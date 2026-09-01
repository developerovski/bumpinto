# Plan 8: Web UI — Tailwind v4 + i18n + rem Token Migrasyonu

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web uygulamasının stil mekanizmasını Tailwind v4 utility-first'e, tüm kullanıcı metnini react-i18next'e (tr taban + en + nl), tüm ölçüleri rem tabanlı `@theme` token'larına taşımak — davranış, DOM akışı ve görsel çıktı DEĞİŞMEDEN.

**Architecture:** Spec: `docs/superpowers/specs/2026-09-01-web-tailwind-i18n-design.md` (BAĞLAYICI — çelişkide spec kazanır). Utility sınıfları YALNIZ `components/` altında; `pages/` salt kompozisyon (utility + inline style + ham element stili yasak). Token kaynağı Design System v2 → `app.css @theme`. `::before/::after` gerektiren 4 desen `@layer components`'ta `c-*` önekiyle kalır. i18n önce (Task 1), stil migrasyonu sonra — iki iş hiçbir dosyada iç içe geçmez.

**Tech Stack:** tailwindcss@^4 + @tailwindcss/vite, i18next + react-i18next + i18next-browser-languagedetector. SCSS YOK (spec §1). Node 22 zorunlu.

---

## Bu plana özel kurallar

- **INDEX güncelle** (başlarken `in-progress`, görev sonlarında `Son adım`, bitince `done`).
- **Git yazma YOK** — commit kullanıcıda. Komutlar `rtk` ile, repo kökünden.
- **Her shell'de önce:** `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"` (pnpm 11, Node 20'de çöker).
- **Görsel değerlerin kaynağı mevcut kod** (`tokens.css`/`ui.css` — Plan 3'te artboard'lardan birebir doğrulandı; Task 7'de silinene dek migrasyon referansıdır). px→rem çevirisi `/16`; border/hairline/outline kalınlıkları, gölge offset'leri ve rotate dereceleri px/deg kalır (spec §3).
- **Metinlerin kaynağı mevcut kod** — tr.json değerleri koddaki literallerle birebir aynı olmalı; uyuşmazlıkta kod kazanır (kod artboard'dan türetildi), fark raporlanır.
- **Hiçbir görsel/metinsel değer icat edilmez.** Yeni bir değer gerekiyorsa BLOCKED + kullanıcıya sor.
- Her görev sonunda gate: `rtk pnpm --filter @bumpinto/web exec tsc --noEmit && rtk pnpm test:web` yeşil.

---

### Task 1: i18n altyapısı + tüm metinlerin extraction'ı

**Files:**
- Modify: `frontend/web/package.json` (deps)
- Create: `frontend/web/src/i18n/index.ts`
- Create: `frontend/web/src/i18n/locales/tr.json`
- Create: `frontend/web/src/i18n/locales/en.json`
- Create: `frontend/web/src/i18n/locales/nl.json`
- Modify: `frontend/web/src/main.tsx`, `frontend/web/src/test-setup.ts`
- Modify: `frontend/web/src/App.tsx`, `src/pages/SessionPage.tsx`, `src/pages/JoinForm.tsx`,
  `src/pages/WaitingRoom.tsx`, `src/pages/DeckScreen.tsx`, `src/pages/RunoffScreen.tsx`,
  `src/pages/ResultScreen.tsx`, `src/components/atoms/Wordmark.tsx`,
  `src/components/molecules/ParticipantRow.tsx`, `src/components/molecules/VenueCard.tsx`,
  `src/components/molecules/DeckActions.tsx`, `src/components/molecules/ViralCard.tsx`,
  `src/components/organisms/ParticipantList.tsx`, `src/components/organisms/RunoffList.tsx`,
  `src/components/organisms/VenueDeck.tsx`

- [ ] **Step 1: Bağımlılıkları ekle** — Run:
  `rtk pnpm --filter @bumpinto/web add i18next react-i18next i18next-browser-languagedetector`
  Expected: hatasız; kök `pnpm-lock.yaml` güncellenir.

- [ ] **Step 2: `src/i18n/index.ts`**

```typescript
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import nl from "./locales/nl.json";
import tr from "./locales/tr.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { tr: { translation: tr }, en: { translation: en }, nl: { translation: nl } },
    fallbackLng: "tr",
    detection: { order: ["querystring", "navigator"], caches: [] }, // storage'a yazma YOK
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;
```

- [ ] **Step 3: `locales/tr.json`** — TABAN DİL. Değerler koddaki literallerin BİREBİR kopyası;
  yazdıktan sonra her değeri kaynak dosyadaki string ile diff'le, fark varsa kodu esas al ve
  farkı raporla. `<0>…</0>` işaretleri `<Trans>` bileşen sınırlarıdır (Highlight).

```json
{
  "common": { "wordmark": "BumpInto" },
  "app": {
    "homeTitle": "Ortada <0>buluşalım.</0>",
    "homeHint": "Bir davet linkin olmalı — örn. bumpinto.app/j/x7k2m"
  },
  "session": {
    "errorTitle": "Hmm.",
    "notFound": "Bu oturum bulunamadı — link doğru mu?",
    "expired": "Bu oturumun süresi dolmuş."
  },
  "join": {
    "invited": "Arkadaşın seni buluşmaya çağırdı",
    "title": "<0>Buluşmaya</0> katıl",
    "subtitle": "Konumunu at, ortada buluşalım. Hesap filan gerekmez.",
    "nameLabel": "Adın",
    "namePlaceholder": "Arkadaşların sana ne der?",
    "whereLabel": "Neredesin?",
    "useMyLocation": "Mevcut konumumu kullan",
    "currentLocation": "Mevcut konumun",
    "or": "veya",
    "addressPlaceholder": "Şehir ya da adres yaz",
    "addressAria": "Şehir ya da adres",
    "submit": "Katıl",
    "privacy": "Konumun yalnızca bu buluşma için kullanılır.",
    "errGeolocation": "Konum izni alınamadı — adres yazabilirsin.",
    "errGeocode": "Bu adres bulunamadı — yakındaki bir şehri dene.",
    "errJoin": "Katılamadın — bu oturum kapanmış olabilir."
  },
  "waiting": {
    "joined": "Katıldın!",
    "preparing": "Deste hazırlanıyor…",
    "copy": "Mekanlar gelince buradan kaydıracaksın — sayfayı kapatma yeter.",
    "who": "Kimler var",
    "readyCount": "{{ready}} / {{total}} hazır",
    "host": "Kuran",
    "ready": "Hazır",
    "waitingBadge": "Bekliyor",
    "waitingLocation": "Konum bekleniyor…",
    "you": "(sen)",
    "changeLocation": "Konumumu değiştir",
    "errUpdate": "Konum güncellenemedi — tekrar dene."
  },
  "deck": {
    "counter": "{{current}} / {{total}}",
    "seeAll": "Hepsini gör",
    "photoTag": "foto · Places",
    "pass": "geç",
    "like": "beğen",
    "ariaUndo": "Geri al",
    "ariaPass": "Geç",
    "ariaLike": "Beğen",
    "travel": "{{who}} {{min}} dk",
    "travelSelf": "Sana",
    "travelFriend": "Arkadaşın",
    "travelFallback": "Yol",
    "finishedTitle": "Deste <0>bitti!</0>",
    "likedCount": "{{count}} mekanı beğendin.",
    "send": "Beğenilerimi gönder",
    "backToList": "Listeye dön, düzelt",
    "listTitle": "Hangisi olsun?"
  },
  "runoff": {
    "sticker": "Son düzlük",
    "title": "İkisi de güzel,\nbiri kazanacak",
    "copy": "Herkes ikisini de beğendi. Tek seçim hakkın var — sonuç herkes seçince açıklanır.",
    "note": "kim neyi seçti, sonuçta belli olur",
    "lockIn": "Seçimimi kilitle",
    "locked": "seçimin kilitli — diğerlerini bekliyoruz"
  },
  "result": {
    "overline": "Ortak nokta",
    "sticker": "Karar verildi!",
    "directions": "Yol tarifi al",
    "viralTitle": "Sıradaki buluşma senden mi?",
    "viralCopy": "30 saniyede kur — arkadaşların linkle katılır.",
    "viralCta": "Buluşma kur",
    "viralSticker": "sıra sende"
  }
}
```

- [ ] **Step 4: `en.json` ve `nl.json`** — tr.json'daki HER anahtarın çevirisi. İlk anahtar
  `"_status": "tasarım onayı bekliyor (2026-09-01)"` olur (spec §5). Üslup: tr'deki samimi,
  kısa, em-dash'li ses korunur; `{{…}}` interpolasyonları ve `<0>…</0>` işaretleri aynen taşınır.
  Örnek (en): `"join.title": "Join the <0>meetup</0>"`, `"deck.travel": "{{who}} {{min}} min"`,
  `"waiting.you": "(you)"`. Buton/rozet metinlerinde tr'den belirgin uzun kalan çeviri varsa
  kısalt ve raporla (spec §7).

- [ ] **Step 5: init'i bağla** — `main.tsx`'e ve `test-setup.ts`'e (ikisi de `src/` içinde)
  `import "./i18n";` satırını ekle (styles import'larından önce). Kaynaklar inline olduğu için
  init senkrondur; testler tr görür.

- [ ] **Step 6: Extraction** — listedeki her bileşen/sayfada kullanıcıya görünen TÜM string
  literalleri (aria-label'lar dahil) `useTranslation()` + `t("…")` ya da vurgulu metinlerde
  `<Trans i18nKey="…" components={[<Highlight key="0" />]} />` ile değiştir. Kurallar:
  - `RunoffScreen` başlığındaki satır kırılımı: `runoff.title` değerindeki `\n` →
    `white-space: pre-line` davranışı Task 6'da stile taşınır; şimdilik
    `{t("runoff.title").split("\n").map(...)}` YERİNE `<h1 style={{whiteSpace:"pre-line"}}>` gibi
    YENİ stil EKLEME — mevcut render `<br/>` ile ise `Trans` + `components={[<br key="0"/>]}` yapısını koru.
  - `DeckScreen` travel etiketleri: `t("deck.travel", { who, min })`; `who` değeri
    `t("deck.travelSelf")` / katılımcı adı / `t("deck.travelFriend")` / `t("deck.travelFallback")`.
  - Dinamik veriler (mekan adı, katılımcı adı, sayılar) çevrilmez; interpolasyonla geçer.
  - `VenueCard.test.tsx`'teki `"foto · Places"` assertion'ları AYNEN kalır (tr taban dil,
    test wrapper tr yükler) — test dosyasına dokunma; kırılırsa extraction hatalıdır.
- [ ] **Step 7: Kalıntı taraması** — Run:
  `grep -rn '"[A-ZÇĞİÖŞÜa-zçğıöşü][^"]* [a-zçğıöşü]' frontend/web/src --include="*.tsx" | grep -v "i18n/\|\.test\.\|aria-hidden\|className"`
  Çıktıyı elle incele: kullanıcıya görünen Türkçe literal kalmamalı (className/teknik stringler hariç).
- [ ] **Step 8: Gate** — Run: `rtk pnpm --filter @bumpinto/web exec tsc --noEmit && rtk pnpm test:web`
  Expected: tsc temiz; `Test Files 2 passed (2) · Tests 5 passed (5)`.
- [ ] **Step 9: INDEX güncelle + Commit (kullanıcı)** — `feat(web): react-i18next + tr/en/nl`

---

### Task 2: Tailwind v4 kurulumu + `app.css` (@theme, base, c-* desenleri)

**Files:**
- Modify: `frontend/web/package.json`, `frontend/web/vite.config.ts`
- Create: `frontend/web/src/styles/app.css`
- Modify: `frontend/web/src/main.tsx`

Eski `tokens.css`/`ui.css` BU GÖREVDE SİLİNMEZ (Task 7) — iki sistem migrasyon boyunca birlikte yaşar.

- [ ] **Step 1: Kur** — Run: `rtk pnpm --filter @bumpinto/web add tailwindcss @tailwindcss/vite`
- [ ] **Step 2: `vite.config.ts`** — `plugins: [react(), tailwindcss()]`
  (`import tailwindcss from "@tailwindcss/vite";`). Diğer ayarlar aynen kalır.
- [ ] **Step 3: `src/styles/app.css`** — değer kaynağı mevcut `tokens.css`/`ui.css`:

```css
@import "tailwindcss";

@theme {
  --color-paper: #fffbf6;
  --color-card: #ffffff;
  --color-ink: #27203b;
  --color-ink2: #6e6584;
  --color-ink3: #a79db8;
  --color-flame: #fd3e6b;
  --color-flame2: #ff7854;
  --color-flame-deep: #de2456;
  --color-flame-wash: #ffe9ef;
  --color-sun: #ffc93c;
  --color-hl: #ffe27a;
  --color-grass: #0b7a44;
  --color-grass-wash: #dff5e9;
  --color-violet: #6234d8;
  --color-violet-wash: #f1ebff;
  --color-amber: #a96a0b;
  --color-amber-wash: #fff1d6;
  --color-line: #f1e8de;
  --color-line2: #e4d9cd;
  --color-line-in: #91869c;
  --font-head: "Bricolage Grotesque", system-ui, sans-serif;
  --font-body: "Figtree", system-ui, sans-serif;
  --font-hand: "Caveat", cursive;
  --text-display: 2.125rem;              /* 34px — h1 */
  --text-display--line-height: 1.05;
  --text-display--letter-spacing: -0.02em;
  --text-h2: 1.3125rem;                  /* 21px */
  --text-h3: 1.0625rem;                  /* 17px */
  --radius-card: 1.375rem;               /* 22px */
  --shadow-sh1: 0 1px 3px rgba(39, 32, 59, 0.05), 0 4px 14px rgba(39, 32, 59, 0.06);
  --shadow-sh2: 0 2px 6px rgba(39, 32, 59, 0.08), 0 12px 30px rgba(39, 32, 59, 0.12);
}

:root {
  --grad: linear-gradient(120deg, #fd3e6b 10%, #ff7854 90%);
  --story-ring: conic-gradient(from 210deg, #fd3e6b, #ff7854, #ffc93c, #7c4dff, #fd3e6b);
}

@layer base {
  body {
    margin: 0;
    background: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-body);
    font-size: 1rem;
    line-height: 1.55;
  }
  a { color: var(--color-flame-deep); text-decoration: none; }
  a:hover { color: var(--color-ink); text-decoration: underline; }
  h1, h2, h3 { font-family: var(--font-head); letter-spacing: -0.01em; margin: 0; }
  h1 { font-size: var(--text-display); font-weight: 800; line-height: 1.05; letter-spacing: -0.02em; }
  h2 { font-size: var(--text-h2); font-weight: 700; }
  h3 { font-size: var(--text-h3); font-weight: 700; }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
}

@layer components {
  /* Yalnız ::before/::after gerektiren desenler (spec §4). Değerler ui.css'ten birebir. */
  .c-dv-text { /* ui.css .a-dv-text bloğunu buraya birebir taşı (::before/::after dahil), rem çevirileriyle */ }
  .c-check { /* ui.css .a-check + .a-check > i */ }
  .c-ico-undo { /* ui.css .a-ico-undo (+pseudo'ları) */ }
  .c-ico-x { /* ui.css .a-ico-x */ }
  .c-ico-heart { /* ui.css .a-ico-heart */ }
  .c-mark { /* ui.css .a-mark */ }
  .c-mark-ring { /* .a-mark-ring */ }
  .c-mark-dot { /* .a-mark-dot */ }
  .c-mark-dot--a { /* .a-mark-dot--a */ }
  .c-mark-dot--b { /* .a-mark-dot--b */ }
  .c-mark-pin { /* .a-mark-pin + ::after */ }
}
```

  `@layer components` gövdeleri: `ui.css`'teki ilgili `a-*` bloklarının **birebir kopyası**
  (tek fark: sınıf adı `c-*`, px ölçüleri rem — border kalınlıkları px kalır). Kopyala,
  yorum satırlarını değerlerle DOLDUR — yukarıdaki yorumlar şablon işaretidir, boş bırakılamaz.
- [ ] **Step 4: `main.tsx`** — `import "./styles/app.css";` satırını mevcut iki css import'unun
  ÜSTÜNE ekle (eski dosyalar Task 7'ye dek kalır; kaskadda eski `a-*` tanımları kazanmaya
  devam eder çünkü kullanılan sınıflar ayrık).
- [ ] **Step 5: Gate** — tsc + test + `rtk pnpm build:web` yeşil; `rtk pnpm dev:web` ile ekranın
  Task 1 sonrası görünümden FARKSIZ olduğunu hızlıca doğrula (yeni css henüz hiçbir bileşende
  kullanılmıyor).
- [ ] **Step 6: INDEX + Commit (kullanıcı)** — `feat(web): tailwind v4 + rem theme token'lari`

---

### Task 3: Atom migrasyonu (+ yeni Page/Note/ErrorText/Heading atomları)

**Files:**
- Modify: `frontend/web/src/components/atoms/` altındaki 10 dosya
- Create: `frontend/web/src/components/atoms/Page.tsx`, `Note.tsx`, `ErrorText.tsx`, `Heading.tsx`
- Modify: `frontend/web/src/components/atoms/index.ts`

Kural: her atomun `a-*` sınıfları kendi JSX'inde utility zincirine dönüşür; prop API'leri
DEĞİŞMEZ. Değer kaynağı `ui.css` — çevirisi `/16` rem. Her dosyanın başına tek satır kaynak
yorumu: `/* Kaynak: ui.css .a-btn* / DS v2 */`.

- [ ] **Step 1: `Button.tsx`** — sınıf üretimini şu zincirlerle değiştir (davranış aynı):

```tsx
const base =
  "flex items-center justify-center gap-[0.5625rem] min-h-[3.25rem] w-full px-6 " +
  "rounded-full border-[1.5px] border-transparent font-head text-base font-bold " +
  "cursor-pointer no-underline text-inherit " +
  "focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px] " +
  "disabled:opacity-45 disabled:shadow-none disabled:cursor-not-allowed";
const kinds = {
  flame: "bg-flame-deep text-white shadow-[0_8px_24px_rgba(222,36,86,0.3)]",
  white: "bg-card text-ink border-line2 shadow-sh1",
  grad: "bg-(--grad) text-white shadow-[0_10px_26px_rgba(222,36,86,0.35)]",
};
const rounds = {
  pill: "",
  round: "rounded-full p-0 w-[3.875rem] min-h-[3.875rem] text-[1.375rem] flex-none",
  "round-sm": "rounded-full p-0 w-[2.75rem] min-h-[2.75rem] text-base flex-none",
};
const aligns = { center: "", start: "justify-start gap-3" };
```

  `className={[base, kinds[kind], rounds[shape], aligns[align]].join(" ").trim()}`.
  Not: `round-sm`'de `rounds.round` zinciri ÖN KOŞUL DEĞİL — `rounds["round-sm"]` tek başına tam
  (eski `a-btn--round`+`--round-sm` bileşimi buraya katlandı: 44px/16px).
- [ ] **Step 2: kalan 9 atom** — aynı yöntemle, `ui.css` karşılıklarından:
  `TextInput` (`.a-inp` + `::placeholder` → `placeholder:text-ink3`, focus → `focus:outline-none
  focus:border-flame-deep focus:shadow-[0_0_0_3px_var(--color-flame-wash)]`),
  `Badge` (`.a-badge` + 5 ton), `Chip`, `Sticker` (+`.a-sticker--white` → `white?: boolean` yerine
  MEVCUT kullanım nasılsa öyle — API değişmez), `Avatar` (`.a-avatar`, `--waiting`, ring sarmalayıcı
  `.a-avatar-ring` utility'leri Avatar içinde), `Progress` (`> i` çocuğu JSX'te `<i>` olarak zaten
  var — utility'ler iki elemana dağılır), `Highlight` (`.a-hl` → arbitrary gradient bg utility;
  padding `px-2.5 py-px`, `rounded-lg inline-block -rotate-[1.2deg]`), `HandNote` (`.a-hand`),
  `Wordmark` (`.a-wm` + `> i` + `> span` — üç eleman JSX'te mevcut).
- [ ] **Step 3: Yeni atomlar** (sayfaların Task 4-6'da utility'siz kalabilmesi için):

`atoms/Page.tsx`:

```tsx
import type { ReactNode } from "react";

/* Kaynak: ui.css .page / .page--deck / .page--result */
const variants = {
  default: "gap-[0.9375rem] px-[1.125rem] pt-5 pb-8",
  deck: "gap-0 px-[1.125rem] pt-4 pb-0",
  result: "gap-3.5 px-[1.125rem] pt-5 pb-8 relative",
};

export default function Page(props: {
  variant?: keyof typeof variants;
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={[
        "mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col",
        variants[props.variant ?? "default"],
        props.center ? "justify-center" : "",
      ].join(" ").trim()}
    >
      {props.children}
    </main>
  );
}
```

`atoms/Note.tsx` (ui.css `.muted`):

```tsx
import type { ReactNode } from "react";

export default function Note(props: { center?: boolean; children: ReactNode }) {
  return (
    <p className={`text-[0.8125rem] leading-normal text-ink2${props.center ? " text-center" : ""}`}>
      {props.children}
    </p>
  );
}
```

`atoms/ErrorText.tsx` (ui.css `.err`):

```tsx
import type { ReactNode } from "react";

export default function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[0.8125rem] text-[#c0392b]">
      {children}
    </p>
  );
}
```

`atoms/Heading.tsx` (sayfalardaki `style={{fontSize:26}}` gibi varyantlar için):

```tsx
import type { ReactNode } from "react";

const sizes = { display: "", md: "text-[1.625rem]" }; // md = 26px (DeckScreen liste modu)

export default function Heading(props: {
  size?: keyof typeof sizes;
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <h1 className={[sizes[props.size ?? "display"], props.center ? "text-center" : ""].join(" ").trim()}>
      {props.children}
    </h1>
  );
}
```

  Dördünü `atoms/index.ts`'e ekle.
- [ ] **Step 4: Gate** — tsc + test yeşil; `rtk pnpm dev:web`'de atom kullanan mevcut ekranlar
  görsel olarak DEĞİŞMEMİŞ olmalı (eski `a-*` sınıfları hâlâ molekül/sayfalarda; atomlar artık
  utility — ikisi çakışmaz çünkü atomlar eski sınıf adlarını artık üretmiyor).
- [ ] **Step 5: INDEX + Commit (kullanıcı)** — `feat(web): atomlar tailwind utility'ye gecti`

---

### Task 4: W1/W2 migrasyonu — Field, ParticipantRow, MapMark, ParticipantList + sayfa temizliği

**Files:**
- Modify: `src/components/molecules/Field.tsx`, `ParticipantRow.tsx`, `MapMark.tsx`
- Modify: `src/components/organisms/ParticipantList.tsx`
- Modify: `src/pages/App.tsx` yönlendiren kök `src/App.tsx`, `src/pages/SessionPage.tsx`,
  `src/pages/JoinForm.tsx`, `src/pages/WaitingRoom.tsx`

Dönüşüm tablosu (ui.css → utility; her yerde aynı):

| Eski | Utility |
|---|---|
| `.row` | `flex items-center gap-2.5` |
| `.field` | `flex flex-col gap-2` |
| `.label` | `text-sm font-semibold` |
| `.muted` | `<Note>` atomu |
| `.err` | `<ErrorText>` atomu |
| `.a-card` | `bg-card border border-line rounded-card shadow-sh1 p-4` |
| `.a-card--grass` | `+ px-4 py-[0.9375rem] bg-grass-wash border-[#bfe5cf]` |
| `.a-dv` | `h-px bg-line` |
| `.a-ov` | `text-[0.6875rem] font-bold uppercase tracking-[0.11em] text-ink3 m-0` |
| `.a-dot` (+`>i`) | ebeveyn `w-[1.625rem] h-[1.625rem] rounded-full bg-grass-wash flex items-center justify-center flex-none`, çocuk `block w-[0.5625rem] h-[0.5625rem] rounded-full bg-grass` |
| `.a-m2` | `text-ink2 font-normal` |
| `.tab` | `tabular-nums` |
| `.a-dv-text` | `c-dv-text` (Task 2'de tanımlı) |
| `.a-check` | `c-check` |
| `.a-mark*` | `c-mark*` |

- [ ] **Step 1: Molekül/organizmalar** — dört dosyada tüm `a-*`/`row`/`field`… sınıflarını ve
  inline stilleri tabloya göre utility'ye çevir. Inline değerler (ör. ParticipantRow
  `padding:"13px 16px"` → `px-4 py-[0.8125rem]`, ParticipantList `padding:"2px 0"` →
  `py-0.5 px-0`, divider `margin:0 16px` → `mx-4`) rem'e çevrilir.
- [ ] **Step 2: Sayfalar** — `App.tsx`, `SessionPage.tsx`, `JoinForm.tsx`, `WaitingRoom.tsx`:
  `<main className="page">` → `<Page>` (center gerektirenler `<Page center>`), `.muted` →
  `<Note>`, `.err` → `<ErrorText>`, kalan TÜM `className`/`style` sayfadan kalkar — layout
  ihtiyacı olan parçalar (JoinForm intro kolonu `gap:12`, form `gap:15`, WaitingRoom orta kolon)
  ya mevcut moleküllere iner ya da `Field`/`Page` kompozisyonuyla karşılanır; hiçbiri
  karşılamıyorsa o parça küçük bir moleküle çıkarılır (`molecules/JoinIntro.tsx` gibi —
  yalnız gerekiyorsa, AGENTS.md yeni-dosya eşiğine tabi).
  Bitişte: `grep -n 'className=\|style=' src/pages/*.tsx src/App.tsx` yalnız `<Page`/atom/molekül
  PROP'ları dışında eşleşme döndürmemeli (sayfada ham sınıf/stil sıfır).
- [ ] **Step 3: Görsel doğrulama** — `rtk pnpm dev:web` ile W1 (`/j/x` → JoinForm) ve W2
  ekranlarını Claude Design artboard'larıyla karşılaştır (`Web Ekranlar v2.dc.html`,
  `data-screen-label` "Katıl"/"Katıldın"; proje `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`).
  Fark = hata; utility değerini düzelt.
- [ ] **Step 4: Gate + INDEX + Commit (kullanıcı)** — `feat(web): w1-w2 tailwind migrasyonu`

---

### Task 5: W3 migrasyonu — VenueCard, DeckActions, VenueDeck + DeckScreen

**Files:**
- Modify: `src/components/molecules/VenueCard.tsx`, `DeckActions.tsx`
- Modify: `src/components/organisms/VenueDeck.tsx`
- Modify: `src/pages/DeckScreen.tsx`
- Create (gerekirse): `src/components/molecules/DeckHeader.tsx`

- [ ] **Step 1: `VenueCard.tsx`** — `a-pol`, `a-pol--d1/d2/d3`, `a-pol-ph`, `a-pho--a/b/c`,
  `a-pho-mono`, `a-pho-tag`, `a-pol-body`, `a-pol-title`, `a-pol-meta`, `a-pol-travel`,
  `a-row-card*`, `a-row-thumb*`, `a-pick*` sınıflarının TÜM değerlerini `ui.css`'ten okuyup
  utility'ye çevir (rem kuralı; rotate dereceleri aynen). Gradyanlar (`.a-pho--a/b/c` üç katmanlı)
  uzun arbitrary değerlerdir — okunabilirlik için dosya içinde `const PHO = { a: "bg-[…]", … }`
  sabitlerinde tutulabilir. `hasPhoto` mantığı, `photoOnly`/`hideTitle` propları, test
  assertion'ları DEĞİŞMEZ. `a-pick`/`a-pick--on` seçim dairesi `::after` içermiyorsa utility'ye
  iner; içeriyorsa `c-pick` olarak Task 2 dosyasına eklenir ve raporlanır.
- [ ] **Step 2: `DeckActions.tsx`** — butonlar `Button` atomundan geliyor (değişmez); glyph
  span'leri `c-ico-undo/x/heart`; satır `flex justify-center gap-5 flex-none`.
- [ ] **Step 3: `VenueDeck.tsx`** — `a-deck` → `relative h-[27.5rem] flex-none` (440px), kart
  konum/transform inline stilleri utility'ye (`absolute inset-0 …`), progress/kbd satırları:
  `a-kbd` → `ui.css` değerlerinden utility (26/24px → `min-w-[1.625rem] h-6 …`, box-shadow
  arbitrary).
- [ ] **Step 4: `DeckScreen.tsx`** — sayfa temizliği: `<Page variant="deck">`; başlık satırı
  (Wordmark + sayaç + Hepsini gör) sayfada utility taşıyamayacağı için `molecules/DeckHeader.tsx`
  olur (props: `current`, `total`, `onSeeAll`; Wordmark'ı içerir; sayaç `text-[0.75rem] text-ink2
  tabular-nums font-bold`, buton mevcut `Button kind="white"` küçük varyant değerleriyle).
  Liste/bitti durumlarındaki `style` kalıntıları `Heading size="md"`, `Note center`,
  `Page center` ile karşılanır.
- [ ] **Step 5: Görsel doğrulama** — W3 artboard'u (`data-screen-label="Deste web"`) ile
  karşılaştır; kart yığını, aksiyon butonları, kbd chip'leri birebir.
- [ ] **Step 6: Gate + INDEX + Commit (kullanıcı)** — `feat(web): w3 tailwind migrasyonu`

---

### Task 6: W4/Runoff migrasyonu — RunoffList, ViralCard + RunoffScreen/ResultScreen

**Files:**
- Modify: `src/components/organisms/RunoffList.tsx`, `src/components/molecules/ViralCard.tsx`
- Modify: `src/pages/RunoffScreen.tsx`, `src/pages/ResultScreen.tsx`

- [ ] **Step 1: `RunoffList.tsx`** — seçim sarmalayıcı buton (`a-pick-btn` reset'i) utility'ye:
  `appearance-none bg-transparent border-0 p-0 m-0 text-left cursor-pointer rounded-card
  focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px]
  disabled:cursor-default` (+ ui.css'te başka ne varsa). Kart/`a-row-*` sınıfları Task 5'te
  VenueCard'a taşındıysa yalnız kalanlar çevrilir.
- [ ] **Step 2: `ViralCard.tsx`** — `a-card--flame` → `bg-flame-wash border-[#f6c6d2] relative`
  (+ `a-card` tabanı), sticker konumu `absolute right-3 -top-3`, CTA `min-h-[2.875rem] mt-3`.
- [ ] **Step 3: Sayfalar** — `RunoffScreen`: `<Page>`; `ResultScreen`: `<Page variant="result">`;
  konfeti `a-cel` span'leri sayfada duruyorsa `molecules/Confetti.tsx`'e iner (üç nokta,
  ui.css `.a-cel/.a-cel--sq` + inline konum değerleri utility olarak; `aria-hidden`).
  Kazanan başlık/overline/sticker kompozisyonu utility taşıyorsa `molecules/WinnerCard.tsx`'e
  toplanır (Sticker + VenueCard `hideTitle` + maps `<a>` — `<a>` stilini `Button`un link
  varyantı YOKSA `a`-tabanlı küçük atom `LinkButton.tsx` ekleyerek çöz: `Button` base zinciriyle
  aynı utility'ler, `<a>` elemanı, props `href/kind/children`).
- [ ] **Step 4: Görsel doğrulama** — W4 (`Web Ekranlar v2.dc.html` "Sonuç") ve `07 Runoff`
  (`Mobil Ekranlar v2.dc.html`) artboard'larıyla karşılaştır.
- [ ] **Step 5: Gate + INDEX + Commit (kullanıcı)** — `feat(web): w4-runoff tailwind migrasyonu`

---

### Task 7: Eski CSS'in silinmesi + kapanış gate'leri

**Files:**
- Delete: `frontend/web/src/styles/tokens.css`, `frontend/web/src/styles/ui.css`
- Modify: `frontend/web/src/main.tsx` (iki eski import satırı silinir)

- [ ] **Step 1: Sil + import temizle.**
- [ ] **Step 2: Gate zinciri** (hepsi zorunlu, sırayla; Node 22 PATH önekiyle):

```bash
rtk pnpm --filter @bumpinto/web exec tsc --noEmit          # temiz
rtk pnpm test:web                                          # 2 dosya / 5 test yeşil
rtk pnpm build:web                                         # başarılı
rtk pnpm build:web:preprod                                 # başarılı
grep -rl "api.preprod.bumpinto.app" frontend/web/dist/assets/   # en az 1 dosya
grep -rEn '"[^"]*\ba-[a-z]' frontend/web/src               # BOŞ (eski sınıf kalmadı)
grep -rn 'style=' frontend/web/src/pages frontend/web/src/App.tsx  # BOŞ
grep -rn "localStorage\|sessionStorage" frontend/web/src   # BOŞ
```

  Ayrıca Task 1 Step 7'deki hard-coded Türkçe metin taraması TEKRAR koşulur (Task 3-6
  bileşenlere dokundu) — kullanıcıya görünen literal sıfır olmalı.

- [ ] **Step 3: Ekran turu** — beş ekran (W1, W2, W3, W4, Runoff) ilgili artboard'la son kez
  karşılaştırılır; `?lng=en` ve `?lng=nl` ile dil değişimi ve taşma kontrolü yapılır
  (kırılım varsa çeviri kısaltılır, spec §7; rapora yazılır).
- [ ] **Step 4: INDEX'te Plan 8'i `done` yap + Commit (kullanıcı)** —
  `feat(web): eski css kaldirildi, tailwind migrasyonu tamam`

---

## Plan sonu doğrulaması

- [ ] Spec §3-5 eşlemesi: @theme token'ları rem'de; utility yalnız `components/` altında;
  tr.json kod literalleriyle birebir; en/nl `_status` işaretli; dil seçici UI YOK.
- [ ] Spec §6 gate'lerinin tamamı Task 7 Step 2-3'te koşuldu ve yeşil.
- [ ] `c-*` sınıf listesi spec §4'tekiyle sınırlı (+ raporlanmış zorunlu eklemeler).
- [ ] Kullanıcıya bildir: en/nl çevirileri + varsa kısaltmalar tasarım onayı bekliyor (spec §8).
