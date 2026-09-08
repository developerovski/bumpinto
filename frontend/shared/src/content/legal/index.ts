import { dataRights } from "./dataRights";
import { privacy } from "./privacy";
import { terms } from "./terms";
import type { LegalBody } from "./types";

export type { LegalBlock, LegalBody, LegalLang } from "./types";
export { bodyFor } from "./types";

/** URL parçası; mağaza meta verisine giren değer — değiştirmek eski linkleri kırar. */
export type LegalSlug = "privacy" | "terms" | "data-rights";

export type LegalDocMeta = {
  slug: LegalSlug;
  /** i18n başlık anahtarı — başlık kabuk metnidir, gövde `body`de dil dil yazılıdır. */
  titleKey: string;
  /** ISO tarih; ekranda kullanıcının diline göre biçimlenir. */
  updated: string;
  version: string;
  body: LegalBody;
};

export const LEGAL_DOCS: Record<LegalSlug, LegalDocMeta> = {
  privacy: { slug: "privacy", titleKey: "legal.privacy", updated: "2026-09-07", version: "1.0", body: privacy },
  terms: { slug: "terms", titleKey: "legal.terms", updated: "2026-09-07", version: "1.0", body: terms },
  "data-rights": { slug: "data-rights", titleKey: "legal.dataRights", updated: "2026-09-07", version: "1.0", body: dataRights },
};
