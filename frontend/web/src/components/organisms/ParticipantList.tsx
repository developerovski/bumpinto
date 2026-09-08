/* Kaynak: ui.css .field / .row / .a-ov / .muted / .tab / .a-card / .a-dv */
import { HandWaving } from "@phosphor-icons/react";
import { Fragment, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Button, Overline, Progress } from "../atoms";
import ParticipantRow from "../molecules/ParticipantRow";
import PersonSheet from "./PersonSheet";
import { useSessionStore } from "../../store/sessionStore";
import { useSocialStore } from "../../store/socialStore";

/** Artboard W2 · "Kimler var" üst başlığı + sayaç + ilerleme çubuğu + satır kartı.
    Host'a dürt şeridi: çevrimdışı YA DA konumu gelmemiş kişileri tek tıkla dürtmesini sağlar
    (R-W6 kapısı) — sunucu 60 sn soğuma uygular, `socialStore` istemci kopyasıyla önden keser. */
export default function ParticipantList({
  participants,
  slug,
  isHost,
  hideNudge,
  anchored,
  steps,
}: {
  participants: ParticipantDto[];
  slug: string;
  isHost: boolean;
  /** Bekle ekranı `WaitingStatus` içinde ZATEN dürtme sunuyor (davetliye de açık); aynı sayfada
      iki dürtme yüzeyi olmasın diye o ekran bu şeridi kapatır. */
  hideNudge?: boolean;
  /** `SessionView.anchored` — çapalı oturumda konum ŞART DEĞİL: sayaç ve satırlar herkesi
      hazır sayar (artboard W3d 4013–4015: "1 / 1 hazır", %100). */
  anchored?: boolean;
  /** Artboard W3 1092–1099: adım şeridi "Kimler var" bloğunun İÇİNDE, ilerleme çubuğunun
      altında durur. Bileşen olarak değil slot olarak: Bekle ekranı onu başka yerde basıyor. */
  steps?: ReactNode;
}) {
  const { t } = useTranslation();
  const viewerId = useSessionStore((s) => s.view?.viewer?.participantId);
  const nudge = useSocialStore((s) => s.nudge);
  const canNudge = useSocialStore((s) => s.canNudge);
  const [sheetFor, setSheetFor] = useState<ParticipantDto | null>(null);
  // R-W6 kapısı: yalnız çevrimdışı YA DA konumu gelmemiş kişi dürtülür. Çapalıda konum
  // beklenmediği için "konumu yok" dürtme sebebi DEĞİLDİR — geriye yalnız çevrimdışı kalır.
  const waiting = participants.filter(
    (p) =>
      !!p.id && p.id !== viewerId && !p.manual && !p.blocked &&
      (p.online === false || (!anchored && !p.hasLocation)),
  );
  const ready = anchored ? participants.length : participants.filter((p) => p.hasLocation).length;
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
        {steps}
      </div>
      <div className="rounded-card border border-line bg-card py-0.5 shadow-sh1">
        {participants.map((p, i) => {
          // Kimlik sunucunun viewer alanından — ad eşlemesi yapılmaz.
          const isSelf = !!viewerId && viewerId === p.id;
          return (
            <Fragment key={p.id ?? i}>
              {i > 0 && <div className="mx-4 h-px bg-line" />}
              <ParticipantRow
                participant={p}
                index={i}
                isSelf={isSelf}
                anchored={anchored}
                onOptions={setSheetFor}
              />
            </Fragment>
          );
        })}
        {isHost && !hideNudge && waiting.length > 0 && (
          <>
            <div className="mx-4 h-px bg-line" />
            <div className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {waiting.map((p) => (
                  <Button key={p.id} type="button" kind="ghost" size="sm" disabled={!canNudge(p.id!)}
                    onClick={() => void nudge(slug, p.id!, p.displayName ?? "")}>
                    <HandWaving size={16} aria-hidden />
                    {t("presence.nudge", { name: p.displayName ?? "" })}
                  </Button>
                ))}
              </div>
              <span className="text-[0.8125rem] text-ink2">{t("presence.hostOnly")}</span>
            </div>
          </>
        )}
      </div>
      {sheetFor && <PersonSheet slug={slug} participant={sheetFor} onClose={() => setSheetFor(null)} />}
    </>
  );
}
