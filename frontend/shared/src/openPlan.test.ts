import { describe, expect, it } from "vitest";
import { anchorForInstant, emptyOpenPlanDraft, openPlanError, openPlanInputOf } from "./openPlan";

const NOW = new Date("2026-09-13T10:00:00Z");
const draft = (patch: Partial<ReturnType<typeof emptyOpenPlanDraft>> = {}) => ({ ...emptyOpenPlanDraft(), ...patch });

describe("openPlanInputOf", () => {
  it("Belirsiz → openPlan yok", () => {
    expect(openPlanInputOf(draft(), NOW)).toBeUndefined();
  });

  it("Şimdi → meetAt = now, openUntil = now + süre, OPEN ve PUBLIC varsayılan", () => {
    expect(openPlanInputOf(draft({ when: "NOW", durationHours: 2, whereLabel: "Café Zwart" }), NOW)).toEqual({
      meetAt: "2026-09-13T10:00:00.000Z",
      openUntil: "2026-09-13T12:00:00.000Z",
      capacity: 4,
      joinPolicy: "OPEN",
      audience: "PUBLIC",
    });
  });

  it("Tarih seç → yerel tarih+saat ISO'ya çevrilir, openUntil yok, APPROVAL varsayılan", () => {
    const input = openPlanInputOf(draft({ when: "DATE", meetDate: "2026-09-20", meetTime: "10:00" }), NOW);
    expect(input?.meetAt).toBe(new Date("2026-09-20T10:00").toISOString());
    expect(input?.openUntil).toBeUndefined();
    expect(input?.joinPolicy).toBe("APPROVAL");
  });

  it("host'un seçtiği katılım varsayılanı ezer", () => {
    expect(openPlanInputOf(draft({ when: "NOW", whereLabel: "x", joinPolicy: "APPROVAL" }), NOW)?.joinPolicy).toBe("APPROVAL");
  });

  it("kapasite 3–8 aralığına sıkıştırılır (sunucu sınırı)", () => {
    expect(openPlanInputOf(draft({ when: "NOW", whereLabel: "x", capacity: 12 }), NOW)?.capacity).toBe(8);
    expect(openPlanInputOf(draft({ when: "NOW", whereLabel: "x", capacity: 1 }), NOW)?.capacity).toBe(3);
  });

  it("Kimse → audience NONE", () => {
    expect(openPlanInputOf(draft({ when: "NOW", whereLabel: "x", audience: "NONE" }), NOW)?.audience).toBe("NONE");
  });

  it("hatalı taslak gövdeye girmez", () => {
    expect(openPlanInputOf(draft({ when: "NOW", whereLabel: " " }), NOW)).toBeUndefined();
  });
});

describe("openPlanError", () => {
  it("Belirsiz hatasız", () => expect(openPlanError(draft(), NOW)).toBeNull());
  it("Şimdi + Nerede boş → plan.errWhereRequired", () => {
    expect(openPlanError(draft({ when: "NOW", whereLabel: "  " }), NOW)).toBe("plan.errWhereRequired");
  });
  it("Tarih seç + geçmiş → plan.errMeetAtPast", () => {
    expect(openPlanError(draft({ when: "DATE", meetDate: "2020-01-01", meetTime: "10:00" }), NOW)).toBe("plan.errMeetAtPast");
  });
  it("Tarih seç + boş tarih → plan.errMeetAtRequired", () => {
    expect(openPlanError(draft({ when: "DATE" }), NOW)).toBe("plan.errMeetAtRequired");
  });
});

describe("anchorForInstant", () => {
  it("Şimdi'de çapa = kendi konum + Nerede etiketi", () => {
    expect(anchorForInstant(draft({ when: "NOW", whereLabel: " Café Zwart " }), { lat: 51.44, lng: 5.47 }))
      .toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
  });
  it("Şimdi değilse ya da konum yoksa null", () => {
    expect(anchorForInstant(draft({ when: "DATE" }), { lat: 1, lng: 2 })).toBeNull();
    expect(anchorForInstant(draft({ when: "NOW", whereLabel: "x" }), null)).toBeNull();
  });
});
