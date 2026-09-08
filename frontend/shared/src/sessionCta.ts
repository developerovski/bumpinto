import type { SessionSummaryDto } from "./api";

/**
 * Durum → hedef ekranın CTA metni (i18n ANAHTARI, metin değil).
 *
 * Web `SessionCard` ve mobil `SessionCard` + derin link yönlendirici AYNI eşlemeyi okur.
 * Eşleme iki dosyada kopyayken ayrışmıştı: `RUNOFF` webde "Mekanlara git", mobilde "Lobiye git"
 * oluyordu (M-4 kapanış denetimi, 2026-09-08). Backend `DECIDED`/`EXPIRED`'ı `past`'e koyar —
 * açık liste kartında bu ikisi gelmez, `default` yalnız toplama/öneri aşamaları içindir.
 */
export function sessionCtaKey(status: SessionSummaryDto["status"]): string {
  switch (status) {
    case "SWIPING":
      return "sessions.goDeck";
    case "BROWSING":
    case "RUNOFF":
      return "sessions.goVenues";
    default:
      return "sessions.goLobby";
  }
}
