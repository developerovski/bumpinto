/* Kaynak: DeckScreen W3 başlık satırı (.row + .a-mi.tab + artboard .bsm) */
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, Progress } from "../atoms";
import SessionHeader from "./SessionHeader";

/** Artboard .bsm — küçük beyaz buton; `Button` atomunun `size="sm"` varyantı.
    DeckScreen liste modunun "Desteye dön" aksiyonu da bu bileşeni paylaşır. */
export function HeaderButton(props: { onClick: () => void; children: ReactNode }) {
  return (
    <Button type="button" kind="white" size="sm" onClick={props.onClick}>
      {props.children}
    </Button>
  );
}

/** Artboard W3 · başlık + meta satırı + ilerleme çubuğu + "Hepsini gör".
    1280'de meta yalnız kart sayısı/orta nokta metnidir (artboard "4 / 12 kart · Eindhoven civarı");
    beğeni sayacı yalnız 390'da görünür (§4.8 — 1280'de zaten sağ kolonda "Beğendiklerin" var). */
export default function DeckHeader(props: {
  title: string;
  meta: string;
  /** Yalnız 390'da meta'ya eklenen "N beğeni" — plan16 T3 coordinator düzeltmesi. */
  likesMeta?: string;
  progress: number;
  onSeeAll?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-3 flex flex-none flex-col gap-3">
      <SessionHeader
        title={props.title}
        meta={
          <>
            {props.meta}
            {props.likesMeta && <span className="lg:hidden"> · {props.likesMeta}</span>}
          </>
        }
        action={
          props.onSeeAll && <HeaderButton onClick={props.onSeeAll}>{t("deck.seeAll")}</HeaderButton>
        }
      />
      <Progress value={props.progress} />
    </div>
  );
}
