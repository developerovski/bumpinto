/* Kaynak: DS v2 §10 Harita dili — .pin-av / .pin-av.man / .mpin / .vpin(.on/.big) */
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";

const PALETTE = [
  "linear-gradient(135deg,#fd3e6b,#d91e52)", "linear-gradient(135deg,#18b26b,#0b7a44)",
  "linear-gradient(135deg,#7c4dff,#5a2fd0)", "linear-gradient(135deg,#ffb020,#e08900)",
];
const SWATCH = ["bg-[#f9c08a]", "bg-[#8fddbb]", "bg-[#c1a8f5]", "bg-[#ffe08a]"];

function el(className: string, text?: string) {
  const d = document.createElement("div");
  d.className = className;
  if (text != null) d.textContent = text;
  return d;
}

/** Katılımcı pini: story-ring avatar; elle konum (manual) kesikli. Kuyruk 2×8px. */
export function participantPin(p: ParticipantDto, index: number, label?: string) {
  const wrap = el("flex flex-col items-center");
  const ring = el(p.manual ? "" : "rounded-full bg-[image:var(--story-ring)] p-0.5");
  const av = el(
    "flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-full border-2 font-head text-[0.75rem] font-bold shadow-[0_2px_6px_rgba(39,32,59,0.2)] " +
    (p.manual ? "border-dashed border-line-in bg-white text-ink2" : "border-white text-white"),
    (p.displayName || "?")[0]?.toUpperCase(),
  );
  if (!p.manual) av.style.background = PALETTE[index % PALETTE.length];
  ring.appendChild(av);
  wrap.appendChild(ring);
  wrap.appendChild(el("h-2 w-0.5 rounded-sm bg-ink2"));
  if (label) wrap.appendChild(el("mt-0.5 rounded-full bg-[rgba(255,255,255,0.9)] px-1.5 text-[0.625rem] font-bold text-ink", label));
  return wrap;
}

/** Orta nokta: alev iğne. */
export function midpointPin() {
  const wrap = el("flex flex-col items-center pb-2");
  wrap.appendChild(el("h-[1.6875rem] w-[1.6875rem] rotate-45 rounded-[50%_50%_50%_0.1875rem] bg-[image:var(--grad)] shadow-[0_4px_14px_rgba(222,36,86,0.4),0_0_0_2.5px_#fff]"));
  return wrap;
}

/** Mekan pini: rozet (puan ya da verilen metin) + tint swatch; seçili = alev dolgu + büyük. */
export function venuePin(v: VenueDto, tint: number, selected: boolean, text?: string) {
  const badge = el(
    "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2 py-0.5 font-head font-extrabold shadow-sh1 " +
    (selected
      ? "h-[1.875rem] border-flame-deep bg-flame-deep text-[0.8125rem] text-white shadow-[0_8px_20px_rgba(222,36,86,0.35)]"
      : "h-[1.625rem] border-line2 bg-white text-[0.75rem] text-ink"),
  );
  badge.appendChild(el("h-[1.125rem] w-[1.125rem] rounded-md " + SWATCH[tint % SWATCH.length]));
  badge.appendChild(el("", text != null ? text.slice(0, 24) : v.rating != null ? v.rating.toFixed(1) : (v.name ?? "").slice(0, 12)));
  const tail = el("mx-auto -mt-1 h-2 w-2 rotate-45 border-b-[1.5px] border-r-[1.5px] " +
    (selected ? "border-flame-deep bg-flame-deep" : "border-line2 bg-white"));
  const wrap = el("flex flex-col items-center");
  wrap.appendChild(badge);
  wrap.appendChild(tail);
  return wrap;
}
