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

/** Katılımcı pini: büyük, kalın beyaz halkalı, gölgeli avatar + adlı etiket + kuyruk.
    Elle konum (manual) kesikli halka. Mekan pinlerinden belirgin biçimde daha büyük ve daha
    üstte (UI review 2026-09-03: küçük daireler haritada kayboluyordu). */
export function participantPin(p: ParticipantDto, index: number, label?: string) {
  // Cevrimdisi katilimci SOLUK cizilir: konumu hala gecerlidir (satir silinmez), yalnizca kisi
  // su an odada degildir. Ayri ikon ya da damga YOK — urunun dil kurallari suclayici isaret
  // istemiyor. ParticipantRow ile AYNI kosul.
  const away = p.online === false && !p.manual;
  const wrap = el("flex flex-col items-center" + (away ? " opacity-50" : ""));
  const ring = el(
    "rounded-full p-[3px] shadow-[0_6px_18px_rgba(39,32,59,0.35)] " +
    (p.manual ? "border-2 border-dashed border-ink2 bg-white" : "bg-white"),
  );
  const av = el(
    "flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-full font-head text-[1.0625rem] font-extrabold " +
    (p.manual ? "border-2 border-line-in bg-sand text-ink" : "border-[3px] border-white text-white"),
    (p.displayName || "?")[0]?.toUpperCase(),
  );
  if (!p.manual) av.style.background = PALETTE[index % PALETTE.length];
  ring.appendChild(av);
  wrap.appendChild(ring);
  wrap.appendChild(el("h-2.5 w-[3px] rounded-sm bg-ink"));
  const text = label ?? p.displayName ?? "";
  if (text) {
    wrap.appendChild(
      el(
        "mt-0.5 max-w-[10rem] truncate rounded-full border border-line bg-white px-2 py-0.5 text-[0.75rem] font-bold text-ink shadow-sh1",
        text,
      ),
    );
  }
  return wrap;
}

/** Mekan pini: rozet (puan ya da verilen metin) + tint swatch; seçili = alev dolgu + büyük.
    Tıklanabilir (MapView marker click listener) — imleç burada elle işaretlenir, `el()`
    yalnız className/text alır ve bu düğümler Tailwind `cursor-pointer` taramasının dışında
    kalan yalıtılmış DOM elemanlarıdır (AdvancedMarkerElement içeriği). */
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
  wrap.style.cursor = "pointer";
  wrap.appendChild(badge);
  wrap.appendChild(tail);
  return wrap;
}
