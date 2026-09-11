import { describe, expect, it } from "vitest";
import { emptyOpenPlanDraft } from "./openPlan";
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

describe("toCreateRequest · açık plan", () => {
  const NOW = new Date("2026-09-13T10:00:00Z");
  it("Şimdi: openPlan + çapa kendi konumdan, venueMode'a bakmadan", () => {
    const d = draft({ activityTypes: ["COFFEE"], origin: { lat: 51.44, lng: 5.47, label: "Stratum" },
      plan: { ...emptyOpenPlanDraft(), when: "NOW", durationHours: 1, whereLabel: "Café Zwart" } });
    const r = toCreateRequest(d, "M", NOW);
    expect(r.openPlan).toEqual({ meetAt: "2026-09-13T10:00:00.000Z", openUntil: "2026-09-13T11:00:00.000Z",
      capacity: 4, joinPolicy: "OPEN", audience: "PUBLIC" });
    expect(r.anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
  });
  it("Şimdi: ANCHOR modunda kalmış eski çapa gövdeye SIZMAZ — çapa yalnız kuranın konumundan", () => {
    const d = draft({ activityTypes: ["COFFEE"], venueMode: "ANCHOR", anchor: { lat: 52.37, lng: 4.9, label: "Amsterdam" },
      origin: { lat: 51.44, lng: 5.47 }, plan: { ...emptyOpenPlanDraft(), when: "NOW", whereLabel: "Café Zwart" } });
    expect(toCreateRequest(d, "M", NOW).anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
  });
  it("geçersiz plan gövdeye SESSİZCE düşmez — fırlatır (gizli oturum kurulmasın)", () => {
    const past = draft({ activityTypes: ["COFFEE"], origin: { lat: 1, lng: 2 },
      plan: { ...emptyOpenPlanDraft(), when: "DATE", meetDate: "2020-01-01", meetTime: "10:00" } });
    expect(() => toCreateRequest(past, "M", NOW)).toThrow("plan.errMeetAtPast");
    const noOrigin = draft({ activityTypes: ["COFFEE"], plan: { ...emptyOpenPlanDraft(), when: "NOW", whereLabel: "x" } });
    expect(() => toCreateRequest(noOrigin, "M", NOW)).toThrow("newSession.ownMissing");
  });
  it("Belirsiz: openPlan yok (bugünkü gövde)", () => {
    expect(toCreateRequest(draft({ activityTypes: ["COFFEE"], origin: { lat: 1, lng: 2 } }), "M", NOW).openPlan).toBeUndefined();
  });
  it("açık plan her zaman GROUP — SOLO'nun davet linki yok, plana kimse katılamazdı", () => {
    const d = draft({ activityTypes: ["COFFEE"], sessionType: "SOLO", origin: { lat: 1, lng: 2 },
      plan: { ...emptyOpenPlanDraft(), when: "DATE", meetDate: "2026-09-20", meetTime: "10:00" } });
    expect(toCreateRequest(d, "M", NOW).sessionType).toBe("GROUP");
    expect(toCreateRequest({ ...d, plan: emptyOpenPlanDraft() }, "M", NOW).sessionType).toBe("SOLO");
  });
});

describe("canSubmit · açık plan", () => {
  const NOW = new Date("2026-09-13T10:00:00Z");
  it("Şimdi: konum + Nerede şart", () => {
    const base = draft({ activityTypes: ["COFFEE"], origin: { lat: 1, lng: 2 } });
    expect(canSubmit({ ...base, plan: { ...emptyOpenPlanDraft(), when: "NOW" } }, NOW)).toBe(false);
    expect(canSubmit({ ...base, plan: { ...emptyOpenPlanDraft(), when: "NOW", whereLabel: "x" } }, NOW)).toBe(true);
    expect(canSubmit({ ...base, origin: null, plan: { ...emptyOpenPlanDraft(), when: "NOW", whereLabel: "x" } }, NOW)).toBe(false);
  });
  it("Tarih seç: geçmiş saat kurulamaz", () => {
    const base = draft({ activityTypes: ["COFFEE"], origin: { lat: 1, lng: 2 } });
    expect(canSubmit({ ...base, plan: { ...emptyOpenPlanDraft(), when: "DATE", meetDate: "2020-01-01", meetTime: "10:00" } }, NOW)).toBe(false);
  });
});
