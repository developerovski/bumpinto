/* Kaynak: FinishedCard "Kim nerede" satırı + RunoffStatus oy satırı — aynı şekil (avatar + ad/"Sen"
   + tek rozet slotu), plan16 T3 coordinator düzeltmesi (T4'ün de ihtiyacı). `ParticipantRow`
   (Bekle ekranı) alt satır/konum etiketi taşıdığı için AYRI kalır — farklı şekil. */
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Avatar } from "../atoms";

export default function PersonRow(props: {
  participant: ParticipantDto;
  index: number;
  isSelf?: boolean;
  ring?: boolean;
  waiting?: boolean;
  /** Sağdaki tek rozet — çağıran tona/etikete karar verir (bitti/kaydırıyor, kilitli/seçiyor…). */
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const p = props.participant;
  return (
    <div role="listitem" className={`flex items-center gap-3 py-2.5 ${props.className ?? ""}`.trim()}>
      <Avatar name={p.displayName ?? "?"} index={props.index} ring={props.ring} waiting={props.waiting} />
      <span className="flex-1 text-left text-[0.875rem] font-semibold">
        {props.isSelf ? t("travel.self") : p.displayName}
      </span>
      {props.children}
    </div>
  );
}
