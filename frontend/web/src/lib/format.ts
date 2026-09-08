/* Shim: biçimleme `@bumpinto/shared`'ta, dil bağı web tarafında kurulur (shared bir i18next
   örneğine bağlanamaz — mobil kendi örneğini kurar). */
import { formatRating as fmt } from "@bumpinto/shared";
import i18n from "../i18n";

export { providerMark } from "@bumpinto/shared";

export function formatRating(rating: number, scale?: number | null): string {
  return fmt(i18n.resolvedLanguage, rating, scale);
}
