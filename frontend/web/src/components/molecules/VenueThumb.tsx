import { useState } from "react";
import type { VenueDto } from "@bumpinto/shared";
import { monogram } from "../../lib/monogram";
import { PHOTO_CLASSES } from "./photoStyles";

/** Mekan görseli — satırda kare küçük resim (`size`), harita pop kartında tam genişlik afiş
    (`className`). İkisi de fotoğraf yoksa gradyan + monograma düşer. */
export default function VenueThumb(props: {
  venue: VenueDto;
  tint: number;
  /** Kare kullanım: px cinsinden kenar. `className` verilirse yok sayılır. */
  size?: number;
  /** Afiş kullanımı: boyutu/köşeleri çağıran belirler (ör. `h-[8.5rem] w-full rounded-none`). */
  className?: string;
  /** Monogram punto — afişte kare oranından türetilemez. */
  monogramSize?: number;
}) {
  const v = props.venue;
  // Ölü bağlantıda monograma dön — bkz. VenueCard'daki aynı gerekçe.
  const [broken, setBroken] = useState(false);
  const showPhoto = v.photoUrl != null && v.photoUrl !== "" && !broken;
  const photoClass = PHOTO_CLASSES[(props.tint + (v.deckOrder ?? 0)) % PHOTO_CLASSES.length];
  return (
    <div
      className={
        props.className
          ? `overflow-hidden ${props.className} ${photoClass}`
          : `flex-none overflow-hidden rounded-xl ${photoClass}`
      }
      style={props.className ? undefined : { width: props.size, height: props.size }}
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
          style={{ fontSize: props.monogramSize ?? (props.size ?? 48) / 3 }}
          aria-hidden
        >
          {monogram(v.name)}
        </span>
      )}
    </div>
  );
}
