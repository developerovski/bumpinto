/* Kaynak: DeckScreen liste modu satırı (.row + inline kutu ölçüleri) */
import type { VenueDto } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import VenueCard from "./VenueCard";

/** Liste modu satırı — işaret kutusu + mekan kartı (artboard karşılığı yok, spec §4).
    `attribution={false}` — artboard "Liste modu 390" satır başına atıf GÖSTERMEZ (12 satır ×
    2 satır olurdu); tek birleşik atıf listenin altında (bkz. `DeckScreen`, reviewer bulgusu). */
export default function VenueCheckRow(props: {
  venue: VenueDto;
  checked: boolean;
  onChange: (checked: boolean) => void;
  travel?: TravelInfo;
  /** Oturum >1 ilgi alanı taşıyorsa satır kartı kendi rozetini basar. */
  mixedDeck?: boolean;
  categories?: string[];
  midpointLabel?: string;
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
        <VenueCard
          venue={props.venue}
          photoHeight={120}
          travel={props.travel}
          mixedDeck={props.mixedDeck}
          categories={props.categories}
          midpointLabel={props.midpointLabel}
          attribution={false}
        />
      </div>
    </label>
  );
}
