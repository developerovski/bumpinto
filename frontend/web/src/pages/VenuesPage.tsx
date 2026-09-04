import type { SessionView } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, Note, Page } from "../components/atoms";
import ActivityBadge from "../components/molecules/ActivityBadge";
import AvatarRow from "../components/molecules/AvatarRow";
import SessionHeader from "../components/molecules/SessionHeader";
import ShareButton from "../components/molecules/ShareButton";
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

  // Sunucu kapisinin (409) AYNISI: konumu olan, elle eklenmemis ve odada olan katilimci >= 2.
  // `online` alani yoksa cevrimici sayilir — bilgi gelmeden host'un onune duvar cikmaz.
  const inRoom = participants.filter((p) => !p.manual && p.hasLocation && p.online !== false).length;

  const action =
    host && !solo ? (
      <AvatarRow people={participants}>
        {/* Katilim BROWSING'de hala acik (SessionCommands.CLOSED_TO_NEW_SEATS) — link de burada
            olmali, yoksa kural izin verirken arayuz araci vermiyor. SOLO'da yok: o oturumun
            davet linki hic calismaz. */}
        <ShareButton
          text={t("venues.inviteText", { name: view.name })}
          url={`${location.origin}/j/${view.slug ?? ""}`}
          label={t("venues.invite")}
          copiedLabel={t("lobby.copied")}
          kind="white"
          size="fit"
          copyOnly
        />
        <Button
          type="button"
          size="fit"
          disabled={busy || inRoom < 2}
          onClick={() => void run(shuffle, "venues.errShuffle", { "participants present": "venues.errAlone" })}
        >
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
      {/* Sessizce olu buton olmaz: kapaliysa sebebi ve cikisi yazili. */}
      {host && !solo && inRoom < 2 && !error && <Note center>{t("venues.needTwo")}</Note>}
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
