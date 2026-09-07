/* R-W8 — "neyle bilinir" satırı. Alan sözleşmede (§2) ama B-15'e kadar openapi'de YOK; bu dosya
   alan geldiğinde silinir. Boş dize satırı çizdirmez: uydurma metin yazılmaz. */
import type { VenueDto } from "@bumpinto/shared";

export function taglineOf(venue: VenueDto): string | null {
  const raw = (venue as VenueDto & { tagline?: unknown }).tagline;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  return text === "" ? null : text;
}
