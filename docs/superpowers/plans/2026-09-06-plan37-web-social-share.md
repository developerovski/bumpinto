# Sosyal Güvenlik + Paylaşım — Web (W-15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apple 1.2 (UGC) için bildir/engelle paneli, presence 2.0 (çevrimiçi noktası · bekleyen nabız · "Linki açtı" · "Son görülen"), host'un "dürt"ü, sonuç kartının 1080×1920 PNG paylaşımı, "Takvime ekle" (ICS + Google Calendar) ve davet linki OG meta'sı.

**Architecture:** `socialStore` (zustand) bildir/engelle/dürt eylemlerinin TEK sahibi: dürtme soğuması, iyimser engel işareti ve sonuç bildirimleri buradan çıkar; bileşen hiçbir uç çağırmaz. Bildirimler `toastStore`'a **i18n anahtarı + parametre** olarak yazılır (depo `t`'ye erişemez), `ToastHost` çevirip basar — STOMP `nudged` olayı da aynı yoldan görünür. `ParticipantRow` yalnız görünüm: üç presence durumunu sunucu alanlarından türetir, "…" düğmesini üstten gelen geri çağrıyla açar; panel (`PersonSheet`) `ParticipantList`'te tek yerde mount edilir. Paylaşımda `lib/shareCard.ts` DOM→PNG dönüşümü ile CORS ön denemesini kapsar, `ShareCard` ekran dışı 1080×1920 düğümü çizer, `ShareButton` iki modlu olur (metin / dosya). `lib/ics.ts` saf metin üretir — sistemde buluşma saati YOK, saat `MeetTimeDialog` ile kullanıcıdan alınır.

**Tech Stack:** React 18, zustand 5, react-i18next (tr/en/nl), Tailwind v4, `html-to-image` (yeni bağımlılık), Web Share API Level 2 (`navigator.share({files})`), vitest + RTL + jsdom.

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` §2 (sözleşme kararları — alan/uç adları DEĞİŞTİRİLMEZ), §3 Web, §4 (W-15 paketi), §6 risk 4. Karşılanan gereksinimler: **R-W15** (bildir/engelle), **R-W5** (presence UI 2.0), **R-W6** (dürt), **R-W3** (sonuç kartı görseli), **R-W4** (ICS).

**UI Kaynağı:** Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, dosya `Web Ekranlar v3.dc.html`. Artboard'lar: **W20 · Bildir/Engelle 1280** (frag `68`), **W20 · Bildir/Engelle 390** (`69`), **W20 · Bildirildi 390** (`70`), **W3 · Lobi 1280/390** (`07`/`08`), **W5 · Bekle** (`16`), **W6d · Gönderildi 1280/390** (`37`/`38`), **W8 · Karar 1280/390** (`24`/`25`). Mobil eşi `Mobil Ekranlar v3.dc.html` · **P21 · Sonuç kartı paylaş** — kart iskeleti (`.rc` / `.rc-ph` / `.rc-ppl` / `.rc-ft`) web ile aynıdır. Ajan kendi tasarımını yapmaz.

**Ön koşul:** **B-14 (R-B4)** ve **B-15 (R-B8)** `done`, `frontend/shared/src/api-types.ts` yeniden üretilmiş (`pnpm --filter @bumpinto/shared generate`). Doğrula (repo kökünden):
```bash
grep -c "ReportRequest\|BlockRequest\|lastSeenAt\|linkOpenedAt" frontend/shared/src/api-types.ts   # ≥ 4
grep -c '"/api/reports"\|"/api/me/blocks"\|/nudge/{participantId}' frontend/shared/src/api-types.ts # ≥ 3
grep -o 'reason: "[A-Z_"| ]*' frontend/shared/src/api-types.ts | head -1                            # sebep birliği
```

Üçüncü komut `ReportRequest.reason` birliğini yazdırır; Task 6'daki `REASONS` dizisi bununla birebir aynı olmalı (`satisfies` derlemede kilitler). Eşikler tutmuyorsa plan **blocked** — sebep ya da uç adı uydurulmaz.

**Bağlayıcı kurallar:**
- **Git yazma işlemi YOK**; her görev sonunda dosya listesi bırakılır, commit'i kullanıcı yapar (AGENTS.md).
- Test komutu (repo kökünden): `source ./init-nvm.sh && pnpm --filter @bumpinto/web test --run <yol>` — aşağıda **`PNPM_TEST <yol>`**. Kökten çıplak `vitest` KOŞMA. Tam koşu: `pnpm test:web`.
- Tailwind utility'leri yalnız `components/` altında; sayfalar kompozisyon.
- i18n: `tr` taban, `en`/`nl` parite (`pnpm i18n:check`). Aşağıdaki JSON blokları yer kazanmak için sıkıştırılmış yazıldı; yapıştırdıktan sonra `pnpm format` biçimlendirir.
- **Sözleşme §2'dir**: `lastSeenAt`, `linkOpenedAt`, `blocked`, `nudged{fromParticipantId,toParticipantId}`, `POST /api/reports`, `POST /api/me/blocks`, `POST /api/sessions/{slug}/nudge/{participantId}` adları değiştirilmez.
- Sunucudan gelmeyen bilgi UYDURULMAZ: `linkOpenedAt` yoksa mevcut "Konum bekleniyor…" metni kalır, `lastSeenAt` yoksa yalnız "çevrimdışı" yazılır.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `frontend/shared/src/api.ts` | T1 | `report`, `blockParticipant`, `nudge` |
| `web/src/i18n/locales/{tr,en,nl}.json` | T2 | `presence` · `social` · `share` · `calendar` |
| `web/src/store/toastStore.ts` (+test), `molecules/ToastHost.tsx` (+test), `organisms/AppShell.tsx` | T3 | Bildirim kuyruğu (anahtar + parametre) |
| `web/src/components/molecules/ParticipantRow.tsx` (+test), `styles/app.css` | T4 | Presence 2.0 + "…" düğmesi |
| `web/src/store/socialStore.ts` (+test), `organisms/ParticipantList.tsx`, `store/useSessionLive.ts`, `pages/{LobbyPage,WaitingRoom}.tsx` | T5 | Dürt + soğuma + `nudged` olayı |
| `web/src/components/organisms/PersonSheet.tsx` (+test), `ParticipantList.tsx`, `store/voiceStore.ts` (+test), `lib/voiceMesh.ts` (+test) | T6 | Bildir / engelle / yerel sustur + engelli roster |
| `web/package.json`, `lib/shareCard.ts` (+test), `molecules/ShareCard.tsx`, `ShareButton.tsx` (+test) | T7 | 1080×1920 PNG + iki modlu paylaşım |
| `web/src/lib/ics.ts` (+test), `molecules/MeetTimeDialog.tsx` (+test), `molecules/ResultActions.tsx`, `pages/ResultScreen.tsx` | T8 | ICS + Google Calendar + eylem satırı |
| `web/index.html`, `web/src/meta.test.ts`, `docs/superpowers/plans/INDEX.md` | T9 | OG meta + doğrulama + kayıt |

---
### Task 1: Paylaşılan API istemcisi (rapor · engel · dürt)
**Files:** Modify: `frontend/shared/src/api.ts`
- [ ] **Step 1: Ön koşulu doğrula** — yukarıdaki üç `grep` komutunu koş; eşikler tutmazsa `pnpm --filter @bumpinto/shared generate`, hâlâ eksikse dur (plan `blocked`).

- [ ] **Step 2: Üç fonksiyon ekle** (`voiceCredentials` satırından sonra, `createBumpintoApi` nesnesinin içine)
```ts
    report: (body: Schemas["ReportRequest"]) =>
      http.post("/api/reports", body).then(() => undefined),
    blockParticipant: (body: Schemas["BlockRequest"]) =>
      http.post<Schemas["BlockDto"]>("/api/me/blocks", body).then((r) => r.data),
    nudge: (slug: string, participantId: string) =>
      http.post(`/api/sessions/${slug}/nudge/${participantId}`).then(() => undefined),
```
- [ ] **Step 3: Derle** — Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b` · Expected: hata yok. `Schemas["BlockDto"]` yoksa B-14 yanıt tipini başka adlandırmış: `api-types.ts`'teki gerçek adı kullan, **uç yolunu değiştirme**.

- [ ] **Step 4: Dosya listesi** — `frontend/shared/src/api.ts`. Mesaj: `feat(social): shared api client for reports, blocks and nudge`.

---
### Task 2: i18n anahtarları (presence · social · share · calendar)
**Files:** Modify: `frontend/web/src/i18n/locales/tr.json`, `en.json`, `nl.json`
- [ ] **Step 1: `tr.json` kök nesnesinin sonuna ekle**
```json
  "presence": {
    "linkOpened": "Linki açtı · konum bekleniyor…", "lastSeen": "Son görülen · {{time}}",
    "nudge": "{{name}}'i dürt", "nudgeSent": "{{name}} dürtüldü",
    "nudgeCooling": "Az önce dürttün — bir dakika bekle", "nudgeError": "Dürtme gönderilemedi — tekrar dene.",
    "nudged": "Seni dürttüler — konumunu paylaşırsan devam edebiliriz",
    "hostOnly": "Dürtme yalnız kurana görünür."
  },
  "social": {
    "options": "{{name}} · seçenekler", "inSession": "{{place}} · bu buluşmada", "report": "Bildir",
    "reportHint": "Rahatsız edici ad ya da davranış", "block": "Engelle",
    "blockHint": "Sesli sohbette duymazsın, seni göremez", "mute": "Sesli sohbette sustur",
    "unmute": "Susturmayı kaldır", "muteHint": "Yalnız senin için", "reportTitle": "Neyi bildiriyorsun?",
    "reasonOFFENSIVE_NAME": "Rahatsız edici ad", "reasonVOICE_HARASSMENT": "Sesli sohbette taciz",
    "reasonSPAM": "Sahte / spam", "reasonOTHER": "Başka",
    "reportNote": "Bildirim ekibimize gider; 24 saat içinde bakılır. {{name}} bunu görmez.", "send": "Gönder",
    "reported": "Bildirildi · {{name}} engellendi", "blocked": "{{name}} engellendi",
    "error": "Gönderilemedi — tekrar dene.", "blockedRow": "engellendi"
  },
  "share": {
    "card": "Kartı paylaş", "preparing": "Kart hazırlanıyor…", "cardTitle": "{{venue}}'de buluşuyoruz",
    "cardFooter": "herkes ~{{min}}–{{max}} dk · fark {{spread}} dk", "fileName": "bumpinto-{{slug}}.png"
  },
  "calendar": {
    "add": "Takvime ekle", "title": "Saat kaçta?",
    "hint": "Buluşma saatini sen seçersin — sistemde kayıtlı bir saat yok.", "date": "Tarih", "time": "Saat",
    "download": "Takvim dosyası indir", "google": "Google Calendar'da aç",
    "eventTitle": "{{venue}} · {{session}}"
  },
```
- [ ] **Step 2: `en.json`'a aynı ağacı ekle**
```json
  "presence": {
    "linkOpened": "Opened the link · waiting for location…", "lastSeen": "Last seen · {{time}}",
    "nudge": "Nudge {{name}}", "nudgeSent": "Nudged {{name}}",
    "nudgeCooling": "You just nudged — wait a minute", "nudgeError": "Couldn't send the nudge — try again.",
    "nudged": "Someone nudged you — share your location so we can move on",
    "hostOnly": "Only the host sees the nudge."
  },
  "social": {
    "options": "{{name}} · options", "inSession": "{{place}} · in this meet-up", "report": "Report",
    "reportHint": "Offensive name or behaviour", "block": "Block",
    "blockHint": "You won't hear them in voice chat, they can't see you", "mute": "Mute in voice chat",
    "unmute": "Unmute", "muteHint": "Only for you", "reportTitle": "What are you reporting?",
    "reasonOFFENSIVE_NAME": "Offensive name", "reasonVOICE_HARASSMENT": "Harassment in voice chat",
    "reasonSPAM": "Fake / spam", "reasonOTHER": "Something else",
    "reportNote": "The report goes to our team and is reviewed within 24 hours. {{name}} won't see it.",
    "send": "Send", "reported": "Reported · {{name}} blocked", "blocked": "{{name}} blocked",
    "error": "Couldn't send — try again.", "blockedRow": "blocked"
  },
  "share": {
    "card": "Share the card", "preparing": "Preparing the card…", "cardTitle": "We're meeting at {{venue}}",
    "cardFooter": "everyone ~{{min}}–{{max}} min · {{spread}} min apart", "fileName": "bumpinto-{{slug}}.png"
  },
  "calendar": {
    "add": "Add to calendar", "title": "What time?",
    "hint": "You pick the time — there is no stored meeting time yet.", "date": "Date", "time": "Time",
    "download": "Download calendar file", "google": "Open in Google Calendar",
    "eventTitle": "{{venue}} · {{session}}"
  },
```
- [ ] **Step 3: `nl.json`'a aynı ağacı ekle**
```json
  "presence": {
    "linkOpened": "Link geopend · wacht op locatie…", "lastSeen": "Laatst gezien · {{time}}",
    "nudge": "{{name}} porren", "nudgeSent": "{{name}} is gepord",
    "nudgeCooling": "Je hebt net gepord — wacht een minuut",
    "nudgeError": "Porren is niet gelukt — probeer opnieuw.",
    "nudged": "Iemand porde je — deel je locatie zodat we verder kunnen",
    "hostOnly": "Alleen de organisator ziet het porren."
  },
  "social": {
    "options": "{{name}} · opties", "inSession": "{{place}} · in deze afspraak", "report": "Melden",
    "reportHint": "Aanstootgevende naam of gedrag", "block": "Blokkeren",
    "blockHint": "Je hoort ze niet in de spraakchat, zij zien jou niet", "mute": "Dempen in spraakchat",
    "unmute": "Dempen opheffen", "muteHint": "Alleen voor jou", "reportTitle": "Wat meld je?",
    "reasonOFFENSIVE_NAME": "Aanstootgevende naam", "reasonVOICE_HARASSMENT": "Intimidatie in spraakchat",
    "reasonSPAM": "Nep / spam", "reasonOTHER": "Iets anders",
    "reportNote": "De melding gaat naar ons team en wordt binnen 24 uur bekeken. {{name}} ziet dit niet.",
    "send": "Versturen", "reported": "Gemeld · {{name}} geblokkeerd", "blocked": "{{name}} geblokkeerd",
    "error": "Versturen is niet gelukt — probeer opnieuw.", "blockedRow": "geblokkeerd"
  },
  "share": {
    "card": "Kaart delen", "preparing": "Kaart wordt gemaakt…", "cardTitle": "We spreken af bij {{venue}}",
    "cardFooter": "iedereen ~{{min}}–{{max}} min · {{spread}} min verschil",
    "fileName": "bumpinto-{{slug}}.png"
  },
  "calendar": {
    "add": "Aan agenda toevoegen", "title": "Hoe laat?",
    "hint": "Jij kiest de tijd — er is nog geen opgeslagen afspraaktijd.", "date": "Datum", "time": "Tijd",
    "download": "Agendabestand downloaden", "google": "Openen in Google Calendar",
    "eventTitle": "{{venue}} · {{session}}"
  },
```
- [ ] **Step 4: Pariteyi doğrula** — Run: `source ./init-nvm.sh && pnpm i18n:check` · Expected: 0 fark (üç dosyada aynı 41 yeni anahtar, çoğul yok).

- [ ] **Step 5: Dosya listesi** — `i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(i18n): presence, social, share and calendar keys`.

---
### Task 3: `toastStore` + `ToastHost`
**Files:** Create: `frontend/web/src/store/toastStore.ts`, `frontend/web/src/components/molecules/ToastHost.tsx` · Modify: `frontend/web/src/components/organisms/AppShell.tsx` · Test: `frontend/web/src/store/toastStore.test.ts`, `frontend/web/src/components/molecules/ToastHost.test.tsx`
- [ ] **Step 1: Başarısız testleri yaz**

`toastStore.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToastStore } from "./toastStore";
describe("toastStore", () => {
  beforeEach(() => { vi.useFakeTimers(); useToastStore.setState({ toasts: [] }); });
  afterEach(() => vi.useRealTimers());
  it("anahtar + parametreyi kuyruğa koyar, 5 sn sonra düşürür", () => {
    useToastStore.getState().push("social.blocked", { name: "Kerem" });
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      messageKey: "social.blocked", params: { name: "Kerem" }, tone: "grass" });
    vi.advanceTimersByTime(5000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
  it("aynı anahtar tekrarlanmaz; dismiss zamanlayıcıyı beklemez", () => {
    const { push, dismiss } = useToastStore.getState();
    push("presence.nudged");
    push("presence.nudged");
    push("social.error", {}, "flame");
    expect(useToastStore.getState().toasts).toHaveLength(2);
    dismiss(useToastStore.getState().toasts[0].id);
    expect(useToastStore.getState().toasts.map((toast) => toast.tone)).toEqual(["flame"]);
  });
});
```

`ToastHost.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useToastStore } from "../../store/toastStore";
import ToastHost from "./ToastHost";
describe("ToastHost", () => {
  beforeEach(() => useToastStore.setState({ toasts: [] }));
  it("anahtarı çevirip basar, kapatma düğmesi kuyruğu boşaltır", () => {
    render(<ToastHost />);
    useToastStore.getState().push("social.reported", { name: "Kerem" });
    expect(screen.getByRole("status")).toHaveTextContent("Bildirildi · Kerem engellendi");
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
```
Run: `PNPM_TEST src/store/toastStore.test.ts src/components/molecules/ToastHost.test.tsx` · Expected: modül bulunamadı.
- [ ] **Step 2: `toastStore.ts`'i yaz**
```ts
import { create } from "zustand";
export type ToastTone = "grass" | "flame";
export type Toast = {
  id: number;
  /** i18n anahtarı — depo `t`'ye erişemez, çeviri `ToastHost`'ta yapılır. */
  messageKey: string;
  params?: Record<string, string | number>;
  tone: ToastTone;
};
type ToastState = {
  toasts: Toast[];
  push: (messageKey: string, params?: Record<string, string | number>, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};
const VISIBLE_MS = 5000;
let nextId = 1;
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (messageKey, params, tone = "grass") => {
    // Aynı anahtar duruyorsa tekrarlama: çift olay (STOMP + poll tazelemesi) tek bildirim eder.
    if (get().toasts.some((toast) => toast.messageKey === messageKey)) return;
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, messageKey, params, tone }] });
    setTimeout(() => get().dismiss(id), VISIBLE_MS);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));
```
- [ ] **Step 3: `ToastHost.tsx`'i yaz** (artboard W20 · Bildirildi 390 — üstte şerit kart)
```tsx
/* Kaynak: artboard W20 · Bildirildi 390 — üst şerit kartı (.card + --grs-w) */
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useToastStore } from "../../store/toastStore";
/** Tek bildirim yüzeyi (AppShell'de bir kez). `role="status"`: dürtme gibi kullanıcının KENDİ
    eylemi olmayan olaylar da ekran okuyucuya duyurulmalı. */
export default function ToastHost() {
  const { t } = useTranslation();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 top-[4.5rem] z-40 flex flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" aria-live="polite"
          className={`pointer-events-auto flex w-full max-w-[26rem] items-center gap-2.5 rounded-card border px-3.5 py-2.5 shadow-sh1 ${
            toast.tone === "grass" ? "border-grass bg-grass-wash" : "border-flame bg-flame-wash"}`}>
          {toast.tone === "grass"
            ? <CheckCircle size={20} className="flex-none text-grass" aria-hidden />
            : <WarningCircle size={20} className="flex-none text-flame-deep" aria-hidden />}
          <span className="flex-1 text-[0.875rem] font-bold">{t(toast.messageKey, toast.params)}</span>
          <button type="button" aria-label={t("common.close")} className="flex-none text-ink2"
            onClick={() => dismiss(toast.id)}>
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
```
- [ ] **Step 4: `AppShell`'e mount et** — `<TopBar />` satırının hemen ardına `<ToastHost />`, üste `import ToastHost from "../molecules/ToastHost";`. Kabuğun flex ölçüsü değişmez (host `fixed`).

- [ ] **Step 5: Testleri koş** — Run: `PNPM_TEST src/store/toastStore.test.ts src/components/molecules/ToastHost.test.tsx` · Expected: 3 test yeşil.

- [ ] **Step 6: Dosya listesi** — `store/toastStore.ts` (+test), `molecules/ToastHost.tsx` (+test), `organisms/AppShell.tsx`. Mesaj: `feat(ui): toast queue with i18n keys`.

---
### Task 4: Presence 2.0 — `ParticipantRow`
**Files:** Modify: `frontend/web/src/components/molecules/ParticipantRow.tsx`, `frontend/web/src/styles/app.css` · Test: `frontend/web/src/components/molecules/ParticipantRow.test.tsx` (zenginleştir)
- [ ] **Step 1: Testleri ekle** (mevcut `describe` bloğunun ALTINA; üstteki import satırını `import { fireEvent, render, screen } from "@testing-library/react";` yap)
```tsx
describe("ParticipantRow — presence 2.0", () => {
  it("çevrimiçide nokta; çevrimdışıda lastSeenAt varsa saat, yoksa yalnız 'çevrimdışı'", () => {
    const { rerender } = render(<ParticipantRow participant={ayse({ online: true }) as never} index={0} />);
    expect(screen.getByTestId("online-dot")).toBeInTheDocument();
    rerender(<ParticipantRow index={0}
      participant={ayse({ online: false, lastSeenAt: "2026-09-06T10:38:00Z" }) as never} />);
    expect(screen.queryByTestId("online-dot")).not.toBeInTheDocument();
    expect(screen.getByText(/Son görülen · /)).toBeInTheDocument();
    rerender(<ParticipantRow participant={ayse({ online: false }) as never} index={0} />);
    expect(screen.getByText("çevrimdışı")).toBeInTheDocument();
    expect(screen.queryByText(/Son görülen/)).not.toBeInTheDocument();
  });
  it("konum yok: linkOpenedAt varsa 'Linki açtı' + nabız, yoksa eski metin", () => {
    const w = { hasLocation: false, locationLabel: undefined };
    const { container, rerender } = render(<ParticipantRow index={0}
      participant={ayse({ ...w, linkOpenedAt: "2026-09-06T10:30:00Z" }) as never} />);
    expect(screen.getByText("Linki açtı · konum bekleniyor…")).toBeInTheDocument();
    expect(container.querySelector(".c-pulse")).not.toBeNull();
    rerender(<ParticipantRow participant={ayse(w) as never} index={0} />);
    expect(screen.getByText("Konum bekleniyor…")).toBeInTheDocument();
  });
  it("'…' yalnız onOptions varken, kendi satırı ve engelli satır dışında çıkar", () => {
    const onOptions = vi.fn();
    const label = { name: "Ayşe · seçenekler" };
    const { rerender } = render(<ParticipantRow participant={ayse() as never} index={0} onOptions={onOptions} />);
    fireEvent.click(screen.getByRole("button", label));
    expect(onOptions).toHaveBeenCalledTimes(1);
    rerender(<ParticipantRow participant={ayse() as never} index={0} isSelf onOptions={onOptions} />);
    expect(screen.queryByRole("button", label)).not.toBeInTheDocument();
    rerender(<ParticipantRow participant={ayse({ blocked: true }) as never} index={0} onOptions={onOptions} />);
    expect(screen.queryByRole("button", label)).not.toBeInTheDocument();
    expect(screen.getByText("engellendi")).toBeInTheDocument();
  });
});
```
Run: `PNPM_TEST src/components/molecules/ParticipantRow.test.tsx` · Expected: 3 yeni test kırmızı.
- [ ] **Step 2: `app.css`** — `@theme` içine (`--animate-appear` satırının ardına):
```css
  --animate-pulse-soft: pulse-soft 1.8s var(--ease-stack) infinite;
  @keyframes pulse-soft {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(169, 106, 11, 0.35);
    }
    60% {
      box-shadow: 0 0 0 0.5rem rgba(169, 106, 11, 0);
    }
  }
```

`@layer components` bloğunun sonuna:
```css
  /* Artboard .av-wt.pulse — konumu beklenen katılımcının halkası. `prefers-reduced-motion`
     kuralı @layer base'te TÜM animasyonları kapatır: sınıf kalır, hareket durur. */
  .c-pulse {
    border-radius: 50%;
    animation: var(--animate-pulse-soft);
  }
```
- [ ] **Step 3: `ParticipantRow.tsx`'i güncelle**

`import { DotsThree, Microphone } from "@phosphor-icons/react";`, prop listesine `onOptions?: (participant: ParticipantDto) => void;`, `const { t } = useTranslation();` → `const { t, i18n } = useTranslation();`. Import'ların ardına:
```tsx
/** WinnerCard'daki kuralla aynı — geçersiz ISO'da satır hiç çizilmez. */
function hhmm(iso: string, locale: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}
```

`away` satırının ardına:
```tsx
  const online = p.online !== false && !p.manual;
  const blocked = p.blocked === true;
  // Alan yoksa metin UYDURULMAZ: linkOpenedAt yoksa mevcut "Konum bekleniyor…" kalır.
  const waitingLine = p.hasLocation
    ? p.locationLabel
    : p.linkOpenedAt ? t("presence.linkOpened") : t("waiting.waitingLocation");
  const seen = away && p.lastSeenAt ? hhmm(p.lastSeenAt, i18n.resolvedLanguage ?? i18n.language) : null;
```

Sarmalayıcının solukluk koşulunu `${away || blocked ? " opacity-55" : ""}` yap. Avatar bloğunu değiştir:
```tsx
      <span className={`relative inline-flex flex-none rounded-full${speaking ? " ring-[3px] ring-grass ring-offset-2 ring-offset-card" : ""}${!p.hasLocation ? " c-pulse" : ""}`}>
        <Avatar name={p.displayName ?? "?"} index={props.index} ring={p.hasLocation} waiting={!p.hasLocation} />
        {online && (
          <i data-testid="online-dot" aria-hidden
            className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-card bg-grass" />
        )}
      </span>
```

Alt satırda `p.hasLocation ? p.locationLabel : t("waiting.waitingLocation")` yerine `{waitingLine}`, `away` bloğu yerine:
```tsx
          {away && (
            <>
              <span aria-hidden>·</span>
              <span>{seen ? t("presence.lastSeen", { time: seen }) : t("waiting.offline")}</span>
            </>
          )}
          {blocked && (
            <>
              <span aria-hidden>·</span>
              <span className="font-bold text-flame-deep">{t("social.blockedRow")}</span>
            </>
          )}
```

Rozetten ÖNCE (engellenene tekrar işlem yapılmaz; kaldırma `/account`'ta W-14'ün işi — K-W16):
```tsx
      {props.onOptions && !props.isSelf && !blocked && (
        <button type="button" aria-label={t("social.options", { name: p.displayName ?? "?" })}
          className="flex-none rounded-full p-1.5 text-ink2 hover:text-ink"
          onClick={() => props.onOptions?.(p)}>
          <DotsThree size={20} weight="bold" aria-hidden />
        </button>
      )}
```
- [ ] **Step 4: Testleri koş** — Run: `PNPM_TEST src/components/molecules/ParticipantRow.test.tsx` · Expected: 3 eski + 3 yeni = 6 test yeşil.

- [ ] **Step 5: Dosya listesi** — `molecules/ParticipantRow.tsx` (+test), `styles/app.css`. Mesaj: `feat(presence): online dot, pulse, link-opened and last-seen lines`.

---
### Task 5: `socialStore` + dürt
**Files:** Create: `frontend/web/src/store/socialStore.ts` · Modify: `frontend/web/src/components/organisms/ParticipantList.tsx`, `store/useSessionLive.ts`, `pages/LobbyPage.tsx`, `pages/WaitingRoom.tsx` · Test: `frontend/web/src/store/socialStore.test.ts`
- [ ] **Step 1: Başarısız testi yaz**
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../lib/api", () => ({
  api: { nudge: vi.fn(), report: vi.fn(), blockParticipant: vi.fn(), getSession: vi.fn(), preview: vi.fn() },
}));
import { api } from "../lib/api";
import { useSessionStore } from "./sessionStore";
import { NUDGE_COOLDOWN_MS, useSocialStore } from "./socialStore";
import { useToastStore } from "./toastStore";
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const keys = () => useToastStore.getState().toasts.map((t) => t.messageKey);
describe("socialStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useSocialStore.setState({ nudgedAt: {}, blocked: {}, busy: false });
    useToastStore.setState({ toasts: [] });
    useSessionStore.setState({ slug: "x", refresh: vi.fn().mockResolvedValue(undefined) } as never);
  });
  afterEach(() => vi.useRealTimers());
  it("dürtme ucu çağrılır, bildirim çıkar, 60 sn soğuma kilitler", async () => {
    mock(api.nudge).mockResolvedValue(undefined);
    await useSocialStore.getState().nudge("x", "k", "Kerem");
    expect(api.nudge).toHaveBeenCalledWith("x", "k");
    expect(keys()).toContain("presence.nudgeSent");
    expect(useSocialStore.getState().canNudge("k")).toBe(false);
    await useSocialStore.getState().nudge("x", "k", "Kerem");
    expect(api.nudge).toHaveBeenCalledTimes(1); // soğumada uç ÇAĞRILMAZ
    expect(keys()).toContain("presence.nudgeCooling");
    vi.advanceTimersByTime(NUDGE_COOLDOWN_MS);
    expect(useSocialStore.getState().canNudge("k")).toBe(true);
  });
  it("dürtme hatası soğumayı SİLER ve hata bildirimi basar", async () => {
    mock(api.nudge).mockRejectedValue(new Error("boom"));
    await useSocialStore.getState().nudge("x", "k", "Kerem");
    expect(useSocialStore.getState().canNudge("k")).toBe(true);
    expect(useToastStore.getState().toasts[0].tone).toBe("flame");
  });
  it("rapor sözleşme gövdesiyle gider, ardından engel, satır iyimser soluklaşır", async () => {
    mock(api.report).mockResolvedValue(undefined);
    mock(api.blockParticipant).mockResolvedValue({ id: "b1" });
    await useSocialStore.getState().report("x", "k", "Kerem", "OTHER", undefined);
    expect(api.report).toHaveBeenCalledWith({
      sessionSlug: "x", targetParticipantId: "k", reason: "OTHER", note: undefined });
    expect(api.blockParticipant).toHaveBeenCalledWith({ participantId: "k" });
    expect(useSocialStore.getState().blocked.k).toBe(true);
    expect(useSessionStore.getState().refresh).toHaveBeenCalled();
    expect(keys()).toContain("social.reported");
    // Tek başına engelleme raporu çağırmaz.
    vi.clearAllMocks();
    mock(api.blockParticipant).mockResolvedValue({ id: "b2" });
    await useSocialStore.getState().block("m", "Mehmet");
    expect(api.report).not.toHaveBeenCalled();
    expect(keys()).toContain("social.blocked");
  });
});
```
Run: `PNPM_TEST src/store/socialStore.test.ts` · Expected: modül bulunamadı.
- [ ] **Step 2: `socialStore.ts`'i yaz**
```ts
import type { Schemas } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";
import { useSessionStore } from "./sessionStore";
import { useToastStore } from "./toastStore";
export type ReportReason = Schemas["ReportRequest"]["reason"];
/** Sunucu da 60 sn uygular (§2) — istemci kopyası yalnız gereksiz 429'u önler. */
export const NUDGE_COOLDOWN_MS = 60_000;
type SocialState = {
  /** Katılımcı başına son dürtme anı (ms). */
  nudgedAt: Record<string, number>;
  /** İyimser engel işareti — sunucunun `blocked` alanı tazelemeyle gelene kadar satır soluk. */
  blocked: Record<string, true>;
  busy: boolean;
  canNudge: (participantId: string) => boolean;
  nudge: (slug: string, participantId: string, name: string) => Promise<void>;
  report: (slug: string, participantId: string, name: string, reason: ReportReason, note?: string) => Promise<void>;
  block: (participantId: string, name: string) => Promise<void>;
};
const toast = (key: string, params?: Record<string, string | number>, tone?: "grass" | "flame") =>
  useToastStore.getState().push(key, params, tone);
export const useSocialStore = create<SocialState>((set, get) => ({
  nudgedAt: {},
  blocked: {},
  busy: false,
  canNudge: (id) => Date.now() - (get().nudgedAt[id] ?? -Infinity) >= NUDGE_COOLDOWN_MS,
  nudge: async (slug, participantId, name) => {
    if (!get().canNudge(participantId)) {
      toast("presence.nudgeCooling", undefined, "flame");
      return;
    }
    // Soğuma İSTEKTEN ÖNCE yazılır (çift tıklama ikinci isteği doğurmasın), hatada geri alınır.
    set({ nudgedAt: { ...get().nudgedAt, [participantId]: Date.now() } });
    try {
      await api.nudge(slug, participantId);
      toast("presence.nudgeSent", { name });
    } catch {
      const { [participantId]: _dropped, ...rest } = get().nudgedAt;
      set({ nudgedAt: rest });
      toast("presence.nudgeError", undefined, "flame");
    }
  },
  report: async (slug, participantId, name, reason, note) => {
    set({ busy: true });
    try {
      await api.report({ sessionSlug: slug, targetParticipantId: participantId, reason, note });
      // Artboard W20 onayı ("Bildirildi · X engellendi") ikisini birlikte söyler: bildiren
      // kişi aynı anda korunur.
      await api.blockParticipant({ participantId });
      set({ blocked: { ...get().blocked, [participantId]: true } });
      await useSessionStore.getState().refresh();
      toast("social.reported", { name });
    } catch {
      toast("social.error", undefined, "flame");
    } finally {
      set({ busy: false });
    }
  },
  block: async (participantId, name) => {
    set({ busy: true });
    try {
      await api.blockParticipant({ participantId });
      set({ blocked: { ...get().blocked, [participantId]: true } });
      await useSessionStore.getState().refresh();
      toast("social.blocked", { name });
    } catch {
      toast("social.error", undefined, "flame");
    } finally {
      set({ busy: false });
    }
  },
}));
```
- [ ] **Step 3: `useSessionLive.ts`'e `nudged` olayını ekle** — `endedReasonOf` altına:
```ts
/** WS `nudged{fromParticipantId,toParticipantId}` (§2) — yalnız HEDEF kişide bildirim. */
function nudgedMe(body: string, selfId: string | null): boolean {
  if (!selfId) return false;
  try {
    const event = JSON.parse(body) as { type?: string; payload?: { toParticipantId?: string } };
    return event.type === "nudged" && event.payload?.toParticipantId === selfId;
  } catch {
    return false;
  }
}
```

Abonelik geri çağrısında `if (reason)` satırından sonra (üste `import { useToastStore } from "./toastStore";`):
```ts
      const selfId = useSessionStore.getState().view?.viewer?.participantId ?? null;
      if (nudgedMe(body, selfId)) useToastStore.getState().push("presence.nudged", undefined, "flame");
```
- [ ] **Step 4: `ParticipantList`'e dürtme bölümünü ve panel durumunu ekle** (artboard W6d · Gönderildi — kart altında ayraçlı bölüm + "yalnız kurana görünür" notu)

İmzayı `{ participants, slug, isHost }: { participants: ParticipantDto[]; slug: string; isHost: boolean }` yap; `LobbyPage` ve `WaitingRoom` çağrılarına `slug={view.slug ?? ""} isHost={!!view.viewer?.host}` ekle. Bileşenin başına:
```tsx
  const nudge = useSocialStore((s) => s.nudge);
  const canNudge = useSocialStore((s) => s.canNudge);
  const [sheetFor, setSheetFor] = useState<ParticipantDto | null>(null);
  // R-W6 kapısı: yalnız çevrimdışı YA DA konumu gelmemiş kişi dürtülür.
  const waiting = participants.filter(
    (p) => !!p.id && p.id !== viewerId && !p.manual && !p.blocked && (p.online === false || !p.hasLocation),
  );
```

`ParticipantRow`'a `onOptions={setSheetFor}` geç. Kartın kapanış `</div>`'inden ÖNCE:
```tsx
        {isHost && waiting.length > 0 && (
          <>
            <div className="mx-4 h-px bg-line" />
            <div className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {waiting.map((p) => (
                  <Button key={p.id} type="button" kind="ghost" size="sm" disabled={!canNudge(p.id!)}
                    onClick={() => void nudge(slug, p.id!, p.displayName ?? "")}>
                    <HandWaving size={16} aria-hidden />
                    {t("presence.nudge", { name: p.displayName ?? "" })}
                  </Button>
                ))}
              </div>
              <span className="text-[0.8125rem] text-ink2">{t("presence.hostOnly")}</span>
            </div>
          </>
        )}
```

Import'lar: `useState`, `HandWaving` (`@phosphor-icons/react`), `Button` (atoms), `useSocialStore`, `ParticipantDto` tipi. (`sheetFor` panelini Task 6 Step 3 bağlar.)

- [ ] **Step 5: Testleri koş** — Run: `PNPM_TEST src/store/socialStore.test.ts` ve varsa `PNPM_TEST src/pages/LobbyPage.test.tsx src/pages/WaitingRoom.test.tsx` · Expected: socialStore 3 test yeşil, mevcut sayfa testleri yeşil kalır.

- [ ] **Step 6: Dosya listesi** — `store/socialStore.ts` (+test), `store/useSessionLive.ts`, `organisms/ParticipantList.tsx`, `pages/LobbyPage.tsx`, `pages/WaitingRoom.tsx`. Mesaj: `feat(presence): host nudge with cooldown and nudged toast`.

---
### Task 6: `PersonSheet` + yerel sustur + engelli roster süzmesi
**Files:** Create: `frontend/web/src/components/organisms/PersonSheet.tsx` · Modify: `frontend/web/src/components/organisms/ParticipantList.tsx`, `lib/voiceMesh.ts`, `store/voiceStore.ts` · Test: `frontend/web/src/components/organisms/PersonSheet.test.tsx`; `lib/voiceMesh.test.ts`, `store/voiceStore.test.ts` (zenginleştir)
- [ ] **Step 1: Başarısız testleri yaz**

`PersonSheet.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../lib/api", () => ({
  api: { report: vi.fn(), blockParticipant: vi.fn(), nudge: vi.fn(), getSession: vi.fn(), preview: vi.fn() },
}));
vi.mock("../../store/liveChannel", () => ({
  liveChannel: { subscribe: vi.fn(() => vi.fn()), publish: vi.fn(), open: vi.fn() },
}));
import { api } from "../../lib/api";
import { useSocialStore } from "../../store/socialStore";
import { useVoiceStore } from "../../store/voiceStore";
import PersonSheet from "./PersonSheet";
const kerem = { id: "k", displayName: "Kerem", host: false, hasLocation: true, deckDone: false,
  manual: false, locationLabel: "Helmond" };
const sheet = (onClose = vi.fn()) =>
  ({ onClose, ...render(<PersonSheet slug="x" participant={kerem as never} onClose={onClose} />) });
describe("PersonSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVoiceStore.setState({ mutedPeers: {} });
    useSocialStore.setState({ busy: false });
  });
  it("menü üç eylemi + kişinin yerini gösterir; Escape ve Vazgeç kapatır", () => {
    const { onClose } = sheet();
    expect(screen.getByRole("dialog", { name: "Kerem" })).toBeInTheDocument();
    expect(screen.getByText("Helmond · bu buluşmada")).toBeInTheDocument();
    for (const label of [/Bildir/, /Engelle/, /Sesli sohbette sustur/])
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it("Bildir → sebep seçimi → Gönder socialStore.report'u çağırır ve panel kapanır", async () => {
    const report = vi.fn().mockResolvedValue(undefined);
    useSocialStore.setState({ report } as never);
    const { onClose } = sheet();
    fireEvent.click(screen.getByRole("button", { name: /Bildir/ }));
    expect(screen.getByText("Bildirim ekibimize gider; 24 saat içinde bakılır. Kerem bunu görmez."))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Sahte / spam" }));
    fireEvent.click(screen.getByRole("button", { name: "Gönder" }));
    expect(report).toHaveBeenCalledWith("x", "k", "Kerem", "SPAM", undefined);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
  it("Engelle store'a gider; Sustur yereldir (hiçbir uç çağrılmaz)", async () => {
    const block = vi.fn().mockResolvedValue(undefined);
    useSocialStore.setState({ block } as never);
    const { onClose, unmount } = sheet();
    fireEvent.click(screen.getByRole("button", { name: /Engelle/ }));
    expect(block).toHaveBeenCalledWith("k", "Kerem");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    unmount();
    sheet();
    fireEvent.click(screen.getByRole("button", { name: /Sesli sohbette sustur/ }));
    expect(useVoiceStore.getState().mutedPeers.k).toBe(true);
    expect(api.report).not.toHaveBeenCalled();
    expect(api.blockParticipant).not.toHaveBeenCalled();
  });
});
```

`voiceMesh.test.ts` ve `voiceStore.test.ts` (dosyalardaki mevcut kurucu yardımcıları kullan):
```ts
  it("setMutedPeers uzak sesi susturur ve geri açar", () => {
    const m = makeMesh(["me", "a"]); // dosyadaki mevcut yardımcı
    m.setMutedPeers(["a"]);
    expect(audioOf("a").muted).toBe(true);
    m.setMutedPeers([]);
    expect(audioOf("a").muted).toBe(false);
  });
```
```ts
  it("togglePeerMute yereldir ve iki yönlü çalışır", () => {
    useVoiceStore.setState({ mutedPeers: {} });
    useVoiceStore.getState().togglePeerMute("a");
    expect(useVoiceStore.getState().mutedPeers.a).toBe(true);
    useVoiceStore.getState().togglePeerMute("a");
    expect(useVoiceStore.getState().mutedPeers.a).toBeUndefined();
  });
  it("rosterOf engelli katılımcıyı ses odasına almaz", () => {
    const view = { participants: [{ id: "a", inVoice: true }, { id: "b", inVoice: true, blocked: true }] };
    expect(rosterOf(view as never)).toEqual(["a"]);
  });
```
Run: `PNPM_TEST src/components/organisms/PersonSheet.test.tsx src/lib/voiceMesh.test.ts src/store/voiceStore.test.ts` · Expected: 3 + 3 yeni test kırmızı.
- [ ] **Step 2: `voiceMesh` ve `voiceStore`'a yerel sustur desteğini ekle**

`voiceMesh.ts` sınıf alanlarına (`private selfSpeaking = false;` yanına) ve `setMuted` metodunun altına:
```ts
  /** Yerel sustur (R-W15) — uzak <audio> kapatılır, PC ve seviye ölçümü bozulmaz. */
  private mutedPeers = new Set<string>();
```
```ts
  /** Yalnız BU tarayıcı için uzak sesi kapatır (sunucuya gitmez, karşı taraf bilmez). */
  setMutedPeers(ids: string[]) {
    this.mutedPeers = new Set(ids);
    for (const [id, peer] of this.peers) {
      if (peer.audio) peer.audio.muted = this.mutedPeers.has(id);
    }
  }
```

`pc.ontrack` içinde `peer.audio = audio;` satırından ÖNCE `audio.muted = this.mutedPeers.has(id);` ekle (sonradan gelen peer de susturulmuş doğar).

`voiceStore.ts` — `VoiceState` tipine `mutedPeers: Record<string, true>;` + `togglePeerMute: (participantId: string) => void;` (yorum: "Yerel sustur — sunucuya gitmez, §2: 'sustur' uçsuz"), başlangıç durumuna `mutedPeers: {},`, `toggleMute` yanına:
```ts
  togglePeerMute: (participantId) => {
    const next = { ...get().mutedPeers };
    if (next[participantId]) delete next[participantId];
    else next[participantId] = true;
    set({ mutedPeers: next });
    mesh?.setMutedPeers(Object.keys(next));
  },
```

`rosterOf`'u güncelle ve mesh'in atandığı satırın ardına `mesh.setMutedPeers(Object.keys(get().mutedPeers));` ekle (yeniden katılımda susturmalar korunur):
```ts
/** Görünümdeki ses üyeleri (kendimiz dahil; mesh kendini eler). Engelli çifti sunucu zaten
    aynı odaya almaz (§2) — istemci süzmesi savunma katmanı, roster yarışında bile ses açılmaz. */
export function rosterOf(view: SessionView | null): string[] {
  return (view?.participants ?? [])
    .filter((p) => p.inVoice && p.id && !p.blocked)
    .map((p) => p.id as string);
}
```
- [ ] **Step 3: `PersonSheet.tsx`'i yaz** (artboard W20 frag 68/69/70 — scrim + alt sayfa; `lg+`'da aynı kart ortalanır)
```tsx
/* Kaynak: artboard W20 · Bildir/Engelle 1280 + 390 + Bildirildi 390 (.scrim + .sheet + .srow.st) */
import { Flag, Prohibit, SpeakerSlash } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { useSocialStore, type ReportReason } from "../../store/socialStore";
import { useVoiceStore } from "../../store/voiceStore";
import { Avatar, Button } from "../atoms";
/** §2 sözleşmesi: `ReportRequest.reason` birliği. `satisfies` derlemede kilitler — B-14 başka
    sebep adı kullandıysa tsc patlar, sebep UYDURULMAZ. */
const REASONS = ["OFFENSIVE_NAME", "VOICE_HARASSMENT", "SPAM", "OTHER"] as const satisfies readonly ReportReason[];
const ROW = "flex w-full items-center gap-3 px-4 py-[0.8125rem] text-left";
const SHEET =
  "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[26rem] flex-col gap-3.5 rounded-t-card " +
  "border border-line bg-card p-5 shadow-sh2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-card";
function ActionRow(props: { icon: ReactNode; title: string; hint: string; danger?: boolean;
  disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={ROW} disabled={props.disabled} onClick={props.onClick}>
      {props.icon}
      <span className="flex flex-col">
        <span className={`text-[0.875rem] font-bold${props.danger ? " text-flame-deep" : ""}`}>{props.title}</span>
        <span className="text-[0.8125rem] text-ink2">{props.hint}</span>
      </span>
    </button>
  );
}
/** Katılımcı eylem paneli. "Sustur" UÇSUZDUR (yalnız bu tarayıcı, `voiceStore`); "Bildir"
    rapor + engel gönderir (artboard onayı ikisini birlikte söyler); "Engelle" yalnız engeller.
    Panel sonucu duyurmaz — bildirimi `socialStore` basar. */
export default function PersonSheet(props: { slug: string; participant: ParticipantDto; onClose: () => void }) {
  const { t } = useTranslation();
  const p = props.participant;
  const name = p.displayName ?? "?";
  const [step, setStep] = useState<"menu" | "report">("menu");
  const [reason, setReason] = useState<ReportReason>(REASONS[0]);
  const report = useSocialStore((s) => s.report);
  const block = useSocialStore((s) => s.block);
  const busy = useSocialStore((s) => s.busy);
  const muted = useVoiceStore((s) => !!p.id && !!s.mutedPeers[p.id]);
  const togglePeerMute = useVoiceStore((s) => s.togglePeerMute);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);
  async function run(action: Promise<void>) {
    await action;
    props.onClose();
  }
  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/35" onClick={props.onClose} aria-hidden />
      <div role="dialog" aria-modal="true" className={SHEET}
        aria-label={step === "menu" ? name : t("social.reportTitle")}>
        {step === "menu" ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={name} index={0} ring />
              <div className="flex flex-col">
                <span className="font-head text-h3 font-bold">{name}</span>
                <span className="text-[0.8125rem] text-ink2">
                  {t("social.inSession", { place: p.locationLabel ?? "" })}
                </span>
              </div>
            </div>
            <div className="rounded-card border border-line">
              <ActionRow icon={<Flag size={20} aria-hidden />} title={t("social.report")}
                hint={t("social.reportHint")} onClick={() => setStep("report")} />
              <div className="mx-4 h-px bg-line" />
              <ActionRow icon={<Prohibit size={20} className="text-flame-deep" aria-hidden />} danger
                title={t("social.block")} hint={t("social.blockHint")} disabled={busy}
                onClick={() => p.id && void run(block(p.id, name))} />
              <div className="mx-4 h-px bg-line" />
              <ActionRow icon={<SpeakerSlash size={20} aria-hidden />} hint={t("social.muteHint")}
                title={muted ? t("social.unmute") : t("social.mute")}
                onClick={() => { if (p.id) togglePeerMute(p.id); props.onClose(); }} />
            </div>
            <Button type="button" kind="ghost" onClick={props.onClose}>{t("common.cancel")}</Button>
          </>
        ) : (
          <>
            <h2>{t("social.reportTitle")}</h2>
            <div role="radiogroup" aria-label={t("social.reportTitle")} className="rounded-card border border-line">
              {REASONS.map((value, i) => (
                <div key={value}>
                  {i > 0 && <div className="mx-4 h-px bg-line" />}
                  <button type="button" role="radio" aria-checked={reason === value} className={ROW}
                    onClick={() => setReason(value)}>
                    <span aria-hidden className={`h-5 w-5 flex-none rounded-full border-2 ${
                      reason === value ? "border-flame bg-flame" : "border-line2"}`} />
                    <span className="text-[0.875rem] font-bold">{t(`social.reason${value}`)}</span>
                  </button>
                </div>
              ))}
            </div>
            <p className="m-0 text-[0.8125rem] text-ink2">{t("social.reportNote", { name })}</p>
            <div className="flex gap-2">
              <Button type="button" kind="ghost" onClick={props.onClose}>{t("common.cancel")}</Button>
              <Button type="button" disabled={busy}
                onClick={() => p.id && void run(report(props.slug, p.id, name, reason, undefined))}>
                {t("social.send")}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
```
- [ ] **Step 4: `ParticipantList`'e paneli bağla** — kartın kapanış `</div>`'inden sonra `{sheetFor && <PersonSheet slug={slug} participant={sheetFor} onClose={() => setSheetFor(null)} />}` ve `import PersonSheet from "./PersonSheet";`.

- [ ] **Step 5: Testleri koş** — Run: `PNPM_TEST src/components/organisms/PersonSheet.test.tsx src/lib/voiceMesh.test.ts src/store/voiceStore.test.ts` · Expected: 3 yeni PersonSheet + 3 yeni ses testi yeşil, mevcut ses testleri bozulmaz.

- [ ] **Step 6: Dosya listesi** — `organisms/PersonSheet.tsx` (+test), `organisms/ParticipantList.tsx`, `lib/voiceMesh.ts` (+test), `store/voiceStore.ts` (+test). Mesaj: `feat(social): report/block sheet, local peer mute, blocked roster filter`.

---
### Task 7: Sonuç kartı görseli (1080×1920 PNG)
**Files:** Modify: `frontend/web/package.json`, `frontend/web/src/components/molecules/ShareButton.tsx` · Create: `frontend/web/src/lib/shareCard.ts`, `frontend/web/src/components/molecules/ShareCard.tsx` · Test: `frontend/web/src/lib/shareCard.test.ts`, `frontend/web/src/components/molecules/ShareButton.test.tsx`
- [ ] **Step 1: Bağımlılık** — `frontend/web/package.json` `dependencies` içine `"html-to-image": "^1.11.13",` (alfabetik: `i18next`'ten önce), sonra `source ./init-nvm.sh && pnpm install`.

- [ ] **Step 2: Başarısız testleri yaz**

`shareCard.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
const toBlob = vi.fn();
const getFontEmbedCSS = vi.fn();
vi.mock("html-to-image", () => ({ toBlob, getFontEmbedCSS }));
import { probePhoto, renderShareCard, shareOrDownload } from "./shareCard";
describe("shareCard", () => {
  beforeEach(() => { vi.clearAllMocks(); getFontEmbedCSS.mockResolvedValue("@font-face{}"); });
  it("1080×1920 çizer, font CSS'ini gömer; font ya da çizim çökerse null döner", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    toBlob.mockResolvedValue(blob);
    const node = document.createElement("div");
    expect(await renderShareCard(node)).toBe(blob);
    expect(toBlob).toHaveBeenCalledWith(node, expect.objectContaining({
      width: 1080, height: 1920, pixelRatio: 1, fontEmbedCSS: "@font-face{}" }));
    getFontEmbedCSS.mockRejectedValue(new Error("cors"));
    toBlob.mockRejectedValue(new Error("taint"));
    expect(await renderShareCard(node)).toBeNull();
    expect(toBlob).toHaveBeenLastCalledWith(node, expect.objectContaining({ fontEmbedCSS: undefined }));
  });
  it("probePhoto: yüklenirse url, hata/boş girdide null", async () => {
    class FakeImage {
      static ok = true;
      crossOrigin = ""; onload: (() => void) | null = null; onerror: (() => void) | null = null;
      set src(_v: string) { setTimeout(() => (FakeImage.ok ? this.onload?.() : this.onerror?.()), 0); }
    }
    vi.stubGlobal("Image", FakeImage);
    expect(await probePhoto("https://cdn/x.jpg")).toBe("https://cdn/x.jpg");
    FakeImage.ok = false;
    expect(await probePhoto("https://cdn/x.jpg")).toBeNull();
    expect(await probePhoto(undefined)).toBeNull();
    vi.unstubAllGlobals();
  });
  it("navigator dosya paylaşımını kabul ediyorsa paylaşır, etmiyorsa indirir", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    vi.stubGlobal("navigator", { share: vi.fn().mockResolvedValue(undefined), canShare: () => true });
    expect(await shareOrDownload(blob, "a.png", "metin")).toBe("shared");
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() });
    expect(await shareOrDownload(blob, "a.png", "metin")).toBe("downloaded");
    vi.unstubAllGlobals();
  });
});
```

`ShareButton.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ShareButton from "./ShareButton";
describe("ShareButton — dosya modu", () => {
  it("dosya üretilemezse metin paylaşımına düşer", async () => {
    const getFile = vi.fn().mockResolvedValue(null);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, canShare: () => false });
    render(<ShareButton mode="file" getFile={getFile} text="metin" url="https://x/y" label="Kartı paylaş" />);
    fireEvent.click(screen.getByRole("button", { name: /Kartı paylaş/ }));
    await waitFor(() => expect(getFile).toHaveBeenCalled());
    await waitFor(() => expect(share).toHaveBeenCalledWith({ text: "metin", url: "https://x/y" }));
    vi.unstubAllGlobals();
  });
});
```
Run: `PNPM_TEST src/lib/shareCard.test.ts src/components/molecules/ShareButton.test.tsx` · Expected: modül/prop hataları.
- [ ] **Step 3: `lib/shareCard.ts`'i yaz**
```ts
import { getFontEmbedCSS, toBlob } from "html-to-image";
/** Kart ölçüsü (dikey story) — `ShareCard`'ın kök stiliyle AYNI değerler. */
export const CARD_W = 1080;
export const CARD_H = 1920;
/** Foto CORS ön denemesi (§6 risk 4): `crossOrigin="anonymous"` ile yüklenemeyen görsel tuvali
    kirletir ve PNG boş çıkar. Yüklenirse url, aksi hâlde null → kart gradyan+monograma düşer. */
export function probePhoto(url: string | undefined | null): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(url);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
/** Ekran dışı düğümü 1080×1920 PNG'ye çevirir. Google Fonts uzak kaynaktır; gömülmezse kart
    sistem fontuyla çıkar — bu yüzden font CSS'i denenir, iki adım da yumuşak düşer. */
export async function renderShareCard(node: HTMLElement): Promise<Blob | null> {
  let fontEmbedCSS: string | undefined;
  try {
    fontEmbedCSS = await getFontEmbedCSS(node);
  } catch {
    fontEmbedCSS = undefined;
  }
  try {
    return await toBlob(node, {
      width: CARD_W, height: CARD_H, pixelRatio: 1, cacheBust: true,
      backgroundColor: "#fffbf6", fontEmbedCSS,
    });
  } catch {
    return null;
  }
}
export type ShareResult = "shared" | "downloaded" | "failed";
/** Web Share Level 2 varsa dosyayı paylaşır; yoksa indirir (masaüstü desteği düzensiz). */
export async function shareOrDownload(blob: Blob, fileName: string, text: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch {
      return "failed"; // kullanıcı vazgeçti — indirmeye ZORLAMA
    }
  }
  try {
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(href);
    return "downloaded";
  } catch {
    return "failed";
  }
}
```
- [ ] **Step 4: `ShareCard.tsx`'i yaz** (artboard W8 `.rc` + mobil P21 — foto / meta / kişiler / altbilgi)
```tsx
/* Kaynak: artboard W8 · Karar .rc (.rc-ph + .rc-ppl + .rc-ft) ve mobil P21 · Sonuç kartı */
import type { CSSProperties, RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { roundTravel } from "@bumpinto/shared";
const HEAD = "'Bricolage Grotesque', system-ui, sans-serif";
/** Ölçüler piksel: kart dış tarayıcıda basılır, kök `rem` tabanına bağlanamaz. */
const S = {
  root: { position: "fixed", left: -20000, top: 0, width: 1080, height: 1920, background: "#fffbf6",
    padding: 72, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 40,
    fontFamily: "Figtree, system-ui, sans-serif" },
  eyebrow: { fontSize: 34, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "#de2456" },
  title: { fontFamily: HEAD, fontSize: 92, fontWeight: 800, lineHeight: 1.05, color: "#27203b" },
  photo: { height: 720, borderRadius: 40, overflow: "hidden", display: "flex", alignItems: "center",
    justifyContent: "center" },
  mono: { fontFamily: HEAD, fontSize: 180, fontWeight: 800, color: "#ffffff" },
  row: { display: "flex", justifyContent: "space-between", fontSize: 38 },
  foot: { marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 32, color: "#6e6584" },
} satisfies Record<string, CSSProperties>;
const monogram = (name: string) => name.replace(/[^\p{L}]/gu, "").slice(0, 2).toLowerCase();
/** Ekran dışı 1080×1920 düğüm — `html-to-image` bunu okur, kullanıcı GÖRMEZ. */
export default function ShareCard(props: {
  nodeRef: RefObject<HTMLDivElement>;
  venue: VenueDto;
  participants: ParticipantDto[];
  /** `probePhoto` geçerse url; null ise gradyan + monogram. */
  photo: string | null;
}) {
  const { t } = useTranslation();
  const rows = props.participants
    .filter((p) => p.id && props.venue.travelMinutes?.[p.id] != null)
    .map((p) => ({ p, min: roundTravel(props.venue.travelMinutes![p.id!]) }));
  const values = rows.map((r) => r.min);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  return (
    <div ref={props.nodeRef} aria-hidden style={S.root}>
      <div style={S.eyebrow}>{t("result.overline")}</div>
      <div style={S.title}>{t("share.cardTitle", { venue: props.venue.name ?? "" })}</div>
      <div style={{ ...S.photo, background: props.photo ? "#f4eee6"
        : "linear-gradient(120deg,#fd3e6b 10%,#ff7854 90%)" }}>
        {props.photo
          ? <img src={props.photo} crossOrigin="anonymous" alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={S.mono}>{monogram(props.venue.name ?? "")}</span>}
      </div>
      <div style={{ fontSize: 34, color: "#6e6584" }}>{props.venue.address}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {rows.map(({ p, min: value }) => (
          <div key={p.id} style={S.row}>
            <span style={{ fontWeight: 700, color: "#27203b" }}>{p.displayName}</span>
            <span style={{ color: "#6e6584" }}>{t("travel.min", { min: value })}</span>
          </div>
        ))}
      </div>
      <div style={S.foot}>
        <span style={{ fontWeight: 800, color: "#27203b" }}>{t("common.wordmark")}</span>
        <span>{t("share.cardFooter", { min, max, spread: max - min })}</span>
      </div>
    </div>
  );
}
```
- [ ] **Step 5: `ShareButton`'ı iki modlu yap** — prop listesine:
```tsx
  /** "text" (varsayılan) = Web Share metin/URL; "file" = 1080×1920 PNG. */
  mode?: "text" | "file";
  /** Dosya modunda çağrılır; null dönerse metin paylaşımına DÜŞÜLÜR (sessiz başarısızlık yok). */
  getFile?: () => Promise<{ blob: Blob; fileName: string } | null>;
```

Mevcut `share()` gövdesini `function shareText() { … }` olarak adlandır (Web Share metin + pano yolu aynen kalır) ve yerine:
```tsx
  const [busy, setBusy] = useState(false);
  function share() {
    if (props.mode !== "file" || !props.getFile) return shareText();
    setBusy(true);
    void props.getFile()
      .then(async (file) => {
        if (file && (await shareOrDownload(file.blob, file.fileName, props.text)) !== "failed") return;
        shareText();
      })
      .finally(() => setBusy(false));
  }
```

Butona `disabled={busy}`, etiketi meşgulken `t("share.preparing")`, ikonu `const Icon = props.mode === "file" ? ImageIcon : props.copyOnly ? Copy : ShareNetwork;` yap (`import { Copy, Image as ImageIcon, ShareNetwork } from "@phosphor-icons/react";`, `import { shareOrDownload } from "../../lib/shareCard";`).

- [ ] **Step 6: Testleri koş** — Run: `PNPM_TEST src/lib/shareCard.test.ts src/components/molecules/ShareButton.test.tsx` · Expected: 4 test yeşil.

- [ ] **Step 7: Dosya listesi** — `package.json`, `lib/shareCard.ts` (+test), `molecules/ShareCard.tsx`, `ShareButton.tsx` (+test). Mesaj: `feat(share): 1080x1920 result card image with CORS fallback`.

---
### Task 8: ICS + Google Calendar + `ResultActions`
**Files:** Create: `frontend/web/src/lib/ics.ts`, `frontend/web/src/components/molecules/MeetTimeDialog.tsx`, `.../ResultActions.tsx` · Modify: `frontend/web/src/pages/ResultScreen.tsx` · Test: `frontend/web/src/lib/ics.test.ts`, `frontend/web/src/components/molecules/MeetTimeDialog.test.tsx`
- [ ] **Step 1: Başarısız testleri yaz**

`ics.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildIcs, defaultMeetAt, googleCalendarUrl } from "./ics";
const event = {
  uid: "x@bumpinto.app", start: new Date("2026-09-06T18:30:00Z"), durationMinutes: 90,
  title: "Café Berlage · Cuma kahvesi", location: "Kleine Berg 16, Eindhoven",
  url: "https://bumpinto.app/j/x7k2m", timeZone: "Europe/Amsterdam",
};
describe("ics", () => {
  it("UTC damgalı, CRLF'li geçerli VEVENT üretir", () => {
    const text = buildIcs(event);
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text).toContain("DTSTART:20260906T183000Z");
    expect(text).toContain("DTEND:20260906T200000Z");
    expect(text).toContain("X-WR-TIMEZONE:Europe/Amsterdam");
    expect(text).toContain("LOCATION:Kleine Berg 16\\, Eindhoven");
    expect(text.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
  it("Google Calendar linki aynı aralığı taşır; varsayılan saat karar + 1 saat", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe("20260906T183000Z/20260906T200000Z");
    expect(url.searchParams.get("location")).toBe("Kleine Berg 16, Eindhoven");
    expect(defaultMeetAt("2026-09-06T12:41:00Z").toISOString()).toBe("2026-09-06T14:00:00.000Z");
  });
});
```

`MeetTimeDialog.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MeetTimeDialog from "./MeetTimeDialog";
const venue = { id: "v", name: "Café Berlage", address: "Kleine Berg 16, Eindhoven" };
describe("MeetTimeDialog", () => {
  it("saat sorar, indirme text/calendar üretir, Google linki aynı saati taşır", () => {
    const types: string[] = [];
    vi.stubGlobal("URL", { createObjectURL: (b: Blob) => { types.push(b.type); return "blob:x"; },
      revokeObjectURL: vi.fn() });
    render(<MeetTimeDialog venue={venue as never} sessionName="Cuma kahvesi" slug="x7k2m"
      decidedAt="2026-09-06T12:41:00Z" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Saat kaçta?" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Saat"), { target: { value: "19:30" } });
    expect(screen.getByRole("link", { name: "Google Calendar'da aç" }).getAttribute("href")).toContain("T1930");
    fireEvent.click(screen.getByRole("button", { name: "Takvim dosyası indir" }));
    expect(types[0]).toContain("text/calendar");
    vi.unstubAllGlobals();
  });
});
```
Run: `PNPM_TEST src/lib/ics.test.ts src/components/molecules/MeetTimeDialog.test.tsx` · Expected: modül bulunamadı.
- [ ] **Step 2: `lib/ics.ts`'i yaz**
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
/** RFC 5545 UTC `DATE-TIME`. `VTIMEZONE` bloğu YAZILMAZ: damgalar mutlak UTC olduğu için
    `TZID` parametresi gereksizdir, DST kurallarını istemcide üretmek yeni hata kaynağıdır. */
export function icsStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
/** RFC 5545 §3.3.11 — virgül, noktalı virgül, ters bölü ve satır sonu kaçışlanır. */
const esc = (value: string) => value.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
export const endOf = (e: CalendarEvent) => new Date(e.start.getTime() + e.durationMinutes * 60_000);
export function buildIcs(e: CalendarEvent): string {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BumpInto//Web//TR", "CALSCALE:GREGORIAN",
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
- [ ] **Step 3: `MeetTimeDialog.tsx`'i yaz**
```tsx
/* Kaynak: artboard W8 · Karar "Takvime ekle" — sistemde meetAt alanı yok, saat kullanıcıdan. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { buildIcs, defaultMeetAt, googleCalendarUrl, type CalendarEvent } from "../../lib/ics";
import { Button, LinkButton, Note, TextInput } from "../atoms";
const pad = (n: number) => String(n).padStart(2, "0");
const dateValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const SHEET =
  "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[26rem] flex-col gap-3.5 rounded-t-card " +
  "border border-line bg-card p-5 shadow-sh2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-card";
export default function MeetTimeDialog(props: {
  venue: VenueDto; sessionName?: string; slug: string; decidedAt?: string; onClose: () => void;
}) {
  const { t } = useTranslation();
  const suggested = defaultMeetAt(props.decidedAt);
  const [date, setDate] = useState(dateValue(suggested));
  const [time, setTime] = useState(timeValue(suggested));
  // `new Date("YYYY-MM-DDTHH:mm")` YEREL yorumlanır, `icsStamp` UTC'ye çevirir — dönüşüm tek yerde.
  const picked = new Date(`${date}T${time}`);
  const event: CalendarEvent = {
    uid: `${props.slug}-${props.venue.id ?? "venue"}@bumpinto.app`,
    start: Number.isNaN(picked.getTime()) ? suggested : picked,
    durationMinutes: 90,
    title: t("calendar.eventTitle", { venue: props.venue.name ?? "", session: props.sessionName ?? "" }),
    location: props.venue.address ?? props.venue.name ?? "",
    url: `${location.origin}/j/${props.slug}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  function download() {
    const href = URL.createObjectURL(new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `bumpinto-${props.slug}.ics`;
    link.click();
    URL.revokeObjectURL(href);
    props.onClose();
  }
  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/35" onClick={props.onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={t("calendar.title")} className={SHEET}>
        <h2>{t("calendar.title")}</h2>
        <Note>{t("calendar.hint")}</Note>
        <label className="flex flex-col gap-1 text-[0.8125rem] font-bold text-ink2">
          {t("calendar.date")}
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[0.8125rem] font-bold text-ink2">
          {t("calendar.time")}
          <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <Button type="button" onClick={download}>{t("calendar.download")}</Button>
        <LinkButton href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" kind="white">
          {t("calendar.google")}
        </LinkButton>
        <Button type="button" kind="ghost" onClick={props.onClose}>{t("common.cancel")}</Button>
      </div>
    </>
  );
}
```

`TextInput` `type`/`value`/`onChange` yayılımını taşımıyorsa (`atoms/TextInput.tsx`) `InputHTMLAttributes<HTMLInputElement>` yayılımını ekle — yeni input atomu YAZILMAZ.

- [ ] **Step 4: `ResultActions.tsx` + `ResultScreen` bağlantısı**
```tsx
/* Kaynak: artboard W8 · Karar eylem satırı — Takvime ekle · Kartı paylaş · Gruba paylaş */
import { CalendarPlus } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView, VenueDto } from "@bumpinto/shared";
import { probePhoto, renderShareCard } from "../../lib/shareCard";
import { Button } from "../atoms";
import MeetTimeDialog from "./MeetTimeDialog";
import ShareButton from "./ShareButton";
import ShareCard from "./ShareCard";
export default function ResultActions(props: {
  view: SessionView; venue: VenueDto; shareText: string; shareUrl: string;
}) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [calendar, setCalendar] = useState(false);
  const slug = props.view.slug ?? "";
  async function getFile() {
    // Foto CORS'u ÇİZİMDEN ÖNCE denenir; kirlenmiş tuval sessizce boş PNG üretirdi (risk 4).
    setPhoto(await probePhoto(props.venue.photoUrl));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const node = cardRef.current;
    if (!node) return null;
    const blob = await renderShareCard(node);
    return blob ? { blob, fileName: t("share.fileName", { slug }) } : null;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" kind="white" size="fit" onClick={() => setCalendar(true)}>
        <CalendarPlus size={18} aria-hidden />
        {t("calendar.add")}
      </Button>
      <ShareButton mode="file" getFile={getFile} text={props.shareText} url={props.shareUrl}
        label={t("share.card")} size="fit" />
      <ShareButton text={props.shareText} url={props.shareUrl} size="fit" />
      <ShareCard nodeRef={cardRef} venue={props.venue} participants={props.view.participants ?? []} photo={photo} />
      {calendar && (
        <MeetTimeDialog venue={props.venue} sessionName={props.view.name} slug={slug}
          decidedAt={props.view.decidedAt} onClose={() => setCalendar(false)} />
      )}
    </div>
  );
}
```

`ResultScreen.tsx`'te `<ShareButton text={shareText} url={shareUrl} />` satırını
`<ResultActions view={v} venue={winner} shareText={shareText} shareUrl={shareUrl} />` ile, `ShareButton` importunu `ResultActions` importuyla değiştir.

- [ ] **Step 5: Testleri koş** — Run: `PNPM_TEST src/lib/ics.test.ts src/components/molecules/MeetTimeDialog.test.tsx src/pages/ResultScreen.test.tsx` · Expected: 3 yeni test yeşil, mevcut `ResultScreen` testleri yeşil kalır ("Gruba paylaş" düğmesi hâlâ var).

- [ ] **Step 6: Dosya listesi** — `lib/ics.ts` (+test), `molecules/MeetTimeDialog.tsx` (+test), `molecules/ResultActions.tsx`, `pages/ResultScreen.tsx`, gerekirse `atoms/TextInput.tsx`. Mesaj: `feat(result): calendar (ICS + Google) and card share actions`.

---
### Task 9: Davet linki OG meta + doğrulama + kayıt
**Files:** Modify: `frontend/web/index.html`, `docs/superpowers/plans/INDEX.md` · Test: `frontend/web/src/meta.test.ts`
- [ ] **Step 1: Başarısız testi yaz** (`src/meta.test.ts`)
```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");
describe("index.html — paylaşım önizlemesi", () => {
  it("Open Graph ve Twitter kartı etiketleri var", () => {
    for (const tag of ["og:type", "og:title", "og:description", "og:image", "og:url"])
      expect(html).toContain(`property="${tag}"`);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });
  it("og:image mutlak URL'dir (göreli yol crawler'da çözülmez)", () => {
    expect(html.match(/property="og:image" content="([^"]+)"/)?.[1]).toMatch(/^https:\/\//);
  });
});
```
Run: `PNPM_TEST src/meta.test.ts` · Expected: iki test kırmızı.
- [ ] **Step 2: `index.html`'e meta bloğunu ekle** (`<title>` satırının ardına)
```html
    <meta name="description" content="Meet in the middle — BumpInto finds the fair spot for everyone." />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="BumpInto" />
    <meta property="og:url" content="https://bumpinto.app/" />
    <meta property="og:title" content="BumpInto — meet in the middle" />
    <meta property="og:description" content="Open the link, drop your location, and we'll find the spot that's fair for everyone." />
    <!-- Görsel B-15'in (R-B10) `GET /og/{slug}.png` denetleyicisinin oturumsuz varyantıdır.
         SPA SINIRI: crawler JavaScript çalıştırmaz, bu yüzden /j/:slug için KİŞİYE ÖZEL kart
         bu statik etiketlerden gelemez — kenar katmanı (Cloudflare/Nginx) bot `User-Agent`'ında
         /j/:slug isteğini backend'in OG HTML'ine yönlendirmelidir (K-W15, I izi). -->
    <meta property="og:image" content="https://bumpinto.app/og/default.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
```
Run: `PNPM_TEST src/meta.test.ts` · Expected: 2 test yeşil.
- [ ] **Step 3: Tam doğrulama** (repo kökünden, tüm görevler bittikten sonra)
```bash
source ./init-nvm.sh
pnpm --filter @bumpinto/web exec tsc -b
pnpm test:web
pnpm i18n:check
pnpm --filter @bumpinto/web build
```
Expected: tsc temiz; test sayısı önceki toplam **+ 24** (toastStore 2, ToastHost 1, ParticipantRow +3, socialStore 3, PersonSheet 3, voiceMesh +1, voiceStore +2, shareCard 3, ShareButton 1, ics 2, MeetTimeDialog 1, meta 2); i18n parite 0 fark; build yeşil (`html-to-image` chunk'a girer).
- [ ] **Step 4: `INDEX.md`'i güncelle** — W tablosunda `W-12` satırından SONRA:
```markdown
| W-15 | **Sosyal güvenlik + paylaşım** — `PersonSheet` (bildir · engelle · yerel sustur), `socialStore` (rapor+engel, 60 sn dürtme soğuması), `toastStore`/`ToastHost`, presence 2.0 (`ParticipantRow`: çevrimiçi noktası, bekleyen nabız, "Linki açtı", "Son görülen"), host dürtme + WS `nudged`, `shareCard` 1080×1920 PNG (`html-to-image`, CORS fallback), `ics.ts` + `MeetTimeDialog`, davet linki OG meta | `2026-09-06-plan37-web-social-share.md` | Plan 37 | ready | B-14 (R-B4) · B-15 (R-B8) | — | Gereksinim dok. §3/§4; R-W15, R-W5, R-W6, R-W3, R-W4. 9 görev. `html-to-image@^1.11.13` tek yeni bağımlılık. Buluşma saati alanı YOK — ICS saati kullanıcıdan (§2 kararı) |
```
W izinin **Spec dışı görevler** tablosunun sonuna iki satır (INDEX kural 10):
```markdown
| K-W15 | **`/j/:slug` OG kartı kenar yönlendirmesi** — crawler `User-Agent`'ını backend'in OG HTML'ine yönlendiren kural; SPA statik meta yalnız varsayılan kartı verir | açık | I izi | Plan 37 T9 bulgusu; B-15 `GET /og/{slug}.png` hazır olunca anlamlı |
| K-W16 | **Engel kaldırma yüzeyi** — `GET /api/me/blocks` + `DELETE /api/me/blocks/{id}` UI'ı | açık | W-14 | Plan 37 kapsamı yalnız engel EKLEME (artboard W20); liste/kaldırma hesap ekranının işi |
```
- [ ] **Step 5: Elle uçtan uca kontrol listesi** (kullanıcıya bırakılır; ajan yapamaz — iki tarayıcı, gerçek foto CDN'i, sistem paylaşım sayfası gerekir)

1. Host lobiyi açar, davetli ikinci tarayıcıda linke tıklar ama konum vermez → host'ta "Linki açtı · konum bekleniyor…", nabızlı avatar, yeşil nokta.
2. Host "Kerem'i dürt" → davetlide üstte bildirim; host'ta düğme 60 sn kapalı.
3. Davetli sekmeyi kapatır → satır solar, "Son görülen · HH:mm" yazar.
4. Host "…" → Bildir → "Sahte / spam" → Gönder → "Bildirildi · Kerem engellendi", satır solar + "engellendi", "…" düğmesi kalkar.
5. Sesli sohbette "Sesli sohbette sustur" → karşı taraf konuşurken ses gelmez, konuşma halkası yine yanar (yerel sustur karşıya gitmez).
6. Karar ekranında "Kartı paylaş" → telefonda sistem paylaşım sayfası PNG ile açılır, masaüstünde dosya iner. Foto CORS'ta kırılırsa kart gradyan + monogram çıkar (PNG boş DEĞİL).
7. "Takvime ekle" → 19:30 seç → `.ics` iner ve Apple/Google Takvim'de doğru saatte açılır; "Google Calendar'da aç" aynı aralığı gösterir.
8. `prefers-reduced-motion: reduce` açıkken bekleyen avatarın nabzı durur, satır yine okunur.
9. WhatsApp'a `https://bumpinto.app/j/<slug>` yapıştır → varsayılan OG kartı görünür (kişiye özel kart K-W15'e bağlı).

- [ ] **Step 6: Dosya listesi** — `frontend/web/index.html`, `frontend/web/src/meta.test.ts`, `docs/superpowers/plans/INDEX.md`. Mesaj: `docs(social): og tags and W-15 registration`.

---
## Plan öz-incelemesi

**Spec kapsamı.** **R-W15**: "…" menüsü (T4 düğme, T6 panel), Bildir · Engelle · Seste sustur (T6), sebep/onay paneli frag 70 (T6), `POST /api/reports` + `POST /api/me/blocks` (T1, T5), `ParticipantDto.blocked` → satır soluklaşır + "engellendi" + menü kalkar (T4) ve ses odasından süzülür (T6), "Bildirildi · engellendi" bildirimi (T2 metin, T3 yüzey, T5 tetik). **R-W5**: çevrimiçi noktası, çevrimdışı soluk satır (mevcut, korundu), bekleyen nabız `.c-pulse` (`@layer base`'teki `prefers-reduced-motion` kuralı hareketi kapatır), "Linki açtı" `linkOpenedAt`, "Son görülen · HH:mm" `lastSeenAt` — hepsi T4. **R-W6**: yalnız host, `online === false || !hasLocation` kapısı, 60 sn soğuma, `POST /api/sessions/{slug}/nudge/{participantId}`, STOMP `nudged` → alıcıda bildirim (T5). **R-W3**: `html-to-image` 1080×1920, font gömme, `crossOrigin` + `probePhoto` → gradyan+monogram, `navigator.share({files})` varsa paylaş yoksa indir, `ShareButton` iki modlu, metin fallback `result.shareText` (T7/T8). **R-W4**: saat soran diyalog, `text/calendar` Blob, `LOCATION` = `venue.address`, UTC damga + bölge satırı, Google Calendar alternatifi (T8). OG meta + SPA sınırı + B-15 referansı (T9). i18n tr/en/nl (T2). INDEX + K-W15/K-W16 (T9). Boşluk yok.

**Bilinçli sapmalar (gerekçeli).** (1) ICS'te `TZID` **parametresi** yerine `X-WR-TIMEZONE` satırı: damgalar mutlak UTC olduğu için `TZID` bir `VTIMEZONE` bloğu gerektirirdi; DST kurallarını istemcide üretmek yeni hata kaynağıdır, bölge bilgisi yine taşınır. (2) Rapor gönderiminden sonra **otomatik engel**: artboard W20 onayı ("Bildirildi · Kerem engellendi") ikisini birlikte söyler; "Engelle" kalemi tek başına da çalışır. (3) Dürtme düğmeleri satır içinde değil kart altında (artboard W6d kalıbı) — 390'da satır zaten avatar + iki metin + rozet taşıyor. (4) tr'de "{{name}}'i dürt" ekinin ada göre değişmesi (Ayşe'yi) karşılanmaz; artboard kopyası esas alındı.

**Yer tutucu taraması:** her adımda gerçek kod ya da çalıştırılabilir komut var; belirsiz talimat kullanılmadı. Tek koşullu dal T1 Step 3'teki `BlockDto` adıdır — `api-types.ts`'ten okunur, uydurulmaz.

**Tip tutarlılığı:** `Toast{id,messageKey,params,tone}` ve `push(key, params?, tone?)` T3 tanım = T5 store = `useSessionLive` = `ToastHost` · `ReportReason = Schemas["ReportRequest"]["reason"]` T5 tanım = T6 `REASONS` (`satisfies` kilidi) = i18n `social.reason<VALUE>` anahtarları · `socialStore.{canNudge,nudge,report,block,blocked,busy}` T5 tanım = T5 `ParticipantList` = T6 `PersonSheet` · `voiceStore.{mutedPeers,togglePeerMute}` ve `VoiceMesh.setMutedPeers(ids: string[])` T6 içinde tek yerde · `ParticipantRow` prop `onOptions?: (p: ParticipantDto) => void` T4 = T5 · `ParticipantList` prop `{participants, slug, isHost}` T5 = `LobbyPage`/`WaitingRoom` · `renderShareCard(node) → Blob | null`, `probePhoto(url?) → string | null`, `shareOrDownload(blob, name, text) → ShareResult` T7 = T8 · `ShareButton` `{mode?, getFile?}` T7 = T8 · `CalendarEvent` T8 `ics.ts` = `MeetTimeDialog`.

**Riskler.** (a) `venue.travelMinutes` W-13'te `travel[]` olacak (K-B26) — `ShareCard` bunu `TravelList` ile AYNI kaynaktan okur, W-13 iki dosyayı birlikte günceller. (b) `html-to-image` jsdom'da gerçek çizim yapamaz; T7 testleri modülü mock'lar, gerçek PNG doğrulaması elle kontrol listesinin 6. maddesidir. (c) Masaüstü Chrome Web Share Level 2'de dosya kabul etmez — `shareOrDownload` indirmeye düşer, beklenen davranış budur.
