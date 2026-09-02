/* Kaynak: ui.css .a-pick-btn / .a-mi / .row (artboard 07 Runoff) */
import type { VenueDto } from "@bumpinto/shared";
import VenueCard from "../molecules/VenueCard";

// .a-pick-btn — `all: unset` reset'i; görsel biçim tamamen kartta, odak halkası .a-btn ile aynı.
const PICK_BTN =
  "m-0 block cursor-pointer appearance-none rounded-card border-0 bg-transparent p-0 text-left " +
  "focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px] " +
  "disabled:cursor-default";

/** Artboard 07 Runoff — finalist kartları, yalnız seçim. HTTP/CTA/not RunoffStatus'ta;
    bu bileşen kilitlenmiş olsa bile (disabled) kartların kendisini gösterir. */
export default function RunoffList(props: {
  finalists: VenueDto[];
  choice: string | null;
  onChoose: (id: string) => void;
  disabled: boolean;
  travelLabels?: Record<string, string>;
}) {
  return (
    <>
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
        {props.finalists.map((v) => (
          <button
            key={v.id}
            type="button"
            className={PICK_BTN}
            aria-pressed={props.choice === v.id}
            disabled={props.disabled}
            onClick={() => props.onChoose(v.id!)}
          >
            <VenueCard
              venue={v}
              variant="polaroid"
              photoHeight={150}
              selected={props.choice === v.id}
              travelLabels={props.travelLabels}
            />
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:hidden">
        {props.finalists.map((v) => (
          <button
            key={v.id}
            type="button"
            className={PICK_BTN}
            aria-pressed={props.choice === v.id}
            disabled={props.disabled}
            onClick={() => props.onChoose(v.id!)}
          >
            <VenueCard
              venue={v}
              variant="row"
              selected={props.choice === v.id}
              travelLabels={props.travelLabels}
            />
          </button>
        ))}
      </div>
    </>
  );
}
