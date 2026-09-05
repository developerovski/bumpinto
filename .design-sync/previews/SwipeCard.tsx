import { SwipeCard, VenueCard } from "@bumpinto/web";
import { KARAKOY, TRAVEL } from "./_fixtures";

/* Kaynak: VenueDeck.tsx — `.a-deck` yuvası (27.5rem, sabit) + ön kartın kendi eğimi (D1).
   ÜRÜN GERÇEĞİ (VenueDeck'in kendi `FullStack` karesinde de görülüyor — grade.json'daki not):
   ön karttaki içerik (foto + rozet + yol çipleri + atıf) her zaman arkadaki d2/d3 hayalet
   katmanlarından UZUN çıkıyor; hayaletler asla peek etmiyor. Bu yüzden burada arka katmanları
   TEKRAR kurmuyoruz — zaten görünmeyecek bir şeyi göstermek "varyant değişiyor" ölçütünü
   sağlamaz. Bunun yerine SwipeCard'ın KENDİ prop ekseni (`enter`) gösteriliyor. */
const DECK_WRAP = "relative h-[27.5rem] flex-none [&>*]:!absolute [&>*]:inset-x-0 [&>*]:mx-auto";
const D1 = "transform-[rotate(-1.6deg)] shadow-sh2";

/* ATLANAN: sürükleme jesti. Sıcak yolda SwipeCard React state TAŞIMIYOR — `onPointerMove`
   transform/damga opaklığını doğrudan DOM'a (`ref.current.style`) yazıyor; prop olarak
   maruz değil. Gerçek bir pointer sürükleme jestini headless'ta güvenle üretmenin tek yolu
   sentetik `PointerEvent` dispatch'i, ve `setPointerCapture` bunun için "aktif" sayılmayan
   bir `pointerId` üzerinde çağrılırsa (tarayıcıya göre) atabiliyor — riskli/kırılgan. Brifin
   izniyle jest atlandı; damga/offset durumları yakalanmadı.

   YAKALANAN: `enter` girişi — gerçek CSS animasyonu (`animate-rise`/`animate-fly-in-left`,
   yalnız bir `from` karesi tanımlıyor, DecisionBurst'teki animasyonların aksine SONU
   OPAKLIK 0'a düşmüyor). `ref` callback'i React commit anında, İLK BOYAMADAN ÖNCE çalışır;
   o anda `animationPlayState:paused` yazmak animasyonu KENDİ `from` karesinde (an 0) donduruyor
   — gerçek zamandan bağımsız, deterministik. */
function freezeEnter(el: HTMLDivElement | null) {
  const card = el?.querySelector<HTMLElement>('[class*="animate-"]');
  if (!card) return;
  // `fly-in-left`in TEK karesi (`from`) ekranın 70vw dışında ve opaklık 0 — an 0'da donmak
  // hem çerçeve dışı hem görünmez kalıyordu (ölçüldü). Negatif gecikmeyle geçişin %70'ine
  // atlıyoruz: kart hâlâ sola kaymış/dönük ama artık çerçeve içinde ve büyük ölçüde opak.
  // `rise`in `from` karesi zaten çerçeve içinde/görünür — onu an 0'da dondurmak yeterli.
  if (card.className.includes("fly-in")) card.style.animationDelay = "-0.24s";
  card.style.animationPlayState = "paused";
}

/** W3 · dinlenme hâli: giriş animasyonu bitmiş, SwipeCard yerinde duruyor — destede en sık
    görülen kare. */
export function Resting() {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col px-[1.125rem] pt-4">
      <div className="mx-auto w-full max-w-[26.25rem]">
        <div className={DECK_WRAP}>
          <SwipeCard onSwipe={() => {}} className="z-2">
            <VenueCard venue={KARAKOY} travel={TRAVEL} className={D1} />
          </SwipeCard>
        </div>
      </div>
    </div>
  );
}

/** W3 · `enter="rise"` — karar sonrası bir sonraki kart yığının altından yükselir (buton/
    klavye kararında da aynı yol). Dondurulmuş `from` karesi: hafif döndürülmüş + küçültülmüş
    + yarı saydam (`@keyframes rise`). */
export function EnterRise() {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col px-[1.125rem] pt-4">
      <div className="mx-auto w-full max-w-[26.25rem]">
        <div ref={freezeEnter} className={DECK_WRAP}>
          <SwipeCard onSwipe={() => {}} enter="rise" className="z-2">
            <VenueCard venue={KARAKOY} travel={TRAVEL} className={D1} />
          </SwipeCard>
        </div>
      </div>
    </div>
  );
}

/** W3 · `enter="left"` — geri al: kart, GEÇ ile çıktığı soldan sahneye geri döner.
    Dondurulmuş `from` karesi: ekran dışı sola kaymış, -18° dönük, saydam
    (`@keyframes fly-in-left`). */
export function EnterFromLeft() {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col px-[1.125rem] pt-4">
      <div className="mx-auto w-full max-w-[26.25rem]">
        <div ref={freezeEnter} className={DECK_WRAP}>
          <SwipeCard onSwipe={() => {}} enter="left" className="z-2">
            <VenueCard venue={KARAKOY} travel={TRAVEL} className={D1} />
          </SwipeCard>
        </div>
      </div>
    </div>
  );
}
