const PALETTE = [
  "linear-gradient(135deg,#fd3e6b,#d91e52)",
  "linear-gradient(135deg,#18b26b,#0b7a44)",
  "linear-gradient(135deg,#7c4dff,#5a2fd0)",
  "linear-gradient(135deg,#ffb020,#e08900)",
];

export default function Avatar(props: {
  name: string;
  index?: number;
  ring?: boolean;
  /** Artboard .av-wt — konumu henüz gelmemiş katılımcı. */
  waiting?: boolean;
}) {
  const avatar = props.waiting ? (
    <span className="a-avatar a-avatar--waiting" aria-hidden>
      {props.name[0]?.toUpperCase()}
    </span>
  ) : (
    <span
      className="a-avatar"
      style={{ background: PALETTE[(props.index ?? 0) % PALETTE.length] }}
      aria-hidden
    >
      {props.name[0]?.toUpperCase()}
    </span>
  );
  // Artboard .ring — hikaye halkası sarmalayıcısı.
  return props.ring ? <span className="a-avatar-ring">{avatar}</span> : avatar;
}
