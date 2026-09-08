import { useState } from "react";
import type { VenueDto } from "@bumpinto/shared";
import { monogram } from "../../lib/monogram";
import { PHOTO_CLASSES } from "./photoStyles";

/** Mekan görseli — satırda kare küçük resim (`size` ya da `sizeClass`), harita pop kartında tam
    genişlik afiş (`className`). İkisi de fotoğraf yoksa gradyan + monograma düşer. */
export default function VenueThumb(props: {
  venue: VenueDto;
  tint: number;
  /** Kare kullanım: px cinsinden kenar. `className` ya da `sizeClass` verilirse yok sayılır. */
  size?: number;
  /** Kırılma noktasına göre değişen kare kenar (ör. `.vrow` 390'da 48px, 1280'de 58px) — satır içi
      `style` genişliği medya sorgusu tanımadığı için sınıfla verilir. */
  sizeClass?: string;
  /** Afiş kullanımı: boyutu/köşeleri çağıran belirler (ör. `h-[8.5rem] w-full rounded-none`). */
  className?: string;
  /** Monogram punto — afişte kare oranından türetilemez. */
  monogramSize?: number;
  /** Monogram puntosu da kırılma noktasına göre değişiyorsa (bkz. `sizeClass`). */
  monogramClass?: string;
  /** Köşe yarıçapı sınıfı — artboard W1 geçmiş satırı 14px, deste/liste 12px (varsayılan). */
  radiusClass?: string;
}) {
  const v = props.venue;
  // Ölü bağlantıda monograma dön — bkz. VenueCard'daki aynı gerekçe.
  const [broken, setBroken] = useState(false);
  const showPhoto = v.photoUrl != null && v.photoUrl !== "" && !broken;
  const photoClass = PHOTO_CLASSES[(props.tint + (v.deckOrder ?? 0)) % PHOTO_CLASSES.length];
  const square = `flex-none overflow-hidden ${props.sizeClass ?? ""} ${props.radiusClass ?? "rounded-xl"} ${photoClass}`;
  return (
    <div
      className={props.className ? `overflow-hidden ${props.className} ${photoClass}` : square}
      // `sizeClass` varken satır içi ölçü BASILMAZ: ikisi birden verilirse `style` sınıfı ezer.
      style={props.className || props.sizeClass ? undefined : { width: props.size, height: props.size }}
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
          className={`flex h-full w-full items-center justify-center font-head font-extrabold text-[rgba(255,255,255,0.5)] ${
            props.monogramClass ?? ""
          }`}
          style={props.monogramClass ? undefined : { fontSize: props.monogramSize ?? (props.size ?? 48) / 3 }}
          aria-hidden
        >
          {monogram(v.name)}
        </span>
      )}
    </div>
  );
}
