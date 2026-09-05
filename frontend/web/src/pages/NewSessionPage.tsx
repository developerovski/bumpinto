import type { Schemas } from "@bumpinto/shared";
import { ArrowLeft } from "@phosphor-icons/react";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button, ErrorText, HandNote, Heading, Note, Overline, Page } from "../components/atoms";
import ActivityPicker from "../components/molecules/ActivityPicker";
import Field from "../components/molecules/Field";
import InvitePreview from "../components/molecules/InvitePreview";
import LazyBoundary from "../components/molecules/LazyBoundary";
import LocationField from "../components/molecules/LocationField";
import Segmented from "../components/molecules/Segmented";
import TravelModeField from "../components/molecules/TravelModeField";
import TwoZone from "../components/molecules/TwoZone";
import TypeSelector from "../components/molecules/TypeSelector";
import PointsEditor from "../components/organisms/PointsEditor";
import { MAX_ACTIVITIES } from "../lib/activity";
import { DEFAULT_MAP_CENTER, centroid } from "../lib/geo";
import { geocode } from "../lib/geocode";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useAuthStore } from "../store/authStore";
import { pointCount, previewParticipants, useNewSessionStore } from "../store/newSessionStore";
import { useOwnLocation } from "../store/useOwnLocation";

/* Harita ayrı chunk (harita politikası §4.7) — tembel yüklenir. */
const MapView = lazy(() => import("../components/organisms/MapView"));
/* Seçici de ayrı chunk VE yalnız düğmeye basılınca render edilir: faturalanan birim
   `new google.maps.Map()` örneğidir, sayfa yüklemesi değil. */
const MapPicker = lazy(() => import("../components/organisms/MapPicker"));

type Activity = Schemas["CreateSessionRequest"]["activityTypes"][number];

/** Artboard W2 "Yeni oturum" — Grup: link kur; Bireysel: konumları elle ekle, harita önizlemesinde gör. */
export default function NewSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.me);
  const type = useNewSessionStore((s) => s.type);
  const activities = useNewSessionStore((s) => s.activities);
  const name = useNewSessionStore((s) => s.name);
  const points = useNewSessionStore((s) => s.points);
  const travelMode = useNewSessionStore((s) => s.travelMode);
  const busy = useNewSessionStore((s) => s.busy);
  const error = useNewSessionStore((s) => s.error);
  const setType = useNewSessionStore((s) => s.setType);
  const toggleActivity = useNewSessionStore((s) => s.toggleActivity);
  const setName = useNewSessionStore((s) => s.setName);
  const setTravelMode = useNewSessionStore((s) => s.setTravelMode);
  const anchorMode = useNewSessionStore((s) => s.anchorMode);
  const anchor = useNewSessionStore((s) => s.anchor);
  const setAnchorMode = useNewSessionStore((s) => s.setAnchorMode);
  const setAnchor = useNewSessionStore((s) => s.setAnchor);
  const addLocalPoint = useNewSessionStore((s) => s.addLocalPoint);
  const removeLocalPoint = useNewSessionStore((s) => s.removeLocalPoint);
  const setLocalPointTravelMode = useNewSessionStore((s) => s.setLocalPointTravelMode);
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
  const [anchorQuery, setAnchorQuery] = useState("");
  const [picker, setPicker] = useState<"own" | "anchor" | null>(null);
  /** İstek kuşağı: haritadan seçim ya da yeni bir sorgu araya girerse geç dönen Nominatim
      cevabı çapayı ele geçiremesin (`useOwnLocation`'ın `addressRef` koruması ile aynı sınıf). */
  const anchorReq = useRef(0);

  /** Adres yazıp alandan çıkınca çözülür — her tuşta değil: Nominatim politikası. */
  async function resolveAnchor() {
    const q = anchorQuery.trim();
    const gen = ++anchorReq.current;
    // Alan boşaltıldıysa çapa DA düşer: görünmeyen bir çapayla oturum kurulmaz.
    if (!q) {
      setAnchor(null);
      return;
    }
    const found = await geocode(q);
    if (anchorReq.current !== gen) return; // bayat cevap
    if (found) {
      setAnchor(found);
      setLocalError(null);
    } else {
      setLocalError(t("join.errGeocode"));
    }
  }

  useEffect(() => {
    reset((me?.defaultActivity as Activity) ?? undefined);
    if (me?.defaultTravelMode) setTravelMode(me.defaultTravelMode);
    // yalnız ilk mount'ta — reset ve varsayılan etkinlik/ulaşım
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    setSubmitting(true);
    try {
      setLocalError(null);
      const resolvedOwn = await loc.resolve();
      // Çapalı oturumda host'un konumu ZORUNLU DEĞİL: modun var oluş sebebi sürtünmeyi
      // kaldırmak. Veren host için yol süresi yine hesaplanır.
      if (!resolvedOwn && anchorMode !== "ANCHOR") {
        setLocalError(t(loc.address.trim() ? "join.errGeocode" : "join.errGeolocation"));
        return;
      }
      if (anchorMode === "ANCHOR" && !anchor) {
        setLocalError(t("newSession.errNoAnchor"));
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
  // 390'da harita hiç mount edilmez (§4.7) — SOLO'da sağ bölge ve harita yalnız gerçek lg
  // genişlikte (JoinForm deseni: `lgOnly` + `TwoZone.rightLgOnly`); jsdom `matchMedia`
  // uygulamıyor → test-setup.ts'teki güdük varsayılan `false` döner, testler ghost'suz
  // haritanın mount olmadığını doğrulayabilir. GRUP'ta sağ bölge (davet önizlemesi) 390'da
  // görünür kalır — yalnız SOLO'nun harita kolonu gizlenir.
  const desktop = useMediaQuery("(min-width: 1024px)");

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
            <Note>{t("newSession.whatHint", { max: MAX_ACTIVITIES })}</Note>
            <ActivityPicker value={activities} onToggle={toggleActivity} />
            <Field
              id="session-name"
              label={`${t("newSession.name")} ${t("newSession.nameOptional")}`}
              placeholder={t("newSession.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Overline>{t("newSession.meetWhere")}</Overline>
            <Segmented
              value={anchorMode}
              onChange={(m) => {
                setAnchorMode(m);
                // Moddan çıkarken alan da temizlenir: dolu görünen ama store'da karşılığı
                // olmayan bir adres kullanıcıyı çıkmaza sokuyordu.
                if (m === "MIDPOINT") setAnchorQuery("");
              }}
              ariaLabel={t("newSession.meetWhere")}
              options={[
                { value: "MIDPOINT", label: t("newSession.modeMidpoint") },
                { value: "ANCHOR", label: t("newSession.modeAnchor") },
              ]}
            />
            {anchorMode === "ANCHOR" && (
              <>
                <Field
                  id="session-anchor"
                  label={t("newSession.anchorLabel")}
                  placeholder={t("newSession.anchorPlaceholder")}
                  value={anchorQuery}
                  onChange={(e) => setAnchorQuery(e.target.value)}
                  onBlur={() => void resolveAnchor()}
                />
                <Note>{anchor ? t("newSession.anchorSet", { label: anchor.label ?? "" }) : t("newSession.anchorHint")}</Note>
                <button
                  type="button"
                  onClick={() => setPicker("anchor")}
                  className="self-start text-[0.75rem] font-normal text-flame-deep underline-offset-2 hover:underline focus-visible:underline"
                >
                  {t("map.pickOnMap")}
                </button>
              </>
            )}
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
              onPickOnMap={() => setPicker("own")}
            />
            <TravelModeField value={travelMode} onChange={setTravelMode} />
            {picker && (
              <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                  <MapPicker
                    center={anchor ?? own ?? DEFAULT_MAP_CENTER}
                    onPick={(picked) => {
                      if (picker === "anchor") {
                        anchorReq.current += 1; // uçuştaki geocode cevabını geçersiz kıl
                        setAnchor(picked);
                        setAnchorQuery(picked.label ?? "");
                      } else {
                        loc.setPicked(picked);
                      }
                      setPicker(null);
                    }}
                    onCancel={() => setPicker(null)}
                  />
                </Suspense>
              </LazyBoundary>
            )}
            {type === "GROUP" ? (
              <Button onClick={create} disabled={busy || submitting}>
                {t("newSession.createGroup")}
              </Button>
            ) : (
              <>
                <Button onClick={create} disabled={busy || submitting || (anchorMode !== "ANCHOR" && count < 2)}>
                  {t("newSession.findVenues")}
                </Button>
                {/* Not, düğmeyle AYNI kapıya bağlı: çapalı modda iki nokta şartı düştüğü için
                    "En az 2 konum gerekir." açık bir düğmenin altında yalan olurdu. */}
                {anchorMode !== "ANCHOR" && (
                  <Note>{count < 2 ? t("newSession.needTwo") : t("newSession.findHint", { count })}</Note>
                )}
              </>
            )}
            {errorMessage && <ErrorText>{errorMessage}</ErrorText>}
          </>
        }
        right={
          type === "SOLO" ? (
            <>
              <PointsEditor
                own={own}
                points={points}
                onAdd={addLocalPoint}
                onRemove={removeLocalPoint}
                onModeChange={setLocalPointTravelMode}
              />
              {desktop && (
                <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                  <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                    <MapView
                      participants={previewList}
                      venues={[]}
                      midpoint={mid}
                      radiusKm={null}
                      pinLabels={labels}
                      caption={mid ? t("map.midpointOnly") : undefined}
                      lgOnly
                    />
                  </Suspense>
                </LazyBoundary>
              )}
              <HandNote>{t("newSession.soloHand")}</HandNote>
            </>
          ) : (
            <InvitePreview hostName={me?.displayName ?? ""} sessionName={name} activities={activities} />
          )
        }
        rightLgOnly={type === "SOLO"}
      />
    </Page>
  );
}
