/* Kaynak: app.css .c-mark* (ui.css .a-mark*) */
/** Artboard W2 · .mark — kesikli halka + iki nokta + gradyan iğne. Salt dekoratif. */
export default function MapMark() {
  return (
    <div className="c-mark" aria-hidden>
      <i className="c-mark-ring" />
      <i className="c-mark-dot c-mark-dot--a" />
      <i className="c-mark-dot c-mark-dot--b" />
      <i className="c-mark-pin" />
    </div>
  );
}
