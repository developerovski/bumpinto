export default function Progress(props: { value: number }) {
  return (
    <div className="a-progress" aria-hidden>
      <i style={{ width: `${Math.min(100, props.value * 100)}%` }} />
    </div>
  );
}
