import { EmptySessions } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk → 27.75rem içerik.
   SessionsPage'de `empty` dalında sayfanın tek çocuğu — sayfanın üstündeki başlık/CTA
   ile birlikte tam kolon genişliğinde oturur. */
const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/** W1 · Oturumlar boş durum — harita işareti + başlık + açıklama + el yazısı not.
    Props almaz, metin `sessions.empty*` i18n anahtarlarından gelir; tek kanonik hücre. */
export function Empty() {
  return (
    <div style={COL}>
      <EmptySessions />
    </div>
  );
}
