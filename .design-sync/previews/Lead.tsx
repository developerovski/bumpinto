import { Lead } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk → 27.75rem içerik.
   Lead'in gerçek tek üst kapı ebeveyni Landing'in `TwoZone` sol bölgesi — o da
   aynı 27.75rem'lik kolonun içinde oturuyor (Page hiçbir zaman ondan geniş açılmıyor,
   `lg:` genişlemesi 1024px altı çekimde tetiklenmiyor). */
const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1rem" } as const;

/** Landing'in gerçek lead paragrafı (`t("landing.copy")`, birebir) — 390'da 16px/30ch
    ölçüsünde üç satıra sarıyor, `text-ink2` tonu başlığın yanında ikinci sesi kurar. */
export function LandingCopy() {
  return (
    <div style={COL}>
      <Lead>
        Sen Den Bosch'tasın, o Someren'de. Dert değil — adil orta noktayı ve oradaki en iyi
        mekânı birlikte bulun.
      </Lead>
    </div>
  );
}

/** Daha uzun, iki cümlelik bir tanıtım metni — ölçü (30ch) aynı kaldığı için satır sayısı
    artıyor ama satır yüksekliği (1.5) ve ton aynı ritmi koruyor; Lead'in "gövde metni" olarak
    ne kadar taşıyabileceğini gösteriyor. */
export function LongForm() {
  return (
    <div style={COL}>
      <Lead>
        BumpInto arkadaş grubunun nerede buluşacağına birlikte karar vermesini sağlar. Herkes
        konumunu atar, uygulama adil bir orta nokta bulur ve gruba oy vermesi için bir mekân
        destesi sunar — hesap açmaya, uzun bir sohbete gerek kalmadan.
      </Lead>
    </div>
  );
}

/** Tek cümlelik kısa kullanım — ölçünün alt sınırı; uzun paragraflarla aynı font/renk/leading
    zincirinin kısa metinde de bozulmadığını doğruluyor. */
export function ShortForm() {
  return (
    <div style={COL}>
      <Lead>Adres değil, buluşma anı önemli.</Lead>
    </div>
  );
}
