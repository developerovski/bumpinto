import { JoinIntro } from "@bumpinto/web";
import { ACTIVITIES_MIX, ACTIVITIES_ONE } from "./_fixtures";

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/** W1 · davet başlığı bloğu — halkalı avatar, "X seni davet etti", oturum adının
    İLK kelimesi `Highlight` ile vurgulanır, ilgi alanı rozetleri + katılımcı sayacı,
    açıklama notu ve formdan ayıran saç teli ayraç. */
export function Invitation() {
  return (
    <div style={COL}>
      <JoinIntro hostName="Mehmet" sessionName="Kahve turu" activities={ACTIVITIES_ONE} count={3} />
    </div>
  );
}

/** Oturum adsızsa başlık i18n şablonuna düşer (`join.title`) — vurgulu kelime
    yine `Highlight` taşır, düzen değişmez. */
export function NoSessionName() {
  return (
    <div style={COL}>
      <JoinIntro hostName="Elif" sessionName={null} activities={ACTIVITIES_ONE} count={2} />
    </div>
  );
}

/** Çoklu ilgi alanı — rozet şeridi `Intl.ListFormat` değil, ayrı rozetler basar;
    sayaç rozeti her zaman en sonda. */
export function MultiActivity() {
  return (
    <div style={COL}>
      <JoinIntro
        hostName="Deniz"
        sessionName="Cumartesi planı"
        activities={ACTIVITIES_MIX}
        count={5}
      />
    </div>
  );
}

/** `compact` — 409 "çok uzak" kartı ekrana girdiğinde giriş bloğu sıkışır: <1024'te
    rozet satırı ve alt başlık düşer, başlık 26px'e iner. ≥1024'te hiçbiri değişmez,
    yani bu hücre (900px çekim) sıkışmış dalı gösterir. */
export function Compact() {
  return (
    <div style={COL}>
      <JoinIntro
        hostName="Mehmet"
        sessionName="Kahve turu"
        activities={ACTIVITIES_ONE}
        count={3}
        compact
      />
    </div>
  );
}

/** Host adı bilinmiyorsa (eski davet linki) genel "davet edildin" metnine düşer. */
export function UnknownHost() {
  return (
    <div style={COL}>
      <JoinIntro hostName={null} sessionName={null} activities={ACTIVITIES_ONE} count={1} />
    </div>
  );
}
