import { Button } from "@bumpinto/web";

/** W1 · formun ana çağrısı. */
export function PrimaryPill() {
  return <Button type="button">Katıl</Button>;
}

/** W2 · ikincil eylem — beyaz gövde, ince çerçeve. */
export function SecondaryPill() {
  return (
    <Button type="button" kind="white">
      Konumumu değiştir
    </Button>
  );
}

/** W1 · ikonlu, sola yaslı kullanım. */
export function IconStart() {
  return (
    <Button type="button" kind="white" align="start">
      <span aria-hidden>📍</span>
      Mevcut konumumu kullan
    </Button>
  );
}

/** W3 · deste aksiyonları — `grad` DS kuralı gereği yalnız yuvarlak/ikon. */
export function RoundControls() {
  return (
    <div className="flex items-center justify-center gap-5">
      <Button type="button" kind="white" shape="round-sm" aria-label="Geri al">
        <span className="c-ico-undo" aria-hidden />
      </Button>
      <Button type="button" kind="white" shape="round" aria-label="Geç">
        <span className="c-ico-x" aria-hidden />
      </Button>
      <Button type="button" kind="grad" shape="round" aria-label="Beğen">
        <span className="c-ico-heart" aria-hidden>
          <i />
        </span>
      </Button>
    </div>
  );
}

/** Gönderim sürerken — %45 opaklık, gölge düşer. */
export function Disabled() {
  return (
    <Button type="button" disabled>
      Katıl
    </Button>
  );
}
