/* Kaynak: ui.css .a-progress (+ > i) / DS v2 */
export default function Progress(props: { value: number }) {
  return (
    <div className="h-[0.4375rem] overflow-hidden rounded-sm bg-[#f0e9e0]" aria-hidden>
      <i
        className="block h-full rounded-sm bg-[image:var(--grad)]"
        style={{ width: `${Math.min(100, props.value * 100)}%` }}
      />
    </div>
  );
}
