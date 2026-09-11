import { useEffect, useState } from "react";

/** Periyodik tazelenen "şimdi" — süren planın kalan süresi sayfa açıkken donmasın.
    Varsayılan 60 sn: kalan süre zaten 5 dakikaya yuvarlanıyor, daha sık render boşa. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
