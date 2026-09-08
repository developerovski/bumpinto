/* R-W8 — "neyle bilinir" satırı. `VenueDto.tagline` ARTIK openapi'de var (B-15 geldi); yine de
   `unknown` üzerinden okunur: alan boş dize dönebilir ve boş dize satırı çizdirmemeli — uydurma
   metin yazılmaz. Tek yüklem burada yaşar (VenueMeta + VenueCard aynısını çağırır). */
import type { VenueDto } from "@bumpinto/shared";

export function taglineOf(venue: VenueDto): string | null {
  const raw = (venue as VenueDto & { tagline?: unknown }).tagline;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  return text === "" ? null : text;
}
