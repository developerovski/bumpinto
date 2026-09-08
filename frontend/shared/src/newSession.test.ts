import { describe, expect, it } from "vitest";
import {
  MAX_ACTIVITIES,
  canSubmit,
  emptyDraft,
  isActivityLocked,
  toCreateRequest,
  toggleActivity,
  type Activity,
} from "./newSession";

const draft = (patch: Partial<ReturnType<typeof emptyDraft>> = {}) => ({ ...emptyDraft(), ...patch });

describe("toggleActivity", () => {
  it("sınıra kadar ekler, sınırdan sonra yok sayar", () => {
    let list: Activity[] = [];
    for (const a of ["COFFEE", "FOOD", "CINEMA", "BAR"] as const) list = toggleActivity(list, a);
    expect(list).toEqual(["COFFEE", "FOOD", "CINEMA"]);
    expect(list).toHaveLength(MAX_ACTIVITIES);
  });

  it("seçili alanı kapatır — sınır doluyken bile (çıkmaz sokak olmaz)", () => {
    const full: Activity[] = ["COFFEE", "FOOD", "CINEMA"];
    expect(toggleActivity(full, "FOOD")).toEqual(["COFFEE", "CINEMA"]);
    // Web'deki "son alan kaldırılmaz" kuralı BURADA YOK: mobil formda CTA zaten
    // `canSubmit` ile kapanıyor, kullanıcı seçimini tamamen değiştirebilmeli.
    expect(toggleActivity(["COFFEE"], "COFFEE")).toEqual([]);
  });

  it("girdi dizisini DEĞİŞTİRMEZ", () => {
    const full: Activity[] = ["COFFEE", "FOOD", "CINEMA"];
    toggleActivity(full, "BAR");
    expect(full).toEqual(["COFFEE", "FOOD", "CINEMA"]);
  });

  it("isActivityLocked yalnız seçili OLMAYAN alanı ve yalnız sınır doluyken kilitler", () => {
    const full: Activity[] = ["COFFEE", "FOOD", "CINEMA"];
    expect(isActivityLocked(full, "BAR")).toBe(true);
    expect(isActivityLocked(full, "FOOD")).toBe(false);
    expect(isActivityLocked(["COFFEE"], "BAR")).toBe(false);
  });
});

describe("canSubmit", () => {
  it("etkinlik yoksa kurulamaz", () => {
    expect(canSubmit(draft({ origin: { lat: 1, lng: 2 } }))).toBe(false);
  });

  it("orta noktalı: kuranın konumu ŞART", () => {
    const d = draft({ activityTypes: ["COFFEE"] });
    expect(canSubmit(d)).toBe(false);
    expect(canSubmit({ ...d, origin: { lat: 51.7, lng: 5.3 } })).toBe(true);
  });

  it("çapalı: çapa ŞART, kendi konumu değil", () => {
    const d = draft({ activityTypes: ["COFFEE"], venueMode: "ANCHOR" });
    expect(canSubmit(d)).toBe(false);
    expect(canSubmit({ ...d, anchor: { lat: 51.44, lng: 5.47 } })).toBe(true);
    // Kendi konumu ÇAPAYI karşılamaz — mod değişince kapı da değişir.
    expect(canSubmit({ ...d, origin: { lat: 51.7, lng: 5.3 } })).toBe(false);
  });
});

describe("toCreateRequest", () => {
  it("orta noktalı gövde: konum alanları dolu, çapa yok", () => {
    const body = toCreateRequest(
      draft({ activityTypes: ["COFFEE"], origin: { lat: 51.7, lng: 5.3, label: "Den Bosch" }, name: "  Cuma  " }),
      "Mehmet",
    );
    expect(body).toMatchObject({
      displayName: "Mehmet",
      activityTypes: ["COFFEE"],
      name: "Cuma",
      sessionType: "GROUP",
      lat: 51.7,
      lng: 5.3,
      locationLabel: "Den Bosch",
      originPresent: true,
      locationWhole: true,
    });
    expect(body.anchor).toBeUndefined();
  });

  it("boş isim GÖNDERİLMEZ (undefined) — sunucu adsız oturumu kendi etiketler", () => {
    expect(toCreateRequest(draft({ activityTypes: ["COFFEE"], name: "   " }), "M").name).toBeUndefined();
  });

  it("çapalı gövde: konumsuz kurulabilir, originPresent false", () => {
    const body = toCreateRequest(
      draft({ activityTypes: ["COFFEE"], venueMode: "ANCHOR", anchor: { lat: 51.44, lng: 5.47, label: "Kleine Berg" } }),
      "Mehmet",
    );
    expect(body.anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Kleine Berg" });
    expect(body.originPresent).toBe(false);
    expect(body.lat).toBeUndefined();
  });

  it("MIDPOINT modunda duran bir çapa gövdeye SIZMAZ", () => {
    const body = toCreateRequest(
      draft({ activityTypes: ["COFFEE"], origin: { lat: 51.7, lng: 5.3 }, anchor: { lat: 51.44, lng: 5.47 } }),
      "Mehmet",
    );
    expect(body.anchor).toBeUndefined();
  });
});
