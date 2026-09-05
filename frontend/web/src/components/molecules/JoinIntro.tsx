/* Kaynak: ui.css .field(gap:12) / .row / .muted / .a-dv — artboard Katıl 1280/390 */
import { Trans, useTranslation } from "react-i18next";
import { Avatar, Badge, Highlight, Note } from "../atoms";
import ActivityBadges from "./ActivityBadges";

/** Artboard W1 · davet başlığı bloğu + onu formdan ayıran saç teli ayraç.
    Oturum adı/etkinlik/katılımcı sayısı sunucu önizlemesinden (preview) gelir. */
export default function JoinIntro(props: {
  hostName: string | null;
  sessionName: string | null;
  activities: string[];
  count: number;
  /** Host su an oturumda mi. KAPI DEGIL: katilim her durumda acik — davet linkinin ana akisi
      asenkrondur (host linki paylasip telefonu kilitler). */
  hostOnline?: boolean;
}) {
  const { t } = useTranslation();
  const trimmedName = props.sessionName?.trim() ?? "";
  const words = trimmedName ? trimmedName.split(/\s+/) : [];
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={props.hostName ?? "B"} ring />
          <span>
            {props.hostName ? (
              <Trans i18nKey="join.invitedBy" values={{ host: props.hostName }} components={[<strong key="0" />]} />
            ) : (
              t("join.invited")
            )}
          </span>
        </div>
        {trimmedName ? (
          <h1>
            <Highlight>{words[0]}</Highlight>
            {words.length > 1 ? ` ${words.slice(1).join(" ")}` : null}
          </h1>
        ) : (
          <h1>
            <Trans i18nKey="join.title" components={[<Highlight key="0" />]} />
          </h1>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <ActivityBadges activities={props.activities} />
          <Badge>{t("join.joinedCount", { count: props.count })}</Badge>
        </div>
        <Note>{t("join.subtitle")}</Note>
        {props.hostOnline === false && props.hostName && (
          <Note>{t("join.hostAway", { host: props.hostName })}</Note>
        )}
      </div>
      <div className="h-px bg-line" />
    </>
  );
}
