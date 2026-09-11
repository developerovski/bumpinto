/* Kaynak: Keşfet POC artboard P2/P2a — açık planın ÜYE OLMAYANA görünen detayı (Keşfet kartı ya da link). */
import type { SessionPreview } from "@bumpinto/shared";
import { ArrowLeft } from "@phosphor-icons/react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Page } from "../components/atoms";
import PlanIntro from "../components/molecules/PlanIntro";
import TwoZone from "../components/molecules/TwoZone";
import SeatRequestCard from "../components/organisms/SeatRequestCard";
import { useNow } from "../lib/useNow";
import { useAuthStore } from "../store/authStore";
import { useSessionStore } from "../store/sessionStore";

export default function PlanPage({ slug, preview }: { slug: string; preview: SessionPreview }) {
  const { t } = useTranslation();
  const now = useNow();
  const me = useAuthStore((s) => s.me);
  const status = useAuthStore((s) => s.status);
  const refresh = useSessionStore((s) => s.refresh);
  // KARARLI geri çağrı: giriş bloğuna iner ve Google düğmesi `onDone` değişince yeniden kurulur.
  const onSeated = useCallback(() => void refresh(), [refresh]);
  return (
    <Page>
      {status === "signed" && (
        <Link to="/kesfet" className="flex w-fit items-center gap-1.5 text-[0.8125rem] font-semibold text-ink2 no-underline">
          <ArrowLeft size={16} aria-hidden />
          {t("plan.back")}
        </Link>
      )}
      <TwoZone
        leftGap="md"
        left={<PlanIntro preview={preview} now={now} interests={me?.interests} />}
        right={
          <SeatRequestCard
            slug={slug}
            hostName={preview.hostDisplayName ?? null}
            joinPolicy={preview.openPlan?.joinPolicy ?? "APPROVAL"}
            onSeated={onSeated}
          />
        }
        stickyRight
      />
    </Page>
  );
}
