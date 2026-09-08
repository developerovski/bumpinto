/* Kaynak: artboard Runoff 1280 sağ kart (2412-2439), Runoff 1280 kilitli (3694-3730),
   Runoff 390 kilitli (2489-2515), W7b Berabere 1280 (4459-4482). */
import { Check } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { personIndexOf } from "../../lib/personColor";
import { votersOf } from "../../lib/voters";
import { Badge, Button, ErrorText, Overline, Progress } from "../atoms";
import PersonRow from "./PersonRow";
import ShareButton from "./ShareButton";

/** Artboard `.f-lockcard` + `.f-lockdot` (2497-2506 / 3694-3702) — yeşil "seçimin kilitli"
    kartı. 1280'de sağ kolonda roster'ın ÜSTÜNDE, 390'da sayfanın yapışkan CTA'sında durur
    (aynı kart iki yerde yaşadığı için dışa açık; yerleşimi çağıran seçer). */
export function RunoffLockCard(props: { title: string; note: string; className?: string }) {
  return (
    <div
      className={`flex items-center gap-[0.6875rem] rounded-card border border-[#bfe5cf] bg-grass-wash p-[0.875rem_1rem] lg:p-[1rem_1.125rem] ${
        props.className ?? ""
      }`.trim()}
    >
      <span className="c-check" aria-hidden>
        <i />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.875rem] font-bold text-grass">{props.title}</span>
        <span className="text-[0.75rem] text-ink2">{props.note}</span>
      </div>
    </div>
  );
}

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
  /** Beraberlik: kart "Oylar" başlığına döner, kilit/hatırlatma aksiyonu taşımaz — karar
      sol bölgeye (RunoffTie) taşındı. */
  tie?: boolean;
}) {
  const { t } = useTranslation();
  const voters = votersOf(props.participants);
  const total = voters.length;
  const done = voters.filter((p) => props.votedIds.includes(p.id!)).length;
  // Beraberlik dalı hariç bu bileşene `sent` ile ulaşıldığında `unlocked` HER ZAMAN ≥1'dir
  // (herkes kilitleseydi `tie` olurdu), o yüzden "herkes seçti" kopyası burada YOKTUR.
  // Kalan tam bir kişiyse §4.8 gereği ADLI ve OLUMLU not.
  const unlocked = voters.filter((p) => !props.votedIds.includes(p.id!));
  const lockedNote =
    unlocked.length === 1
      ? t("runoff.lockedCopyName", { name: unlocked[0].displayName ?? "" })
      : t("runoff.lockedCopy");
  // Artboard 2414 → 3705: seçim sürerken "Kim kilitledi", kendi seçimin kilitliyken "Kim seçti";
  // beraberlikte kart W7b'nin "Oylar" kartına döner (4460).
  const overline = props.tie
    ? t("runoff.tallyTitle")
    : props.sent
      ? t("runoff.whoLocked")
      : t("runoff.who");
  // 390'da roster kartı YOKTUR: kilitliyken tek satırlık özet + yapışkan CTA (2489-2515),
  // beraberlikte yalnız manşet + kartlar + CTA (4341-4406). Kart 1280'de her üç durumda da
  // görünür — eski kod `sent` dalında erken return edip roster'ı tümüyle atıyordu (§3 P1).
  const rosterOnMobile = !props.sent && !props.tie;

  return (
    <>
      {props.sent && !props.tie && (
        <>
          {/* Artboard 2489-2492 — mobil özet satırı; 1280'de yerini roster kartı alır. */}
          <div className="mt-0.5 flex items-center justify-center gap-2 text-[0.75rem] text-ink2 lg:hidden">
            <span className="font-bold tabular-nums">{t("runoff.votedCount", { done, total })}</span>
            <span>· {t("runoff.note")}</span>
          </div>
          {/* 390'daki ikizi RunoffScreen'in yapışkan CTA'sında (artboard 2497). */}
          <RunoffLockCard title={t("runoff.lockedTitle")} note={lockedNote} className="max-lg:hidden" />
        </>
      )}
      <div
        className={`${
          rosterOnMobile ? "" : "max-lg:hidden "
        }flex flex-col gap-3.5 rounded-card border border-line bg-card p-[1.375rem_1.375rem_1.25rem] shadow-sh1`}
      >
        <div className="flex items-baseline justify-between">
          <Overline>{overline}</Overline>
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
                {/* `size="xs"` = artboard `.av-s` (29px), `presence` = `.avw > .od` çevrimiçi
                    noktası + `.off` soluk satır (3711-3723 / 4476). Veri sunucudan gelir. */}
                <PersonRow
                  participant={p}
                  /* Renk KANONİK sıradan: `voters` filtrelenmiş liste. */
                  index={personIndexOf(props.participants, p.id)}
                  isSelf={p.id === props.selfId}
                  ring
                  size="xs"
                  presence
                >
                  {locked ? (
                    <Badge tone="grass">
                      <Check size={12} aria-hidden />
                      {t("runoff.lockedBadge")}
                    </Badge>
                  ) : props.tie ? (
                    /* Artboard 4463-4480 her satırın YANINDA seçtiği mekanı yazar; SessionView'da
                       katılımcı→mekan eşlemesi YOK (`runoffVotedParticipantIds` düz bir id
                       listesi, `voteTally` mekan→sayı). Gerçek uygulama için sunucunun
                       `SessionView.runoffVotes: { [participantId]: venueId }` alanını (yalnız
                       oylama bittikten sonra) döndürmesi gerekir. Buraya kadar türetilebilen
                       TEK ayrım seçti/seçmedi olduğu için yalnız o basılır — uydurulmaz. */
                    <span className="text-[0.75rem] text-ink2">{t("runoff.notVoted")}</span>
                  ) : (
                    <Badge tone="amber">{t("runoff.choosing")}</Badge>
                  )}
                </PersonRow>
              </div>
            );
          })}
        </div>
        {/* Artboard 2437 / 3728: aksiyon NOTUN ÜSTÜNDE. Seçim sürerken kilit butonu, kendi
            seçimin kilitliyken hatırlatma; beraberlikte kart aksiyonsuz (karar sol bölgede). */}
        {!props.tie &&
          (props.sent ? (
            <ShareButton
              text={props.shareText}
              url={props.shareUrl}
              label={t("runoff.remind")}
              kind="white"
              icon="remind"
            />
          ) : (
            <Button type="button" onClick={props.onLock} disabled={!props.choice || props.sending}>
              {t("runoff.lockIn")}
            </Button>
          ))}
        <p className="text-[0.75rem] text-ink2">{t("runoff.note")}</p>
        {props.error && <ErrorText>{props.error}</ErrorText>}
      </div>
    </>
  );
}
