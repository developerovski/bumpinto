/* Keşfet aralık süzgeci ve süren-plan yardımcıları (W-18/M-12 ortak). "now" bir FİLTREDİR,
   varsayılan sekme değil (spec §11.2): Keşfet "week" ile açılır, sürenler zaten üstte. */
import type { Translate } from "./travelText";

export type PlanRange = "now" | "week" | "weekend" | "all";
type PlanLike = { meetAt?: string; openUntil?: string };

export const RANGES: readonly PlanRange[] = ["now", "week", "weekend", "all"];

/** Sunucunun `OpenPlan.inProgress` kuralı: `[meetAt, openUntil)`, yalnız pencereli planda. */
export function isInProgress(p: PlanLike, now: Date): boolean {
  if (!p.meetAt || !p.openUntil) return false;
  const t = now.getTime();
  return Date.parse(p.meetAt) <= t && t < Date.parse(p.openUntil);
}

export function inRange(p: PlanLike, range: PlanRange, now: Date): boolean {
  if (!p.meetAt) return false;
  if (range === "now") return isInProgress(p, now);
  if (range === "all") return true;
  const t = new Date(p.meetAt);
  if (range === "week") return t.getTime() - now.getTime() < 7 * 86_400_000;
  const day = t.getDay(); // weekend — yerel gün
  return day === 0 || day === 6;
}

/** Pencere sonuna kalan dakika, 5'e yuvarlı; geçmişte 0. */
export function remainingMinutes(openUntil: string, now: Date): number {
  const min = Math.max(0, (Date.parse(openUntil) - now.getTime()) / 60_000);
  return Math.round(min / 5) * 5;
}

/** Buluşma tarihinin `Intl.DateTimeFormat` seçenekleri. 6 gün içinde gün adı yeter ("Cmt 10:00");
    ötesinde gün+ay eklenir — Keşfet 14 günlük pencere listeler ve yalnız "Cmt" iki ayrı hafta
    sonunu aynı gösterir (kullanıcı yanlış haftaya istek atardı). */
export function meetAtOptions(meetAt: Date, now: Date, weekday: "short" | "long"): Intl.DateTimeFormatOptions {
  const base: Intl.DateTimeFormatOptions = { weekday, hour: "2-digit", minute: "2-digit" };
  return meetAt.getTime() - now.getTime() < 6 * 86_400_000 ? base : { weekday, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
}

/** "1 sa 20 dk" — birimler çevirinin (`duration.hm/h/m`); sabit Türkçe birim en/nl'de yanlış basardı. */
export function formatDuration(minutes: number, t: Translate): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return t("duration.hm", { h, m });
  if (h) return t("duration.h", { h });
  return t("duration.m", { m });
}

/** Sürenler önce (başlangıcı erken olan önde), sonra meetAt artan. Girdiyi DEĞİŞTİRMEZ. */
export function sortPlans<T extends PlanLike>(plans: readonly T[], now: Date): T[] {
  return [...plans].sort((a, b) => {
    const ia = isInProgress(a, now) ? 0 : 1;
    const ib = isInProgress(b, now) ? 0 : 1;
    return ia !== ib ? ia - ib : Date.parse(a.meetAt ?? "") - Date.parse(b.meetAt ?? "");
  });
}
