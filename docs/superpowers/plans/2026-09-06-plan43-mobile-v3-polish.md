# Mobil v3 Cilası (M-9) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** B-15'in açtığı beş küçük sözleşmeyi mobil kabuğa geçirmek: presence 2.0 + dürt (P6/P10/P17),
mekan kartı 2.0 `tagline`/saat/foto/atıf (P11), sonuç kartının 1080×1920 görsel paylaşımı (P20/P21),
"Takvime ekle" (ICS + sistem paylaşımı, P20), 5 haneli oturum kodu + QR (P2/P6) ve Live Activity'nin
**yalnız köprü iskeleti** (P26).

**Architecture:** Üç yeni depo (`toastStore`, `socialStore`, `liveEvents`) ve dört yeni saf modül
(`shared/joinCode.ts`, `shared/og.ts`, `shared/ics.ts`, `mobile/lib/shareCard.ts`). `socialStore`
dürtmenin **tek sahibi**: 60 sn soğuma, iyimser damga ve bildirimler oradan çıkar; ekran/molekül
hiçbir uç çağırmaz. Bildirimler `toastStore`'a **i18n anahtarı + parametre** olarak yazılır (depo
`t`'ye erişemez), `ToastHost` çevirip basar. Sunucudan gelen `nudged` olayı `src/store/liveEvents.ts`
adlı **tek dinleyici seam**'inden geçer: bugün onu kimse beslemez (STOMP köprüsü M-6'nın işi),
`socialStore` onu birim testinde `emitSessionEvent` ile tüketir — M-6 tek satırla bağlar. Kart
görseli **ekran dışı** `ShareCardImage` düğümünün `react-native-view-shot` ile 360×640 dp'den
1080×1920 px'e ölçeklenmesiyle üretilir; foto yüklenemezse gradyan + monogram, çizim çökerse metin
paylaşımı. ICS **shared**'a konur (`frontend/shared/src/ics.ts`), web'deki kopya shim'e çevrilir
(M-4:T3b deseni) — takvim metni tek yerde kalır. Live Activity bu planda **arayüz iskeleti**dir;
gerçek widget target'ı ve push güncellemesi B-16'dadır — ama **SDK 57 ile `expo-widgets` geldiği için
bu artık uzak bir iş değil**, T7 notuna bak.

**Tech Stack:** **Expo SDK 57** (RN 0.86 / React 19.2, CNG prebuild, New Arch), expo-router 57,
zustand 5, react-i18next 17, `expo-image` (mekan/kart fotoğrafı), `react-native-view-shot`
(kart PNG'si), `expo-sharing` + RN `Share` (paylaşım), `expo-file-system` (`File`/`Paths` API'si,
.ics dosyası), `react-native-qrcode-svg` + `react-native-svg` 15 (QR), `expo-camera` (QR tarama),
`@react-native-community/datetimepicker` (buluşma saati), `expo-haptics`, **`expo-widgets`**
(Live Activity — T7 notuna bak), jest-expo 57 + @testing-library/react-native 14.
Sürüm politikası: M-4 (plan38) Tech Stack bloğu.

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` §2 (sözleşme kararları — alan/uç
adları **değiştirilmez**), §3 Mobil, §4 (M-7/B-16 satırındaki mobil kalemleri bu plan kapatır).
Karşılanan gereksinimler: **R-M9** (canlı lobi/bekleme — dürt ve presence damgaları),
**R-M11** (sonuç kartı + paylaşım + takvim), **R-M12** (mekan kartı 2.0), **R-M17** (oturum kodu + QR).
Live Activity (P26) **taslak**: yalnız köprü (T7 revizyon notu). Kapsam dışı: push jetonu/`device_tokens` (B-16),
bildir/engelle (M-5), sesli sohbet dock'u (M-6).

**UI Kaynağı:** Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, dosya
**`Mobil Ekranlar v3.dc.html`**. Yerel kopya + ölçüler: `.../scratchpad/design/m3/A/*.html`,
`m3/native.css`, `m3/GUIDE.md`. Ajan kendi tasarımını yapmaz.

| Artboard | Bu plandaki karşılığı |
|---|---|
| **P2 · Oturumlar (boş)** (`02-oturumlar-bos.html`) | Kod/link kartı → `InviteEntryCard` (T6) |
| **P6 · Lobi** (`06-lobi.html`) | `kod X7K2M` satırı + QR (T6); "Linki açtı · konum bekleniyor…" (T2) |
| **P10 · Bekle** (`10-bekle.html`) | Roster presence satırları + dürt düğmesi (T2) |
| **P11 · Mekanlar grup** (`11-mekanlar-grup.html`) | `Bugün 08:00–18:00 · espresso bar` + `.f-note` tagline + `.f-attrs` (T3) |
| **P17 · Gönderildi** (`17-gonderildi.html`) | Satır içi "Kerem'i dürt" + ilerleme (T2) |
| **P20 · Karar** (`20-karar.html`) | "Takvime ekle" / "Kartı paylaş" ikilisi (T4, T5) |
| **P21 · Sonuç kartı paylaş** (`21-sonuc-karti-paylas.html`) | `ShareCardImage` 1080×1920 + sistem paylaşım sayfası (T4) |
| **P26 · Live Activity** (`26-live-activity.html`) | `liveActivity.ts` arayüzü + plugin iskeleti (T7) — **çizim yok** |

**Ön koşul:** **M-8 `done`** (mobil kabuk tamam: `ParticipantRow`, `VenueRow`, `InviteCard`,
`ResultScreen`, `SentScreen`, `RangeBar`, atomlar, `sessionStore`, `netStore`, i18n `shared`'da) ve
**B-15 `done`** + `api-types.ts` yeniden üretilmiş (`pnpm --filter @bumpinto/shared generate`).
Doğrula (repo kökünden; **altısı da ≥ 1** olmalı):

```bash
rtk grep -c "lastSeenAt" frontend/shared/src/api-types.ts
rtk grep -c "linkOpenedAt" frontend/shared/src/api-types.ts
rtk grep -c "joinCode" frontend/shared/src/api-types.ts
rtk grep -c "tagline" frontend/shared/src/api-types.ts
rtk grep -c "sessions/by-code" frontend/shared/src/api-types.ts
rtk grep -c "nudge/{participantId}" frontend/shared/src/api-types.ts
```

Kabuk doğrulaması (hepsi var olmalı):

```bash
ls frontend/mobile/src/components/molecules/{ParticipantRow,VenueRow,VenueThumb,Attribution,InviteCard}.tsx
ls frontend/mobile/src/screens/{LobbyScreen,WaitingScreen,SentScreen,VenuesScreen,ResultScreen}.tsx
ls frontend/shared/src/i18n/locales/tr.json
```

Eşiklerden biri tutmuyorsa plan **blocked** — alan, uç ya da dosya **uydurulmaz**.

**Bağlayıcı kurallar:**

- **Git yazma YOK** (`git mv`/`commit`/`push` yasak); her görev sonunda **dosya listesi**, kullanıcı commit eder.
- Mobil test komutu (repo kökü): `source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test -- <yol>` — aşağıda **`MTEST <yol>`**.
- `frontend/shared` testleri web koşucusundan geçer: `source ./init-nvm.sh && pnpm --filter @bumpinto/web test --run <yol>` — aşağıda **`PNPM_TEST <yol>`**. Web regresyonu: `rtk pnpm test:web`.
- Sözleşme §2'dir: `tagline`, `taglineSource`, `lastSeenAt`, `linkOpenedAt`, `joinCode`,
  `nudged{fromParticipantId,toParticipantId}`, `POST /api/sessions/{slug}/nudge/{participantId}`,
  `GET /api/sessions/by-code/{code}`, `GET /og/{slug}.png` **değiştirilmez**.
- **Sunucudan gelmeyen bilgi uydurulmaz:** `tagline` yoksa satır çizilmez, `hoursToday` yoksa meta
  parçası atlanır, `lastSeenAt` yoksa yalnız "çevrimdışı", `linkOpenedAt` yoksa mevcut
  "Konum bekleniyor…" kalır, `joinCode` yoksa kod satırı gizlenir.
- Ekran dosyalarında ham `Pressable`/`TextInput`/`Text` ve kopya stil YASAK (atomlar üzerinden).
  Tek istisna: `ShareCardImage` — ekran dışı çizim düğümü olduğu için kendi mutlak ölçülerini taşır.
- i18n: metin sabiti yasak; taban `tr`, yeni anahtar **üç dile birden** (`rtk pnpm i18n:check` yeşil).
- **Rozet çorbası yasak:** adalet yalnız `RangeBar`/`TravelBars` ile gösterilir (karar dok. §4).
- Metin ≥12px, dokunma hedefi ≥44px, her ekranda tek birincil düğme.
- Live Activity kapsamı **kilitli**: widget target'ı, push jetonu ve ActivityKit çağrısı bu planda
  YOK. `liveActivity.ts` no-op döner; sahte "canlı" arayüz çizilmez. (Kilit *kapsam* kilidi olarak
  kalır — teknik imkânsızlık değil; SDK 57'de `expo-widgets` var, bkz. T7.)

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `shared/src/{api,joinCode,og,index}.ts` (+2 test), `shared/src/i18n/locales/*.json`, `mobile/package.json`, `mobile/jest.setup.ts` | T1 | Sözleşme istemcisi, kod/OG yardımcıları, dil anahtarları, bağımlılıklar |
| `mobile/src/store/{toastStore,socialStore,liveEvents}.ts` (+2 test), `molecules/{ToastHost,ParticipantRow}.tsx` (+test), `app/_layout.tsx`, `screens/{Lobby,Waiting,Sent}Screen.tsx` | T2 | Presence 2.0 + dürt + bildirim |
| `mobile/src/components/molecules/{VenueRow,VenueThumb,Attribution}.tsx` (+2 test) | T3 | Mekan kartı 2.0 |
| `mobile/src/lib/shareCard.ts` (+test), `organisms/ShareCardImage.tsx`, `screens/ResultScreen.tsx` | T4 | 1080×1920 sonuç kartı |
| `shared/src/ics.ts` (+test), `web/src/lib/ics.ts` (shim), `mobile/app/(sheets)/meet-time.tsx` (+test), `mobile/src/lib/calendar.ts` | T5 | ICS + saat sayfası |
| `shared/src/joinCode.ts` (T1) tüketicileri: `molecules/{InviteEntryCard,InviteCard}.tsx` (+2 test), `app/(sheets)/{qr,scan}.tsx`, `app/sessions/index.tsx`, `app.config.ts` | T6 | Oturum kodu + QR |
| `mobile/plugins/withLiveActivity.js`, `mobile/src/lib/liveActivity.ts` (+test), `app.config.ts` | T7 | Live Activity köprü iskeleti |
| `mobile/.maestro/04-code-join.yaml`, `docs/store/DEVICE-CHECKLIST-M9.md`, `docs/superpowers/plans/INDEX.md` | T8 | Kapanış + kayıt |

---

### Task 1: Paylaşılan sözleşme katmanı — `nudge`, `sessionByCode`, kod/OG yardımcıları, dil anahtarları

**Files:**
Modify: `frontend/shared/src/api.ts`, `frontend/shared/src/index.ts`,
`frontend/shared/src/i18n/locales/{tr,en,nl}.json`, `frontend/mobile/package.json`,
`frontend/mobile/jest.setup.ts`
Create: `frontend/shared/src/joinCode.ts`, `frontend/shared/src/og.ts`
Test: `frontend/shared/src/joinCode.test.ts`, `frontend/shared/src/og.test.ts`

- [ ] **Step 1: Ön koşulu doğrula** — plan başındaki altı `rtk grep` ve iki `ls` komutunu koş.
Eşik tutmazsa `source ./init-nvm.sh && pnpm --filter @bumpinto/shared generate`; hâlâ eksikse **dur**.

- [ ] **Step 2: Başarısız testleri yaz**

`frontend/shared/src/joinCode.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { JOIN_CODE_LENGTH, normalizeJoinCode, parseInvite } from "./joinCode";

describe("joinCode", () => {
  it("kodu kanonikleştirir: büyük harf, boşluk/tire atılır, 5 hane", () => {
    expect(normalizeJoinCode(" x7k2m ")).toBe("X7K2M");
    expect(normalizeJoinCode("x7-k2m")).toBe("X7K2M");
    expect(JOIN_CODE_LENGTH).toBe(5);
  });
  it("karışabilen harf/rakam ve yanlış uzunluk reddedilir", () => {
    expect(normalizeJoinCode("X7K2I")).toBeNull(); // I alfabede yok
    expect(normalizeJoinCode("X7K2O")).toBeNull(); // O alfabede yok
    expect(normalizeJoinCode("ABC")).toBeNull();
    expect(normalizeJoinCode("")).toBeNull();
  });
  it("parseInvite linkten slug, ham girdiden kod çıkarır", () => {
    expect(parseInvite("https://bumpinto.app/j/ab12cd34"))
      .toEqual({ kind: "slug", slug: "ab12cd34" });
    expect(parseInvite("bumpinto://j/ab12cd34/")).toEqual({ kind: "slug", slug: "ab12cd34" });
    expect(parseInvite("x7k2m")).toEqual({ kind: "code", code: "X7K2M" });
    expect(parseInvite("  ")).toBeNull();
    expect(parseInvite("merhaba dünya")).toBeNull();
  });
});
```

`frontend/shared/src/og.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ogImageUrl } from "./og";

describe("ogImageUrl", () => {
  it("sözleşme yolunu üretir ve sondaki bölüyü tekilleştirir", () => {
    expect(ogImageUrl("https://bumpinto.app", "x7k2m")).toBe("https://bumpinto.app/og/x7k2m.png");
    expect(ogImageUrl("https://bumpinto.app/", "x7k2m")).toBe("https://bumpinto.app/og/x7k2m.png");
  });
  it("taban ya da slug boşsa null", () => {
    expect(ogImageUrl("", "x7k2m")).toBeNull();
    expect(ogImageUrl("https://bumpinto.app", "")).toBeNull();
  });
});
```

Run: `PNPM_TEST ../shared/src/joinCode.test.ts ../shared/src/og.test.ts` · Expected: modül bulunamadı.

- [ ] **Step 3: `frontend/shared/src/joinCode.ts`**
```ts
/** B-15 `Ids.joinCode` ile AYNI alfabe: karışabilen I/O/0/1 dışarıda (§2 oturum kodu kararı). */
export const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const JOIN_CODE_LENGTH = 5;

/** Kullanıcının yazdığını kanonik koda çevirir; alfabe dışı ya da yanlış uzunlukta null. */
export function normalizeJoinCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  if (code.length !== JOIN_CODE_LENGTH) return null;
  for (const ch of code) if (!JOIN_CODE_ALPHABET.includes(ch)) return null;
  return code;
}

export type Invite = { kind: "slug"; slug: string } | { kind: "code"; code: string };

/**
 * "Kod ya da link yapıştır" kutusunun tek çözümleyicisi. Link `/j/<slug>` biçimindeyse slug,
 * değilse 5 haneli kod aranır. Slug 8 hane ve küçük harftir (B-6 sözleşmesi) — koddan bu
 * yüzden ayrıştırılabilir.
 */
export function parseInvite(raw: string | null | undefined): Invite | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const link = /\/j\/([a-z0-9]{6,16})\/?\s*$/i.exec(text);
  if (link) return { kind: "slug", slug: link[1].toLowerCase() };
  const code = normalizeJoinCode(text);
  return code ? { kind: "code", code } : null;
}
```
- [ ] **Step 4: `frontend/shared/src/og.ts`**
```ts
/**
 * B-15 `GET /og/{slug}.png` (§2). Uç **`/api` altında değildir**; taban, uygulamanın web
 * kökü (`webBase`) ya da API kökü olabilir — çağıran hangisini kullanacağını bilir.
 */
export function ogImageUrl(base: string, slug: string): string | null {
  if (!base || !slug) return null;
  return `${base.replace(/\/+$/, "")}/og/${slug}.png`;
}
```
- [ ] **Step 5: `frontend/shared/src/api.ts`'e iki fonksiyon** (`preview` satırından hemen sonra,
`createBumpintoApi` nesnesinin içine):

```ts
    nudge: (slug: string, participantId: string) =>
      http.post(`/api/sessions/${slug}/nudge/${participantId}`).then(() => undefined),
    sessionByCode: (code: string) =>
      http.get<SessionPreview>(`/api/sessions/by-code/${code}`).then((r) => r.data),
```

W-15 aynı `nudge` satırını eklemiş olabilir — **iki kez eklenmez**, varsa olduğu gibi bırakılır.

`frontend/shared/src/index.ts`'e:

```ts
export { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH, normalizeJoinCode, parseInvite, type Invite } from "./joinCode";
export { ogImageUrl } from "./og";
```
- [ ] **Step 6: Dil anahtarları** — `frontend/shared/src/i18n/locales/{tr,en,nl}.json`.
Önce koş: `rtk grep -c '"presence"' frontend/shared/src/i18n/locales/tr.json`.
**1 dönerse** (W-15 yürütülmüş) `presence`/`share`/`calendar` ağaçları **atlanır**, yalnız `code`
ve `share`'in eksik üç anahtarı eklenir. 0 dönerse aşağıdaki ağaçların tamamı eklenir.

`tr.json` kök nesnesinin sonuna:

```json
  "presence": { "linkOpened": "Linki açtı · konum bekleniyor…", "lastSeen": "Son görülen · {{time}}",
    "nudge": "{{name}}'i dürt", "nudgeSent": "{{name}} dürtüldü", "nudgeCooling": "Az önce dürttün — bir dakika bekle",
    "nudgeError": "Dürtme gönderilemedi — tekrar dene.", "hostOnly": "Dürtme yalnız kurana görünür.",
    "nudged": "Seni dürttüler — konumunu paylaşırsan devam edebiliriz" },
  "share": { "card": "Kartı paylaş", "preparing": "Kart hazırlanıyor…", "cardTitle": "{{venue}}'de buluşuyoruz",
    "cardFooter": "herkes ~{{min}}–{{max}} dk · fark {{spread}} dk", "fileName": "bumpinto-{{slug}}.png",
    "cardFailed": "Görsel üretilemedi — metin paylaşıldı.", "dialogTitle": "Sonuç kartını paylaş",
    "textFallback": "{{venue}} · {{url}}" },
  "calendar": { "add": "Takvime ekle", "title": "Saat kaçta?", "date": "Tarih", "time": "Saat",
    "hint": "Buluşma saatini sen seçersin — sistemde kayıtlı bir saat yok.", "share": "Takvime ekle",
    "eventTitle": "{{venue}} · {{session}}", "error": "Takvim dosyası oluşturulamadı." },
  "code": { "label": "Bir davet linkin mi var?", "hint": "Kod ya da link yapıştır", "join": "Katıl",
    "scan": "QR tara", "codeLine": "kod {{code}} · hesap gerekmez", "showQr": "QR göster",
    "qrTitle": "Kodu okutun", "qrHint": "Arkadaşın kamerayı buna tutsun.", "scanTitle": "Davet QR'ını tara",
    "scanDisclosure": "Kamera yalnız davet QR kodunu okumak için açılır; görüntü kaydedilmez, gönderilmez.",
    "scanAllow": "Kamerayı aç", "scanDenied": "Kamera izni kapalı", "invalid": "Kod 5 haneli olmalı",
    "scanDeniedCopy": "Kodu elle yazarak da katılabilirsin.", "notFound": "Bu kodla oturum bulunamadı" },
```

`en.json`:

```json
  "presence": { "linkOpened": "Opened the link · waiting for location…", "lastSeen": "Last seen · {{time}}",
    "nudge": "Nudge {{name}}", "nudgeSent": "Nudged {{name}}", "nudgeCooling": "You just nudged — wait a minute",
    "nudgeError": "Couldn't send the nudge — try again.", "hostOnly": "Only the host sees the nudge.",
    "nudged": "Someone nudged you — share your location so we can move on" },
  "share": { "card": "Share the card", "preparing": "Preparing the card…", "cardTitle": "We're meeting at {{venue}}",
    "cardFooter": "everyone ~{{min}}–{{max}} min · {{spread}} min apart", "fileName": "bumpinto-{{slug}}.png",
    "cardFailed": "Couldn't make the image — shared as text.", "dialogTitle": "Share the result card",
    "textFallback": "{{venue}} · {{url}}" },
  "calendar": { "add": "Add to calendar", "title": "What time?", "date": "Date", "time": "Time",
    "hint": "You pick the time — there is no stored meeting time yet.", "share": "Add to calendar",
    "eventTitle": "{{venue}} · {{session}}", "error": "Couldn't create the calendar file." },
  "code": { "label": "Got an invite link?", "hint": "Paste a code or link", "join": "Join",
    "scan": "Scan QR", "codeLine": "code {{code}} · no account needed", "showQr": "Show QR",
    "qrTitle": "Let them scan this", "qrHint": "Point their camera at this code.", "scanTitle": "Scan the invite QR",
    "scanDisclosure": "The camera opens only to read the invite QR code; nothing is stored or sent.",
    "scanAllow": "Open the camera", "scanDenied": "Camera access is off", "invalid": "The code has 5 characters",
    "scanDeniedCopy": "You can also type the code by hand.", "notFound": "No meet-up found for that code" },
```

`nl.json`:

```json
  "presence": { "linkOpened": "Link geopend · wacht op locatie…", "lastSeen": "Laatst gezien · {{time}}",
    "nudge": "{{name}} porren", "nudgeSent": "{{name}} is gepord", "nudgeCooling": "Je hebt net gepord — wacht een minuut",
    "nudgeError": "Porren is niet gelukt — probeer opnieuw.", "hostOnly": "Alleen de organisator ziet het porren.",
    "nudged": "Iemand porde je — deel je locatie zodat we verder kunnen" },
  "share": { "card": "Kaart delen", "preparing": "Kaart wordt gemaakt…", "cardTitle": "We spreken af bij {{venue}}",
    "cardFooter": "iedereen ~{{min}}–{{max}} min · {{spread}} min verschil", "fileName": "bumpinto-{{slug}}.png",
    "cardFailed": "Afbeelding mislukt — als tekst gedeeld.", "dialogTitle": "Resultaatkaart delen",
    "textFallback": "{{venue}} · {{url}}" },
  "calendar": { "add": "Aan agenda toevoegen", "title": "Hoe laat?", "date": "Datum", "time": "Tijd",
    "hint": "Jij kiest de tijd — er is nog geen opgeslagen afspraaktijd.", "share": "Aan agenda toevoegen",
    "eventTitle": "{{venue}} · {{session}}", "error": "Agendabestand maken is mislukt." },
  "code": { "label": "Heb je een uitnodigingslink?", "hint": "Plak een code of link", "join": "Meedoen",
    "scan": "QR scannen", "codeLine": "code {{code}} · geen account nodig", "showQr": "QR tonen",
    "qrTitle": "Laat dit scannen", "qrHint": "Richt hun camera op deze code.", "scanTitle": "Scan de uitnodigings-QR",
    "scanDisclosure": "De camera opent alleen om de uitnodigings-QR te lezen; er wordt niets bewaard of verstuurd.",
    "scanAllow": "Camera openen", "scanDenied": "Cameratoegang staat uit", "invalid": "De code heeft 5 tekens",
    "scanDeniedCopy": "Je kunt de code ook met de hand typen.", "notFound": "Geen afspraak gevonden voor die code" },
```
- [ ] **Step 7: Bağımlılıklar** — `frontend/mobile` içinde (tek kurulum, sonraki görevler lockfile'a
dokunmaz):

```bash
cd frontend/mobile && rtk pnpm exec npx expo install expo-image expo-sharing expo-file-system \
  expo-camera react-native-view-shot @react-native-community/datetimepicker
rtk pnpm add react-native-qrcode-svg
```
- [ ] **Step 8: `frontend/mobile/jest.setup.ts`'e test ikizleri** (dosyanın sonuna; bunlar yalnız
YÜZEY taklidi — kamera, dosya yazımı ve paylaşım sayfası T8'in cihaz kontrol listesinde gerçek
cihazda koşar):

```ts
jest.mock("expo-image", () => {
  const { View } = require("react-native");
  return { Image: View };
});
jest.mock("react-native-view-shot", () => ({ captureRef: jest.fn(async () => "file:///card.png") }));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache/" },
  File: class {
    uri: string;
    constructor(dir: { toString?: () => string } | string, name: string) {
      this.uri = `${String(dir)}${name}`;
    }
    write = jest.fn();
    delete = jest.fn();
  },
}));
jest.mock("react-native-qrcode-svg", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View };
});
jest.mock("expo-camera", () => {
  const { View } = require("react-native");
  return { CameraView: View, useCameraPermissions: () => [{ granted: true }, jest.fn()] };
});
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View };
});
```

Mevcut `expo-haptics` ikizine `notificationAsync: jest.fn()` ve
`NotificationFeedbackType: { Warning: "warning", Success: "success" }` eklenir.

- [ ] **Step 9: PASS** — Run: `PNPM_TEST ../shared/src/joinCode.test.ts ../shared/src/og.test.ts` ·
Expected: 5 test yeşil. Sonra `rtk pnpm i18n:check` (0 fark) ve `rtk pnpm test:web` (yeşil).

- [ ] **Step 10: Dosya listesi** — `frontend/shared/src/{api.ts,index.ts,joinCode.ts,joinCode.test.ts,og.ts,og.test.ts}`, `frontend/shared/src/i18n/locales/{tr,en,nl}.json`, `frontend/mobile/{package.json,jest.setup.ts}`, `pnpm-lock.yaml`. Mesaj: `feat(shared): nudge + by-code istemcisi, join kodu ve og yardimcilari`.

---

### Task 2: Presence 2.0 + dürt — `ParticipantRow`, `socialStore`, bildirim

**Files:**
Create: `frontend/mobile/src/store/{toastStore.ts,socialStore.ts,liveEvents.ts}`,
`frontend/mobile/src/components/molecules/ToastHost.tsx`
Modify: `frontend/mobile/src/components/molecules/ParticipantRow.tsx`,
`frontend/mobile/src/screens/{LobbyScreen,WaitingScreen,SentScreen}.tsx`,
`frontend/mobile/app/_layout.tsx`
Test: `frontend/mobile/src/store/socialStore.test.ts`,
`frontend/mobile/src/components/molecules/ParticipantRow.test.tsx`

- [ ] **Step 1: Başarısız testleri yaz**

`socialStore.test.ts`:

```ts
jest.mock("../lib/api", () => ({ api: { nudge: jest.fn() } }));
import { api } from "../lib/api";
import { emitSessionEvent } from "./liveEvents";
import { NUDGE_COOLDOWN_MS, useSocialStore } from "./socialStore";
import { useToastStore } from "./toastStore";

const mock = (fn: unknown) => fn as jest.Mock;
const keys = () => useToastStore.getState().toasts.map((t) => t.messageKey);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useSocialStore.setState({ nudgedAt: {} });
  useToastStore.setState({ toasts: [] });
});
afterEach(() => jest.useRealTimers());

test("dürtme ucu çağrılır, bildirim çıkar, 60 sn soğuma ikinci isteği keser", async () => {
  mock(api.nudge).mockResolvedValue(undefined);
  await useSocialStore.getState().nudge("x7k2m", "k", "Kerem");
  expect(api.nudge).toHaveBeenCalledWith("x7k2m", "k");
  expect(keys()).toContain("presence.nudgeSent");
  expect(useSocialStore.getState().canNudge("k")).toBe(false);
  await useSocialStore.getState().nudge("x7k2m", "k", "Kerem");
  expect(api.nudge).toHaveBeenCalledTimes(1);
  expect(keys()).toContain("presence.nudgeCooling");
  jest.advanceTimersByTime(NUDGE_COOLDOWN_MS);
  expect(useSocialStore.getState().canNudge("k")).toBe(true);
});

test("hata soğumayı siler ve hata bildirimi basar", async () => {
  mock(api.nudge).mockRejectedValue(new Error("boom"));
  await useSocialStore.getState().nudge("x7k2m", "k", "Kerem");
  expect(useSocialStore.getState().canNudge("k")).toBe(true);
  expect(useToastStore.getState().toasts[0].tone).toBe("flame");
});

test("`nudged` olayı yalnız HEDEF kişide bildirim üretir", () => {
  useSocialStore.getState().listen("me");
  emitSessionEvent({ type: "nudged", payload: { fromParticipantId: "m", toParticipantId: "me" } });
  expect(keys()).toContain("presence.nudged");
  useToastStore.setState({ toasts: [] });
  emitSessionEvent({ type: "nudged", payload: { fromParticipantId: "m", toParticipantId: "k" } });
  expect(keys()).toHaveLength(0);
});
```

`ParticipantRow.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import ParticipantRow from "./ParticipantRow";

const ayse = (over: Record<string, unknown> = {}) => ({
  id: "a", displayName: "Ayşe", hasLocation: true, locationLabel: "Someren",
  online: true, travelMode: "CAR", ...over }) as never;

test("çevrimdışıda lastSeenAt varsa saat, yoksa yalnız 'çevrimdışı'", () => {
  const { rerender } = render(
    <ParticipantRow participant={ayse({ online: false, lastSeenAt: "2026-09-06T10:38:00Z" })} index={0} />);
  expect(screen.getByText(/Son görülen · /)).toBeTruthy();
  rerender(<ParticipantRow participant={ayse({ online: false })} index={0} />);
  expect(screen.getByText(/çevrimdışı/)).toBeTruthy();
  expect(screen.queryByText(/Son görülen/)).toBeNull();
});

test("konum yoksa linkOpenedAt varken 'Linki açtı', yokken eski metin", () => {
  const waiting = { hasLocation: false, locationLabel: undefined };
  const { rerender } = render(
    <ParticipantRow participant={ayse({ ...waiting, linkOpenedAt: "2026-09-06T10:30:00Z" })} index={0} />);
  expect(screen.getByText("Linki açtı · konum bekleniyor…")).toBeTruthy();
  rerender(<ParticipantRow participant={ayse(waiting)} index={0} />);
  expect(screen.getByText("Konum bekleniyor…")).toBeTruthy();
});

test("dürt düğmesi yalnız onNudge varken, konumu olmayan kişide çıkar", () => {
  const onNudge = jest.fn();
  const waiting = { hasLocation: false, locationLabel: undefined };
  const { rerender } = render(
    <ParticipantRow participant={ayse(waiting)} index={0} onNudge={onNudge} />);
  fireEvent.press(screen.getByRole("button", { name: "Ayşe'i dürt" }));
  expect(onNudge).toHaveBeenCalledWith("a", "Ayşe");
  rerender(<ParticipantRow participant={ayse()} index={0} onNudge={onNudge} />);
  expect(screen.queryByRole("button", { name: "Ayşe'i dürt" })).toBeNull();
});
```

Run: `MTEST src/store/socialStore.test.ts src/components/molecules/ParticipantRow.test.tsx` ·
Expected: modül/prop hataları.

- [ ] **Step 2: `src/store/toastStore.ts`**
```ts
import { create } from "zustand";

export type ToastTone = "grass" | "flame" | "neutral";
export type Toast = { id: number; messageKey: string;
  params?: Record<string, string | number>; tone: ToastTone };

let seq = 0;
/** Depo `t`'ye erişemez: anahtar + parametre tutar, çeviriyi `ToastHost` yapar. */
export const useToastStore = create<{
  toasts: Toast[];
  push: (messageKey: string, params?: Record<string, string | number>, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}>((set) => ({
  toasts: [],
  push: (messageKey, params, tone = "neutral") => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, messageKey, params, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```
- [ ] **Step 3: `src/store/liveEvents.ts`** — canlı olayların TEK giriş kapısı:
```ts
export type SessionEventLike = { type?: string; payload?: Record<string, string> };
type Handler = (event: SessionEventLike) => void;

const handlers = new Set<Handler>();

/** Dinleyici kaydeder; dönen fonksiyon aboneliği bırakır. */
export function onSessionEvent(handler: Handler): () => void {
  handlers.add(handler);
  return () => void handlers.delete(handler);
}

/**
 * Tek üretici noktası. Bugün üreticisi YOK: STOMP `liveChannel` RN portu M-6'nın işidir ve
 * bağlanınca gelen her olay için bunu çağırır (K-M6). O zamana kadar `nudged` bildirimi yalnız
 * birim testinden tetiklenir — sahte olay üretilmez, polling'e `nudged` uydurulmaz.
 */
export function emitSessionEvent(event: SessionEventLike): void {
  handlers.forEach((handler) => handler(event));
}
```
- [ ] **Step 4: `src/store/socialStore.ts`**
```ts
import * as Haptics from "expo-haptics";
import { create } from "zustand";
import { api } from "../lib/api";
import { onSessionEvent, type SessionEventLike } from "./liveEvents";
import { useToastStore } from "./toastStore";

/** Sunucu da 60 sn uygular (§2) — istemci kopyası yalnız gereksiz 429'u önler. */
export const NUDGE_COOLDOWN_MS = 60_000;

const toast = (key: string, params?: Record<string, string | number>,
  tone?: "grass" | "flame" | "neutral") => useToastStore.getState().push(key, params, tone);

export const useSocialStore = create<{
  /** Katılımcı başına son dürtme anı (ms). */
  nudgedAt: Record<string, number>;
  canNudge: (participantId: string) => boolean;
  nudge: (slug: string, participantId: string, name: string) => Promise<void>;
  /** Kendi katılımcı kimliğiyle `nudged` olayına abone olur; dönen fonksiyon bırakır. */
  listen: (selfParticipantId: string | null | undefined) => () => void;
}>((set, get) => ({
  nudgedAt: {},
  canNudge: (id) => Date.now() - (get().nudgedAt[id] ?? -Infinity) >= NUDGE_COOLDOWN_MS,
  nudge: async (slug, participantId, name) => {
    if (!get().canNudge(participantId)) {
      toast("presence.nudgeCooling", undefined, "flame");
      return;
    }
    // Soğuma İSTEKTEN ÖNCE yazılır (çift dokunuş ikinci isteği doğurmasın), hatada geri alınır.
    set({ nudgedAt: { ...get().nudgedAt, [participantId]: Date.now() } });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.nudge(slug, participantId);
      toast("presence.nudgeSent", { name }, "grass");
    } catch {
      const { [participantId]: _dropped, ...rest } = get().nudgedAt;
      set({ nudgedAt: rest });
      toast("presence.nudgeError", undefined, "flame");
    }
  },
  listen: (selfParticipantId) => {
    if (!selfParticipantId) return () => undefined;
    return onSessionEvent((event: SessionEventLike) => {
      if (event.type !== "nudged") return;
      if (event.payload?.toParticipantId !== selfParticipantId) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast("presence.nudged", undefined, "flame");
    });
  },
}));
```
- [ ] **Step 5: `src/components/molecules/ToastHost.tsx`** — `Card` + `AppText` ile alt orta
şerit; `useSafeAreaInsets().bottom + 12` yüksekliğinde, `pointerEvents="box-none"`,
`accessibilityLiveRegion="polite"`, `tone`'a göre `grassWash`/`flameWash`/`card` zemin.
`app/_layout.tsx`'te `SafeAreaProvider` içinde `Stack`'ten SONRA mount edilir (üstte kalsın).

- [ ] **Step 6: `ParticipantRow`'u güncelle** — dosyanın başına:
```tsx
/** Yerelleştirilmiş saat; geçersiz ISO'da satır hiç çizilmez. Intl yoksa 24 saatlik yedeğe düşer. */
function hhmm(iso: string, locale: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  } catch {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}
```

Prop listesine `onNudge?: (participantId: string, name: string) => void;` ve
`nudgeDisabled?: boolean;` eklenir. Gövdeye:

```tsx
  const { t, i18n } = useTranslation();
  const away = p.online === false;
  // Alan yoksa metin UYDURULMAZ: linkOpenedAt yoksa mevcut "Konum bekleniyor…" kalır.
  const waitingLine = p.hasLocation
    ? p.locationLabel
    : p.linkOpenedAt ? t("presence.linkOpened") : t("waiting.waitingLocation");
  const seen = away && p.lastSeenAt
    ? hhmm(p.lastSeenAt, i18n.resolvedLanguage ?? i18n.language) : null;
```

Alt satırda mevcut `p.hasLocation ? … : t("waiting.waitingLocation")` ifadesi `waitingLine` ile
değiştirilir; `away` dalındaki `· {t("waiting.offline")}` yerine
`· {seen ? t("presence.lastSeen", { time: seen }) : t("waiting.offline")}`.
Nabız zaten `Avatar waiting` ile geliyor (M-8 T2b) — ikinci animasyon eklenmez.

Satırın altına (P17'deki `.btn.b-gh.bsm` karşılığı; **yalnız konumu olmayan** kişide):

```tsx
      {props.onNudge && !p.hasLocation && p.id && (
        <Button kind="ghost" small disabled={props.nudgeDisabled}
          title={t("presence.nudge", { name: p.displayName ?? "?" })}
          icon={<HandWaving size={16} color={colors.flameDeep} />}
          style={{ width: "auto", alignSelf: "flex-start", marginTop: 8 }}
          onPress={() => props.onNudge?.(p.id!, p.displayName ?? "?")} />
      )}
```

`import { HandWaving } from "phosphor-react-native";` eklenir.

- [ ] **Step 7: Ekranlara bağla** — `LobbyScreen`, `WaitingScreen`, `SentScreen`'de roster
`ParticipantRow`'una:

```tsx
  const nudge = useSocialStore((s) => s.nudge);
  const canNudge = useSocialStore((s) => s.canNudge);
  const isHost = !!view.viewer?.host;
  const listen = useSocialStore((s) => s.listen);
  useEffect(() => listen(view.viewer?.participantId), [listen, view.viewer?.participantId]);
```

ve satır çağrısına
`onNudge={isHost ? (id, name) => void nudge(view.slug ?? "", id, name) : undefined}`
`nudgeDisabled={!canNudge(p.id ?? "")}`.

**Sapma notu (P10):** artboard davetliye de "Kerem'i dürt" gösteriyor; W-15 dürtmeyi **host'a**
kilitledi (`presence.hostOnly`) ve sözleşme tek uygulamadır. Bu yüzden `WaitingScreen`'de davetliye
düğme yerine `AppText variant="muted"` ile `presence.hostOnly` satırı çizilir. Tasarımdan sapma
INDEX notuna yazılır (T8).

- [ ] **Step 8: PASS** — Run: `MTEST src/store/socialStore.test.ts src/components/molecules/ParticipantRow.test.tsx` · Expected: 6 test yeşil.

- [ ] **Step 9: Dosya listesi** — `src/store/{toastStore,socialStore,socialStore.test,liveEvents}.ts`, `src/components/molecules/{ToastHost,ParticipantRow,ParticipantRow.test}.tsx`, `src/screens/{LobbyScreen,WaitingScreen,SentScreen}.tsx`, `app/_layout.tsx`. Mesaj: `feat(mobile): presence 2.0 damgalari, durt ve bildirim serifi`.

---

### Task 3: Mekan kartı 2.0 — `tagline`, saat, gerçek foto, atıf

**Files:**
Modify: `frontend/mobile/src/components/molecules/{VenueRow,VenueThumb,Attribution}.tsx`
Test: `frontend/mobile/src/components/molecules/{VenueRow,Attribution}.test.tsx`

- [ ] **Step 1: Başarısız testleri yaz**

`VenueRow.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import VenueRow from "./VenueRow";

const venue = (over: Record<string, unknown> = {}) => ({
  id: "v1", name: "Café Berlage", rating: 4.6, priceLevel: 2, category: "espresso bar",
  hoursToday: "Bugün 08:00–18:00", tagline: "Sakin, oturmalı, iyi filtre kahve",
  taglineSource: "FSQ", photoUrl: "https://cdn/x.jpg", travelMinutes: { m: 25, k: 35 },
  ...over }) as never;

test("meta satırı puan · fiyat · saat · kategori sırasını kurar, tagline ayrı satır", () => {
  render(<VenueRow venue={venue()} names={{ m: "Mehmet", k: "Kerem" }} selfId="m" />);
  expect(screen.getByText("★ 4.6 · €€ · Bugün 08:00–18:00 · espresso bar")).toBeTruthy();
  expect(screen.getByText("Sakin, oturmalı, iyi filtre kahve")).toBeTruthy();
});

test("alan yoksa parça atlanır, tagline satırı hiç çizilmez", () => {
  render(<VenueRow venue={venue({ hoursToday: undefined, tagline: undefined,
    taglineSource: undefined, priceLevel: undefined })}
    names={{ m: "Mehmet", k: "Kerem" }} selfId="m" />);
  expect(screen.getByText("★ 4.6 · espresso bar")).toBeTruthy();
  expect(screen.queryByText(/Sakin/)).toBeNull();
});
```

`Attribution.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import Attribution from "./Attribution";

test("FSQ kaynaklı tagline varsa Foursquare atfı da basılır", () => {
  render(<Attribution venues={[{ id: "v1", provider: "GOOGLE", taglineSource: "FSQ" }] as never} />);
  expect(screen.getByText("Google Maps")).toBeTruthy();
  expect(screen.getByText("Powered by Foursquare")).toBeTruthy();
});

test("tagline kaynağı yoksa yalnız sağlayıcı atfı kalır", () => {
  render(<Attribution venues={[{ id: "v1", provider: "GOOGLE" }] as never} />);
  expect(screen.queryByText("Powered by Foursquare")).toBeNull();
});
```

Run: `MTEST src/components/molecules/VenueRow.test.tsx src/components/molecules/Attribution.test.tsx` · Expected: kırmızı.

- [ ] **Step 2: `VenueThumb`'u gerçek fotoğrafa geçir** — `react-native` `Image` yerine
`expo-image` (önbellek + `transition`; deste kaydırmasında yeniden çizim maliyeti düşer):

```tsx
import { Image } from "expo-image";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { monogram } from "@bumpinto/shared";
import { AppText } from "../atoms";
import { fonts, photoTints, radius } from "../../theme";

export default function VenueThumb(p: { name?: string; photoUrl?: string; deckOrder?: number;
  width: number; height: number; monoSize?: number }) {
  const [broken, setBroken] = useState(false);
  const tint = photoTints[(p.deckOrder ?? 0) % photoTints.length];
  const box = { width: p.width, height: p.height, borderRadius: radius.thumb, overflow: "hidden" as const };
  if (p.photoUrl && !broken) {
    return (
      <Image source={{ uri: p.photoUrl }} style={box} contentFit="cover" transition={150}
        recyclingKey={p.photoUrl} accessibilityIgnoresInvertColors
        onError={() => setBroken(true)} />
    );
  }
  return (
    <LinearGradient colors={tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[box, { alignItems: "center", justifyContent: "center" }]}>
      <AppText style={{ fontFamily: fonts.head, fontSize: p.monoSize ?? 16, color: "#fff" }}>
        {monogram(p.name ?? "")}
      </AppText>
    </LinearGradient>
  );
}
```

`expo-linear-gradient` M-8'de kuruluysa olduğu gibi kullanılır; `rtk grep -c "expo-linear-gradient"
frontend/mobile/package.json` 0 dönerse `rtk pnpm exec npx expo install expo-linear-gradient`.

- [ ] **Step 3: `VenueRow`'un meta satırı + tagline** — mevcut meta üretimini şu saf yardımcıyla
değiştir (dosyanın başına):

```tsx
/** Artboard P11 meta satırı: ★ puan · fiyat · saat · kategori. Eksik parça ATLANIR. */
function metaParts(v: VenueDto, priceOf: (level?: number) => string | null): string[] {
  return [
    v.rating != null ? `★ ${v.rating}` : null,
    priceOf(v.priceLevel ?? undefined),
    v.hoursToday || null,
    v.category || null,
  ].filter((part): part is string => !!part);
}
```

`priceOf` M-8'in mevcut fiyat sözlüğüdür (`"€".repeat(level)`); ikinci kopyası yazılmaz.
Meta satırı `<AppText variant="muted">{metaParts(v, priceOf).join(" · ")}</AppText>`.
Uyum uyarısı satırı (`venue.fitOff`) olduğu gibi kalır — o meta'nın parçası değil.

Meta'nın hemen ALTINA (`.f-note` karşılığı; `RangeBar`'dan ÖNCE):

```tsx
      {!!v.tagline && (
        <AppText variant="muted" numberOfLines={2}
          style={{ fontSize: 13, color: colors.ink, fontStyle: "italic" }}>
          {v.tagline}
        </AppText>
      )}
```

`VenueThumb` çağrısına `photoUrl={v.photoUrl ?? undefined}` eklenir (M-8'de yalnız gradyandı).

- [ ] **Step 4: `Attribution`'a tagline kaynağı** — bileşen `venues` dizisi alır; mevcut sağlayıcı
satırının yanına:

```tsx
  const fsqTagline = props.venues.some((v) => v.taglineSource === "FSQ");
```

`fsqTagline` true ise `attribution.foursquare` etiketi listeye eklenir (zaten sağlayıcıdan
geliyorsa **tekrarlanmaz**: `Array.from(new Set(labels))`). Gerekçe: FSQ tips'ten türeyen metin
Foursquare atfı ister (GUIDE kural 8; B-15 T2).

- [ ] **Step 5: PASS** — Run: `MTEST src/components/molecules/VenueRow.test.tsx src/components/molecules/Attribution.test.tsx` · Expected: 4 test yeşil.
Sonra `MTEST src/components/molecules/RangeBar.test.tsx` — M-8 testi hâlâ yeşil olmalı.

- [ ] **Step 6: Dosya listesi** — `src/components/molecules/{VenueRow,VenueRow.test,VenueThumb,Attribution,Attribution.test}.tsx`. Mesaj: `feat(mobile): mekan karti 2.0 — tagline, saat, gercek foto, fsq atfi`.

---

### Task 4: Sonuç kartı görseli — 1080×1920 PNG + sistem paylaşımı

**Files:**
Create: `frontend/mobile/src/lib/shareCard.ts`,
`frontend/mobile/src/components/organisms/ShareCardImage.tsx`
Modify: `frontend/mobile/src/screens/ResultScreen.tsx`
Test: `frontend/mobile/src/lib/shareCard.test.ts`,
`frontend/mobile/src/components/organisms/ShareCardImage.test.tsx`

- [ ] **Step 1: Başarısız testleri yaz**

`shareCard.test.ts`:

```ts
import { Share } from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { CARD_H, CARD_W, captureShareCard, shareCard } from "./shareCard";

const mock = (fn: unknown) => fn as jest.Mock;
const ref = { current: {} } as never;

beforeEach(() => jest.clearAllMocks());

test("1080×1920 yakalar; çizim çökerse null döner", async () => {
  mock(captureRef).mockResolvedValue("file:///card.png");
  expect(await captureShareCard(ref)).toBe("file:///card.png");
  expect(captureRef).toHaveBeenCalledWith(ref,
    expect.objectContaining({ format: "png", width: CARD_W, height: CARD_H, quality: 1 }));
  expect([CARD_W, CARD_H]).toEqual([1080, 1920]);
  mock(captureRef).mockRejectedValue(new Error("surface"));
  expect(await captureShareCard(ref)).toBeNull();
});

test("dosya paylaşımı varsa görsel, yoksa metin paylaşılır", async () => {
  mock(Sharing.isAvailableAsync).mockResolvedValue(true);
  expect(await shareCard("file:///card.png", "metin", "Başlık")).toBe("shared");
  expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///card.png",
    expect.objectContaining({ mimeType: "image/png", UTI: "public.png" }));

  mock(Sharing.isAvailableAsync).mockResolvedValue(false);
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  expect(await shareCard(null, "metin", "Başlık")).toBe("text");
  expect(share).toHaveBeenCalledWith({ message: "metin" }, { dialogTitle: "Başlık" });
});

test("paylaşım sayfası hata verirse 'failed' döner, çökmez", async () => {
  mock(Sharing.isAvailableAsync).mockResolvedValue(true);
  mock(Sharing.shareAsync).mockRejectedValue(new Error("cancel"));
  expect(await shareCard("file:///card.png", "metin", "Başlık")).toBe("failed");
});
```

`ShareCardImage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import ShareCardImage from "./ShareCardImage";

const props = {
  venue: { id: "v1", name: "Café Berlage", address: "Kleine Berg 16, Eindhoven",
    photoUrl: "https://cdn/x.jpg", travelMinutes: { m: 25, k: 35 } },
  participants: [{ id: "m", displayName: "Mehmet" }, { id: "k", displayName: "Kerem" }],
} as never;

test("kart adı, kişi dakikalarını ve altbilgiyi taşır", () => {
  render(<ShareCardImage {...props} nodeRef={{ current: null }} />);
  expect(screen.getByText("Café Berlage")).toBeTruthy();
  expect(screen.getByText("Mehmet")).toBeTruthy();
  expect(screen.getByText("herkes ~25–35 dk · fark 10 dk")).toBeTruthy();
});
```

Run: `MTEST src/lib/shareCard.test.ts src/components/organisms/ShareCardImage.test.tsx` ·
Expected: modül bulunamadı.

- [ ] **Step 2: `src/lib/shareCard.ts`**
```ts
import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { Share, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

/** Dikey story ölçüsü (piksel). `ShareCardImage` bu oranı dp cinsinden çizer. */
export const CARD_W = 1080;
export const CARD_H = 1920;
/** Düğüm ekran dışında bu dp ölçüsünde durur; `captureRef` çıktıyı 3× büyütür. */
export const CARD_DP_W = 360;
export const CARD_DP_H = 640;

/** Ekran dışı düğümü PNG dosyasına çevirir; başarısızlıkta null (metin paylaşımına düşülür). */
export async function captureShareCard(nodeRef: RefObject<View | null>): Promise<string | null> {
  try {
    return await captureRef(nodeRef, {
      format: "png", quality: 1, result: "tmpfile", width: CARD_W, height: CARD_H });
  } catch {
    return null;
  }
}

export type ShareCardResult = "shared" | "text" | "failed";

/**
 * `uri` varsa görsel paylaşım sayfası açılır; sistemde paylaşım yoksa ya da görsel
 * üretilemediyse RN `Share` ile METİN paylaşılır. Kullanıcı vazgeçerse "failed" —
 * ikinci bir sayfa AÇILMAZ.
 */
export async function shareCard(uri: string | null, text: string,
  dialogTitle: string): Promise<ShareCardResult> {
  if (uri && (await Sharing.isAvailableAsync())) {
    try {
      await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle });
      return "shared";
    } catch {
      return "failed";
    }
  }
  try {
    await Share.share({ message: text }, { dialogTitle });
    return "text";
  } catch {
    return "failed";
  }
}
```
- [ ] **Step 3: `src/components/organisms/ShareCardImage.tsx`** — artboard P21 `.rc` (foto / meta /
kişiler / altbilgi). Ekran dışı düğüm olduğu için ölçüler burada mutlaktır (kural istisnası):

```tsx
/* Kaynak: artboard P21 · Sonuç kartı paylaş (.rc / .rc-ph / .rc-ppl / .rc-ft). Kullanıcı bu
   düğümü GÖRMEZ: ekran dışında durur, yalnız `captureShareCard` okur. */
import { fairnessOf, monogram, roundTravel, type ParticipantDto, type VenueDto }
  from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "../atoms";
import { CARD_DP_H, CARD_DP_W } from "../../lib/shareCard";
import { colors, fonts, photoTints } from "../../theme";

export default function ShareCardImage(props: { nodeRef: RefObject<View | null>;
  venue: VenueDto; participants: ParticipantDto[] }) {
  const { t } = useTranslation();
  const [broken, setBroken] = useState(false);
  const f = fairnessOf(props.venue);
  const nameOf = (id: string) =>
    props.participants.find((p) => p.id === id)?.displayName ?? "?";
  const rows = (f?.entries ?? []).map((e) => ({ id: e.id, name: nameOf(e.id),
    minutes: roundTravel(e.minutes) }));
  const showPhoto = !!props.venue.photoUrl && !broken;
  return (
    <View ref={props.nodeRef} collapsable={false} pointerEvents="none"
      style={{ position: "absolute", left: -10000, top: 0, width: CARD_DP_W, height: CARD_DP_H,
        backgroundColor: colors.paper, padding: 24, justifyContent: "flex-start" }}>
      <AppText variant="over" style={{ color: colors.flameDeep, textAlign: "center" }}>
        {t("result.overline")}</AppText>
      <AppText style={{ fontFamily: fonts.head, fontSize: 30, lineHeight: 34, color: colors.ink,
        textAlign: "center", marginTop: 4 }} numberOfLines={2}>{props.venue.name}</AppText>
      <View style={{ height: 240, borderRadius: 20, overflow: "hidden", marginTop: 16 }}>
        {showPhoto
          ? <Image source={{ uri: props.venue.photoUrl! }} style={{ flex: 1 }} contentFit="cover"
              onError={() => setBroken(true)} accessibilityIgnoresInvertColors />
          : <LinearGradient colors={photoTints[0]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <AppText style={{ fontFamily: fonts.head, fontSize: 64, color: "#fff" }}>
                {monogram(props.venue.name ?? "")}</AppText>
            </LinearGradient>}
      </View>
      <AppText variant="muted" style={{ marginTop: 12 }} numberOfLines={2}>
        {props.venue.address}</AppText>
      <View style={{ marginTop: 12, gap: 8 }}>
        {rows.map((r) => (
          <View key={r.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText variant="label">{r.name}</AppText>
            <AppText variant="num">{t("travel.minOne", { n: r.minutes })}</AppText>
          </View>))}
      </View>
      <View style={{ marginTop: "auto", flexDirection: "row", justifyContent: "space-between",
        alignItems: "center" }}>
        <AppText style={{ fontFamily: fonts.head, fontSize: 16, color: colors.ink }}>
          {t("common.wordmark")}</AppText>
        {f && (
          <AppText variant="muted" style={{ fontSize: 12 }}>
            {t("share.cardFooter", { min: f.min, max: f.max, spread: f.spread })}</AppText>)}
      </View>
    </View>
  );
}
```

`travel.minOne` M-8'de "~{{n}} dk" olarak var; yoksa üç dile eklenir (`rtk pnpm i18n:check`).

- [ ] **Step 4: `ResultScreen`'e "Kartı paylaş" düğmesi** — P20'nin ikili düğme satırı
(sol yeri T5'in "Takvime ekle"si alır):

```tsx
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);

  async function onShareCard() {
    setBusy(true);
    try {
      const uri = await captureShareCard(cardRef);
      const text = t("share.textFallback", { venue: venue.name ?? "", url: inviteUrl });
      const result = await shareCard(uri, text, t("share.dialogTitle"));
      if (!uri && result !== "failed") push("share.cardFailed", undefined, "flame");
    } finally {
      setBusy(false);
    }
  }
```

Düğme: `<Button kind="white" small disabled={busy} icon={<ImageIcon size={16} />}
title={busy ? t("share.preparing") : t("share.card")} onPress={() => void onShareCard()} />`.
`ShareCardImage` ekranın kökünde, `ResultCard`'ın YANINDA mount edilir (ekran dışı; görünür
düzeni etkilemez). Üst çubuktaki mevcut `Share.share` düğmesi **olduğu gibi kalır** (metin yolu).

- [ ] **Step 5: PASS** — Run: `MTEST src/lib/shareCard.test.ts src/components/organisms/ShareCardImage.test.tsx` · Expected: 4 test yeşil.

- [ ] **Step 6: Dosya listesi** — `src/lib/{shareCard.ts,shareCard.test.ts}`, `src/components/organisms/{ShareCardImage.tsx,ShareCardImage.test.tsx}`, `src/screens/ResultScreen.tsx`. Mesaj: `feat(mobile): 1080x1920 sonuc karti gorseli ve sistem paylasimi`.

---

### Task 5: "Takvime ekle" — ICS + saat soran alt sayfa

**Files:**
Create: `frontend/shared/src/ics.ts`, `frontend/mobile/src/lib/calendar.ts`,
`frontend/mobile/app/(sheets)/meet-time.tsx`
Modify: `frontend/shared/src/index.ts`, `frontend/mobile/src/screens/ResultScreen.tsx`
Test: `frontend/shared/src/ics.test.ts`, `frontend/mobile/src/lib/calendar.test.ts`

- [ ] **Step 1: `web/src/lib/ics.ts` var mı?** — Run: `ls frontend/web/src/lib/ics.ts`.
**Varsa** (W-15 yürütülmüş) dosya `mv frontend/web/src/lib/ics.ts frontend/shared/src/ics.ts` ile
taşınır, web'e shim bırakılır (M-4:T3b deseni):

```ts
export { buildIcs, defaultMeetAt, endOf, googleCalendarUrl, icsStamp, type CalendarEvent }
  from "@bumpinto/shared";
```

ve `frontend/web/src/lib/ics.test.ts` varsa `frontend/shared/src/ics.test.ts`'e taşınır.
**Yoksa** aşağıdaki test + kaynak sıfırdan yazılır. İki durumda da `shared/src/index.ts`'e:

```ts
export { buildIcs, defaultMeetAt, endOf, googleCalendarUrl, icsStamp, type CalendarEvent }
  from "./ics";
```
- [ ] **Step 2: Başarısız testleri yaz**

`frontend/shared/src/ics.test.ts` (taşındıysa mevcut dosya korunur, bu blok EKLENİR):

```ts
import { describe, expect, it } from "vitest";
import { buildIcs, defaultMeetAt } from "./ics";

describe("ics", () => {
  const event = { uid: "x@bumpinto.app", start: new Date("2026-09-06T18:30:00Z"),
    durationMinutes: 90, title: "Café Berlage · Cuma kahvesi",
    location: "Kleine Berg 16, Eindhoven", url: "https://bumpinto.app/j/x7k2m",
    timeZone: "Europe/Amsterdam" };
  it("UTC damgalı, CRLF'li geçerli VEVENT üretir", () => {
    const text = buildIcs(event);
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text).toContain("DTSTART:20260906T183000Z");
    expect(text).toContain("DTEND:20260906T200000Z");
    expect(text).toContain("X-WR-TIMEZONE:Europe/Amsterdam");
    expect(text).toContain("LOCATION:Kleine Berg 16\\, Eindhoven");
    expect(text.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
  it("varsayılan saat karar anı + 1 saat, tam saate yuvarlı", () => {
    expect(defaultMeetAt("2026-09-06T12:41:00Z").getMinutes()).toBe(0);
  });
});
```

`frontend/mobile/src/lib/calendar.test.ts`:

```ts
import * as Sharing from "expo-sharing";
import { writeIcsFile, shareIcs } from "./calendar";

const mock = (fn: unknown) => fn as jest.Mock;
const event = { uid: "x@bumpinto.app", start: new Date("2026-09-06T18:30:00Z"),
  durationMinutes: 90, title: "Café Berlage", location: "Kleine Berg 16",
  url: "https://bumpinto.app/j/x7k2m", timeZone: "Europe/Amsterdam" };

beforeEach(() => jest.clearAllMocks());

test("ICS önbelleğe yazılır ve slug'la adlandırılır", () => {
  expect(writeIcsFile(event, "x7k2m")).toBe("file:///cache/bumpinto-x7k2m.ics");
});

test("paylaşım yoksa null döner, çökmez", async () => {
  mock(Sharing.isAvailableAsync).mockResolvedValue(false);
  expect(await shareIcs(event, "x7k2m", "Takvime ekle")).toBe("unavailable");
  mock(Sharing.isAvailableAsync).mockResolvedValue(true);
  expect(await shareIcs(event, "x7k2m", "Takvime ekle")).toBe("shared");
  expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/bumpinto-x7k2m.ics",
    expect.objectContaining({ mimeType: "text/calendar" }));
});
```

Run: `PNPM_TEST ../shared/src/ics.test.ts` ve `MTEST src/lib/calendar.test.ts` · Expected: kırmızı.

- [ ] **Step 3: `frontend/shared/src/ics.ts`** (Step 1'de taşındıysa ATLA)
```ts
export type CalendarEvent = {
  uid: string;
  start: Date;
  durationMinutes: number;
  title: string;
  location: string;
  url: string;
  /** IANA bölgesi — bilgi amaçlı (`X-WR-TIMEZONE`); damgalar mutlak UTC'dir. */
  timeZone: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** RFC 5545 UTC `DATE-TIME`. `VTIMEZONE` YAZILMAZ: damgalar mutlak UTC, `TZID` gereksiz. */
export function icsStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** RFC 5545 §3.3.11 — virgül, noktalı virgül, ters bölü, satır sonu kaçışlanır. */
const esc = (value: string) => value.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");

export const endOf = (e: CalendarEvent) =>
  new Date(e.start.getTime() + e.durationMinutes * 60_000);

export function buildIcs(e: CalendarEvent): string {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BumpInto//App//TR", "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", `X-WR-TIMEZONE:${e.timeZone}`,
    "BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(e.start)}`, `DTEND:${icsStamp(endOf(e))}`,
    `SUMMARY:${esc(e.title)}`, `LOCATION:${esc(e.location)}`, `URL:${e.url}`,
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", e.title);
  url.searchParams.set("dates", `${icsStamp(e.start)}/${icsStamp(endOf(e))}`);
  url.searchParams.set("location", e.location);
  url.searchParams.set("details", e.url);
  return url.toString();
}

/** Sistemde buluşma saati YOK (§2) — öneri: karar anı + 1 saat, tam saate yuvarlı. */
export function defaultMeetAt(decidedAt?: string): Date {
  const base = decidedAt ? new Date(decidedAt) : new Date();
  const next = new Date((Number.isNaN(base.getTime()) ? Date.now() : base.getTime()) + 60 * 60_000);
  next.setMinutes(0, 0, 0);
  return next;
}
```
- [ ] **Step 4: `frontend/mobile/src/lib/calendar.ts`**
```ts
import { buildIcs, type CalendarEvent } from "@bumpinto/shared";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/** ICS'i önbelleğe yazar ve dosya URI'sini döner. `expo-calendar` KULLANILMAZ — yeni izin istemez. */
export function writeIcsFile(event: CalendarEvent, slug: string): string {
  const file = new File(Paths.cache, `bumpinto-${slug}.ics`);
  file.write(buildIcs(event));
  return file.uri;
}

export type IcsResult = "shared" | "unavailable" | "failed";

/** Dosyayı sistem paylaşım sayfasına verir; kullanıcı "Takvim"i seçince etkinlik eklenir. */
export async function shareIcs(event: CalendarEvent, slug: string,
  dialogTitle: string): Promise<IcsResult> {
  if (!(await Sharing.isAvailableAsync())) return "unavailable";
  try {
    const uri = writeIcsFile(event, slug);
    await Sharing.shareAsync(uri, { mimeType: "text/calendar",
      UTI: "com.apple.ical.ics", dialogTitle });
    return "shared";
  } catch {
    return "failed";
  }
}
```

SDK 57'de `expo-file-system` yeni API'yi (`File`/`Paths`) dışa aktarır. `rtk grep -c "Paths"
frontend/mobile/node_modules/expo-file-system/build/index.d.ts` 0 dönerse import
`expo-file-system/legacy`'ye alınır ve `writeAsStringAsync` kullanılır — o durum INDEX notuna yazılır.

- [ ] **Step 5: `app/(sheets)/meet-time.tsx`** — P20 "Takvime ekle" alt sayfası:

- `useLocalSearchParams<{ slug: string; venueId: string }>()`; `sessionStore.view`'dan mekan bulunur.
- `const [when, setWhen] = useState(defaultMeetAt(view.decidedAt));`
- Başlık `calendar.title`, açıklama `calendar.hint` (`AppText variant="muted"`).
- `DateTimePicker` iki kez: `mode="date"` ve `mode="time"`, `value={when}`,
  `onChange={(_e, d) => d && setWhen(d)}`; iOS'ta `display="compact"`, Android'de
  `display="default"` ve satırlar `Button kind="white" small` ile açılır (Android picker
  modaldır — `showDate`/`showTime` durumlarıyla kontrol edilir).
- CTA: `Button title={t("calendar.share")}` →
  ```tsx
  const event: CalendarEvent = {
    uid: `${slug}-${venue.id ?? "venue"}@bumpinto.app`,
    start: when, durationMinutes: 90,
    title: t("calendar.eventTitle", { venue: venue.name ?? "", session: view.name ?? "" }),
    location: venue.address ?? venue.name ?? "",
    url: `${webBase}/j/${slug}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  const result = await shareIcs(event, slug, t("calendar.add"));
  if (result !== "shared") push("calendar.error", undefined, "flame");
  router.back();
  ```
  `webBase` `expo-constants` `expoConfig.extra.webBase`'ten gelir (M-8'de tanımlı).

`ResultScreen`'de P20 ikili satırının SOL düğmesi:
`<Button kind="white" small icon={<CalendarPlus size={16} />} title={t("calendar.add")}
onPress={() => router.push({ pathname: "/(sheets)/meet-time", params: { slug, venueId } })} />`.

- [ ] **Step 6: PASS** — Run: `PNPM_TEST ../shared/src/ics.test.ts` (2 test) ve
`MTEST src/lib/calendar.test.ts` (2 test). Web taşındıysa ayrıca `rtk pnpm test:web` yeşil.

- [ ] **Step 7: Dosya listesi** — `frontend/shared/src/{ics.ts,ics.test.ts,index.ts}`, `frontend/web/src/lib/ics.ts` (shim, varsa), `frontend/mobile/src/lib/{calendar.ts,calendar.test.ts}`, `frontend/mobile/app/(sheets)/meet-time.tsx`, `frontend/mobile/src/screens/ResultScreen.tsx`. Mesaj: `feat(mobile): takvime ekle — paylasilan ics ve saat sayfasi`.

---

### Task 6: Oturum kodu + QR — kod girişi, lobi kodu, tarama sayfası

**Files:**
Create: `frontend/mobile/src/components/molecules/InviteEntryCard.tsx`,
`frontend/mobile/app/(sheets)/{qr,scan}.tsx`
Modify: `frontend/mobile/src/components/molecules/InviteCard.tsx`,
`frontend/mobile/app/sessions/index.tsx`, `frontend/mobile/app.config.ts`
Test: `frontend/mobile/src/components/molecules/{InviteEntryCard,InviteCard}.test.tsx`

- [ ] **Step 1: Başarısız testleri yaz**

`InviteEntryCard.test.tsx`:

```tsx
jest.mock("../../lib/api", () => ({ api: { sessionByCode: jest.fn() } }));
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { api } from "../../lib/api";
import InviteEntryCard from "./InviteEntryCard";

const mock = (fn: unknown) => fn as jest.Mock;
beforeEach(() => jest.clearAllMocks());

test("5 haneli kod uca sorulur ve dönen slug'a gidilir", async () => {
  mock(api.sessionByCode).mockResolvedValue({ slug: "ab12cd34" });
  render(<InviteEntryCard />);
  fireEvent.changeText(screen.getByPlaceholderText("Kod ya da link yapıştır"), "x7k2m");
  fireEvent.press(screen.getByRole("button", { name: "Katıl" }));
  await waitFor(() => expect(api.sessionByCode).toHaveBeenCalledWith("X7K2M"));
  expect(router.push).toHaveBeenCalledWith("/j/ab12cd34");
});

test("link yapıştırılırsa uç ÇAĞRILMAZ, doğrudan slug'a gidilir", async () => {
  render(<InviteEntryCard />);
  fireEvent.changeText(screen.getByPlaceholderText("Kod ya da link yapıştır"),
    "https://bumpinto.app/j/ab12cd34");
  fireEvent.press(screen.getByRole("button", { name: "Katıl" }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/j/ab12cd34"));
  expect(api.sessionByCode).not.toHaveBeenCalled();
});

test("geçersiz girdi ve bilinmeyen kod için hata metni", async () => {
  mock(api.sessionByCode).mockRejectedValue(new Error("404"));
  render(<InviteEntryCard />);
  const input = screen.getByPlaceholderText("Kod ya da link yapıştır");
  fireEvent.changeText(input, "abc");
  fireEvent.press(screen.getByRole("button", { name: "Katıl" }));
  await waitFor(() => expect(screen.getByText("Kod 5 haneli olmalı")).toBeTruthy());
  fireEvent.changeText(input, "X7K2M");
  fireEvent.press(screen.getByRole("button", { name: "Katıl" }));
  await waitFor(() => expect(screen.getByText("Bu kodla oturum bulunamadı")).toBeTruthy());
});
```

`InviteCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import InviteCard from "./InviteCard";

test("joinCode varsa kod satırı ve QR düğmesi çıkar", () => {
  render(<InviteCard slug="ab12cd34" joinCode="X7K2M" />);
  expect(screen.getByText("kod X7K2M · hesap gerekmez")).toBeTruthy();
  expect(screen.getByRole("button", { name: "QR göster" })).toBeTruthy();
});

test("joinCode yoksa kod satırı da QR düğmesi de çizilmez", () => {
  render(<InviteCard slug="ab12cd34" />);
  expect(screen.queryByText(/kod /)).toBeNull();
  expect(screen.queryByRole("button", { name: "QR göster" })).toBeNull();
});
```

Run: `MTEST src/components/molecules/InviteEntryCard.test.tsx src/components/molecules/InviteCard.test.tsx` · Expected: kırmızı.

- [ ] **Step 2: `InviteEntryCard.tsx`** (artboard P2 "Bir davet linkin mi var?" kartı)
```tsx
/* Kaynak: artboard P2 · Oturumlar (boş) — kod/link kartı. */
import { parseInvite } from "@bumpinto/shared";
import { QrCode } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { View } from "react-native";
import { AppText, Button, Card, IconButton, Input } from "../atoms";
import { api } from "../../lib/api";
import { colors } from "../../theme";

export default function InviteEntryCard() {
  const { t } = useTranslation();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(text: string) {
    const invite = parseInvite(text);
    if (!invite) return setError(t("code.invalid"));
    setError(null);
    if (invite.kind === "slug") return void router.push(`/j/${invite.slug}`);
    setBusy(true);
    try {
      const preview = await api.sessionByCode(invite.code);
      if (!preview.slug) throw new Error("no slug");
      router.push(`/j/${preview.slug}`);
    } catch {
      setError(t("code.notFound"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <AppText variant="h3">{t("code.label")}</AppText>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <Input style={{ flex: 1 }} value={raw} onChangeText={setRaw} autoCapitalize="characters"
          autoCorrect={false} placeholder={t("code.hint")} invalid={!!error}
          onSubmitEditing={() => void submit(raw)} />
        <IconButton accessibilityLabel={t("code.scan")}
          onPress={() => router.push("/(sheets)/scan")}
          icon={<QrCode size={20} color={colors.ink} />} />
      </View>
      {!!error && (
        <AppText variant="muted" style={{ color: colors.flameDeep, marginTop: 6 }}>{error}</AppText>
      )}
      <Button kind="white" small disabled={busy} title={t("code.join")}
        style={{ marginTop: 10 }} onPress={() => void submit(raw)} />
    </Card>
  );
}
```

`app/sessions/index.tsx`'te P2 boş durumundaki elle yazılmış davet kutusu (M-8 T5 Step 3)
**silinir** ve yerine `<InviteEntryCard />` konur — kod çözümlemesi tek yerde kalır.

- [ ] **Step 3: `InviteCard`'a kod + QR** (artboard P6) — prop listesine
`joinCode?: string | null;`. Link satırının altına:

```tsx
      {!!props.joinCode && (
        <AppText variant="muted">
          {t("code.codeLine", { code: props.joinCode })}
        </AppText>
      )}
```

Kopyala düğmesinin yanına, yine `joinCode` koşullu:

```tsx
      {!!props.joinCode && (
        <IconButton accessibilityLabel={t("code.showQr")}
          onPress={() => router.push({ pathname: "/(sheets)/qr", params: { slug: props.slug } })}
          icon={<QrCode size={20} color={colors.ink} />} />
      )}
```

`LobbyScreen` çağrısına `joinCode={view.joinCode ?? undefined}` eklenir (`SessionView.joinCode`
yalnız üyeye gelir; davetli görünümünde `undefined` → satır çizilmez).

- [ ] **Step 4: `app/(sheets)/qr.tsx`** — `QRCode` (react-native-qrcode-svg) `value={inviteUrl}`,
`size={240}`, `backgroundColor="#FFFFFF"`, `color={colors.ink}`; üstte `code.qrTitle`, altında
`code.qrHint` ve `code.codeLine` (büyük, `fonts.head`, harf aralığı 2). `inviteUrl` =
`${webBase}/j/${slug}` — `InviteCard` ile aynı kaynak.

- [ ] **Step 5: `app/(sheets)/scan.tsx`** — `expo-camera` ile QR tarama:
```tsx
const [permission, requestPermission] = useCameraPermissions();
const [handled, setHandled] = useState(false);
```

- İzin **yoksa**: `code.scanTitle` başlığı, `code.scanDisclosure` satırı (Play "prominent
  disclosure" gereği kameranın niçin açıldığını sistem diyaloğundan ÖNCE söyler) ve
  `Button title={t("code.scanAllow")} onPress={requestPermission}`. Ayrı bir izin **ön-ekranı
  gerekmez** — sistem diyaloğu kamera için yeterlidir; burada yalnız tek satır açıklama vardır.
- İzin **reddedildiyse**: `code.scanDenied` + `code.scanDeniedCopy` + `Linking.openSettings()`
  düğmesi (O6 kurtarma deseninin aynısı).
- İzin varsa: `<CameraView style={{ flex: 1 }} facing="back"
  barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} />`,
  üstünde yarı saydam şeritte `code.scanDisclosure`.

```tsx
  function onScan({ data }: { data: string }) {
    if (handled) return;
    const invite = parseInvite(data);
    if (!invite) return; // BumpInto linki değil — sessizce yok sayılır, taramaya devam
    setHandled(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace(invite.kind === "slug" ? `/j/${invite.slug}` : `/j/${invite.code}`);
  }
```

**Not:** QR her zaman `${webBase}/j/${slug}` taşır (Step 4), dolayısıyla `kind === "slug"` dalı
işler; kod dalı yalnız üçüncü taraf bir QR'da kodun kendisi yazılıysa devreye girer ve o durumda
`InviteEntryCard`'ın ucu kullanılamadığı için ekran `code.notFound`'a düşer — bu bilinçli ve
kayıtlıdır (K-M8).

- [ ] **Step 6: `app.config.ts`** — `plugins` dizisine:
```ts
    ["expo-camera", { cameraPermission:
      "BumpInto kamerayı yalnız arkadaşının davet QR kodunu okumak için kullanır." }],
```

M-5 tüm purpose string'leri O4/O7'den tek yerde toplayacak; burada **yalnız kamera** satırı eklenir
ve M-5 birleştirmesi INDEX notuna yazılır.

- [ ] **Step 7: PASS** — Run: `MTEST src/components/molecules/InviteEntryCard.test.tsx src/components/molecules/InviteCard.test.tsx` · Expected: 5 test yeşil. Ayrıca `MTEST app/sessions/index.test.tsx` — M-8 testindeki `getByPlaceholderText("Kod ya da link yapıştır")` beklentisi `InviteEntryCard` ile karşılanmalı (kırmızıysa kartın placeholder anahtarı düzeltilir, test **gevşetilmez**).

- [ ] **Step 8: Dosya listesi** — `src/components/molecules/{InviteEntryCard,InviteEntryCard.test,InviteCard,InviteCard.test}.tsx`, `app/(sheets)/{qr,scan}.tsx`, `app/sessions/index.tsx`, `app.config.ts`. Mesaj: `feat(mobile): oturum kodu girisi, lobi kodu ve qr tarama`.

---

### Task 7: Live Activity — köprü iskeleti (taslak, kapsamı kilitli)

> **REVİZYON NOTU (2026-09-07) — aşağıdaki adımlara başlamadan oku.**
> Bu görev SDK 54 varsayımıyla yazıldı: o gün Expo'nun widget/extension desteği yoktu, bu yüzden
> `plugins/withLiveActivity.js` **elde yazılmış** bir config plugin olarak tasarlandı ve yalnız
> `NSSupportsLiveActivities` anahtarını basıyordu. **SDK 57'de `expo-widgets` (~57.0.x) first-party
> geldi** — iOS Widget Extension target'ı ve ActivityKit artık CNG içinde desteklenen bir yol.
>
> Sonuç: **`plugins/withLiveActivity.js` YAZILMAZ.** Step 3 iptaldir; yerine `app.config.ts`
> `plugins` dizisine `expo-widgets` eklenir ve `npx expo install expo-widgets` çağrılır.
> `src/lib/liveActivity.ts` no-op arayüzü ve testleri (Step 1/2/4) **aynen durur** — M-9'un teslimi
> hâlâ yalnız köprüdür, P26 çizilmez.
>
> Adım gövdeleri M-9 sırası geldiğinde `expo-widgets`in o günkü API'sine göre yeniden yazılır;
> M-9 mobil sıranın **sonuncusu** (M-4 → M-7 → M-8 → M-5 → M-6 → M-9), bu yüzden şimdi yeniden
> yazmak erken — bugünkü doğru bilgi bu nottur.

**Files:**
Create: `frontend/mobile/plugins/withLiveActivity.js`,
`frontend/mobile/src/lib/liveActivity.ts`
Modify: `frontend/mobile/app.config.ts`
Test: `frontend/mobile/src/lib/liveActivity.test.ts`

**Kapsam (bağlayıcı):** Bu görev **yalnız** (a) iOS Info.plist anahtarını basan config plugin
iskeletini ve (b) çağrı yerlerinin bugünden yazılabilmesi için no-op TypeScript arayüzünü üretir.
Widget extension target'ı, ActivityKit Swift kodu, Android Live Update bildirimi ve push
güncellemesi (`device_tokens`) **B-16**'dadır. P26 tasarımı burada **çizilmez**; sahte bir kilit
ekranı önizlemesi üretmek yasaktır.

- [ ] **Step 1: Başarısız testi yaz** (`src/lib/liveActivity.test.ts`)
```ts
import { Platform } from "react-native";
import { endSessionActivity, isLiveActivityAvailable, startSessionActivity,
  updateSessionActivity } from "./liveActivity";

test("köprü bugün hiçbir platformda etkin değil ve null döner", async () => {
  expect(isLiveActivityAvailable()).toBe(false);
  expect(await startSessionActivity({ slug: "x7k2m", title: "Cuma kahvesi",
    subtitle: "2/3 hazır · Kerem bekleniyor", readyCount: 2, totalCount: 3 })).toBeNull();
});

test("güncelleme ve bitirme, etkin etkinlik yokken sessizce geçer", async () => {
  await expect(updateSessionActivity("id", { readyCount: 3, totalCount: 3 })).resolves
    .toBeUndefined();
  await expect(endSessionActivity("id")).resolves.toBeUndefined();
});

test("iOS'ta bile yerel modül yoksa kapalı kalır (B-16 açar)", () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
  expect(isLiveActivityAvailable()).toBe(false);
  Object.defineProperty(Platform, "OS", { value: original, configurable: true });
});
```

Run: `MTEST src/lib/liveActivity.test.ts` · Expected: modül bulunamadı.

- [ ] **Step 2: `src/lib/liveActivity.ts`**
```ts
/**
 * Live Activity / Live Update köprüsü — **TASLAK** (artboard P26).
 *
 * Bugün hiçbir yerel modül bağlı DEĞİLDİR: `isLiveActivityAvailable()` daima false döner ve
 * başlatma `null` verir. Amacı, çağrı yerlerinin (lobi → deste → karar geçişleri) B-16'dan önce
 * yazılabilmesi ve o iz geldiğinde TEK dosyanın değişmesidir. Gerçek uygulama şunları gerektirir:
 * iOS'ta ayrı bir Widget Extension target'ı + ActivityKit, Android 16'da Live Update bildirimi,
 * her ikisi için de sunucu tarafı push (B-16 `device_tokens`). Sahte bir "canlı" arayüz ÇİZİLMEZ.
 */
import { NativeModules, Platform } from "react-native";

/** P26'nın gösterdiği alanlar — B-16 bu şekli aynen taşır. */
export type SessionActivityState = {
  slug: string;
  title: string;
  subtitle: string;
  readyCount: number;
  totalCount: number;
};

/** B-16'da bu ada sahip yerel modül tanımlanır; yokken köprü kapalıdır. */
const NATIVE = (NativeModules as Record<string, unknown>).BumpIntoLiveActivity;

export function isLiveActivityAvailable(): boolean {
  if (!NATIVE) return false;
  // iOS 16.1+ ActivityKit, Android 16 Live Update — sürüm kapısı B-16'da yerel tarafta.
  return Platform.OS === "ios" || Platform.OS === "android";
}

/** Etkinliği başlatır; köprü kapalıyken `null` döner (çağıran sessizce devam eder). */
export async function startSessionActivity(_state: SessionActivityState): Promise<string | null> {
  if (!isLiveActivityAvailable()) return null;
  return null; // B-16: NATIVE.start(_state)
}

export async function updateSessionActivity(_activityId: string,
  _patch: Partial<SessionActivityState>): Promise<void> {
  if (!isLiveActivityAvailable()) return;
  // B-16: NATIVE.update(_activityId, _patch)
}

export async function endSessionActivity(_activityId: string): Promise<void> {
  if (!isLiveActivityAvailable()) return;
  // B-16: NATIVE.end(_activityId)
}
```
- [ ] **Step 3: `plugins/withLiveActivity.js`** — CNG prebuild'de Info.plist anahtarını basan
asgari plugin (target üretmez):

```js
const { withInfoPlist } = require("expo/config-plugins");

/**
 * Live Activity taslağı: yalnız `NSSupportsLiveActivities` anahtarını yazar. Widget Extension
 * target'ı üretmez — onu B-16 ekleyecek; anahtarın şimdiden bulunması, o iz geldiğinde prebuild
 * farkının tek dosyaya inmesini sağlar. Android tarafında bu sürümde değişiklik YOKTUR.
 */
module.exports = function withLiveActivity(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    return cfg;
  });
};
```

`app.config.ts` `plugins` dizisine `"./plugins/withLiveActivity"` eklenir.

- [ ] **Step 4: PASS** — Run: `MTEST src/lib/liveActivity.test.ts` · Expected: 3 test yeşil.
Ayrıca Run: `cd frontend/mobile && rtk pnpm exec npx expo config --type prebuild > /dev/null`
Expected: hata yok (plugin çözümleniyor).

- [ ] **Step 5: Dosya listesi** — `plugins/withLiveActivity.js`, `src/lib/{liveActivity.ts,liveActivity.test.ts}`, `app.config.ts`. Mesaj: `feat(mobile): live activity kopru iskeleti (taslak, B-16 acar)`.

---

### Task 8: Tam koşu, cihaz kontrol listesi ve INDEX kaydı

**Files:**
Create: `frontend/mobile/.maestro/04-code-join.yaml`, `docs/store/DEVICE-CHECKLIST-M9.md`
Modify: `docs/superpowers/plans/INDEX.md`

- [ ] **Step 1: Maestro akışı** (`04-code-join.yaml`) — kod ile katılım gerçek istemciyle koşar
(framework-glue testsiz bırakılmaz):

```yaml
appId: app.bumpinto.mobile
---
- launchApp: { clearState: true }
- tapOn: "Google ile devam et"
- assertVisible: { text: "Bir davet linkin mi var?", timeout: 20000 }
- tapOn: { id: "invite-input" }
- inputText: "${MAESTRO_JOIN_CODE}"
- tapOn: "Katıl"
- assertVisible: { text: "seni buluşmaya çağırdı", timeout: 20000 }
- back
- tapOn: { id: "invite-input" }
- inputText: "ZZZZZ"
- tapOn: "Katıl"
- assertVisible: "Bu kodla oturum bulunamadı"
```

`InviteEntryCard`'ın `Input`'una `testID="invite-input"` eklenir.
`.maestro/README.md`'ye `MAESTRO_JOIN_CODE`'un nasıl alınacağı yazılır:
`curl -s -H "Authorization: Bearer $TOKEN" localhost:8060/api/sessions/$SLUG | jq -r .joinCode`.

- [ ] **Step 2: `docs/store/DEVICE-CHECKLIST-M9.md`** — jest ile doğrulanamayan altı yüzey; her
satır dev build'de (iOS + Android) elle işaretlenir:

```markdown
# M-9 cihaz kontrol listesi (dev build, iOS + Android)

- [ ] **Kart görseli** — P20 "Kartı paylaş": üretilen PNG **1080×1920**; fotolu ve fotosuz
      (gradyan + monogram) iki mekanda da metin taşmıyor; uçak modunda foto yüklenemeyince
      gradyana düşüyor ve kart yine üretiliyor.
- [ ] **Paylaşım sayfası** — WhatsApp / Mesajlar / "Görseli kaydet" seçenekleri görünüyor;
      vazgeçince ikinci bir sayfa AÇILMIYOR (`shareCard` → "failed").
- [ ] **Takvim** — .ics dosyası iOS Takvim ve Google Takvim'de açılıyor; saat seçilen saatle
      birebir aynı (yaz saati sınırında `Europe/Amsterdam` ile bir kez daha denenir).
- [ ] **QR** — Lobi QR'ı üçüncü taraf bir kamera uygulamasıyla okunduğunda `/j/<slug>` açıyor;
      uygulamanın kendi tarayıcısı ışık az iken de okuyor.
- [ ] **Kamera izni** — sistem diyaloğundan ÖNCE `code.scanDisclosure` satırı görünüyor
      (Play prominent disclosure); reddedince Ayarlar yolu çıkıyor.
- [ ] **Dürt** — host dürtünce hedef cihazda bildirim + haptik çıkıyor; 60 sn içinde ikinci
      dokunuş uca gitmiyor (sunucu 429 loglanmıyor). **STOMP köprüsü M-6'dan sonra doğrulanır.**
```
- [ ] **Step 3: Tam koşu** — Run (repo kökünden):
```bash
source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test
source ./init-nvm.sh && pnpm --filter @bumpinto/mobile typecheck
rtk pnpm test:web && rtk pnpm i18n:check
```

Expected: mobil süit yeşil (T2–T7'nin 22 testi + M-8'in mevcut testleri), tip hatası yok, web
regresyonu temiz (shared `api.ts`/`ics.ts`/`index.ts` değişti), i18n paritesi tam.

- [ ] **Step 4: Yer tutucu taraması** — Run:
`rtk grep -rn "TODO\|FIXME\|TBD" frontend/mobile/src frontend/mobile/app frontend/mobile/plugins`
Expected: yalnız `VoiceDockSlot.tsx`'teki M-6 notu. `liveActivity.ts`'teki `// B-16:` yorumları
kasıtlıdır ve bu desene uymaz (TODO değil, hedef iz adı); başka eşleşmede görev **kapanmaz**.

- [ ] **Step 5: INDEX kaydı** — `docs/superpowers/plans/INDEX.md`:

**M — Mobil** tablosuna yeni satır:

```
| M-9 | **Mobil v3 cilası** — presence 2.0 (`lastSeenAt`/`linkOpenedAt`) + dürt (60 sn soğuma, `nudged` → bildirim + haptik), mekan kartı 2.0 (`tagline`, saat, `expo-image` foto, FSQ atfı), 1080×1920 sonuç kartı (`react-native-view-shot` + `expo-sharing`, foto/metin yedeği), "Takvime ekle" (paylaşılan `ics.ts` + saat sayfası, `expo-calendar` YOK), oturum kodu + QR (`by-code`, `react-native-qrcode-svg`, `expo-camera`), Live Activity köprü iskeleti | `2026-09-06-plan43-mobile-v3-polish.md` | Plan 43 | ready | **M-8**, **B-15** | — | R-M9, R-M11, R-M12, R-M17. 8 görev. Live Activity **taslak** (Info.plist + no-op arayüz); gerçek widget/push B-16. UI: Mobil Ekranlar v3 P2/P6/P10/P11/P17/P20/P21/P26. |
```

**Spec dışı görevler** tablosuna üç satır:

```
| K-M6 | `liveEvents.emitSessionEvent` üreticisi yok: `nudged` bildirimi M-6'nın STOMP portu bağlanana kadar yalnız testten tetiklenir | açık | M-6 | M-6'da `liveChannel` her olayda `emitSessionEvent` çağırır — tek satır |
| K-M7 | `expo-camera` purpose string'i M-9'da tek başına eklendi; M-5 tüm purpose string'leri O4/O7'den tek yerde toplarken bu satır oraya alınır | açık | M-5 | Metin değişmez, yalnız yeri değişir |
| K-M8 | Kod yazılı (link değil) üçüncü taraf QR'ı `scan.tsx`'te çözülemez — `code.notFound`'a düşer | aday | M-7 sonrası | Gerekirse `scan.tsx` kod dalını `api.sessionByCode`'a bağlar |
```

`K-M4` ("Dürt + `lastSeenAt`/`linkOpenedAt` mobil UI'ı") satırı → **`done`**, not:
`M-9 (plan43) T2'de uygulandı; P10'da davetliye düğme yerine presence.hostOnly satırı (W-15 ile tek uygulama).`

Üst blokta (satır 118) mobil akış `… M-6 ──> M-7 (…)` yerine
`… M-6 ──> [B-15] M-9 (v3 cilası)` olur; `Sıradakiler:` satırına **M-9** eklenir.

**Çapraz iz kilitleri**'ne 11. madde:

```
11. **M-9 ⇄ W-15 (shared dosyalar).** M-9 T1 `shared/src/api.ts`'e `nudge`/`sessionByCode`, T5
    `shared/src/ics.ts`'e ICS'i koyar ve web'e shim bırakır; W-15 aynı `nudge` satırını ve kendi
    `web/src/lib/ics.ts`'ini yazar. Hangisi ikinci koşarsa **mevcut satırı tekrarlamaz**, shim'e
    çevirir. Dil anahtarları `frontend/shared/src/i18n/locales`'tadır (M-4:T3a taşıdı).
```
- [ ] **Step 6: Dosya listesi** — `frontend/mobile/.maestro/{04-code-join.yaml,README.md}`, `frontend/mobile/src/components/molecules/InviteEntryCard.tsx`, `docs/store/DEVICE-CHECKLIST-M9.md`, `docs/superpowers/plans/INDEX.md`. Mesaj: `test(mobile): kod ile katilim e2e + cihaz kontrol listesi + INDEX kaydi (M-9)`.

---

## Plan öz-incelemesi

**Spec kapsamı.** §2'nin mobili ilgilendiren altı kararı da karşılandı: `tagline`/`taglineSource`
(T3), `lastSeenAt`/`linkOpenedAt` (T2), `POST …/nudge/{participantId}` + `nudged` olayı (T1/T2),
`SessionView.joinCode` + `GET /api/sessions/by-code/{code}` (T1/T6), `GET /og/{slug}.png` yardımcısı
(T1), buluşma saatinin **sistemde olmaması** → istemci diyaloğu (T5). Gereksinimler: R-M9 (T2),
R-M11 (T4+T5), R-M12 (T3), R-M17 (T6); Live Activity taslağı (T7) kapsamı yazılı olarak kilitli.

**Yer tutucu taraması.** "TBD", "TODO", "uygun hata yönetimi ekle", "Task N'e benzer" ifadesi yok;
her adım ya tam kod ya da adı geçen dosyada birebir uygulanacak somut değişiklik veriyor.
`liveActivity.ts`'teki `// B-16:` yorumları hedef iz işaretidir, iş kalemi değil (T8 Step 4 bunu
tarama kuralında ayırıyor).

**Tip tutarlılığı.** `Toast{id,messageKey,params,tone}` + `push(key, params?, tone?)` T2 tanım =
`ToastHost` = T4/T5 çağrıları · `useSocialStore.{nudgedAt,canNudge,nudge,listen}` T2 tanım = T2
ekran bağlamaları · `SessionEventLike` T2 `liveEvents` = `socialStore.listen` = M-6 üreticisi ·
`ParticipantRow` propları `{onNudge?, nudgeDisabled?}` T2 tanım = üç ekran · `Invite`/`parseInvite`
T1 tanım = T6 `InviteEntryCard` = T6 `scan.tsx` · `CARD_W/CARD_H/CARD_DP_W/CARD_DP_H` T4 `shareCard`
= `ShareCardImage` · `captureShareCard(ref) → string | null`, `shareCard(uri, text, title) →
ShareCardResult` T4 tanım = `ResultScreen` · `CalendarEvent` T5 `shared/ics.ts` = `calendar.ts` =
`meet-time.tsx` · `SessionActivityState` T7 tanım = üç fonksiyon imzası.

**Bilinen sapmalar (kayıtlı).** (1) P10'da davetliye "dürt" düğmesi yerine `presence.hostOnly`
satırı — W-15 ile tek uygulama (T2 Step 7, INDEX K-M4 notu). (2) `nudged` bildiriminin üreticisi
M-6'ya bağlı (K-M6). (3) `expo-camera` purpose string'i M-5'te birleştirilecek (K-M7).
(4) Kod yazılı üçüncü taraf QR'ı çözülmüyor (K-M8).
