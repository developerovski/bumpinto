import type { VenueDto } from "@bumpinto/shared";
import { PHOTO_CLASSES, monogram } from "./VenueCard";

/** Mekan görseli — satır (64px) ve pop kart (52px) için ortak küçük resim/gradyan. */
export default function VenueThumb(props: { venue: VenueDto; tint: number; size: number }) {
  const v = props.venue;
  const hasPhoto = v.photoUrl != null && v.photoUrl !== "";
  const photoClass = PHOTO_CLASSES[(props.tint + (v.deckOrder ?? 0)) % PHOTO_CLASSES.length];
  return (
    <div
      className={`flex-none overflow-hidden rounded-xl ${hasPhoto ? "" : photoClass}`}
      style={{ width: props.size, height: props.size }}
    >
      {hasPhoto ? (
        <img src={v.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-head font-extrabold text-[rgba(255,255,255,0.5)]"
          style={{ fontSize: props.size / 3 }}
          aria-hidden
        >
          {monogram(v.name)}
        </span>
      )}
    </div>
  );
}
