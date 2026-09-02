import { useState } from "react";
import type { VenueDto } from "@bumpinto/shared";
import { PHOTO_CLASSES, monogram } from "./VenueCard";

/** Mekan görseli — satır (64px) ve pop kart (52px) için ortak küçük resim/gradyan. */
export default function VenueThumb(props: { venue: VenueDto; tint: number; size: number }) {
  const v = props.venue;
  // Ölü bağlantıda monograma dön — bkz. VenueCard'daki aynı gerekçe.
  const [broken, setBroken] = useState(false);
  const showPhoto = v.photoUrl != null && v.photoUrl !== "" && !broken;
  const photoClass = PHOTO_CLASSES[(props.tint + (v.deckOrder ?? 0)) % PHOTO_CLASSES.length];
  return (
    <div
      className={`flex-none overflow-hidden rounded-xl ${photoClass}`}
      style={{ width: props.size, height: props.size }}
    >
      {showPhoto ? (
        <img
          src={v.photoUrl}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover pointer-events-none select-none"
          draggable={false}
        />
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
