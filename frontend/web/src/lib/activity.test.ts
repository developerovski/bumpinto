import { describe, expect, it } from "vitest";
import { activityListLabel, sessionActivities } from "./activity";

describe("sessionActivities", () => {
  it("görünümün alanlarını olduğu gibi verir", () => {
    expect(sessionActivities({ activityTypes: ["COFFEE", "HIKE"] })).toEqual(["COFFEE", "HIKE"]);
  });

  /** Alan hiç yoksa ekran boş rozet çizmemeli — eski `?? "COFFEE"` varsayılanı YALAN söylüyordu. */
  it("alan yoksa boş dizi döner, uydurmaz", () => {
    expect(sessionActivities({})).toEqual([]);
  });
});

describe("activityListLabel", () => {
  const t = (key: string) => ({ "activity.COFFEE": "Kahve", "activity.HIKE": "Doğa yürüyüşü", "activity.BAR": "Bar" })[key] ?? key;

  it("tek alanı olduğu gibi bırakır", () => {
    expect(activityListLabel(["COFFEE"], t, "tr")).toBe("Kahve");
  });

  it("üç alanı locale kuralıyla birleştirir", () => {
    expect(activityListLabel(["COFFEE", "HIKE", "BAR"], t, "tr")).toBe("Kahve, Doğa yürüyüşü ve Bar");
  });

  it("İngilizcede kendi bağlacını kullanır", () => {
    expect(activityListLabel(["COFFEE", "HIKE"], (k) => ({ "activity.COFFEE": "Coffee", "activity.HIKE": "Hike" })[k] ?? k, "en")).toBe("Coffee and Hike");
  });
});
