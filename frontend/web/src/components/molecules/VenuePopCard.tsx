import type { ReactNode } from "react";
import type { VenueDto } from "@bumpinto/shared";
import VenueMeta from "./VenueMeta";
import VenueThumb from "./VenueThumb";

/** Haritadaki seçili mekan kartı (artboard `.popcard`). */
export default function VenuePopCard(props: {
  venue: VenueDto;
  tint: number;
  travelLabels: Record<string, string>;
  action?: ReactNode;
}) {
  const v = props.venue;

  return (
    <div className="absolute left-4 top-4 z-[5] flex w-[15.625rem] flex-col gap-2 rounded-2xl border border-line bg-white p-2.5 shadow-sh2">
      <div className="flex items-center gap-3">
        <VenueThumb venue={v} tint={props.tint} size={52} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="font-head text-[0.9375rem] font-bold">{v.name}</h3>
          <VenueMeta venue={v} travelLabels={props.travelLabels} />
        </div>
      </div>
      {props.action}
    </div>
  );
}
