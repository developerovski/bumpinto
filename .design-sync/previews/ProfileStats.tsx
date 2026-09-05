import { ProfileStats } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk → 27.75rem içerik.
   ProfilePage'de IdentityCard'ın hemen altında, TwoZone sol bölgede bu genişlikte. */
const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/** W9 · aktif kullanıcı — birkaç buluşma kurmuş, birkaç dost görmüş. */
export function Active() {
  return (
    <div style={COL}>
      <ProfileStats stats={{ sessionsHosted: 9, friendsMet: 23 }} />
    </div>
  );
}

/** W9 · yeni hesap — `stats` alanları boş, `?? 0` düşüşüyle iki kart da sıfır basar. */
export function NewAccount() {
  return (
    <div style={COL}>
      <ProfileStats stats={{}} />
    </div>
  );
}
