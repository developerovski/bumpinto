import { Suspense, lazy, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MoonStars } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Note, Page } from "../components/atoms";
import JoinFormFields, { type JoinError } from "../components/molecules/JoinFormFields";
import JoinIntro from "../components/molecules/JoinIntro";
import LazyBoundary from "../components/molecules/LazyBoundary";
import TwoZone from "../components/molecules/TwoZone";
import WhoIsHere from "../components/molecules/WhoIsHere";
import type { ParticipantDto } from "@bumpinto/shared";
import { apiErrorCode } from "../lib/apiError";
import { approx } from "../lib/geo";
import { DEFAULT_TRAVEL_MODE, type TravelMode } from "../lib/travelMode";
import { useAuthStore } from "../store/authStore";
import { useSessionStore } from "../store/sessionStore";
import { useOwnLocation } from "../store/useOwnLocation";

/* Harita ayrı chunk (harita politikası §4.7) — tembel yüklenir. */
const MapView = lazy(() => import("../components/organisms/MapView"));

/** Kendi pinimizin id'si — gercek katilimci id'si henuz yok (katilim oncesi). */
const SELF_PIN = "self";

export default function JoinForm() {
  const { t } = useTranslation();
  const preview = useSessionStore((s) => s.preview);
  const join = useSessionStore((s) => s.join);
  const me = useAuthStore((s) => s.me);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<JoinError | null>(null);
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
        setError({ kind: "geocode", message: t("join.errGeocode") });
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
    } catch (e) {
      // Kod, prose değil: backend 409'u `participants_too_far_apart` ile işaretliyor, çünkü
      // kullanıcının yapabileceği somut bir şey var — host'tan sabit bir yer istemek.
      setError(apiErrorCode(e) === "participants_too_far_apart"
        ? { kind: "tooFar", message: t("join.errTooFar") }
        : { kind: "join", message: t("join.errJoin") });
    } finally {
      setSubmitting(false);
    }
  }

  // Artboard W4b: 409 ekrana bir kart eklediğinde giriş bloğu sıkışır ve sağdaki kart
  // özet şeridi yerine kişi başına satıra döner (4133 / 4229).
  const tooFar = error?.kind === "tooFar";

  return (
    <Page>
      <TwoZone
        // .zone gap 18px (artboard 1264) — varsayılan 16px değil.
        leftGap="md"
        // Artboard Katıl 390 (1344–1376): sağ bölge YOK — kart, harita ve el yazısı not
        // yalnız ≥1024'te çıkar.
        rightLgOnly
        left={
          <>
            <JoinIntro
              hostName={preview?.hostDisplayName ?? null}
              sessionName={preview?.name ?? null}
              activities={preview?.activityTypes ?? []}
              count={preview?.participantCount ?? 0}
              compact={tooFar}
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
              onTravelModeChange={handleTravelModeChange}
              onSubmit={submit}
            />
          </>
        }
        right={
          <WhoIsHere participants={preview?.participants ?? []} rows={tooFar} hostOnline={preview?.hostOnline}>
            {preview?.hostOnline === false && preview.hostDisplayName && (
              // Artboard W4b 1280 (4252–4255): host çevrimdışı notu SAĞ bölgede amber kart —
              // katılımı engellemez, bu yüzden formun akışından çıkarıldı.
              <div className="flex items-center gap-2.5 rounded-card border border-amber-line bg-amber-wash p-[0.75rem_0.875rem] shadow-sh1">
                <MoonStars size={19} aria-hidden className="flex-none text-amber" />
                <span className="flex-1 text-[0.75rem] text-ink">
                  {t("join.hostAway", { host: preview.hostDisplayName })}
                </span>
              </div>
            )}
            <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
              <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                <MapView
                  participants={ownPin}
                  pinLabels={{ [SELF_PIN]: t("map.youPending") }}
                  venues={[]}
                  midpoint={null}
                  radiusKm={null}
                  caption={t("map.locationsPending")}
                  // Artboard 1322: 290px (varsayılan 320px değil).
                  heightClass="h-[18.125rem]"
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
