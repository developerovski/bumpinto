import type { Schemas } from "@bumpinto/shared";
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button, ErrorText, HandNote, Heading, Note, Overline, Page } from "../components/atoms";
import ActivityPicker from "../components/molecules/ActivityPicker";
import Field from "../components/molecules/Field";
import InvitePreview from "../components/molecules/InvitePreview";
import LocationField from "../components/molecules/LocationField";
import TwoZone from "../components/molecules/TwoZone";
import TypeSelector from "../components/molecules/TypeSelector";
import MapView from "../components/organisms/MapView";
import PointsEditor from "../components/organisms/PointsEditor";
import { centroid } from "../lib/geo";
import { useAuthStore } from "../store/authStore";
import { pointCount, previewParticipants, useNewSessionStore } from "../store/newSessionStore";
import { useOwnLocation } from "../store/useOwnLocation";

type Activity = Schemas["CreateSessionRequest"]["activityType"];

/** Artboard W2 "Yeni oturum" — Grup: link kur; Bireysel: konumları elle ekle, harita önizlemesinde gör. */
export default function NewSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.me);
  const type = useNewSessionStore((s) => s.type);
  const activity = useNewSessionStore((s) => s.activity);
  const name = useNewSessionStore((s) => s.name);
  const points = useNewSessionStore((s) => s.points);
  const busy = useNewSessionStore((s) => s.busy);
  const error = useNewSessionStore((s) => s.error);
  const setType = useNewSessionStore((s) => s.setType);
  const setActivity = useNewSessionStore((s) => s.setActivity);
  const setName = useNewSessionStore((s) => s.setName);
  const addLocalPoint = useNewSessionStore((s) => s.addLocalPoint);
  const removeLocalPoint = useNewSessionStore((s) => s.removeLocalPoint);
  const submit = useNewSessionStore((s) => s.submit);
  const reset = useNewSessionStore((s) => s.reset);

  const loc = useOwnLocation({
    initial: me?.defaultLocation
      ? { lat: me.defaultLocation.lat, lng: me.defaultLocation.lng, label: me.defaultLocation.label ?? null }
      : null,
    autoDetect: true,
  });
  const own = loc.coords;
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    reset();
    if (me?.defaultActivity) setActivity(me.defaultActivity);
    // yalnız ilk mount'ta — reset ve varsayılan etkinlik
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    setSubmitting(true);
    try {
      setLocalError(null);
      const resolvedOwn = await loc.resolve();
      if (!resolvedOwn) {
        setLocalError(t(loc.address.trim() ? "join.errGeocode" : "join.errGeolocation"));
        return;
      }
      try {
        const slug = await submit(me?.displayName ?? "", resolvedOwn);
        navigate(`/j/${slug}`);
      } catch {
        // store zaten error anahtarını ayarladı
      }
    } finally {
      setSubmitting(false);
    }
  }

  const previewList = previewParticipants(own, points, me?.displayName ?? t("deck.travelSelf"));
  const midPoints = previewList
    .map((p) => p.approxLocation)
    .filter((p): p is { lat: number; lng: number } => p?.lat != null && p?.lng != null);
  const mid = centroid(midPoints);
  const labels = Object.fromEntries(
    previewList.map((p) => [
      p.id,
      p.id === "own" ? t("deck.travelSelf") : `${p.displayName} · ${t("newSession.manual")}`,
    ]),
  );
  const count = pointCount(own, points);
  const errorMessage = localError ?? (error ? t(error) : null);

  return (
    <Page>
      <Link to="/sessions">
        <ArrowLeft size={16} aria-hidden />
        {t("newSession.back")}
      </Link>
      <Heading>{t("newSession.title")}</Heading>
      <TwoZone
        left={
          <>
            <Overline>{t("newSession.how")}</Overline>
            <TypeSelector value={type} onChange={setType} />
            <Overline>{t("newSession.what")}</Overline>
            <ActivityPicker value={activity} onChange={(a) => setActivity(a as Activity)} />
            <Field
              id="session-name"
              label={`${t("newSession.name")} ${t("newSession.nameOptional")}`}
              placeholder={t("newSession.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <LocationField
              title={t("newSession.where")}
              state={loc.state}
              label={own?.label ?? null}
              address={loc.address}
              onAddressChange={loc.setAddress}
              onUseLocation={loc.detect}
              onOtherAddress={loc.otherAddress}
              otherLabel={t("newSession.orAddress")}
              inputId="session-address"
              busy={loc.busy}
            />
            {type === "GROUP" ? (
              <Button onClick={create} disabled={busy || submitting}>
                {t("newSession.createGroup")}
              </Button>
            ) : (
              <>
                <Button onClick={create} disabled={busy || submitting || count < 2}>
                  {t("newSession.findVenues")}
                </Button>
                <Note>{count < 2 ? t("newSession.needTwo") : t("newSession.findHint", { count })}</Note>
              </>
            )}
            {errorMessage && <ErrorText>{errorMessage}</ErrorText>}
          </>
        }
        right={
          type === "SOLO" ? (
            <>
              <PointsEditor own={own} points={points} onAdd={addLocalPoint} onRemove={removeLocalPoint} />
              <MapView
                participants={previewList}
                venues={[]}
                midpoint={mid}
                radiusKm={null}
                pinLabels={labels}
                caption={mid ? t("map.midpointOnly") : undefined}
              />
              <HandNote>{t("newSession.soloHand")}</HandNote>
            </>
          ) : (
            <InvitePreview hostName={me?.displayName ?? ""} sessionName={name} activity={activity} />
          )
        }
      />
    </Page>
  );
}
