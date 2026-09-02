/* Kaynak: ui.css .row / .field / .label / .a-m2 / .muted + W2 satır ölçüleri */
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Avatar, Badge, Note } from "../atoms";

/** Artboard W2 · .srow — avatar + ad/alt satır + tek rozet.
    Rozet önceliği artboard'dan: kuran satırında "Kuran", diğerlerinde hazır/bekliyor. */
export default function ParticipantRow(props: {
  participant: ParticipantDto;
  index: number;
  isSelf?: boolean;
}) {
  const { t } = useTranslation();
  const p = props.participant;
  const subtitle = p.hasLocation ? p.locationLabel : t("waiting.waitingLocation");
  return (
    <div className="flex items-center gap-3 px-4 py-[0.8125rem]">
      <Avatar
        name={p.displayName ?? "?"}
        index={props.index}
        ring={p.hasLocation}
        waiting={!p.hasLocation}
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[0.875rem] font-bold">
          {p.displayName}
          {props.isSelf && <span className="font-normal text-ink2"> {t("waiting.you")}</span>}
        </span>
        {subtitle && <Note>{subtitle}</Note>}
      </div>
      {p.host ? (
        <Badge tone="neutral">{t("waiting.host")}</Badge>
      ) : (
        <Badge tone={p.hasLocation ? "grass" : "amber"}>
          {p.hasLocation ? t("waiting.ready") : t("waiting.waitingBadge")}
        </Badge>
      )}
    </div>
  );
}
