/* Kaynak: artboard Oturumlar_1280.html .a-row-card (geçmiş liste) / DS v2 */
import { useTranslation } from "react-i18next";
import type { SessionSummaryDto } from "@bumpinto/shared";
import { Badge } from "../atoms";
import { GROUP_TINT, groupOf } from "../../lib/activity";
import VenueCard from "./VenueCard";

/** Artboard W1 · geçmiş buluşma satırı — küçük görsel + ad/tarih + rozet. */
export default function PastSessionRow({ row, index }: { row: SessionSummaryDto; index: number }) {
  const { t, i18n } = useTranslation();
  const decided = !!row.decidedVenueName;
  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    day: "numeric",
    month: "short",
  });
  const date = row.createdAt ? fmt.format(new Date(row.createdAt)) : "";
  return (
    <div className={`flex items-center gap-3 px-4 py-[0.8125rem]${decided ? "" : " opacity-65"}`}>
      <div className="h-12 w-12 flex-none">
        <VenueCard
          venue={{ id: row.slug, name: row.decidedVenueName ?? row.name ?? "?", photoUrl: row.decidedVenuePhotoUrl, deckOrder: index }}
          tint={GROUP_TINT[groupOf(row.activityType ?? "COFFEE")]}
          photoOnly
          photoHeight={48}
        />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <h3>{row.decidedVenueName ?? row.name}</h3>
        <span className="text-[0.75rem] text-ink2">
          {date} · {decided ? t("sessions.people", { count: row.participantCount ?? 0 }) : t("sessions.noDecision")}
        </span>
      </div>
      <Badge tone={decided ? "grass" : "neutral"}>{decided ? t("sessions.went") : t("sessions.full")}</Badge>
    </div>
  );
}
