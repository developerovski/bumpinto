import type { SessionView } from "@bumpinto/shared";
import { useState } from "react";
import { wasAnswered } from "../../lib/checkinMark";
import CheckinSheet from "./CheckinSheet";

/** Buluşma (pencereli planda pencere) geçince üyeye TEK soru. Durum her render'da yeniden
    değerlendirilir: yoklama `meetPassed`'i sayfa açıkken çevirebilir. Cevap işaretlenir; kapatmak
    yalnız bu açılışlık gizler (bir sonraki açılışta yine sorulur). */
export default function CheckinPrompt({ view, slug }: { view: SessionView; slug: string }) {
  const [closed, setClosed] = useState(() => wasAnswered(slug));
  if (closed) return null;
  if (!view.openPlan?.meetPassed || !view.viewer?.participantId || view.status === "EXPIRED") return null;
  return (
    <CheckinSheet
      slug={slug}
      people={view.participants ?? []}
      planName={view.name}
      onDone={() => setClosed(true)}
      onDismiss={() => setClosed(true)}
    />
  );
}
