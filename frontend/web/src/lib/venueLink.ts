import type { VenueDto } from "@bumpinto/shared";

/** Mekanın kanonik dış bağlantısı: önce kendi sayfası (yorum/fotoğraf — "detay" isteğinin
    karşılığı), sonra yol tarifi. Zincir TEK yerde: WinnerCard ve VenuePopCard aynı sıralamayı
    okur; iki yerde ayrı yazılsaydı sessizce ayrışırdı.

    `mapsUrl` artık HER ZAMAN koordinat tabanlı yol tarifi adresidir (spec §10) — backend
    SessionViewAssembler bunu boşsa zaten üretip DTO'ya koyar. "Bağlantı yok" durumu yalnız
    saklama süresi kırpmasından (§11) SONRA var olur; çağıranların `href && …` koruması bunun
    içindir. */
export function venueLink(v: Pick<VenueDto, "placeLink" | "mapsUrl">): string | null {
  return v.placeLink || v.mapsUrl || null;
}
