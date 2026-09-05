import { FinishedCard } from "@bumpinto/web";
import { ELIF_P, MEHMET, SELF, SELIN_P } from "./_fixtures";

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

const SHARE = {
  shareText: "Kahve için 6 mekan hazır, seni bekliyoruz:",
  shareUrl: "https://bumpinto.app/j/kahve-cuma",
};

/* `votersOf` (hasLocation && !manual) ROSTER'daki Deniz'i (hasLocation: false) eler —
   "kim nerede" satırlarında yalnız üç kişi görünür, tıpkı RunoffStatus'ta olduğu gibi.
   Kendi satırın (Mehmet) `deckDone: true` — bu karta ancak kendi desten bittiğinde
   ulaşılıyor. */
const SELF_DONE = { ...MEHMET, deckDone: true };
const WAITING_ONE = [SELF_DONE, { ...ELIF_P, deckDone: true }, { ...SELIN_P, deckDone: false }];
const WAITING_MANY = [SELF_DONE, { ...ELIF_P, deckDone: false }, { ...SELIN_P, deckDone: false }];
const ALL_DONE = [SELF_DONE, { ...ELIF_P, deckDone: true }, { ...SELIN_P, deckDone: true }];

/** Gönderilmeden önce — 4 mekan beğenilmiş, birincil buton "gönder", ikincil "listeye dön". */
export function BeforeSend() {
  return (
    <div style={COL}>
      <FinishedCard
        likedCount={4}
        sending={false}
        sent={false}
        host
        selfId={SELF}
        participants={WAITING_ONE}
        onSend={() => {}}
        onList={() => {}}
        onForce={() => {}}
        {...SHARE}
      />
    </div>
  );
}

/** Hiç beğeni seçilmemiş — uyarı notu + birincil buton "listeye dön"e döner, "yine de gönder"
    ikincil olarak kalır. */
export function EmptyLikes() {
  return (
    <div style={COL}>
      <FinishedCard
        likedCount={0}
        sending={false}
        sent={false}
        host
        selfId={SELF}
        participants={WAITING_ONE}
        onSend={() => {}}
        onList={() => {}}
        onForce={() => {}}
        {...SHARE}
      />
    </div>
  );
}

/** Gönderildi, geriye TEK kişi kaldı (Selin) — başlık ADLA anılır, host olduğun için
    "Selin olmadan devam et" butonu da çıkar. */
export function SentWaitingNamed() {
  return (
    <div style={COL}>
      <FinishedCard
        likedCount={4}
        sending={false}
        sent
        host
        selfId={SELF}
        participants={WAITING_ONE}
        onSend={() => {}}
        onList={() => {}}
        onForce={() => {}}
        {...SHARE}
      />
    </div>
  );
}

/** Aynı bekleme, ama sen host DEĞİLSİN — "olmadan devam et" butonu hiç basılmaz, kalanı
    tamamen aynı. */
export function SentWaitingNotHost() {
  return (
    <div style={COL}>
      <FinishedCard
        likedCount={4}
        sending={false}
        sent
        host={false}
        selfId={SELF}
        participants={WAITING_ONE}
        onSend={() => {}}
        onList={() => {}}
        onForce={() => {}}
        {...SHARE}
      />
    </div>
  );
}

/** Gönderildi, geriye BİRDEN ÇOK kişi kaldı — isim isim sayılmaz, başlık genel "diğerleri"
    diyor; "olmadan devam et" butonunun etiketi `Intl.ListFormat` ile "Elif ve Selin" olur. */
export function SentWaitingGeneral() {
  return (
    <div style={COL}>
      <FinishedCard
        likedCount={4}
        sending={false}
        sent
        host
        selfId={SELF}
        participants={WAITING_MANY}
        onSend={() => {}}
        onList={() => {}}
        onForce={() => {}}
        {...SHARE}
      />
    </div>
  );
}

/** Herkes bitirdi — kutlama/rozet yok (§4.8), yalnız el yazısı not; "olmadan devam et" ve
    dürtme butonu ikisi de kaybolur (bekleyen kimse yok). */
export function SentAllDone() {
  return (
    <div style={COL}>
      <FinishedCard
        likedCount={4}
        sending={false}
        sent
        host
        selfId={SELF}
        participants={ALL_DONE}
        onSend={() => {}}
        onList={() => {}}
        onForce={() => {}}
        {...SHARE}
      />
    </div>
  );
}
