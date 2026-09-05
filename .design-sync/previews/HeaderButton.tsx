import { HeaderButton, SessionHeader } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk. */
const FRAME = { width: "27.75rem" } as const;

/** `DeckHeader`'ın kendi aksiyonu — deste başlığının sağındaki "Hepsini gör" kısayolu.
    `DeckHeader.tsx` kartında bu bileşenin YALNIZ o hücresi var; burada tek başına,
    gerçek boyutunda (artboard .bsm — küçük beyaz pill, 42px). */
export function SeeAll() {
  return (
    <div style={FRAME}>
      <HeaderButton onClick={() => {}}>Hepsini gör</HeaderButton>
    </div>
  );
}

/** İkinci gerçek kullanım — deste liste modu (`DeckScreen`): başlık "Hangisi olsun?"
    dalına geçtiğinde sağdaki aksiyon "Desteye dön" olur. `SessionHeader` içinde,
    gerçek başlık + meta satırıyla birlikte — `HeaderButton` her iki yerde de
    `Button` atomunun `kind="white" size="sm"` varyantı, metin dışında fark yok. */
export function BackToDeck() {
  return (
    <div style={FRAME}>
      <SessionHeader
        title="Hangisi olsun?"
        meta="12 mekan · 5 beğeni"
        action={<HeaderButton onClick={() => {}}>Desteye dön</HeaderButton>}
      />
    </div>
  );
}
