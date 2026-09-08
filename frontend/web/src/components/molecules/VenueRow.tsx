import { forwardRef, type KeyboardEvent, type MouseEvent } from "react";
import type { VenueDto } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Button } from "../atoms";
import ActivityBadge from "./ActivityBadge";
import FitLine from "./FitLine";
import VenueMeta from "./VenueMeta";
import VenueThumb from "./VenueThumb";

/** Mekan satırı (artboard `.vrow`) — liste görünümünün her satırı. Grup modunda satır
    aksiyonu yok (karar dokümanı §5.B.1); SOLO'da artboard W3c her satıra bir "Bunu seç"
    düğmesi koyar (`selectLabel`) ve onay `SelectionCard` ile satırın altında sürer.
    `ref` — `VenueBrowser`, SOLO onay kartı "Vazgeç" ile kapanınca odağı satıra geri
    verebilsin diye ileri iletir (kod-review bulgusu). */
const VenueRow = forwardRef<
  HTMLDivElement,
  {
    venue: VenueDto;
    selected: boolean;
    tint: number;
    /** Karışık deste (>1 ilgi alanı): satır kendi alanının rozetini de basar. */
    mixedDeck?: boolean;
    /** Listedeki TÜM kategoriler — `FitLine`'ın ≥2 farklı değer denetimine geçer (§4.6). */
    categories?: string[];
    travel: TravelInfo;
    /** SessionView.midpointLabel — semt bununla AYNIYSA meta satırında tekrar edilmez (§4.9). */
    midpointLabel?: string;
    /** SOLO: satır sonundaki "Bunu seç" düğmesinin metni. Verilmezse düğme HİÇ basılmaz
        (grup modu — karar deste + runoff'tan çıkar). */
    selectLabel?: string;
    /** Yalnız fare/klavye ODAKLANMASI (hover/focus) — haritadaki pin/pop kartı vurgular,
        SOLO onay kartını AÇMAZ (kod-review bulgusu: hover'da da açılıyordu). */
    onHover: () => void;
    /** Hover/odak bitince odağı bırakır — harita seçimi hover ile sınırlı kalır. */
    onLeave?: () => void;
    /** Gerçek seçim — tık ya da Enter/Space. SOLO onay kartını bu açar. */
    onSelect: () => void;
  }
>(function VenueRow(props, ref) {
  const v = props.venue;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      props.onSelect();
    }
  };

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-pressed={props.selected}
      onMouseEnter={props.onHover}
      onMouseLeave={props.onLeave}
      onFocus={props.onHover}
      onBlur={props.onLeave}
      onClick={props.onSelect}
      onKeyDown={onKeyDown}
      className={[
        // 390 (`.vrow` ezmesi): 8px dolgu, 9px boşluk, 16px köşe, üstten hizalı.
        // 1280 (`.vrow` tabanı): 10px dolgu, 12px boşluk, 18px köşe, ortalı — ama SOLO
        // artboard'ı (W3c) 1280'de de üstten hizalı, çünkü satır sonunda düğme var.
        "flex items-start gap-[0.5625rem] rounded-2xl border-[1.5px] p-2",
        "lg:gap-3 lg:rounded-[1.125rem] lg:p-2.5",
        props.selectLabel ? "" : "lg:items-center",
        props.selected ? "border-flame-deep bg-white shadow-sh2" : "border-transparent",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <VenueThumb
        venue={v}
        tint={props.tint}
        sizeClass="h-12 w-12 lg:h-[3.625rem] lg:w-[3.625rem]"
        radiusClass="rounded-xl lg:rounded-[0.875rem]"
        monogramClass="text-[0.875rem] lg:text-base"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[0.1875rem]">
        {/* Kategori üstlüğü YOK (artboard W3b/W3c): alan adı `.f-fit` cümlesinde geçiyor,
            üstlük olarak ikinci kez basılması aynı bilgiyi iki tipografik kayıtta tekrarlardı. */}
        <h3 className="font-head text-[0.90625rem] font-bold lg:text-h3">{v.name}</h3>
        {props.mixedDeck && v.activityType && (
          <div className="flex">
            <ActivityBadge activity={v.activityType} />
          </div>
        )}
        {/* `.f-fit` — artboard'ın satır başına EN ÇOK tekrarlanan öğesi (§4.6). */}
        <FitLine venue={v} categories={props.categories} />
        <VenueMeta venue={v} travel={props.travel} midpointLabel={props.midpointLabel} />
      </div>
      {props.selectLabel && (
        // `Button` `className`i yok sayar (hesaplanan zincir ezer) — hizalama sarmalayıcıda.
        <div className="flex-none self-center">
          <Button
            type="button"
            size="sm"
            kind={props.selected ? "flame" : "white"}
            // Satırın kendisi de `onSelect` çağırır; kabarma engellenmezse aynı seçim iki kez
            // işlenirdi (idempotent olsa da ikinci `pick` gereksiz render doğurur).
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              props.onSelect();
            }}
          >
            {props.selectLabel}
          </Button>
        </div>
      )}
    </div>
  );
});

export default VenueRow;
