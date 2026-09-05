/* Kaynak: artboard Oturumlar_1280.html .card (açık liste) / DS v2 */
import { useTranslation } from "react-i18next";
import type { SessionSummaryDto } from "@bumpinto/shared";
import { Badge, LinkButton, Progress, Sticker } from "../atoms";
import { activityListLabel } from "../../lib/activity";

/** Durum → hedef sayfa CTA metni (i18n anahtarı). Backend DECIDED/EXPIRED'ı past'e koyar — burada gelmez. */
function cta(status: SessionSummaryDto["status"]): string {
  switch (status) {
    case "SWIPING": return "sessions.goDeck";
    case "BROWSING": case "RUNOFF": return "sessions.goVenues";
    default: return "sessions.goLobby";
  }
}

/** Artboard W1 · açık buluşma kartı — durum, ilerleme, katılımcı sayısı, CTA. */
export default function SessionCard({ row }: { row: SessionSummaryDto }) {
  const { t, i18n } = useTranslation();
  const label = activityListLabel(row.activityTypes ?? [], t, i18n.resolvedLanguage ?? "en");
  const active = row.status === "SWIPING";
  const done = row.doneCount ?? 0;
  const readyTotal = row.readyCount ?? 0;
  const participantTotal = row.participantCount ?? 0;
  return (
    <div
      className={[
        "relative rounded-card bg-card p-[1.25rem_1.375rem]",
        active ? "border-[1.5px] border-flame-deep shadow-sh2" : "border border-line shadow-sh1",
      ].join(" ")}
    >
      {active && (
        <span className="absolute -top-[0.8125rem] right-4">
          <Sticker>{t("sessions.deckOpen")}</Sticker>
        </span>
      )}
      <h3 className="mb-1 text-[1.3125rem]">{row.name ?? label}</h3>
      <p className="mb-3.5 text-[0.8125rem] text-ink2">
        {label} · {row.sessionType === "SOLO" ? t("sessions.solo") : t("sessions.group")}
      </p>
      <div className="mb-3.5 flex flex-col gap-2">
        {row.status === "SWIPING" ? (
          <>
            <p className="text-[0.75rem] text-ink2 tabular-nums">
              {t("sessions.doneOf", { done, total: readyTotal })}
            </p>
            <Progress value={done / Math.max(readyTotal, 1)} />
          </>
        ) : row.status === "COLLECTING" || row.status === "SUGGESTING" ? (
          <>
            <p className="text-[0.75rem] text-ink2 tabular-nums">
              {t("sessions.readyOf", { ready: readyTotal, total: participantTotal })}
              {row.sessionType === "GROUP" ? ` — ${t("sessions.linkHint")}` : ""}
            </p>
            <Progress value={readyTotal / Math.max(participantTotal, 1)} />
          </>
        ) : (row.status === "BROWSING" || row.status === "RUNOFF") ? (
          <p className="text-[0.75rem] text-ink2 tabular-nums">{t(`sessions.status.${row.status}`)}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Badge>{t("sessions.people", { count: participantTotal })}</Badge>
        <LinkButton
          href={`/j/${row.slug ?? ""}`}
          kind="white"
          size="fit-sm"
          aria-label={`${t(cta(row.status))} · ${row.name ?? label}`}
        >
          {t(cta(row.status))}
        </LinkButton>
      </div>
    </div>
  );
}
