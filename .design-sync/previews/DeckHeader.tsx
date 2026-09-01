import { DeckHeader } from "@bumpinto/web";

const FRAME = "mx-auto w-full max-w-[30rem] px-[1.125rem]";

/** W3 · destenin ilk kartı — marka, "1 / 12" sayacı ve "Hepsini gör" kısayolu.
    Metin taşımaz; sayaç i18n'deki `deck.counter` şablonundan kurulur. */
export function FirstCard() {
  return (
    <div className={FRAME}>
      <DeckHeader current={1} total={12} onSeeAll={() => {}} />
    </div>
  );
}

/** Destenin ortası — iki haneli sayaç, tabular-nums sayesinde zıplamaz. */
export function MidDeck() {
  return (
    <div className={FRAME}>
      <DeckHeader current={7} total={12} onSeeAll={() => {}} />
    </div>
  );
}

/** Son kart — sayacın iki tarafı da dolu, en geniş hâli. */
export function LastCard() {
  return (
    <div className={FRAME}>
      <DeckHeader current={12} total={12} onSeeAll={() => {}} />
    </div>
  );
}
