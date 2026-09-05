import { RunoffStatus } from "@bumpinto/web";
import { ELIF_P, ROSTER, SELF } from "./_fixtures";

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/* `votersOf` konumu olmayanları eler: ROSTER'daki Deniz (hasLocation: false) burada hiç
   görünmez, oy verebilenler MEHMET/ELIF/SELIN'e iner — üç kişilik gerçek runoff sahnesi. */
const SHARE = {
  shareText: "Seçim seni bekliyor, tek tıkla kilitle:",
  shareUrl: "https://bumpinto.app/j/kahve-cuma",
};

/** Kimse kilitlemedi, kendi seçimin de yok — "Kilitle" butonu devre dışı, üç satır da
    "Seçiyor…" rozetiyle. */
export function NotVoted() {
  return (
    <div style={COL}>
      <RunoffStatus
        participants={ROSTER}
        votedIds={[]}
        choice={null}
        sent={false}
        sending={false}
        onLock={() => {}}
        selfId={SELF}
        {...SHARE}
      />
    </div>
  );
}

/** Elif kilitledi, sen bir mekân seçtin ama henüz kilitlemedin — "Kilitle" butonu artık
    aktif. */
export function ReadyToLock() {
  return (
    <div style={COL}>
      <RunoffStatus
        participants={ROSTER}
        votedIds={[ELIF_P.id]}
        choice="72c9d3f8-1e45-4a90-b6c1-3d08e5f24a77"
        sent={false}
        sending={false}
        onLock={() => {}}
        selfId={SELF}
        {...SHARE}
      />
    </div>
  );
}

/** Kilitleme sunucuya gitmedi — hata metni kilit butonunun altında, seçim korunur. */
export function WithError() {
  return (
    <div style={COL}>
      <RunoffStatus
        participants={ROSTER}
        votedIds={[ELIF_P.id]}
        choice="72c9d3f8-1e45-4a90-b6c1-3d08e5f24a77"
        sent={false}
        sending={false}
        onLock={() => {}}
        selfId={SELF}
        error="Seçim gönderilemedi — tekrar dene."
        {...SHARE}
      />
    </div>
  );
}

/** Sen kilitledin, geriye TEK kişi kaldı (Selin) — §4.8 gereği kalan tek kişi ADLI ve
    olumlu notla anılır ("Selin seçiyor — herkes kilitleyince sonuç açıklanır"). */
export function LockedNamedRemaining() {
  return (
    <div style={COL}>
      <RunoffStatus
        participants={ROSTER}
        votedIds={[SELF, ELIF_P.id]}
        choice="72c9d3f8-1e45-4a90-b6c1-3d08e5f24a77"
        sent
        sending={false}
        onLock={() => {}}
        selfId={SELF}
        {...SHARE}
      />
    </div>
  );
}

/** Sen kilitledin, geriye BİRDEN ÇOK kişi kaldı — isim isim sayılmaz, genel
    "diğerlerini bekliyoruz" notu basılır. */
export function LockedGeneralRemaining() {
  return (
    <div style={COL}>
      <RunoffStatus
        participants={ROSTER}
        votedIds={[SELF]}
        choice="72c9d3f8-1e45-4a90-b6c1-3d08e5f24a77"
        sent
        sending={false}
        onLock={() => {}}
        selfId={SELF}
        {...SHARE}
      />
    </div>
  );
}
