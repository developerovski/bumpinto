/* Kaynak: artboard Runoff 1280 sağ kart / Runoff 390 kilitli */
import { Check } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Avatar, Badge, Button, ErrorText, Overline, Progress } from "../atoms";

export default function RunoffStatus(props: {
  participants: ParticipantDto[];
  votedIds: string[];
  choice: string | null;
  sent: boolean;
  sending: boolean;
  onLock: () => void;
  selfId?: string;
  error?: string | null;
}) {
  const { t } = useTranslation();
  const voters = props.participants.filter((p) => p.hasLocation && !p.manual);
  const total = voters.length;
  const done = voters.filter((p) => props.votedIds.includes(p.id!)).length;

  if (props.sent) {
    return (
      <>
        <div className="mt-0.5 flex items-center justify-center gap-2 text-[0.75rem] text-ink2">
          <span className="font-bold tabular-nums">{t("runoff.votedCount", { done, total })}</span>
          <span>· {t("runoff.note")}</span>
        </div>
        <div className="flex items-center gap-[0.6875rem] rounded-card border border-[#bfe5cf] bg-grass-wash p-[0.875rem_1rem]">
          <span className="c-check" aria-hidden>
            <i />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.875rem] font-bold text-grass">{t("runoff.lockedTitle")}</span>
            <span className="text-[0.75rem] text-ink2">{t("runoff.lockedCopy")}</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-card border border-line bg-card p-[1.375rem_1.375rem_1.25rem] shadow-sh1">
      <div className="flex items-baseline justify-between">
        <Overline>{t("runoff.who")}</Overline>
        <span className="font-head text-[1.75rem] font-extrabold tabular-nums">
          {t("runoff.countOf", { done, total })}
        </span>
      </div>
      <Progress value={done / Math.max(total, 1)} />
      <div className="flex flex-col">
        {voters.map((p, i) => {
          const locked = props.votedIds.includes(p.id!);
          return (
            <div key={p.id}>
              {i > 0 && <div className="h-px bg-line" />}
              <div className="flex items-center gap-3 py-2.5">
                <Avatar name={p.displayName ?? "?"} index={i} ring />
                <span className="flex-1 text-[0.875rem] font-semibold">
                  {p.id === props.selfId ? t("deck.travelSelf") : p.displayName}
                </span>
                {locked ? (
                  <Badge tone="grass">
                    <Check size={12} aria-hidden />
                    {t("runoff.lockedBadge")}
                  </Badge>
                ) : (
                  <Badge tone="amber">{t("runoff.choosing")}</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[0.75rem] text-ink2">{t("runoff.note")}</p>
      <Button type="button" onClick={props.onLock} disabled={!props.choice || props.sending}>
        {t("runoff.lockIn")}
      </Button>
      {props.error && <ErrorText>{props.error}</ErrorText>}
    </div>
  );
}
