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

/** md = varsayılan (artboard `.av` 40px); sm = üst çubuk avatarı (DS §06, 34px); xs = artboard `.av-s`
    (29px) — oturum kartı yığını ve roster satırları; `2xs` sonuç kartı kişi satırı (26px); xl = Profil kimlik kartı (80px). */
const sizes = {
  md: "h-10 w-10 text-[0.9375rem]",
  // 390 artboard (774) üst çubuk avatarını 32/12'ye küçültür; 1280 (686) 34/13.
  sm: "h-8 w-8 text-[0.75rem] lg:h-[2.125rem] lg:w-[2.125rem] lg:text-[0.8125rem]",
  xs: "h-[1.8125rem] w-[1.8125rem] text-[0.75rem]",
  "2xs": "h-[1.625rem] w-[1.625rem] text-[0.6875rem]",
  xl: "h-16 w-16 text-2xl lg:h-20 lg:w-20 lg:text-[1.875rem]",
};

/** Halka sarmalayıcı iç boşluğu — artboard xl'de 3.5px, diğerlerinde 2.5px. */
const ringPad = {
  md: "p-[0.15625rem]",
  sm: "p-[0.15625rem]",
  xs: "p-[0.125rem]",
  "2xs": "p-[0.125rem]",
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
