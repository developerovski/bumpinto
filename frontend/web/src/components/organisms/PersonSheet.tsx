/* Kaynak: artboard W20 frag 68/69/70 — scrim + alt sayfa; `lg+`'te sağ-alta yanaşır (`.dk .sheet`). */
import { Check, Flag, Prohibit, SpeakerSlash } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { useSocialStore, type ReportReason } from "../../store/socialStore";
import { useVoiceStore } from "../../store/voiceStore";
import { Avatar, Button } from "../atoms";

/** §2 sözleşmesi: `ReportRequest.reason` birliği. `satisfies` derlemede kilitler.
    Sıra artboard W20·Bildirildi (5794-5814) ile aynı: "Rahatsız edici ad" → "Sesli sohbette
    taciz" → "Sahte / spam" → "Başka". Tasarımın ilk satırının sunucuda karşılığı YOK
    (`ReportRequest.reason` yalnız HARASSMENT|SPAM|IMPERSONATION|OTHER kabul eder), bu yüzden
    enum uydurmak yerine metin var olan üyelere yeniden eşlendi: IMPERSONATION = "rahatsız edici
    ad" (ad üzerinden kimlik ihlali), HARASSMENT = "sesli sohbette taciz". Ayrı bir anlam gerekirse
    uçta `OFFENSIVE_NAME` üyesi istenmeli. */
const REASONS = ["IMPERSONATION", "HARASSMENT", "SPAM", "OTHER"] as const satisfies readonly ReportReason[];

/* Artboard `.srow.st` (521) ve sebep satırları (5796) aynı ölçüde: 12px/16px, 12px boşluk. */
const ROW = "flex w-full items-center gap-3 px-4 py-3 text-left";
/* `.sheet` (466): 28px üst yarıçap, 10/20/26px iç boşluk. `lg`: `.dk .sheet` (566) — ortalanmış
   modal değil, lobinin üstünde sağ-alta (48px/28px) yanaşan 420px'lik 24px yarıçaplı panel. */
const SHEET =
  "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[26rem] flex-col gap-3.5 rounded-t-[1.75rem] " +
  "border border-line bg-card px-5 pt-2.5 pb-[1.625rem] shadow-sh2 " +
  "lg:left-auto lg:right-12 lg:bottom-7 lg:mx-0 lg:w-[26.25rem] lg:max-w-none lg:rounded-[1.5rem]";
/* `.srow.st .ic` (522): 32px kum dolgulu, 10px yarıçaplı kutu; glif 17px. */
const CHIP = "flex h-8 w-8 flex-none items-center justify-center rounded-[0.625rem] bg-sand text-ink2";
/* `.grab` (468): 40×5px `--line2` tutamak. Yalnız alt sayfa halinde — `.dk`'de yok. */
const GRAB = "mx-auto mb-1 h-[5px] w-10 flex-none rounded-[3px] bg-line2 lg:hidden";

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
      <span className={CHIP}>{props.icon}</span>
      <span className="flex flex-col">
        {/* Artboard 5613 `.danger` — engelleme #B3261E; marka pembesi (flame-deep) uyarı
            değil vurgu rengidir. */}
        <span className={`text-[0.875rem] font-bold${props.danger ? " text-danger" : ""}`}>{props.title}</span>
        <span className="text-xs text-ink2">{props.hint}</span>
      </span>
    </button>
  );
}

/** `index`: satırdaki avatar renginin (avA/avB/avC…) aynısı. Artboard 5604'te alt sayfa başlığı
    kişinin KENDİ rengini taşır; liste sırasını yalnız `ParticipantList` bilir, o yüzden dışarıdan
    gelir. Verilmezse 0 — eski davranış. */
export default function PersonSheet(props: {
  slug: string;
  participant: ParticipantDto;
  index?: number;
  onClose: () => void;
}) {
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
      <div className="fixed inset-0 z-40 bg-ink/42" onClick={props.onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={SHEET}
        aria-label={step === "menu" ? name : t("social.reportTitle")}
      >
        <span aria-hidden className={GRAB} />
        {step === "menu" ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={name} index={props.index ?? 0} ring />
              <div className="flex flex-col">
                <span className="font-head text-h3 font-bold">{name}</span>
                <span className="text-[0.8125rem] text-ink2">
                  {t("social.inSession", { place: p.locationLabel ?? "" })}
                </span>
              </div>
            </div>
            <div className="rounded-card border border-line">
              <ActionRow
                icon={<Flag size={17} aria-hidden />}
                title={t("social.report")}
                hint={t("social.reportHint")}
                onClick={() => setStep("report")}
              />
              <div className="mx-4 h-px bg-line" />
              <ActionRow
                icon={<Prohibit size={17} className="text-danger" aria-hidden />}
                danger
                title={t("social.block")}
                hint={t("social.blockHint")}
                disabled={busy}
                onClick={() => p.id && void run(block(p.id, name))}
              />
              <div className="mx-4 h-px bg-line" />
              <ActionRow
                icon={<SpeakerSlash size={17} aria-hidden />}
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
                    {/* `.chk` (167-169): 26px daire, 1.5px `--line-in`; seçili = `--grad` dolgu + beyaz 14px tik. */}
                    <span
                      aria-hidden
                      className={`flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full border-[1.5px] ${
                        reason === value ? "border-transparent bg-[image:var(--grad)] text-white" : "border-line-in"
                      }`}
                    >
                      {reason === value && <Check size={14} />}
                    </span>
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
