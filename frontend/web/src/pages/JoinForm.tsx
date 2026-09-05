import { Suspense, lazy, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Note, Page } from "../components/atoms";
import JoinFormFields from "../components/molecules/JoinFormFields";
import JoinIntro from "../components/molecules/JoinIntro";
import LazyBoundary from "../components/molecules/LazyBoundary";
import TwoZone from "../components/molecules/TwoZone";
import WhoIsHere from "../components/molecules/WhoIsHere";
import type { ParticipantDto } from "@bumpinto/shared";
import { DEFAULT_MAP_CENTER, approx } from "../lib/geo";
import { DEFAULT_TRAVEL_MODE, type TravelMode } from "../lib/travelMode";
import { useAuthStore } from "../store/authStore";
import { useSessionStore } from "../store/sessionStore";
import { useOwnLocation } from "../store/useOwnLocation";

/* Harita ayrı chunk (harita politikası §4.7) — tembel yüklenir. */
const MapView = lazy(() => import("../components/organisms/MapView"));
/* Seçici de ayrı chunk VE yalnız düğmeye basılınca render edilir: faturalanan birim
   `new google.maps.Map()` örneğidir, sayfa yüklemesi değil. */
const MapPicker = lazy(() => import("../components/organisms/MapPicker"));

/** Kendi pinimizin id'si — gercek katilimci id'si henuz yok (katilim oncesi). */
const SELF_PIN = "self";

export default function JoinForm() {
  const { t } = useTranslation();
  const preview = useSessionStore((s) => s.preview);
  const join = useSessionStore((s) => s.join);
  const me = useAuthStore((s) => s.me);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>(me?.defaultTravelMode ?? DEFAULT_TRAVEL_MODE);
  // profil `me` çoğu zaman bu sayfa ilk render edildiğinde henüz yüklenmemiştir (davet linki
  // taze sayfa yüklemesiyle açılır) — geldiğinde ön-doldur, ama kullanıcı elle seçtiyse üzerine yazma.
  const travelModeTouched = useRef(false);
  useEffect(() => {
    if (!travelModeTouched.current && me?.defaultTravelMode) setTravelMode(me.defaultTravelMode);
  }, [me]);
  function handleTravelModeChange(mode: TravelMode) {
    travelModeTouched.current = true;
    setTravelMode(mode);
  }
  const loc = useOwnLocation({ autoDetect: true });

  // Artboard W4: harita katilmadan once de KENDI konumunu gosterir ("sen · katilinca").
  // Baskalarinin konumu burada yok — preview DTO'su onlari tasimaz (davetli anonimdir).
  const ownPin: ParticipantDto[] = useMemo(
    () =>
      loc.coords
        ? [{
            id: SELF_PIN,
            // Isim yazilana kadar bos — participantPin "?" gosterir; artboard'da
            // avatar isim bas harfidir.
            displayName: name.trim(),
            host: false,
            hasLocation: true,
            deckDone: false,
            // Artboard .pin-av.man: katilim ONCESI kendi pinin kesikli/beyazdir,
            // "henuz kesinlesmedi" anlaminda. Konum izniyle ilgisi yok.
            manual: true,
            approxLocation: approx({ lat: loc.coords.lat, lng: loc.coords.lng }),
          }]
        : [],
    [loc.coords, name],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const location = await loc.resolve();
      if (!location && loc.address.trim()) {
        setError(t("join.errGeocode"));
        return;
      }
      // token HttpOnly cookie'de — web'de saklanmaz; join() görünümü tazeler
      await join({
        displayName: name.trim(),
        lat: location?.lat,
        lng: location?.lng,
        locationLabel: location?.label ?? undefined,
        travelMode,
      });
    } catch {
      setError(t("join.errJoin"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      <TwoZone
        left={
          <>
            <JoinIntro
              hostName={preview?.hostDisplayName ?? null}
              sessionName={preview?.name ?? null}
              activities={preview?.activityTypes ?? []}
              count={preview?.participantCount ?? 0}
              hostOnline={preview?.hostOnline}
            />
            <JoinFormFields
              name={name}
              address={loc.address}
              locationState={loc.state}
              locationLabel={loc.coords?.label ?? null}
              locationBusy={loc.busy}
              travelMode={travelMode}
              error={error}
              busy={submitting}
              onNameChange={setName}
              onAddressChange={loc.setAddress}
              onUseLocation={loc.detect}
              onOtherAddress={loc.otherAddress}
              onPickOnMap={() => setPickerOpen(true)}
              onTravelModeChange={handleTravelModeChange}
              onSubmit={submit}
            />
            {pickerOpen && (
              <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                  <MapPicker
                    center={loc.coords ?? DEFAULT_MAP_CENTER}
                    onPick={(picked) => {
                      loc.setPicked(picked);
                      setPickerOpen(false);
                    }}
                    onCancel={() => setPickerOpen(false)}
                  />
                </Suspense>
              </LazyBoundary>
            )}
          </>
        }
        right={
          <WhoIsHere participants={preview?.participants ?? []}>
            <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
              <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                <MapView
                  participants={ownPin}
                  pinLabels={{ [SELF_PIN]: t("map.youPending") }}
                  venues={[]}
                  midpoint={null}
                  radiusKm={null}
                  caption={t("map.midpointPending")}
                  lgOnly
                />
              </Suspense>
            </LazyBoundary>
          </WhoIsHere>
        }
      />
    </Page>
  );
}
