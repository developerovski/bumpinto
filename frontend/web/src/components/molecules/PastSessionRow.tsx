/* Kaynak: artboard Oturumlar_1280.html .a-row-card (geçmiş liste) / DS v2 */
import { useTranslation } from "react-i18next";
import type { SessionSummaryDto } from "@bumpinto/shared";
import { Badge } from "../atoms";
import { GROUP_TINT, activityListLabel, groupOf } from "../../lib/activity";
import VenueThumb from "./VenueThumb";

/** Artboard W1 · geçmiş buluşma satırı — küçük görsel + ad/tarih + rozet. */
export default function PastSessionRow({ row, index }: { row: SessionSummaryDto; index: number }) {
  const { t, i18n } = useTranslation();
  const decided = !!row.decidedVenueName;
  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    day: "numeric",
    month: "short",
  });
  const date = row.createdAt ? fmt.format(new Date(row.createdAt)) : "";
  // Karar çıkmamış ve adlandırılmamış oturumun `decidedVenueName` de `name` de yoktur —
  // başlık boş bir <h3> olarak kalıyordu. `SessionCard` ile AYNI yedek: etkinlik etiketi.
  const title =
    row.decidedVenueName ?? row.name ?? activityListLabel(row.activityTypes ?? [], t, i18n.resolvedLanguage ?? "en");
  return (
    <div className={`flex items-center gap-3 px-4 py-[0.8125rem]${decided ? "" : " opacity-65"}`}>
      {/* Artboard W1 (734): 48px, 14px köşe, ÇIPLAK gradyan karo — polaroid kart chrome'u YOK.
          `VenueCard photoOnly` deste yığınının d2/d3 kartları içindir (beyaz kart + %100 yükseklik):
          48px'lik bir satırda kartın dolgusu görseli ~26px'e düşürüyordu. Küçük görselin bileşeni
          `VenueThumb` (LikedList da bunu kullanır). */}
      <VenueThumb
        venue={{ id: row.slug, name: title, photoUrl: row.decidedVenuePhotoUrl, deckOrder: index }}
        tint={GROUP_TINT[groupOf(row.activityTypes?.[0] ?? "")]}
        size={48}
        radiusClass="rounded-[0.875rem]"
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <h3>{title}</h3>
        <span className="text-[0.75rem] text-ink2">
          {date} · {decided ? t("sessions.people", { count: row.participantCount ?? 0 }) : t("sessions.noDecision")}
        </span>
      </div>
      <Badge tone={decided ? "grass" : "neutral"}>{decided ? t("sessions.went") : t("sessions.full")}</Badge>
    </div>
  );
}
