import { Suspense, lazy } from "react";
import type { SessionView } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, HandNote, Note, Page } from "../components/atoms";
import ActivityBadges from "../components/molecules/ActivityBadges";
import LazyBoundary from "../components/molecules/LazyBoundary";
import SessionHeader from "../components/molecules/SessionHeader";
import TwoZone from "../components/molecules/TwoZone";
import PointsEditor from "../components/organisms/PointsEditor";
import VenuesLoading from "../components/organisms/VenuesLoading";
import { sessionActivities } from "../lib/activity";
import { useMediaQuery } from "../lib/useMediaQuery";
import { pointCount } from "../store/newSessionStore";
import { mapProps, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/* Harita ayrı chunk (harita politikası §4.7) — tembel yüklenir. */
const MapView = lazy(() => import("../components/organisms/MapView"));

/** SOLO host: sunucu taraflı nokta editörü + harita önizlemesi + "Mekanları bul". */
export default function SoloSetupPage({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const addPoint = useSessionStore((s) => s.addPoint);
  const removePoint = useSessionStore((s) => s.removePoint);
  const findVenues = useSessionStore((s) => s.findVenues);
  // İki ayrı kilit (K-W23): "Mekanları bul" tam ekran iskelete döner (LobbyPage deseni, artboard
  // W3e); nokta ekle/sil ise yerinde kalır — tek örnek paylaşılsaydı her nokta işleminde de
  // iskelet çıkardı.
  const points = useSessionAction();
  const find = useSessionAction();

  const participants = view.participants ?? [];
  const host = participants.find((p) => p.host) ?? null;
  const manual = participants.filter((p) => p.manual);
  const count = pointCount(host?.hasLocation ? { label: host.locationLabel } : null, manual);
  const activities = sessionActivities(view);
  // 390'da harita hiç mount edilmez (§4.7) — sağ bölge ve harita yalnız gerçek lg genişlikte
  // (JoinForm deseni: `lgOnly` + `TwoZone.rightLgOnly`); jsdom `matchMedia` uygulamıyor →
  // test-setup.ts'teki güdük varsayılan `false` döner, testler ghost'suz haritanın mount
  // olmadığını doğrulayabilir.
  const desktop = useMediaQuery("(min-width: 1024px)");

  if (find.busy) return <VenuesLoading view={view} />;

  return (
    <Page>
      <SessionHeader
        as="h1"
        title={view.name}
        badges={
          <>
            <ActivityBadges activities={activities} />
            <Badge>{t("sessions.solo")}</Badge>
          </>
        }
      />
      <TwoZone
        left={
          <>
            <PointsEditor
              own={host?.hasLocation ? { label: host.locationLabel ?? null } : null}
              points={manual.map((p) => ({
                displayName: p.displayName ?? "",
                locationLabel: p.locationLabel ?? null,
                travelMode: p.travelMode,
              }))}
              onAdd={(p) =>
                points.run(
                  () =>
                    addPoint({
                      displayName: p.displayName,
                      locationLabel: p.locationLabel ?? undefined,
                      lat: p.lat,
                      lng: p.lng,
                      travelMode: p.travelMode,
                    }),
                  "lobby.errPoint",
                )
              }
              onRemove={(i) => {
                const id = manual[i]?.id;
                if (id) void points.run(() => removePoint(id), "lobby.errPoint");
              }}
            />
            {/* Çapalı oturumda konum önkoşulu B-10'da düştü (DeckFlow.findVenues). */}
            <Button
              onClick={() => void find.run(findVenues, "lobby.errFind")}
              disabled={(!view.anchored && count < 2) || points.busy || find.busy}
            >
              {t("newSession.findVenues")}
            </Button>
            {/* Not, düğmeyle AYNI kapıya bağlı: açık bir düğmenin altında "En az 2 konum
                gerekir." yalan olurdu. */}
            {!view.anchored && (
              <Note>{count < 2 ? t("newSession.needTwo") : t("newSession.findHint", { count })}</Note>
            )}
            {points.error && <ErrorText>{points.error}</ErrorText>}
            {find.error && <ErrorText>{find.error}</ErrorText>}
          </>
        }
        right={
          <>
            {desktop && (
              <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                  <MapView
                    {...mapProps(view, t("map.you"), t("newSession.manual"))}
                    venues={[]}
                    caption={t("map.midpointOnly")}
                    lgOnly
                  />
                </Suspense>
              </LazyBoundary>
            )}
            <HandNote>{t("newSession.soloHand")}</HandNote>
          </>
        }
        rightLgOnly
      />
    </Page>
  );
}
