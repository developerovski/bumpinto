/* Kaynak: artboard W20 frag 68/69/70 — scrim + bottom sheet; centers on `lg+`); */
import { Flag, Prohibit, SpeakerSlash } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { useSocialStore, type ReportReason } from "../../store/socialStore";
import { useVoiceStore } from "../../store/voiceStore";
import { Avatar, Button } from "../atoms";

/** §2 sözleşmesi: `ReportRequest.reason` birliği. `satisfies` derlemede kilitler. */
const REASONS = ["HARASSMENT", "SPAM", "IMPERSONATION", "OTHER"] as const satisfies readonly ReportReason[];

const ROW = "flex w-full items-center gap-3 px-4 py-[0.8125rem] text-left";
const SHEET =
  "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[26rem] flex-col gap-3.5 rounded-t-card " +
  "border border-line bg-card p-5 shadow-sh2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-card";

function ActionRow(props: {
  icon: ReactNode;
  title: string;
  hint: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={ROW} disabled={props.disabled} onClick={props.onClick}>
      {props.icon}
      <span className="flex flex-col">
        <span className={`text-[0.875rem] font-bold${props.danger ? " text-flame-deep" : ""}`}>{props.title}</span>
        <span className="text-[0.8125rem] text-ink2">{props.hint}</span>
      </span>
    </button>
  );
}

export default function PersonSheet(props: { slug: string; participant: ParticipantDto; onClose: () => void }) {
  const { t } = useTranslation();
  const p = props.participant;
  const name = p.displayName ?? "?";
  const [step, setStep] = useState<"menu" | "report">("menu");
  const [reason, setReason] = useState<ReportReason>(REASONS[0]);
  const report = useSocialStore((s) => s.report);
  const block = useSocialStore((s) => s.block);
  const busy = useSocialStore((s) => s.busy);
  const muted = useVoiceStore((s) => !!p.id && !!s.mutedPeers[p.id]);
  const togglePeerMute = useVoiceStore((s) => s.togglePeerMute);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  async function run(action: Promise<void>) {
    await action;
    props.onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/35" onClick={props.onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={SHEET}
        aria-label={step === "menu" ? name : t("social.reportTitle")}
      >
        {step === "menu" ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={name} index={0} ring />
              <div className="flex flex-col">
                <span className="font-head text-h3 font-bold">{name}</span>
                <span className="text-[0.8125rem] text-ink2">
                  {t("social.inSession", { place: p.locationLabel ?? "" })}
                </span>
              </div>
            </div>
            <div className="rounded-card border border-line">
              <ActionRow
                icon={<Flag size={20} aria-hidden />}
                title={t("social.report")}
                hint={t("social.reportHint")}
                onClick={() => setStep("report")}
              />
              <div className="mx-4 h-px bg-line" />
              <ActionRow
                icon={<Prohibit size={20} className="text-flame-deep" aria-hidden />}
                danger
                title={t("social.block")}
                hint={t("social.blockHint")}
                disabled={busy}
                onClick={() => p.id && void run(block(p.id, name))}
              />
              <div className="mx-4 h-px bg-line" />
              <ActionRow
                icon={<SpeakerSlash size={20} aria-hidden />}
                hint={t("social.muteHint")}
                title={muted ? t("social.unmute") : t("social.mute")}
                onClick={() => {
                  if (p.id) togglePeerMute(p.id);
                  props.onClose();
                }}
              />
            </div>
            <Button type="button" kind="ghost" onClick={props.onClose}>
              {t("common.cancel")}
            </Button>
          </>
        ) : (
          <>
            <h2>{t("social.reportTitle")}</h2>
            <div role="radiogroup" aria-label={t("social.reportTitle")} className="rounded-card border border-line">
              {REASONS.map((value, i) => (
                <div key={value}>
                  {i > 0 && <div className="mx-4 h-px bg-line" />}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={reason === value}
                    className={ROW}
                    onClick={() => setReason(value)}
                  >
                    <span
                      aria-hidden
                      className={`h-5 w-5 flex-none rounded-full border-2 ${
                        reason === value ? "border-flame bg-flame" : "border-line2"
                      }`}
                    />
                    <span className="text-[0.875rem] font-bold">{t(`social.reason${value}`)}</span>
                  </button>
                </div>
              ))}
            </div>
            <p className="m-0 text-[0.8125rem] text-ink2">{t("social.reportNote", { name })}</p>
            <div className="flex gap-2">
              <Button type="button" kind="ghost" onClick={props.onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => p.id && void run(report(props.slug, p.id, name, reason, undefined))}
              >
                {t("social.send")}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
