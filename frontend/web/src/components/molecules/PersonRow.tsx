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
  /** Artboard `.av-s` (29px) roster satırı; varsayılan 44px kalır (mevcut çağıranlar değişmez). */
  size?: "md" | "xs";
  /** Artboard `.avw > .od` — çevrimiçi noktası + `.off` soluk satır. `ParticipantRow` ile AYNI
      kural: `online` sunucudan gelir, istemci canlılık türetmez; elle eklenen noktada gösterilmez. */
  presence?: boolean;
  /** Sağdaki tek rozet — çağıran tona/etikete karar verir (bitti/kaydırıyor, kilitli/seçiyor…). */
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const p = props.participant;
  const away = props.presence === true && p.online === false && !p.manual;
  const online = props.presence === true && p.online !== false && !p.manual;
  return (
    <div
      role="listitem"
      /* Artboard `.srow` (3564, 3576, 3589 / 3711): dikey dolgu 11px. */
      className={`flex items-center gap-3 py-[0.6875rem]${away ? " opacity-55" : ""} ${props.className ?? ""}`.trim()}
    >
      <span className="relative inline-flex flex-none rounded-full">
        <Avatar
          name={p.displayName ?? "?"}
          index={props.index}
          ring={props.ring}
          waiting={props.waiting}
          size={props.size ?? "md"}
        />
        {online && (
          <i
            data-testid="online-dot"
            aria-hidden
            /* Artboard 438: `right:-1px;bottom:-1px`. */
            className="absolute -right-px -bottom-px h-3 w-3 rounded-full border-2 border-card bg-grass"
          />
        )}
      </span>
      <span className="flex-1 text-left text-[0.875rem] font-semibold">
        {/* Artboard 3448/3711: kendi satırın da ADINLA yazılır, "(sen)" yalnız ek — üç kişilik
            roster'da "Sen" satırı kimin olduğunu ekran görüntüsünde okunaksız kılıyordu. */}
        {p.displayName}
        {props.isSelf && <span className="font-normal text-ink2"> {t("waiting.you")}</span>}
        {away && <span className="ml-1.5 font-normal text-ink2">· {t("waiting.offline")}</span>}
      </span>
      {props.children}
    </div>
  );
}
