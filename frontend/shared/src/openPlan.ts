/* Açık plan TASLAĞI kuralları (B-18 · W-18/M-12). Saf: iki istemci de aynı `OpenPlanInput`'u
   üretir. "Ne zaman" planı TANIMLAR: UNSET = bugünkü gizli oturum (openPlan yok), NOW = pencereli
   "buradayım", DATE = zamanlı plan. Kitle: PUBLIC | NONE (FRIENDS B-19 — burada bilerek yok). */
import type { Schemas } from "./api";

export type WhenMode = "UNSET" | "NOW" | "DATE";
export type DurationHours = 1 | 2 | 3;
export type Audience = "PUBLIC" | "NONE";
export type JoinPolicy = NonNullable<Schemas["OpenPlanInput"]["joinPolicy"]>;
export type OpenPlanErrorKey = "plan.errWhereRequired" | "plan.errMeetAtRequired" | "plan.errMeetAtPast";

export type OpenPlanDraft = {
  when: WhenMode;
  /** DATE: `YYYY-MM-DD` + `HH:mm` (yerel saat; `<input type=date/time>` biçimi). */
  meetDate: string;
  meetTime: string;
  /** NOW: pencere. */
  durationHours: DurationHours;
  /** Host dahil koltuk; artboard P3 stepper'ı — sunucu sınırı `[MIN_CAPACITY, MAX_CAPACITY]`. */
  capacity: number;
  /** null = moda göre varsayılan (NOW → OPEN, DATE → APPROVAL); host dokununca dolar. */
  joinPolicy: JoinPolicy | null;
  audience: Audience;
  /** NOW: mekân adı — çapanın etiketi olur (üyelere özel; Keşfet semti sunucudan). */
  whereLabel: string;
};

export const DURATIONS: readonly DurationHours[] = [1, 2, 3];
/** `OpenPlan.MIN_CAPACITY/MAX_CAPACITY` (backend) ile aynı sayılar; 3 aynı zamanda yeter sayı. */
export const MIN_CAPACITY = 3;
export const MAX_CAPACITY = 8;
export const WHERE_LABEL_MAX = 60;

export function emptyOpenPlanDraft(): OpenPlanDraft {
  return { when: "UNSET", meetDate: "", meetTime: "", durationHours: 2, capacity: 4,
    joinPolicy: null, audience: "PUBLIC", whereLabel: "" };
}

/** Şimdi'de OPEN: push yok, 2 saatlik pencerede onay beklemek planı öldürür (spec karar 4). */
export function defaultJoinPolicy(when: WhenMode): JoinPolicy {
  return when === "NOW" ? "OPEN" : "APPROVAL";
}

export function effectiveJoinPolicy(d: OpenPlanDraft): JoinPolicy {
  return d.joinPolicy ?? defaultJoinPolicy(d.when);
}

function dateOf(d: OpenPlanDraft): Date | null {
  if (!d.meetDate || !d.meetTime) return null;
  const t = new Date(`${d.meetDate}T${d.meetTime}`);
  return Number.isNaN(t.getTime()) ? null : t;
}

export function openPlanError(d: OpenPlanDraft, now: Date): OpenPlanErrorKey | null {
  if (d.when === "NOW") return d.whereLabel.trim() ? null : "plan.errWhereRequired";
  if (d.when === "DATE") {
    const t = dateOf(d);
    if (!t) return "plan.errMeetAtRequired";
    return t.getTime() <= now.getTime() ? "plan.errMeetAtPast" : null;
  }
  return null;
}

/** Sözleşme gövdesi; UNSET ya da hatalı taslakta undefined (gövdeye `openPlan` girmez). */
export function openPlanInputOf(d: OpenPlanDraft, now: Date): Schemas["OpenPlanInput"] | undefined {
  if (d.when === "UNSET" || openPlanError(d, now)) return undefined;
  const capacity = Math.min(MAX_CAPACITY, Math.max(MIN_CAPACITY, Math.round(d.capacity)));
  const base = { capacity, joinPolicy: effectiveJoinPolicy(d), audience: d.audience };
  if (d.when === "NOW") {
    return { meetAt: now.toISOString(),
      openUntil: new Date(now.getTime() + d.durationHours * 3_600_000).toISOString(), ...base };
  }
  return { meetAt: dateOf(d)!.toISOString(), ...base };
}

/** Şimdi'de çapa = kuranın konumu + "Nerede?" etiketi; sunucu pencereli planı çapasız reddeder. */
export function anchorForInstant(
  d: OpenPlanDraft,
  own: { lat: number; lng: number } | null,
): { lat: number; lng: number; label: string } | null {
  if (d.when !== "NOW" || !own) return null;
  return { lat: own.lat, lng: own.lng, label: d.whereLabel.trim().slice(0, WHERE_LABEL_MAX) };
}
