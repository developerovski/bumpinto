/* Kaynak: DeckScreen liste modu satırı (.row + inline kutu ölçüleri) */
import type { VenueDto } from "@bumpinto/shared";
import VenueCard from "./VenueCard";

/** Liste modu satırı — işaret kutusu + mekan kartı (artboard karşılığı yok, spec §4). */
export default function VenueCheckRow(props: {
  venue: VenueDto;
  checked: boolean;
  onChange: (checked: boolean) => void;
  travelLabels?: Record<string, string>;
}) {
  return (
    <label className="flex items-stretch gap-2.5">
      <input
        type="checkbox"
        className="w-[1.375rem] accent-flame-deep"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <div className="flex-1">
        <VenueCard venue={props.venue} photoHeight={120} travelLabels={props.travelLabels} />
      </div>
    </label>
  );
}
