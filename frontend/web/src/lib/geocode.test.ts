import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it, vi } from "vitest";
import { geocode, reverseGeocode } from "./geocode";
import { api } from "./api";

vi.mock("./api", () => ({ api: { geocode: vi.fn(), reverseGeocode: vi.fn() } }));

describe("geocode", () => {
  it("backend ucunu çağırır ve Coords döner", async () => {
    vi.mocked(api.geocode).mockResolvedValue({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });

    const r = await geocode("Amsterdam");

    expect(r).toEqual({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });
    expect(api.geocode).toHaveBeenCalledWith({ query: "Amsterdam" });
  });

  it("404 ve ağ hatası null, nominatim'e fetch gitmez", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const notFound = new AxiosError("x", "404", undefined, undefined, {
      status: 404, data: {}, statusText: "", headers: {}, config: { headers: new AxiosHeaders() },
    } as never);
    vi.mocked(api.geocode).mockRejectedValueOnce(notFound);
    expect(await geocode("bilinmeyen yer")).toBeNull();

    vi.mocked(api.geocode).mockRejectedValueOnce(new Error("network"));
    expect(await geocode("Amsterdam")).toBeNull();

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("ters geocode etiketi ya da null döner", async () => {
    vi.mocked(api.reverseGeocode).mockResolvedValueOnce({ label: "Den Bosch" });
    expect(await reverseGeocode(51.69, 5.3)).toBe("Den Bosch");
    expect(api.reverseGeocode).toHaveBeenCalledWith({ lat: 51.69, lng: 5.3 });

    vi.mocked(api.reverseGeocode).mockResolvedValueOnce({ label: null });
    expect(await reverseGeocode(51.69, 5.3)).toBeNull();

    vi.mocked(api.reverseGeocode).mockRejectedValueOnce(new Error("network"));
    expect(await reverseGeocode(51.69, 5.3)).toBeNull();
  });
});
