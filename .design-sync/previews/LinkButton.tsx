import { LinkButton } from "@bumpinto/web";

/* `<a>` gövdeli buton — dış bağlantılar. `kind` değerleri Button ile ortak,
   `size` kendine ait (md 52px / sm 46px). `kind="grad"` burada kullanılmaz:
   DS kural 1 gradyan üstüne metin koymayı yasaklar ve LinkButton'da
   yuvarlak/ikon biçimi yok — bkz. learnings. */

/** W4 · kazanan kartının altındaki ana çağrı — flame gövde, 52px. */
export function Directions() {
  return (
    <LinkButton
      href="https://www.google.com/maps/dir/?api=1&destination=Karak%C3%B6y+Lokantas%C4%B1"
      target="_blank"
      rel="noreferrer"
    >
      Yol tarifi al
    </LinkButton>
  );
}

/** Aynı ölçü, ikincil ton — beyaz gövde + line2 çerçeve. */
export function SecondaryLink() {
  return (
    <LinkButton
      kind="white"
      href="https://www.google.com/maps/search/?api=1&query=Moda+Sahil"
      target="_blank"
      rel="noreferrer"
    >
      Mekanı haritada aç
    </LinkButton>
  );
}

/** W4 · viral blok CTA'sı — `size="sm"` (46px), beyaz gövde. */
export function ViralCta() {
  return (
    <LinkButton kind="white" size="sm" href="https://bumpinto.app/">
      Buluşma kur
    </LinkButton>
  );
}

/** Ölçü ekseninin diğer ucu: flame gövde, dar (46px) yerleşim. */
export function CompactPrimary() {
  return (
    <LinkButton size="sm" href="https://bumpinto.app/j/x7k2m">
      Davete dön
    </LinkButton>
  );
}
