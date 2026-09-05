import { StatCard } from "@bumpinto/web";

/* StatCard ProfileStats'ın `grid-cols-2` hücresi olarak yaşıyor — burada tek başına
   gösterildiğinde de aynı ~13.1rem genişliğe yaklaşsın diye dar bir sarmalayıcı. */
const CELL = {
  width: "13rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/** W9 · sol kart, hafif sola eğik (-1°) — kurulan buluşma sayısı. */
export function TiltLeft() {
  return (
    <div style={CELL}>
      <StatCard value={9} label="buluşma kuruldu" tilt={-1} />
    </div>
  );
}

/** W9 · sağ kart, hafif sağa eğik (+1°) — görülen dost sayısı. */
export function TiltRight() {
  return (
    <div style={CELL}>
      <StatCard value={23} label="dost görüldü" tilt={1} />
    </div>
  );
}

/** W9 · yeni hesap — henüz kurulmuş buluşma yok, `?? 0` düşüşü. */
export function Zero() {
  return (
    <div style={CELL}>
      <StatCard value={0} label="buluşma kuruldu" tilt={-1} />
    </div>
  );
}
