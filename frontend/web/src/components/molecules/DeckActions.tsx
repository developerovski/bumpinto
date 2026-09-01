import { Button } from "../atoms";

/** Artboard W3 · .act / .a-un / .a-yes — geri al · geç · beğen.
    İkonlar artboard'un CSS glifleri (.undo/.x1/.heart); aria-label metin karşılığı. */
export default function DeckActions(props: {
  onUndo: () => void;
  onPass: () => void;
  onLike: () => void;
}) {
  // Artboard W3: .row style="justify-content:center;gap:20px;margin-top:12px;flex:0 0 auto"
  return (
    <div
      className="row"
      style={{ justifyContent: "center", gap: 20, marginTop: 12, flex: "0 0 auto" }}
    >
      <Button
        type="button"
        kind="white"
        shape="round-sm"
        aria-label="Geri al"
        onClick={props.onUndo}
      >
        <span className="a-ico-undo" aria-hidden />
      </Button>
      <Button type="button" kind="white" shape="round" aria-label="Geç" onClick={props.onPass}>
        <span className="a-ico-x" aria-hidden />
      </Button>
      <Button type="button" kind="grad" shape="round" aria-label="Beğen" onClick={props.onLike}>
        <span className="a-ico-heart" aria-hidden>
          <i />
        </span>
      </Button>
    </div>
  );
}
