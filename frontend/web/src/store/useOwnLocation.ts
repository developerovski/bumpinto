import { useEffect, useRef, useState } from "react";
import { geocode, reverseGeocode, type Coords } from "../lib/geocode";

export type LocationState = "idle" | "granted" | "denied";
/** Koordinatın NEREDEN geldiği: "o anki konum" şart olan akışlar (Şimdi planı, spec §1.3) kayıtlı
    profil varsayılanını (`initial`) kabul etmez — o nokta çoğu zaman ev adresidir. */
export type LocationSource = "initial" | "detected" | "picked" | "typed";

/** Konum/adres akışı — JoinForm, NewSessionPage ve profil paneli ortak kullanır. */
export function useOwnLocation(opts: { initial?: Coords | null; autoDetect?: boolean } = {}) {
  const [state, setState] = useState<LocationState>(opts.initial ? "granted" : "idle");
  const [coords, setCoords] = useState<Coords | null>(opts.initial ?? null);
  const [source, setSource] = useState<LocationSource | null>(opts.initial ? "initial" : null);
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
            setSource("detected");
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
    setSource(null);
  }

  function detect() {
    setAddressState("");
    addressRef.current = "";
    runDetect();
  }

  function otherAddress() {
    setState("idle");
    setCoords(null);
    setSource(null);
  }

  /** Kayıtlı varsayılanı EKRANDAN DA düşürüp tarayıcıdan taze konum ister. Yalnız `detect()`
      yetmez: algılama sürerken ya da reddedilince eski nokta "otomatik alındı" diye kalırdı. */
  function redetect() {
    setAddressState("");
    addressRef.current = "";
    setCoords(null);
    setSource(null);
    setState("idle");
    runDetect();
  }

  /** Konumu tamamen geri al — `otherAddress` yazılan adresi bırakıyor, "kaldır" bırakmamalı:
      çapalı oturumda konumsuz devam etmek geçerli bir seçim (CreateSessionRequest.isOriginPresent). */
  function clear() {
    setAddressState("");
    addressRef.current = "";
    setCoords(null);
    setSource(null);
    setState("idle");
  }

  /** Haritadan seçilen nokta: adres alanı temizlenir, konum "granted" sayılır — kullanıcı
      açıkça bir yer işaretledi, tarayıcı izni beklemenin anlamı yok. */
  function setPicked(picked: Coords) {
    setAddressState("");
    addressRef.current = "";
    setCoords(picked);
    setSource("picked");
    setState("granted");
  }

  async function resolve(): Promise<Coords | null> {
    if (coords) return coords;
    if (!address.trim()) return null;
    const c = await geocode(address.trim());
    if (c) {
      setCoords(c);
      setSource("typed");
    }
    return c;
  }

  return { state, coords, source, address, busy, setAddress, detect, redetect, otherAddress, clear, setPicked, resolve };
}
