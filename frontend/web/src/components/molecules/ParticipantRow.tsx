/* Kaynak: ui.css .row / .field / .label / .a-m2 / .muted + W2 satır ölçüleri */
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { MODE_ICON, MODE_LABEL_KEY } from "../../lib/travelMode";
import { Avatar, Badge } from "../atoms";

/** Artboard W2 · .srow — avatar + ad/alt satır + tek rozet.
    Rozet önceliği artboard'dan: kuran satırında "Kuran", diğerlerinde hazır/bekliyor.
    Alt satır: "{{şehir}} · <ikon> ~{{dk}} dk" — ikon ve dakika `travelMode`/`midpointMinutes`
    alanları ZATEN katılımcı nesnesinin üstünde (B-7:T1, üretilmiş tipte), ayrı prop olarak
    THREAD edilmez. Geliş animasyonu: `animate-appear` (reduced-motion `@layer base`'te kapalı). */
export default function ParticipantRow(props: {
  participant: ParticipantDto;
  index: number;
  isSelf?: boolean;
}) {
  const { t } = useTranslation();
  const p = props.participant;
  const mode = p.hasLocation ? p.travelMode : undefined;
  const icons = mode ? MODE_ICON[mode] : [];
  return (
    <div className="flex items-center gap-3 px-4 py-[0.8125rem] animate-appear">
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
        <span className="flex items-center gap-1.5 text-[0.8125rem] text-ink2">
          {p.hasLocation ? p.locationLabel : t("waiting.waitingLocation")}
          {icons.length > 0 && (
            <>
              <span aria-hidden>·</span>
              {icons.map((Icon, i) => (
                <Icon key={i} size={14} aria-hidden />
              ))}
              {mode && <span className="sr-only">{t(MODE_LABEL_KEY[mode].name)}</span>}
              {p.midpointMinutes != null && (
                <span className="tabular-nums">{t("travel.min", { min: p.midpointMinutes })}</span>
              )}
            </>
          )}
        </span>
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
