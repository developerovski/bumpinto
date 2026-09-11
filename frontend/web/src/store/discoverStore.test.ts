import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { discover: vi.fn() } }));
import { api } from "../lib/api";
import { useDiscoverStore } from "./discoverStore";

describe("discoverStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDiscoverStore.getState().reset();
  });

  it("ilk yükleme kendi (yuvarlanmış) konumunu saklar; süzgeç değişince aynı konumla yeniden sorar", async () => {
    vi.mocked(api.discover).mockResolvedValue({ plans: [], filter: ["HIKE"] });
    await useDiscoverStore.getState().load({ lat: 51.44, lng: 5.47, travelMode: "BIKE" });
    expect(useDiscoverStore.getState().filter).toEqual(["HIKE"]);
    useDiscoverStore.getState().toggle("SWIM");
    await vi.waitFor(() => expect(api.discover).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.discover).mock.calls[1][0]).toEqual({ activity: ["HIKE", "SWIM"], lat: 51.44, lng: 5.47, travelMode: "BIKE" });
  });

  it("son seçili tür kaldırılamaz — sunucu boş süzgeci ilgi alanlarına çevirir, çip geri zıplardı", async () => {
    vi.mocked(api.discover).mockResolvedValue({ plans: [], filter: ["HIKE"] });
    await useDiscoverStore.getState().load();
    useDiscoverStore.getState().toggle("HIKE");
    expect(useDiscoverStore.getState().filter).toEqual(["HIKE"]);
    expect(api.discover).toHaveBeenCalledTimes(1);
  });

  it("geç dönen eski yanıt yeni süzgecin sonucunu ezmez", async () => {
    let resolveOld: (v: unknown) => void = () => {};
    vi.mocked(api.discover)
      .mockReturnValueOnce(new Promise((r) => { resolveOld = r; }) as never)
      .mockResolvedValueOnce({ plans: [{ slug: "new" }], filter: ["SWIM"] });
    const first = useDiscoverStore.getState().load();
    await useDiscoverStore.getState().load();
    resolveOld({ plans: [{ slug: "old" }], filter: ["HIKE"] });
    await first;
    expect(useDiscoverStore.getState().plans.map((p) => p.slug)).toEqual(["new"]);
    expect(useDiscoverStore.getState().filter).toEqual(["SWIM"]);
  });

  it("'Diğer türlere bak' tüm türleri seçip yeniden sorar", async () => {
    vi.mocked(api.discover).mockResolvedValue({ plans: [], filter: [] });
    useDiscoverStore.getState().selectAll();
    await vi.waitFor(() => expect(api.discover).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.discover).mock.calls[0][0]?.activity).toHaveLength(15);
  });

  it("aralık 'week' ile başlar — Şimdi bir süzgeçtir, varsayılan sekme değil", () => {
    expect(useDiscoverStore.getState().range).toBe("week");
  });
});
