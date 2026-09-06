import { Button } from "@bumpinto/web";
// El yapımı `c-ico-*` glifleri KALDIRILDI (DeckActions.tsx:1 — Phosphor ikonları geldi).
// Bu hücre üründeki DeckActions deseninin aynısını kullanır.
import { ArrowCounterClockwise, Heart, X } from "@phosphor-icons/react";

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
        <ArrowCounterClockwise size={24} weight="bold" className="text-ink2" aria-hidden />
      </Button>
      <Button type="button" kind="white" shape="round" aria-label="Geç">
        <X size={24} weight="bold" className="text-ink" aria-hidden />
      </Button>
      <Button type="button" kind="grad" shape="round" aria-label="Beğen">
        <Heart size={24} weight="fill" className="text-white" aria-hidden />
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
