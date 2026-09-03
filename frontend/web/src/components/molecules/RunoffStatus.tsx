/* Kaynak: artboard Runoff 1280 sağ kart / Runoff 390 kilitli / Runoff 1280 kilitli */
import { Check } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { votersOf } from "../../lib/voters";
import { Badge, Button, ErrorText, Overline, Progress } from "../atoms";
import PersonRow from "./PersonRow";
import ShareButton from "./ShareButton";

export default function RunoffStatus(props: {
  participants: ParticipantDto[];
  votedIds: string[];
  choice: string | null;
  sent: boolean;
  sending: boolean;
  onLock: () => void;
  selfId?: string;
  error?: string | null;
  shareText: string;
  shareUrl: string;
}) {
  const { t } = useTranslation();
  const voters = votersOf(props.participants);
  const total = voters.length;
  const done = voters.filter((p) => props.votedIds.includes(p.id!)).length;
  // "Herkes kilitledi" durumu RunoffScreen yönlendirmesinde her zaman RunoffTie'ye düşer (`tie`
  // AYNI oy kümesini kullanır) — bu dal buraya `sent` ile ulaştığında `unlocked` HER ZAMAN ≥1'dir,
  // dolayısıyla "herkes seçti" kopyası/sayım burada YOKTUR (code-review: ölü kod kaldırıldı,
  // bkz. RunoffTie). Kalan tam bir kişiyse §4.8 gereği ADLI ve OLUMLU not.
  const unlocked = voters.filter((p) => !props.votedIds.includes(p.id!));
  const lockedNote =
    unlocked.length === 1
      ? t("runoff.lockedCopyName", { name: unlocked[0].displayName ?? "" })
      : t("runoff.lockedCopy");

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
            <span className="text-[0.75rem] text-ink2">{lockedNote}</span>
          </div>
        </div>
        <ShareButton text={props.shareText} url={props.shareUrl} label={t("runoff.remind")} kind="white" />
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
      <div role="list" className="flex flex-col">
        {voters.map((p, i) => {
          const locked = props.votedIds.includes(p.id!);
          return (
            <div key={p.id}>
              {i > 0 && <div className="h-px bg-line" />}
              <PersonRow participant={p} index={i} isSelf={p.id === props.selfId} ring>
                {locked ? (
                  <Badge tone="grass">
                    <Check size={12} aria-hidden />
                    {t("runoff.lockedBadge")}
                  </Badge>
                ) : (
                  <Badge tone="amber">{t("runoff.choosing")}</Badge>
                )}
              </PersonRow>
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
