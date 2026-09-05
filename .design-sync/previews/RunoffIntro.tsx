import { RunoffIntro } from "@bumpinto/web";
import { ACTIVITIES_MIX, ACTIVITIES_ONE } from "./_fixtures";

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/** 07 Runoff · iki finalist — overline (ilgi alanı + kişi sayısı) + "ikili" başlık dalı
    + neden kopyası. T4: "Son düzlük" çıkartması KALDIRILDI (karar dokümanı §4.8 —
    kutlama/rozet dili yasak). */
export function TwoFinalists() {
  return (
    <div style={COL}>
      <RunoffIntro activities={ACTIVITIES_ONE} people={3} finalists={2} sent={false} />
    </div>
  );
}

/** Üç ve üzeri finalist — başlık "çoklu" dalına geçer. */
export function ManyFinalists() {
  return (
    <div style={COL}>
      <RunoffIntro activities={ACTIVITIES_MIX} people={5} finalists={4} sent={false} />
    </div>
  );
}

/** `reason="FALLBACK"` — kesişim boş çıktı, finalistler yedek kuraldan geldi;
    neden kopyası ayrı bir metne döner (B-7:T2). */
export function FallbackReason() {
  return (
    <div style={COL}>
      <RunoffIntro
        activities={ACTIVITIES_ONE}
        people={4}
        finalists={3}
        reason="FALLBACK"
        sent={false}
      />
    </div>
  );
}

/** Kendi oyunu kilitledin: başlık artboard'ın "kilitli" dalına döner. */
export function Locked() {
  return (
    <div style={COL}>
      <RunoffIntro activities={ACTIVITIES_ONE} people={3} finalists={2} sent />
    </div>
  );
}
