import { DeckActions } from "@bumpinto/web";

/** W3 · destenin aksiyon satırı: geri al · geç · beğen. Metin taşımaz —
    aria etiketleri i18n'den (`deck.aria*`), ikonlar DS'in `c-ico-*` glifleri. */
export function ActionRow() {
  return <DeckActions onUndo={() => {}} onPass={() => {}} onLike={() => {}} />;
}
