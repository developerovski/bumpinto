import type { VenueDto } from "./api";

/** "Google Maps'te aç" düğmesinin hedefi: HER ZAMAN koordinat tabanlı yol tarifi (spec §10).
    Backend SessionViewAssembler bunu boşsa zaten üretip DTO'ya koyar; "bağlantı yok" durumu yalnız
    saklama süresi kırpmasından (§11) SONRA var olur, çağıranların `href && …` koruması bunun içindir.

    Eskiden `placeLink` önceliklenirdi; ama her kaynak (Foursquare, açık taban) oraya mekanın WEB
    SİTESİNİ yazıyor. "Google Maps'te aç" düğmesi kafenin sitesini açıyordu (2026-09-06, manuel test).
    Site artık ayrı bağlantı: `websiteLink`. */
export function venueLink(v: Pick<VenueDto, "mapsUrl">): string | null {
  return v.mapsUrl || null;
}

/** Mekanın kendi sitesi; kaynaklar `placeLink`e `website` alanını yazar. Yoksa null, bağlantı çizilmez. */
export function websiteLink(v: Pick<VenueDto, "placeLink">): string | null {
  return v.placeLink || null;
}
