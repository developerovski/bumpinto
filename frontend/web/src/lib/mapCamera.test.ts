import { describe, expect, it } from "vitest";
import { MAX_FIT_ZOOM, SOLO_ZOOM, cameraFor, cameraSignature } from "./mapCamera";

const DEN_BOSCH = { lat: 51.7, lng: 5.3 };
const SOMEREN = { lat: 51.39, lng: 5.71 };

describe("mapCamera", () => {
  /** Tek katılımcılı oturumda fitBounds sıfır alanlı kutuya maksimum zoom veriyordu. */
  it("tek konumda kutu değil, şehir ölçeğinde nokta döner", () => {
    const c = cameraFor([DEN_BOSCH]);

    expect(c).toEqual({ kind: "point", center: DEN_BOSCH, zoom: SOLO_ZOOM });
    expect(SOLO_ZOOM).toBeLessThan(MAX_FIT_ZOOM);
  });

  it("birkaç yüz metrelik fark da nokta sayılır — sokak seviyesine kilitlenmez", () => {
    const c = cameraFor([DEN_BOSCH, { lat: 51.702, lng: 5.303 }]);

    expect(c?.kind).toBe("point");
  });

  it("ayrı şehirlerde tüm konumları kapsayan kutu döner", () => {
    const c = cameraFor([DEN_BOSCH, SOMEREN]);

    expect(c).toEqual({ kind: "bounds", sw: { lat: 51.39, lng: 5.3 }, ne: { lat: 51.7, lng: 5.71 } });
  });

  it("mekanlar da kadraja girer (çağıran onları points'e ekler)", () => {
    const venue = { lat: 51.44, lng: 5.48 };
    const c = cameraFor([DEN_BOSCH, SOMEREN, { lat: 51.2, lng: 6.1 }, venue]);

    expect(c).toMatchObject({ kind: "bounds", sw: { lat: 51.2, lng: 5.3 }, ne: { lat: 51.7, lng: 6.1 } });
  });

  /** Yarıçap çemberi kadrajın dışında kalırsa "orta nokta" anlatısı okunmaz olur. */
  it("yarıçap çemberi kutuyu genişletir", () => {
    const withoutCircle = cameraFor([DEN_BOSCH, SOMEREN], { lat: 51.545, lng: 5.505 }, null);
    const withCircle = cameraFor([DEN_BOSCH, SOMEREN], { lat: 51.545, lng: 5.505 }, 25);

    expect(withCircle).toMatchObject({ kind: "bounds" });
    if (withCircle?.kind !== "bounds" || withoutCircle?.kind !== "bounds") throw new Error("kutu bekleniyordu");
    expect(withCircle.ne.lat).toBeGreaterThan(withoutCircle.ne.lat);
    expect(withCircle.sw.lat).toBeLessThan(withoutCircle.sw.lat);
    // 25 km ≈ 0.225° enlem
    expect(withCircle.ne.lat - 51.545).toBeCloseTo(0.2246, 3);
  });

  it("tek konum + çember: çember görünür kalsın diye kutuya döner", () => {
    const c = cameraFor([DEN_BOSCH], DEN_BOSCH, 10);

    expect(c?.kind).toBe("bounds");
  });

  it("hiç konum yoksa null — mevcut kameraya dokunulmaz", () => {
    expect(cameraFor([])).toBeNull();
  });

  /** İmza seçim/etiket değişimini GÖRMEZ: kamera yalnız coğrafya değişince yeniden kurulur. */
  it("imza sadece koordinatlara, orta noktaya ve yarıçapa bakar", () => {
    const a = cameraSignature([DEN_BOSCH], null, null);
    const b = cameraSignature([DEN_BOSCH], null, null);
    const c = cameraSignature([DEN_BOSCH, SOMEREN], null, null);
    const d = cameraSignature([DEN_BOSCH], null, 25);

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });
});
