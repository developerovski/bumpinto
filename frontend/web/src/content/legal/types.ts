import type { LegalBlock } from "../../components/molecules/LegalBlocks";

/** Uygulamanın desteklediği diller; yasal gövde ÜÇÜNDE de tam yazılır (çeviri şeridi yok). */
export type LegalLang = "tr" | "en" | "nl";

/**
 * Yasal gövde dil başına AYRI yazılır. Rejim seçimi dile bağlıdır (kullanıcı kararı,
 * 2026-09-07): TR metni KVKK'yı, EN/NL metni GDPR'ı anlatır. Dil yargı yetkisiyle birebir
 * örtüşmediği için her sürüm diğer rejime tek cümleyle işaret eder — Hollanda'daki Türkçe
 * konuşan GDPR'a tabidir, metni okurken bunu görmeli.
 */
export type LegalBody = Record<LegalLang, LegalBlock[]>;

export function bodyFor(body: LegalBody, language: string | undefined): LegalBlock[] {
  const lang = (language ?? "").slice(0, 2) as LegalLang;
  return body[lang] ?? body.en;
}
