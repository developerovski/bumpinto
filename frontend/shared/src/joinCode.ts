/** B-15 `Ids.joinCode` ile AYNI alfabe: karışabilen I/O/0/1 dışarıda (§2 oturum kodu kararı). */
export const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const JOIN_CODE_LENGTH = 5;

/** Kullanıcının yazdığını kanonik koda çevirir; alfabe dışı ya da yanlış uzunlukta null. */
export function normalizeJoinCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  if (code.length !== JOIN_CODE_LENGTH) return null;
  for (const ch of code) if (!JOIN_CODE_ALPHABET.includes(ch)) return null;
  return code;
}

export type Invite = { kind: "slug"; slug: string } | { kind: "code"; code: string };

/**
 * "Kod ya da link yapıştır" kutusunun TEK çözümleyicisi — kod girişi, QR taraması ve
 * yapıştırılan link aynı yoldan geçer.
 *
 * Link `/j/<slug>` biçimindeyse slug, değilse 5 haneli kod aranır. Slug 8 hane ve küçük
 * harftir (B-6 sözleşmesi) — koddan bu yüzden ayrıştırılabilir.
 */
export function parseInvite(raw: string | null | undefined): Invite | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const link = /\/j\/([a-z0-9]{6,16})\/?\s*$/i.exec(text);
  if (link) return { kind: "slug", slug: link[1].toLowerCase() };
  const code = normalizeJoinCode(text);
  return code ? { kind: "code", code } : null;
}
