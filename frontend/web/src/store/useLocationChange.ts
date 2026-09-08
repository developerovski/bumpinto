import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiErrorCode } from "../lib/apiError";
import { DEFAULT_TRAVEL_MODE, type TravelMode } from "../lib/travelMode";
import { useSessionStore } from "./sessionStore";
import { useOwnLocation } from "./useOwnLocation";

/** Oturuma katıldıktan SONRA konum/ulaşım değiştirme — Bekle ekranı ve Lobi ortak kullanır.
    İkisinde de aynı hata eşlemesi geçerli (`participants_too_far_apart` ayrı cümledir), bu
    yüzden mantık tek yerde: host'a lobide düğme eklerken kopyalansaydı iki yüzey ayrışırdı. */
export function useLocationChange(initialTravelMode?: TravelMode | null) {
  const { t } = useTranslation();
  const updateLocation = useSessionStore((s) => s.updateLocation);
  const loc = useOwnLocation();
  const [travelMode, setTravelMode] = useState<TravelMode>(initialTravelMode ?? DEFAULT_TRAVEL_MODE);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    setOpen((o) => !o);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      // LocationRequest.lat/lng zorunlu — yalnız ulaşım türü değişse de konum YENİDEN gönderilir
      // (sunucu viewer'a fuzzed approxLocation döner, gerçek koordinatı geri saklamaz).
      const resolved = await loc.resolve();
      if (!resolved) {
        setError(t(loc.address.trim() ? "join.errGeocode" : "join.errGeolocation"));
        return;
      }
      await updateLocation({ lat: resolved.lat, lng: resolved.lng, label: resolved.label ?? undefined, travelMode });
      setOpen(false);
    } catch (e) {
      setError(t(apiErrorCode(e) === "participants_too_far_apart" ? "join.errTooFar" : "waiting.errUpdate"));
    } finally {
      setBusy(false);
    }
  }

  return {
    loc,
    travelMode,
    setTravelMode,
    open,
    toggle,
    busy,
    error,
    submit,
    canSubmit: !!loc.coords || !!loc.address.trim(),
  };
}

export type LocationChange = ReturnType<typeof useLocationChange>;
