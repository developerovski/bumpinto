import { api } from "../lib/api";
import { useMeStore } from "./meStore";

jest.mock("../lib/api", () => ({
  api: { updateMe: jest.fn(async (body: unknown) => body), me: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (api.updateMe as jest.Mock).mockImplementation(async (body: unknown) => body);
});

/* K-M46: `PUT /api/me` tam değişimdir — yalnız `{ language }` gönderilseydi sunucu varsayılan
   konumu, etkinliği ve ulaşım türünü silerdi. Gövde mevcut `me`'yi taşır, patch yalnız
   değişeni ezer; `interests` gönderilmez (sunucu null'da korur). */
test("update: tek alan değişse de gövde diğer tercihleri taşır", async () => {
  useMeStore.setState({
    me: {
      displayName: "Mehmet",
      defaultLocation: { lat: 51.44, lng: 5.47, label: "Eindhoven" },
      defaultActivity: "COFFEE",
      language: "tr",
      defaultTravelMode: "BIKE",
      interests: ["HIKE"],
    },
  });

  await expect(useMeStore.getState().update({ language: "nl" })).resolves.toBe(true);

  expect(api.updateMe).toHaveBeenCalledWith({
    displayName: "Mehmet",
    defaultLocation: { lat: 51.44, lng: 5.47, label: "Eindhoven" },
    defaultActivity: "COFFEE",
    language: "nl",
    defaultTravelMode: "BIKE",
  });
});

/* T5 inceleme: `update` her yanıtı VARIŞ sırasıyla yazıyordu. Yavaş ağda eski kaydın geç dönen
   yanıtı yenisini ezer; profil satırı sunucudakinden farklı listeyi gösterir ve sonraki düzenleme o
   yanlış listeden kurulup sunucuyu yeniden ezerdi. */
test("update: geç dönen ESKİ kaydın yanıtı yeni kaydı ezmez; kayıt sürdükçe `saving`", async () => {
  useMeStore.setState({ me: { displayName: "M", interests: ["COFFEE"] }, saving: false });
  let resolveOld: (v: unknown) => void = () => {};
  (api.updateMe as jest.Mock)
    .mockReturnValueOnce(new Promise((r) => { resolveOld = r; }))
    .mockResolvedValueOnce({ displayName: "M", interests: ["COFFEE", "BAR"] });

  const old = useMeStore.getState().update({ interests: ["COFFEE", "FOOD"] });
  expect(useMeStore.getState().saving).toBe(true);
  await useMeStore.getState().update({ interests: ["COFFEE", "BAR"] });

  resolveOld({ displayName: "M", interests: ["COFFEE", "FOOD"] });
  await old;
  expect(useMeStore.getState().me?.interests).toEqual(["COFFEE", "BAR"]);
  expect(useMeStore.getState().saving).toBe(false);
});

test("load: kayıt sürerken başlayan okumanın BAYAT sonucu kaydı ezmez", async () => {
  useMeStore.setState({ me: { displayName: "M", interests: ["COFFEE"] }, saving: false });
  let resolveLoad: (v: unknown) => void = () => {};
  (api.me as jest.Mock).mockReturnValueOnce(new Promise((r) => { resolveLoad = r; }));

  const loading = useMeStore.getState().load();
  await useMeStore.getState().update({ interests: ["COFFEE", "BAR"] });
  resolveLoad({ displayName: "M", interests: ["COFFEE"] });
  await loading;

  expect(useMeStore.getState().me?.interests).toEqual(["COFFEE", "BAR"]);
});
