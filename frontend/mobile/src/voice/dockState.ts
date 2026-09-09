import type { EndReason, VoicePhase } from "../store/voiceStore";

/** P25'in yedi hâli. "sessiz" ayrı durum DEĞİLDİR: `in` gövdesinin `muted` varyantıdır (P25:5). */
export type DockState = "closedHost" | "hidden" | "open" | "joining" | "in" | "error" | "expired";

/**
 * Dock'un TEK karar noktası. Bileşen bu tabloyu ÇİZER; kendi içinde ikinci bir dal kurmaz —
 * yedi hâl yedi ayrı `if` olarak ekrana dağılsaydı biri değişince diğerleri sessizce ayrışırdı.
 */
export function dockStateOf(input: {
  hasRoom: boolean;
  host: boolean;
  phase: VoicePhase;
  endedReason: EndReason | null;
}): DockState {
  // Sebep, tazelenmemiş görünümdeki `endsAt`i EZER: host yeniden başlattığında üyenin görünümü
  // henüz dönmemiş olabilir ve "Katıl" ekranı YANLIŞ olurdu (W-11 dersi).
  if (input.endedReason === "TIME_LIMIT") return "expired";
  if (input.endedReason) return input.host ? "closedHost" : "hidden";
  if (!input.hasRoom) return input.host ? "closedHost" : "hidden";
  if (input.phase === "error") return "error";
  if (input.phase === "joining") return "joining";
  if (input.phase === "in") return "in";
  return "open";
}
