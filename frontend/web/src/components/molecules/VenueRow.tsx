import { forwardRef, type KeyboardEvent } from "react";
import type { VenueDto } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Overline } from "../atoms";
import VenueMeta from "./VenueMeta";
import VenueThumb from "./VenueThumb";

/** Mekan satırı (artboard `.vrow`) — liste görünümünün her satırı. Grup modunda satır
    aksiyonu yok (karar dokümanı §5.B.1); SOLO'da seçim satırın altına `SelectionCard`
    ile eklenir (bkz. `VenueBrowser`), satırın kendisinde buton yok.
    `ref` — `VenueBrowser`, SOLO onay kartı "Vazgeç" ile kapanınca odağı satıra geri
    verebilsin diye ileri iletir (kod-review bulgusu). */
const VenueRow = forwardRef<
  HTMLDivElement,
  {
    venue: VenueDto;
    selected: boolean;
    tint: number;
    travel: TravelInfo;
    /** SessionView.midpointLabel — semt bununla AYNIYSA meta satırında tekrar edilmez (§4.9). */
    midpointLabel?: string;
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
        "flex items-center gap-3 rounded-[1.125rem] border-[1.5px] p-2.5",
        props.selected ? "border-flame-deep bg-white shadow-sh2" : "border-transparent",
      ].join(" ")}
    >
      <VenueThumb venue={v} tint={props.tint} size={64} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {v.category && <Overline>{v.category}</Overline>}
        <h3 className="font-head text-[1.0625rem] font-bold">{v.name}</h3>
        <VenueMeta venue={v} travel={props.travel} midpointLabel={props.midpointLabel} />
      </div>
    </div>
  );
});

export default VenueRow;
