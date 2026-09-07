/* Artboard W3e `.sk` — mekan satırı iskeleti: 56×64 görsel kutusu + üç metin şeridi. Nabız
   `motion-safe:` ile: `app.css` `prefers-reduced-motion`da tüm animasyonları zaten kapatıyor,
   sınıf o kararı OKUNUR ve test edilebilir kılar. Yarıçap BURADA yok — her kullanım kendisininkini
   verir (kod incelemesi #7): aynı elemana iki `rounded-*` binerse kazananı sınıf sırası değil
   Tailwind'in çıktı sırası belirler. */
const BLOCK = "block bg-sand motion-safe:animate-pulse";

export default function VenueRowSkeleton() {
  return (
    // `.f-lk` align-items:flex-start (kod incelemesi #11) — `items-center` DEĞİL.
    <div data-testid="venue-skeleton" aria-hidden className="flex items-start gap-3 px-3.5 py-[0.6875rem]">
      <span className={`${BLOCK} h-16 w-14 flex-none rounded-xl`} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`${BLOCK} h-3.5 w-[70%] rounded-[0.625rem]`} />
        <span className={`${BLOCK} h-3 w-1/2 rounded-[0.625rem]`} />
        <span className={`${BLOCK} h-2 w-full rounded-[0.625rem]`} />
      </span>
    </div>
  );
}
