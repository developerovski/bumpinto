import { Field } from "@bumpinto/web";

/** W1 · ad alanı — boş, placeholder görünür. */
export function Empty() {
  return <Field id="f-name" label="Adın" placeholder="Arkadaşların sana ne der?" />;
}

/** Doldurulmuş hâli. */
export function Filled() {
  return <Field id="f-name-2" label="Adın" defaultValue="Mehmet" />;
}

/** Geocode başarısız — `error` hem metni basar hem `aria-invalid` kurar. */
export function WithError() {
  return (
    <Field
      id="f-addr"
      label="Neredesin?"
      defaultValue="Kadıköy"
      error="Bu adres bulunamadı — yakındaki bir şehri dene."
    />
  );
}
