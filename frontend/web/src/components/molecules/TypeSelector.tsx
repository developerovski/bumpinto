import { MapPin, ShareNetwork } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { SessionType } from "../../store/newSessionStore";
import Segmented from "./Segmented";
import TypeCard from "./TypeCard";

/** "Nasıl buluşuyorsunuz?" — ≥lg iki kart yan yana, <lg segment + seçilen tipin açıklaması. */
export default function TypeSelector(props: { value: SessionType; onChange: (t: SessionType) => void }) {
  const { t } = useTranslation();
  const copy = props.value === "GROUP" ? t("newSession.groupCopy") : t("newSession.soloCopy");
  return (
    <>
      <div role="radiogroup" aria-label={t("newSession.how")} className="hidden gap-3 lg:flex">
        <TypeCard
          icon={ShareNetwork}
          title={t("newSession.group")}
          copy={t("newSession.groupCopy")}
          selected={props.value === "GROUP"}
          onSelect={() => props.onChange("GROUP")}
        />
        <TypeCard
          icon={MapPin}
          title={t("newSession.solo")}
          copy={t("newSession.soloCopy")}
          selected={props.value === "SOLO"}
          onSelect={() => props.onChange("SOLO")}
        />
      </div>
      <div className="flex flex-col gap-2 lg:hidden">
        <Segmented
          value={props.value}
          onChange={props.onChange}
          ariaLabel={t("newSession.how")}
          options={[
            { value: "GROUP", label: t("newSession.group") },
            { value: "SOLO", label: t("newSession.solo") },
          ]}
        />
        <span className="text-[0.8125rem] text-ink2">{copy}</span>
      </div>
    </>
  );
}
