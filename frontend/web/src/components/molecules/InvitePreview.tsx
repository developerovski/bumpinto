import { Trans, useTranslation } from "react-i18next";
import { Avatar, Badge, HandNote, Highlight, Note, Overline } from "../atoms";
import ActivityBadges from "./ActivityBadges";

/** GRUP sağ bölge — davetlinin göreceği önizleme (spec §5 W2). */
export default function InvitePreview(props: { hostName: string; sessionName: string; activities: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Overline>{t("newSession.previewTitle")}</Overline>
      <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-[1.125rem_1.25rem] shadow-sh1">
        <div className="flex items-center gap-3">
          <Avatar name={props.hostName} ring />
          <span className="text-[0.875rem]">
            <Trans i18nKey="join.invitedBy" values={{ host: props.hostName }} components={[<strong key="0" />]} />
          </span>
        </div>
        <h2>{props.sessionName || <Trans i18nKey="join.title" components={[<Highlight key="0" />]} />}</h2>
        <div className="flex flex-wrap gap-2">
          <ActivityBadges activities={props.activities} />
          <Badge>{t("join.joinedCount", { count: 1 })}</Badge>
        </div>
        <Note>{t("join.subtitle")}</Note>
        <span className="font-mono text-[0.8125rem] text-ink3">{t("newSession.previewLink")}</span>
      </div>
      <HandNote>{t("newSession.previewHand")}</HandNote>
    </div>
  );
}
