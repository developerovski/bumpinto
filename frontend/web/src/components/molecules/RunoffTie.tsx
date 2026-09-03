/* Kaynak: artboard Runoff 1280 sağ kart — beraberlik dalı (kilitli kartın amber ikizi) */
import { Scales } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { VenueDto as Venue } from "@bumpinto/shared";
import { Button, ErrorText } from "../atoms";
import VoteTally from "./VoteTally";

/**
 * Eleme berabere bittiğinde sağ kolon. Host'a karar butonu, diğerlerine kimin karar verdiği.
 *
 * Kilitli kart ("diğerlerini bekliyoruz") burada YANLIŞTIR: herkes oy vermiştir, beklenecek
 * kimse yoktur. Bu dal olmadan oturum RUNOFF'ta sonsuza kadar kilitli kalıyordu — sunucu
 * beraberlikte kararı bilerek host'un force-decision'ına bırakıyor (spec §4).
 */
export default function RunoffTie(props: {
  host: boolean;
  hostName: string;
  choice: string | null;
  sending: boolean;
  onDecide: () => void;
  onFair: () => void;
  error?: string | null;
  /** Sunucu-kapılı: herkes oy verince dolu gelir (B-7:T2) — beraberlikte ARTIK burada, tek erişilebilir
      yerde gösterilir (RunoffStatus'un aynı koşulu RunoffScreen yönlendirmesinden hiç geçmiyor). */
  tally?: Record<string, number>;
  finalists?: Venue[];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3.5 rounded-card border border-[#f2ddb0] bg-amber-wash p-[1.375rem] shadow-sh1">
      <div className="flex items-center gap-[0.6875rem]">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-amber text-white">
          <Scales size={17} aria-hidden />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.875rem] font-bold text-amber">{t("runoff.tieTitle")}</span>
          <span className="text-[0.75rem] text-ink2">
            {props.host ? t("runoff.tieHostCopy") : t("runoff.tieGuestCopy", { host: props.hostName })}
          </span>
        </div>
      </div>
      {props.tally && props.finalists && <VoteTally tally={props.tally} finalists={props.finalists} />}
      {props.host && (
        <>
          <Button type="button" onClick={props.onDecide} disabled={!props.choice || props.sending}>
            {t("runoff.tieDecide")}
          </Button>
          {/* B-7'de uç YOK: en adil finalist istemcide seçilir (min fark → min toplam → puan → id)
              ve mevcut force-decision ile gönderilir (fairestOf, @bumpinto/shared). */}
          <Button type="button" kind="white" onClick={props.onFair} disabled={props.sending}>
            {t("runoff.tieFair")}
          </Button>
          {props.error && <ErrorText>{props.error}</ErrorText>}
        </>
      )}
    </div>
  );
}
