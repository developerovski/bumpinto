import { TextInput } from "@bumpinto/web";

/* Etiketsiz, çıplak alan — etiket + hata metni `Field`'ın işi.
   Kontrolsüz kullanım: `defaultValue`, `value` değil. */

/** W1 · adres alanı boşken — placeholder ink3 tonunda, çerçeve line-in. */
export function Placeholder() {
  return (
    <TextInput
      id="ti-address"
      aria-label="Şehir ya da adres"
      placeholder="Şehir ya da adres yaz"
    />
  );
}

/** Doldurulmuş hâli — metin ink, Figtree gövde puntosu. */
export function Filled() {
  return (
    <TextInput id="ti-address-2" aria-label="Şehir ya da adres" defaultValue="Moda Sahil, Kadıköy" />
  );
}

/** Katılım isteği giderken kilitlenen ad alanı. */
export function Disabled() {
  return <TextInput id="ti-name" aria-label="Adın" defaultValue="Mehmet" disabled />;
}
