import { Heading } from "@bumpinto/web";

/** W1 · sayfa başlığı — `display` (34px Bricolage 800, sıkı tracking).
    Boyutu app.css `@layer base` içindeki `h1` kuralı verir, utility değil. */
export function Display() {
  return <Heading>Buluşmaya katıl</Heading>;
}

/** W3 · deste bitiş ekranı — `center` ile ortalanmış başlık. */
export function Centered() {
  return <Heading center>Deste bitti!</Heading>;
}

/** 07 Runoff · iki satırlık başlık — 1.05 satır yüksekliği burada görünür. */
export function TwoLine() {
  return (
    <Heading>
      İkisi de güzel,
      <br />
      biri kazanacak
    </Heading>
  );
}

/** W3 liste modu · `size="md"` (26px) — deste yerine liste gösterilen ekranın başlığı. */
export function Medium() {
  return <Heading size="md">Hangisi olsun?</Heading>;
}
