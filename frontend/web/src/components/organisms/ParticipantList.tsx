/* Kaynak: ui.css .field / .row / .a-ov / .muted / .tab / .a-card / .a-dv */
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Overline, Progress } from "../atoms";
import ParticipantRow from "../molecules/ParticipantRow";
import { useSessionStore } from "../../store/sessionStore";

/** Artboard W2 · "Kimler var" üst başlığı + sayaç + ilerleme çubuğu + satır kartı. */
export default function ParticipantList({ participants }: { participants: ParticipantDto[] }) {
  const { t } = useTranslation();
  const viewerId = useSessionStore((s) => s.view?.viewer?.participantId);
  const ready = participants.filter((p) => p.hasLocation).length;
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2.5">
          <Overline>{t("waiting.who")}</Overline>
          {/* .muted + .tab — Note atomu tabular-nums taşımadığı için zincir burada. */}
          <span className="text-[0.8125rem] leading-normal text-ink2 tabular-nums">
            {t("waiting.readyCount", { ready, total: participants.length })}
          </span>
        </div>
        <Progress value={ready / Math.max(participants.length, 1)} />
      </div>
      <div className="rounded-card border border-line bg-card py-0.5 shadow-sh1">
        {participants.map((p, i) => {
          // Kimlik sunucunun viewer alanından — ad eşlemesi yapılmaz.
          const isSelf = !!viewerId && viewerId === p.id;
          return (
            <Fragment key={p.id ?? i}>
              {i > 0 && <div className="mx-4 h-px bg-line" />}
              <ParticipantRow participant={p} index={i} isSelf={isSelf} />
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
