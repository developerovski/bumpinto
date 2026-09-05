import { DecisionBurst, VenueCard } from "@bumpinto/web";
import { KARAKOY, MODA, TRAVEL } from "./_fixtures";

// VenueDeck.tsx'in kendi literal'leri (deste yuvası + ön kart eğimi) — yeni arbitrary değer yok.
const DECK_WRAP = "relative h-[27.5rem] flex-none [&>*]:!absolute [&>*]:inset-x-0 [&>*]:mx-auto";
const D1 = "transform-[rotate(-1.6deg)] shadow-sh2";

/* Patlama tek seferlik CSS animasyonu: `--animate-confetti`/`--animate-poof`/`--animate-pop`
   hepsi `forwards` ve KEYFRAME SONU opaklık 0 (app.css). Yani doğal bitişte YAKALANIRSA
   sahne TAMAMEN BOŞ kalır — Confetti'yi vuran "birkaç zerre" tuzağının bir adım ötesi.
   Çözüm: mount anında her animasyonlu düğümü NEGATİF `animation-delay` ile "patlamanın
   ortası"na sarıp DURDURUYORUZ — bu, gerçek zamandan bağımsız, tekrarlanabilir bir tepe kare
   verir (brief'in "dinlenme hâlini kur" talimatı burada "doğal bitiş" değil "temsili tepe
   kare" anlamına geliyor). `ref` callback commit anında senkron çalışır, ilk boyanmadan önce. */
function freezeBurst(el: HTMLDivElement | null) {
  el?.querySelectorAll<HTMLElement>('[class*="animate-"]').forEach((node) => {
    // `poof` yalnız iki kare taşıyor (from/to) ve opaklığı .85→0 DOĞRUSAL DEĞİL bir eğriyle
    // düşürüyor (cubic-bezier(.3,.6,.4,1) — erken hızlanıyor); -0.3s'de neredeyse görünmez
    // kalıyordu. Konfeti/rozet 65%'e kadar opaklık=1 platosunda kalıyor, -0.3s onları etkilemiyor.
    const isPoof = node.className.includes("animate-poof");
    node.style.animationDelay = isPoof ? "-0.12s" : "-0.3s";
    node.style.animationPlayState = "paused";
  });
}

/** W3 · beğeni: gradyan kalp rozeti + 14 renkli konfeti dışa saçılıyor — dondurulmuş tepe
    kare (ön kart Karaköy Lokantası). */
export function Like() {
  return (
    <div className="mx-auto w-full max-w-[26.25rem]">
      <div ref={freezeBurst} className={DECK_WRAP}>
        <VenueCard venue={KARAKOY} travel={TRAVEL} className={D1} />
        <DecisionBurst kind="like" onDone={() => {}} />
      </div>
    </div>
  );
}

/** W3 · geç: beyaz çarpı rozeti + gri toz aşağı dağılıyor — dondurulmuş tepe kare (ön kart
    Moda Sahil). */
export function Pass() {
  return (
    <div className="mx-auto w-full max-w-[26.25rem]">
      <div ref={freezeBurst} className={DECK_WRAP}>
        <VenueCard venue={MODA} travel={TRAVEL} className={D1} />
        <DecisionBurst kind="pass" onDone={() => {}} />
      </div>
    </div>
  );
}
