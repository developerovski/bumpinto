/* Kaynak: ui.css .a-avatar / .a-avatar-ring / .a-avatar--waiting / DS v2 */
const PALETTE = [
  "linear-gradient(135deg,#fd3e6b,#d91e52)",
  "linear-gradient(135deg,#18b26b,#0b7a44)",
  "linear-gradient(135deg,#7c4dff,#5a2fd0)",
  "linear-gradient(135deg,#ffb020,#e08900)",
];

const base =
  "flex flex-none items-center justify-center rounded-full " +
  "font-head font-bold";

/** md = varsayılan (44px); sm = üst çubuk avatarı (DS §06, 34px); xl = Profil kimlik kartı (80px). */
const sizes = {
  md: "h-11 w-11 text-base",
  sm: "h-[2.125rem] w-[2.125rem] text-[0.8125rem]",
  xl: "h-20 w-20 text-[1.875rem]",
};

/** Halka sarmalayıcı iç boşluğu — artboard xl'de 3.5px, diğerlerinde 2.5px. */
const ringPad = {
  md: "p-[0.15625rem]",
  sm: "p-[0.15625rem]",
  xl: "p-[0.21875rem]",
};

export default function Avatar(props: {
  name: string;
  index?: number;
  ring?: boolean;
  size?: keyof typeof sizes;
  /** Artboard .av-wt — konumu henüz gelmemiş katılımcı. */
  waiting?: boolean;
}) {
  const size = props.size ?? "md";
  /* Halka içindeki avatar 2px beyaz kenar alır — eski `.a-avatar-ring > .a-avatar`
     kuralı `.a-avatar--waiting` kesikli kenarını özgüllükle eziyordu. */
  const edge = props.ring
    ? "border-2 border-white"
    : props.waiting
      ? "border-[1.5px] border-dashed border-line-in"
      : "";
  const skin = props.waiting ? "bg-sand text-ink3" : "text-white";
  const className = [base, sizes[size], edge, skin].join(" ").trim();

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
    <span className={`inline-flex flex-none rounded-full bg-[image:var(--story-ring)] ${ringPad[size]}`}>
      {avatar}
    </span>
  ) : (
    avatar
  );
}
