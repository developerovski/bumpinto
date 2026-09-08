import { OfflineBanner } from "@bumpinto/web";

/** W10b · çevrimdışı şerit: son görülme saati alt satırda, "Tekrar dene" beyaz buton. */
export function Offline() {
  return (
    <div style={{ width: "60rem" }}>
      <OfflineBanner online={false} lastOnlineAt={Date.parse("2026-09-06T12:38:00Z")} onRetry={() => {}} />
    </div>
  );
}

/** Zaman damgası yoksa (hiç çevrimiçi olunmadıysa) alt satır çizilmez. */
export function NoTimestamp() {
  return (
    <div style={{ width: "60rem" }}>
      <OfflineBanner online={false} lastOnlineAt={null} onRetry={() => {}} />
    </div>
  );
}
