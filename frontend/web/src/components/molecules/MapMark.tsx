/* Kaynak: app.css .c-mark* (ui.css .a-mark*) */
/** Artboard W2 · .mark — kesikli halka + iki nokta + gradyan iğne. Salt dekoratif.
    `muted` — artboard W10 hata ekranları: gri iğne, gölgesiz (.mk-pin ink3 override). */
export default function MapMark(props: { muted?: boolean }) {
  return (
    <div className="c-mark" aria-hidden>
      <i className="c-mark-ring" />
      <i className="c-mark-dot c-mark-dot--a" />
      <i className="c-mark-dot c-mark-dot--b" />
      <i className={props.muted ? "c-mark-pin c-mark-pin--muted" : "c-mark-pin"} />
    </div>
  );
}
