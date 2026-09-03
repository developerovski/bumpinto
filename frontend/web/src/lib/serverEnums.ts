/* B-7 (plan15) birleşti ve `rtk pnpm codegen` koştu (Task 8 kapanışı) — `SessionView.decisionKind`
   / `runoffReason` artık `@bumpinto/shared`'ın üretilmiş tiplerinde ANONİM (satır-içi) birleşim.
   Adlandırılmış TEK kaynak burasıdır; başka HİÇBİR dosya bu union'ları yeniden bildirmez
   (`lib/travelMode.ts`'teki `TravelMode` deseniyle aynı yaklaşım). */
import type { SessionView } from "@bumpinto/shared";

export type DecisionKind = NonNullable<SessionView["decisionKind"]>;
export type RunoffReason = NonNullable<SessionView["runoffReason"]>;
