import type { VenueDto } from "@bumpinto/shared";

/** Mekanın kanonik dış bağlantısı: önce kendi sayfası (yorum/fotoğraf — "detay" isteğinin
    karşılığı), sonra yol tarifi. Zincir TEK yerde: WinnerCard ve VenuePopCard aynı sıralamayı
    okur; iki yerde ayrı yazılsaydı sessizce ayrışırdı.

    Üçüncü halka (lat/lng'den hesaplanan yol tarifi adresi) YOK: backend'in
    SessionViewAssembler.directionsUrl'i mapsUrl boşsa onu zaten üretip DTO'ya koyuyor. */
export function venueLink(v: Pick<VenueDto, "placeLink" | "mapsUrl">): string | null {
  return v.placeLink || v.mapsUrl || null;
}
