import { describe, expect, it } from "vitest";
import { approx, centroid } from "./geo";

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
});
