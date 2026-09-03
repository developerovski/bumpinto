import { describe, expect, it } from "vitest";
import { approx, centroid, distanceMeters, roundedMidpointMeters } from "./geo";

describe("geo", () => {
  it("centroid iki nokta arasındaki küresel ortalamayı verir; approx 2 ondalığa yuvarlar", () => {
    const c = centroid([{ lat: 51.7, lng: 5.3 }, { lat: 51.39, lng: 5.71 }]);
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(51.545, 2);
    expect(c!.lng).toBeCloseTo(5.505, 2);
    expect(approx({ lat: 51.6978, lng: 5.3037 })).toEqual({ lat: 51.7, lng: 5.3 });
  });

  it("centroid boş listede null döner; antimeridyanı doğru geçer (naif ortalama 0 verirdi)", () => {
    expect(centroid([])).toBeNull();
    const c = centroid([{ lat: 0, lng: 179 }, { lat: 0, lng: -179 }]);
    expect(c).not.toBeNull();
    expect(Math.abs(c!.lng)).toBeCloseTo(180, 0);
  });

  it("distanceMeters aynı noktada 0, bilinen bir çift arasında haversine mesafesini verir", () => {
    expect(distanceMeters({ lat: 51.7, lng: 5.3 }, { lat: 51.7, lng: 5.3 })).toBe(0);
    // Eindhoven merkez ~600 m civarı iki nokta.
    const d = distanceMeters({ lat: 51.4416, lng: 5.4697 }, { lat: 51.4467, lng: 5.4697 });
    expect(d).toBeCloseTo(567, -1);
  });

  it("roundedMidpointMeters 50 m'ye yuvarlar; eksik koordinatta null döner", () => {
    expect(roundedMidpointMeters({ lat: 51.4416, lng: 5.4697 }, { lat: 51.4467, lng: 5.4697 })).toBe(550);
    expect(roundedMidpointMeters({ lat: 51.7 }, { lat: 51.7, lng: 5.3 })).toBeNull();
    expect(roundedMidpointMeters(null, { lat: 51.7, lng: 5.3 })).toBeNull();
  });
});
