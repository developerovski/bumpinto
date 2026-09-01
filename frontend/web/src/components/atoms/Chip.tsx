export default function Chip(props: { label: string; on?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={props.on}
      onClick={props.onClick}
      className={`a-chip${props.on ? " a-chip--on" : ""}`}
    >
      {props.label}
    </button>
  );
}
