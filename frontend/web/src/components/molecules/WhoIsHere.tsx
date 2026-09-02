/* Kaynak: artboard Katıl 1280 sağ kart "Kimler var" — preview verisi (id/koordinat yok) */
import type { ReactNode } from "react";
import type { Schemas } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Avatar, HandNote, Overline } from "../atoms";

type Row = Schemas["PreviewParticipantDto"];

export default function WhoIsHere(props: { participants: Row[]; children?: ReactNode }) {
  const { t, i18n } = useTranslation();
  const ready = props.participants.filter((p) => p.hasLocation);
  const names = new Intl.ListFormat(i18n.resolvedLanguage ?? i18n.language, { type: "conjunction" })
    .format(ready.map((p) => p.displayName ?? "?"));
  return (
    <>
      {props.participants.length > 0 && (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-[1.125rem_1.25rem] shadow-sh1">
          <div className="flex items-center justify-between">
            <Overline>{t("waiting.who")}</Overline>
            <span className="text-[0.75rem] text-ink2 tabular-nums">{t("waiting.readyCount", { ready: ready.length, total: props.participants.length })}</span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="flex gap-1.5">
              {props.participants.map((p, i) => (
                <Avatar key={i} name={p.displayName ?? "?"} index={i} ring={!!p.hasLocation} waiting={!p.hasLocation} />
              ))}
            </div>
            {ready.length > 0 && (
              <span className="text-[0.8125rem] leading-[1.45] text-ink2">{t("join.whoCopy", { names })}</span>
            )}
          </div>
        </div>
      )}
      {props.children}
      <HandNote>{t("join.hand")}</HandNote>
    </>
  );
}
