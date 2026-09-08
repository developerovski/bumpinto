/* Kaynak: DeckScreen W3 başlık satırı (.row + .a-mi.tab + artboard .bsm) */
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, Progress } from "../atoms";
import SessionHeader from "./SessionHeader";

/** Artboard .bsm — küçük beyaz buton; `Button` atomunun `size="sm"` varyantı (42px / 14px).
    DeckScreen liste modunun "Desteye dön" aksiyonu da bu bileşeni paylaşır.
    390'da artboard `.bsm`i satır içinde 34px / 13px'e indiriyor (2103, 2287): başlığın yanında
    tam boy pill oturum adını sıkıştırıyordu. `max-lg:` ezmesi Button'un `className` ekiyle
    verilir — atomun kendi ölçüsü DEĞİŞMEZ (başka ekranlarda 42px doğru). */
export function HeaderButton(props: { onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      kind="white"
      size="sm"
      className="max-lg:min-h-[2.125rem] max-lg:text-[0.8125rem]"
      onClick={props.onClick}
    >
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
  /** ≥1024 kısa ses denetimi — "Tümünü gör" ile aynı aksiyon satırında (kullanıcı kararı
      2026-09-08: ses denetimi her oturum ekranının başlık satırında yaşar). */
  voice?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    // Artboard 2098/2105 (390): başlık satırı 10px, ilerleme çubuğu 12px alt boşluk taşır;
    // 1280'de ikisi de `.wrap` gap'i olan 16px (1989).
    <div className="mb-3 flex flex-none flex-col gap-[0.625rem] lg:mb-4 lg:gap-4">
      <SessionHeader
        titleSize="sm"
        title={props.title}
        meta={
          <>
            {props.meta}
            {props.likesMeta && <span className="lg:hidden"> · {props.likesMeta}</span>}
          </>
        }
        action={
          (props.voice || props.onSeeAll) && (
            <div className="flex items-center gap-2">
              {props.voice}
              {props.onSeeAll && <HeaderButton onClick={props.onSeeAll}>{t("deck.seeAll")}</HeaderButton>}
            </div>
          )
        }
      />
      <Progress value={props.progress} />
    </div>
  );
}
