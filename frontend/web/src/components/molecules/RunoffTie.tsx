/* Kaynak: artboard Runoff 1280 sağ kart — beraberlik dalı (kilitli kartın amber ikizi) */
import { Scales } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Button, ErrorText } from "../atoms";

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
  error?: string | null;
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
      {props.host && (
        <>
          <Button type="button" onClick={props.onDecide} disabled={!props.choice || props.sending}>
            {t("runoff.tieDecide")}
          </Button>
          {props.error && <ErrorText>{props.error}</ErrorText>}
        </>
      )}
    </div>
  );
}
