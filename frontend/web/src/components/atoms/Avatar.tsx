/* Kaynak: ui.css .a-avatar / .a-avatar-ring / .a-avatar--waiting / DS v2 */
const PALETTE = [
  "linear-gradient(135deg,#fd3e6b,#d91e52)",
  "linear-gradient(135deg,#18b26b,#0b7a44)",
  "linear-gradient(135deg,#7c4dff,#5a2fd0)",
  "linear-gradient(135deg,#ffb020,#e08900)",
];

const base =
  "flex h-11 w-11 flex-none items-center justify-center rounded-full " +
  "font-head text-base font-bold";

export default function Avatar(props: {
  name: string;
  index?: number;
  ring?: boolean;
  /** Artboard .av-wt — konumu henüz gelmemiş katılımcı. */
  waiting?: boolean;
}) {
  /* Halka içindeki avatar 2px beyaz kenar alır — eski `.a-avatar-ring > .a-avatar`
     kuralı `.a-avatar--waiting` kesikli kenarını özgüllükle eziyordu. */
  const edge = props.ring
    ? "border-2 border-white"
    : props.waiting
      ? "border-[1.5px] border-dashed border-line-in"
      : "";
  const skin = props.waiting ? "bg-[#f4eee6] text-ink3" : "text-white";
  const className = [base, edge, skin].join(" ").trim();

  const avatar = props.waiting ? (
    <span className={className} aria-hidden>
      {props.name[0]?.toUpperCase()}
    </span>
  ) : (
    <span
      className={className}
      style={{ background: PALETTE[(props.index ?? 0) % PALETTE.length] }}
      aria-hidden
    >
      {props.name[0]?.toUpperCase()}
    </span>
  );
  // Artboard .ring — hikaye halkası sarmalayıcısı.
  return props.ring ? (
    <span className="inline-flex flex-none rounded-full bg-[image:var(--story-ring)] p-[0.15625rem]">
      {avatar}
    </span>
  ) : (
    avatar
  );
}
