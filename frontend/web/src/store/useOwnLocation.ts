import { useEffect, useRef, useState } from "react";
import { geocode, reverseGeocode, type Coords } from "../lib/geocode";

export type LocationState = "idle" | "granted" | "denied";

/** Konum/adres akışı — JoinForm, NewSessionPage ve profil paneli ortak kullanır. */
export function useOwnLocation(opts: { initial?: Coords | null; autoDetect?: boolean } = {}) {
  const [state, setState] = useState<LocationState>(opts.initial ? "granted" : "idle");
  const [coords, setCoords] = useState<Coords | null>(opts.initial ?? null);
  const [address, setAddressState] = useState("");
  const [busy, setBusy] = useState(false);
  const addressRef = useRef("");
  const mountedRef = useRef(true);

  function runDetect() {
    if (!("geolocation" in navigator)) {
      setState("denied");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        void (async () => {
          const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (!mountedRef.current) return;
          // kullanıcı bu arada adres yazdıysa geç gelen otomatik konumu üzerine yazma
          if (!addressRef.current.trim()) {
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, label });
            setState("granted");
          }
          setBusy(false);
        })();
      },
      () => {
        if (mountedRef.current) {
          setState("denied");
          setBusy(false);
        }
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  useEffect(() => {
    mountedRef.current = true;
    if (!opts.initial && opts.autoDetect && "geolocation" in navigator) runDetect();
    return () => {
      mountedRef.current = false;
    };
    // yalnız ilk mount'ta — konum izni bir kez otomatik istenir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setAddress(v: string) {
    setAddressState(v);
    addressRef.current = v;
    setCoords(null);
  }

  function detect() {
    setAddressState("");
    addressRef.current = "";
    runDetect();
  }

  function otherAddress() {
    setState("idle");
    setCoords(null);
  }

  async function resolve(): Promise<Coords | null> {
    if (coords) return coords;
    if (!address.trim()) return null;
    const c = await geocode(address.trim());
    if (c) setCoords(c);
    return c;
  }

  return { state, coords, address, busy, setAddress, detect, otherAddress, resolve };
}
