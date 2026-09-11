import { api } from "../lib/api";
import { useDiscoverStore as store } from "./discoverStore";

jest.mock("../lib/api", () => ({ api: { discover: jest.fn() } }));

const s = () => store.getState();
const discover = api.discover as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  s().reset();
});

test("ilk yükleme konumu saklar; süzgeç değişince AYNI konumla yeniden sorar", async () => {
  discover.mockResolvedValue({ plans: [], filter: ["HIKE"] });
  await s().load({ lat: 51.44, lng: 5.47, travelMode: "BIKE" });
  expect(s().filter).toEqual(["HIKE"]);
  s().toggle("SWIM");
  expect(discover).toHaveBeenCalledTimes(2);
  expect(discover.mock.calls[1][0]).toEqual({
    activity: ["HIKE", "SWIM"],
    lat: 51.44,
    lng: 5.47,
    travelMode: "BIKE",
  });
});

/* Sunucu boş süzgeci profil ilgi alanlarına çevirir: son çip kaldırılsaydı yanıttaki `filter`
   onu geri zıplatır, kullanıcının yaptığı şey sessizce geri alınmış olurdu. */
test("son seçili tür kaldırılamaz", async () => {
  discover.mockResolvedValue({ plans: [], filter: ["HIKE"] });
  await s().load();
  s().toggle("HIKE");
  expect(s().filter).toEqual(["HIKE"]);
  expect(discover).toHaveBeenCalledTimes(1);
});

test("geç dönen eski yanıt yeni süzgecin sonucunu ezmez", async () => {
  let resolveOld: (v: unknown) => void = () => {};
  discover
    .mockReturnValueOnce(new Promise((r) => { resolveOld = r; }))
    .mockResolvedValueOnce({ plans: [{ slug: "new" }], filter: ["SWIM"] });
  const first = s().load();
  await s().load();
  resolveOld({ plans: [{ slug: "old" }], filter: ["HIKE"] });
  await first;
  expect(s().plans.map((p) => p.slug)).toEqual(["new"]);
  expect(s().filter).toEqual(["SWIM"]);
});

test("'Diğer türlere bak' tüm türleri seçip yeniden sorar", () => {
  discover.mockResolvedValue({ plans: [], filter: [] });
  s().selectAll();
  expect(discover).toHaveBeenCalledTimes(1);
  expect(discover.mock.calls[0][0].activity).toHaveLength(15);
});

test("aralık 'week' ile başlar; reset konumu ve süzgeci de düşürür (hesaba bağlı)", async () => {
  expect(s().range).toBe("week");
  discover.mockResolvedValue({ plans: [{ slug: "a" }], filter: ["HIKE"] });
  await s().load({ lat: 51.44, lng: 5.47 });
  s().setRange("now");
  s().reset();
  expect(s()).toMatchObject({ plans: [], filter: [], range: "week", origin: null, loaded: false });
});
