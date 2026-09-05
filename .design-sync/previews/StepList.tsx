import { StepList } from "@bumpinto/web";

/* Ürün kolonu: Landing'de TwoZone sağ bölgede (`PolaroidFan` altında), ≥1024 altı
   tam Page kolon genişliğinde (27.75rem). */
const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/** Landing · "nasıl çalışır" — 3 numaralı adım, her biri kalın başlık + açıklama.
    Props almaz, metin `landing.step1..3` / `step1..3Copy` i18n'den gelir; tek kanonik hücre. */
export function Steps() {
  return (
    <div style={COL}>
      <StepList />
    </div>
  );
}
