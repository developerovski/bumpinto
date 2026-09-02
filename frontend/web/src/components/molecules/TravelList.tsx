/* Kaynak: artboard Karar 1280 sağ kart — katılımcı başına yol süresi */
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { Avatar } from "../atoms";

export default function TravelList(props: {
  venue: VenueDto;
  participants: ParticipantDto[];
  selfId?: string;
}) {
  const { t } = useTranslation();
  const rows = props.participants
    .filter((p) => p.id && props.venue.travelMinutes?.[p.id] != null)
    .sort((a, b) => Number(b.id === props.selfId) - Number(a.id === props.selfId));

  return (
    <div className="rounded-card border border-line bg-card py-1.5 shadow-sh1">
      {rows.map((p, i) => (
        <div key={p.id}>
          {i > 0 && <div className="mx-4 h-px bg-line" />}
          <div className="flex items-center gap-3 px-4 py-[0.6875rem]">
            <Avatar name={p.displayName ?? "?"} index={i} />
            <span className="flex-1 text-[0.875rem] font-semibold">
              {p.id === props.selfId ? t("deck.travelSelf") : p.displayName}
            </span>
            <span className="text-[0.8125rem] font-bold text-ink tabular-nums">
              {t("deck.minutes", { min: props.venue.travelMinutes![p.id!] })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
