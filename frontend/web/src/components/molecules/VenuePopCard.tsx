import type { ReactNode } from "react";
import type { VenueDto } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import VenueMeta from "./VenueMeta";
import VenueThumb from "./VenueThumb";

/** Haritadaki seçili mekan kartı (artboard `.popcard`). */
export default function VenuePopCard(props: {
  venue: VenueDto;
  tint: number;
  travel: TravelInfo;
  action?: ReactNode;
  /** SessionView.midpointLabel — semt bununla AYNIYSA meta satırında tekrar edilmez (§4.9). */
  midpointLabel?: string;
}) {
  const v = props.venue;

  return (
    <div className="absolute left-4 top-4 z-[5] flex w-[15.625rem] flex-col gap-2 rounded-2xl border border-line bg-white p-2.5 shadow-sh2">
      <div className="flex items-center gap-3">
        <VenueThumb venue={v} tint={props.tint} size={52} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="font-head text-[0.9375rem] font-bold">{v.name}</h3>
          <VenueMeta venue={v} travel={props.travel} midpointLabel={props.midpointLabel} />
        </div>
      </div>
      {props.action}
    </div>
  );
}
