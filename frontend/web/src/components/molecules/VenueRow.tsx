import type { KeyboardEvent, ReactNode } from "react";
import type { VenueDto } from "@bumpinto/shared";
import VenueMeta from "./VenueMeta";
import VenueThumb from "./VenueThumb";

/** Mekan satırı (artboard `.vrow`) — liste görünümünün her satırı. */
export default function VenueRow(props: {
  venue: VenueDto;
  selected: boolean;
  tint: number;
  travelLabels: Record<string, string>;
  onHover: () => void;
  onSelect: () => void;
  action?: ReactNode;
}) {
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
      role="button"
      tabIndex={0}
      aria-pressed={props.selected}
      onMouseEnter={props.onHover}
      onFocus={props.onHover}
      onClick={props.onSelect}
      onKeyDown={onKeyDown}
      className={[
        "flex items-center gap-3 rounded-[1.125rem] border-[1.5px] p-2.5",
        props.selected ? "border-flame-deep bg-white shadow-sh2" : "border-transparent",
      ].join(" ")}
    >
      <VenueThumb venue={v} tint={props.tint} size={64} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="font-head text-[1.0625rem] font-bold">{v.name}</h3>
        <VenueMeta venue={v} travelLabels={props.travelLabels} />
      </div>
      {props.action && <div onClick={(e) => e.stopPropagation()}>{props.action}</div>}
    </div>
  );
}
