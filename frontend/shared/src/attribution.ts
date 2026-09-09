import type { VenueDto } from "./api";

/**
 * Bir mekan listesinin ATIF gerektiren sağlayıcı kimlikleri (spec §11).
 *
 * İki kaynak vardır ve ikisi de yükümlülük doğurur: mekanın KENDİSİ (`provider`) ve
 * "neyle bilinir" cümlesi (`taglineSource`). FSQ tips'ten türeyen bir cümle Foursquare
 * atfı ister, mekan Google'dan gelmiş olsa bile (GUIDE kural 8; B-15 T2).
 *
 * `taglineSource` sözleşme enum'u (`FSQ`/`OSM`), `/api/config.sources[].id` ise sağlayıcı
 * kimliği (`foursquare`/`open`) — eşleme TEK yerde, burada. Web ve mobil aynı listeyi
 * `Attribution`ın `providers` propuna verir; bileşenlerin ikisi de veri-güdümlü kalır,
 * sağlayıcı başına kod dalı açılmaz.
 */
const TAGLINE_PROVIDER: Record<string, string> = { FSQ: "foursquare", OSM: "open" };

export function attributionProviders(
  venues: ReadonlyArray<Pick<VenueDto, "provider" | "taglineSource"> | null | undefined>,
): string[] {
  const ids = new Set<string>();
  for (const venue of venues) {
    if (!venue) continue;
    if (venue.provider) ids.add(venue.provider);
    const fromTagline = venue.taglineSource ? TAGLINE_PROVIDER[venue.taglineSource] : undefined;
    if (fromTagline) ids.add(fromTagline);
  }
  return [...ids];
}
