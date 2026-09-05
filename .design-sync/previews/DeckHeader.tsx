import { DeckHeader, HeaderButton } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk. */
const FRAME = "mx-auto w-full max-w-[30rem] px-[1.125rem]";

/** W3 · destenin başı — oturum adı, "N / M kart · semt" meta satırı, ilerleme
    şeridi ve "Hepsini gör" kısayolu. `progress` 0–1 arası orandır, sayaç değil. */
export function FirstCard() {
  return (
    <div className={FRAME}>
      <DeckHeader
        title="Kahve turu"
        meta="1 / 12 kart · Kadıköy civarı"
        progress={1 / 12}
        onSeeAll={() => {}}
      />
    </div>
  );
}

/** Destenin ortası + `likesMeta` — beğeni sayacı YALNIZ 390'da meta'ya eklenir
    (`lg:hidden`); geniş kartta zaten sağ kolonda "Beğendiklerin" var. */
export function WithLikes() {
  return (
    <div className={FRAME}>
      <DeckHeader
        title="Kahve turu"
        meta="7 / 12 kart · Kadıköy civarı"
        likesMeta="3 beğeni"
        progress={7 / 12}
        onSeeAll={() => {}}
      />
    </div>
  );
}

/** Son kart — şerit dolu. */
export function LastCard() {
  return (
    <div className={FRAME}>
      <DeckHeader
        title="Kahve turu"
        meta="12 / 12 kart · Kadıköy civarı"
        progress={1}
        onSeeAll={() => {}}
      />
    </div>
  );
}

/** `onSeeAll` yoksa aksiyon hiç render edilmez — başlık satırı tek sütuna düşer. */
export function NoAction() {
  return (
    <div className={FRAME}>
      <DeckHeader title="Akşam yemeği" meta="2 / 8 kart · Karaköy civarı" progress={2 / 8} />
    </div>
  );
}

/** `HeaderButton` — artboard .bsm küçük beyaz buton; DeckHeader'ın aksiyonu ve
    liste modunun "Desteye dön" kısayolu aynı bileşeni paylaşır. */
export function ActionButton() {
  return (
    <div className={FRAME}>
      <HeaderButton onClick={() => {}}>Desteye dön</HeaderButton>
    </div>
  );
}
