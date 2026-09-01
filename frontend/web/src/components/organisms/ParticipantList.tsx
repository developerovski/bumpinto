/* Kaynak: ui.css .field / .row / .a-ov / .muted / .tab / .a-card / .a-dv */
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Progress } from "../atoms";
import ParticipantRow from "../molecules/ParticipantRow";
import { useSessionStore } from "../../store/sessionStore";

/** Artboard W2 · "Kimler var" üst başlığı + sayaç + ilerleme çubuğu + satır kartı. */
export default function ParticipantList({ participants }: { participants: ParticipantDto[] }) {
  const { t } = useTranslation();
  const self = useSessionStore((s) => s.self);
  const ready = participants.filter((p) => p.hasLocation).length;
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2.5">
          <p className="m-0 text-[0.6875rem] font-bold tracking-[0.11em] text-ink3 uppercase">
            {t("waiting.who")}
          </p>
          {/* .muted + .tab — Note atomu tabular-nums taşımadığı için zincir burada. */}
          <span className="text-[0.8125rem] leading-normal text-ink2 tabular-nums">
            {t("waiting.readyCount", { ready, total: participants.length })}
          </span>
        </div>
        <Progress value={ready / Math.max(participants.length, 1)} />
      </div>
      <div className="rounded-card border border-line bg-card py-0.5 shadow-sh1">
        {participants.map((p, i) => {
          // Kimlik yalnız katılım yanıtındaki participantId'den — ad eşlemesi yapılmaz.
          const isSelf = !!self?.id && self.id === p.id;
          return (
            <Fragment key={p.id ?? i}>
              {i > 0 && <div className="mx-4 h-px bg-line" />}
              <ParticipantRow
                participant={p}
                index={i}
                isSelf={isSelf}
                locationLabel={isSelf ? self?.locationLabel : null}
              />
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
