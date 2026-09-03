import type { SessionView } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, Page } from "../components/atoms";
import ActivityBadge from "../components/molecules/ActivityBadge";
import AvatarRow from "../components/molecules/AvatarRow";
import SessionHeader from "../components/molecules/SessionHeader";
import VenueBrowser from "../components/organisms/VenueBrowser";
import { GROUP_TINT, groupOf, sessionActivity } from "../lib/activity";
import { track } from "../lib/analytics";
import { useTravelLabels } from "../lib/useTravelLabels";
import { isHost, mapProps, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/** Artboard Mekanlar 1280/390 · BROWSING — mekan listesi/harita + host karıştır aksiyonu. */
export default function VenuesPage({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const host = isHost(view);
  const solo = view.sessionType === "SOLO";
  const mode = solo ? "solo" : host ? "host" : "guest";
  const shuffle = useSessionStore((s) => s.shuffle);
  const pick = useSessionStore((s) => s.pick);
  const { run, busy, error } = useSessionAction();
  const travel = useTravelLabels(view);
  const activity = sessionActivity(view);
  const tint = GROUP_TINT[groupOf(activity)];
  const mp = mapProps(view, t("map.you"), solo ? t("newSession.manual") : undefined);
  // Sıralama artık sayfada yapılmaz — VenueBrowser saf fonksiyonlarla (byFairness/byRating) sıralar.
  const venues = view.venues ?? [];
  const participants = view.participants ?? [];

  const action =
    host && !solo ? (
      <AvatarRow names={participants.map((p) => p.displayName ?? "?")}>
        <Button type="button" size="fit" disabled={busy} onClick={() => void run(shuffle, "venues.errShuffle")}>
          {t("venues.shuffle")}
        </Button>
      </AvatarRow>
    ) : solo ? (
      <Badge>{t("venues.soloBadge", { count: participants.length })}</Badge>
    ) : (
      <Badge tone="amber">{t("venues.guestWait")}</Badge>
    );

  return (
    <Page wide>
      <SessionHeader
        title={view.name}
        meta={
          view.radiusKm != null
            ? t("venues.meta", { count: venues.length, km: Math.round(view.radiusKm) })
            : t("venues.metaNoRadius", { count: venues.length })
        }
        badges={<ActivityBadge activity={activity} />}
        action={action}
      />
      {error && <ErrorText>{error}</ErrorText>}
      <VenueBrowser
        venues={venues}
        participants={mp.participants}
        midpoint={mp.midpoint}
        radiusKm={mp.radiusKm}
        mode={mode}
        travel={travel}
        onPick={(id) => void run(() => pick(id), "venues.errPick")}
        tint={tint}
        pinLabels={mp.pinLabels}
        midpointLabel={view.midpointLabel}
        onMapOpen={() => track("map_open", { screen: "venues" })}
      />
    </Page>
  );
}
