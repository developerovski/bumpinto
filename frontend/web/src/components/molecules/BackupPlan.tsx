/* Karar dokümanı §5.C — "Yedek plan": runoff ikincisi (voteTally), yoksa likeCounts ikincisi
   (≥2 beğeni ve ≥3 katılımcı şartıyla). İkisi de yoksa satır hiç çizilmez.
   Yerleşim artboard W8 `.f-back` (CSS 566): TEK satır — küçük görsel YOK, "Yedek plan: <ad> ·
   N beğeni · herkes ~25–40 dk" + sağda caret (rapor I · P2-6). Oylamayla karar verildiyse sayı
   beğeni değil OY'dur (2573 vs. 3795 — P2-C1). */
import { CaretRight } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { fairnessOf, type SessionView as View } from "@bumpinto/shared";
import { backupOf } from "../../lib/backupPlan";

export default function BackupPlan(props: { view: View; winnerId: string }) {
  const { t } = useTranslation();
  const v = backupOf(props.view, props.winnerId);
  if (!v) return null;
  const id = v.id ?? "";
  // Sayı kaynağı kararın türüyle AYNI kapıdan geçer: runoff'ta oy, aksi hâlde beğeni. Sayı
  // yoksa parça hiç yazılmaz — "0 beğeni" uydurmasındansa sessizlik (§1).
  const votes = props.view.decisionKind === "RUNOFF" ? props.view.voteTally?.[id] : undefined;
  const likes = votes == null ? props.view.likeCounts?.[id] : undefined;
  const f = fairnessOf(v);
  const parts = [
    votes != null ? t("result.backupVotes", { count: votes }) : null,
    likes != null ? t("result.backupLikes", { count: likes }) : null,
    f ? t("result.backupRange", { min: f.min, max: f.max }) : null,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-2 rounded-[0.8125rem] border border-line bg-card px-[0.875rem] py-[0.6875rem] lg:max-w-[32.5rem]">
      <span className="min-w-0 flex-1 text-[0.75rem] text-ink2">
        {t("result.backup")}: <b className="font-bold text-ink">{v.name}</b>
        {parts.length > 0 && ` · ${parts.join(" · ")}`}
      </span>
      {/* Artboard `.f-back i` — yönlendirme oku. Yedek mekânın kendi ekranı YOK: ok yalnız
          "burada devamı var" işareti, tıklanabilir bir hedef uydurulmaz. */}
      <CaretRight size={14} className="flex-none text-ink3" aria-hidden />
    </div>
  );
}
