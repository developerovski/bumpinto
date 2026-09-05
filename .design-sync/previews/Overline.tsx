import { Overline } from "@bumpinto/web";

const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1rem" } as const;

/** Varsayılan ton (`ink3`) — `ParticipantList`/`WhoIsHere` kullanımı, katılımcı listesinin
    üst başlığı ("Kimler var"). En sık görülen dal. */
export function Default() {
  return (
    <div style={COL}>
      <Overline>Kimler var</Overline>
    </div>
  );
}

/** `tone="flame"` — `InviteCard`in davet linki başlığı; marka rengiyle vurgulanan tek dal. */
export function Flame() {
  return (
    <div style={COL}>
      <Overline tone="flame">Davet linki</Overline>
    </div>
  );
}

/** `RunoffIntro`nun interpolasyonlu üst başlığı gibi en uzun gerçek örnek — büyük harf +
    `0.11em` harf aralığının uzun, noktalı bir etikette nasıl davrandığını gösteriyor. */
export function LongLabel() {
  return (
    <div style={COL}>
      <Overline>KAHVE · 4 KİŞİ · ORTA NOKTA ÇEVRESİ</Overline>
    </div>
  );
}
