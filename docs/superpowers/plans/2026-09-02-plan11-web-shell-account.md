# Plan 11: Web — Kabuk, Kimlik, Hesap Ekranları, Dil Menüsü, İki Bölgeli Yerleşim

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web uygulamasını "davetli sayfası"ndan "tam ürün"e taşımanın ilk yarısı: üst çubuklu uygulama kabuğu, masaüstünde iki bölgeli yerleşim (mevcut Katıl/Bekle/Deste/Runoff/Karar ekranları dahil), Google ile web girişi ve oturum kimliği, Landing, Oturumlar, Profil ve hata sayfaları, dil menüsü (TR/EN/NL, varsayılan **en**, `?lng=`, sunucu tercihi, `<html lang>`). Harita ve oturum tipi/Mekanlar akışı **W-4**'te.

**Architecture:** Mevcut mimari kural korunur: utility sınıfları YALNIZ `components/` altında, `pages/` salt kompozisyon; HTTP yalnız `lib/api` (+ store'lar); Zustand. Yeni parçalar: `store/authStore` (kimlik + `/api/me`), `organisms/AppShell` (react-router layout route: TopBar + `<Outlet/>`), `molecules/TwoZone` (≥1024 iki bölge, altında tek sütun), `molecules/LangMenu`, `molecules/AvatarMenu`, `molecules/GoogleSignIn` (Google Identity Services render'ı). Spec: `docs/superpowers/specs/2026-09-01-web-parity-design.md` §3–§6 (BAĞLAYICI).

**Tech Stack:** React 18 + Vite 6 + react-router-dom 7, Tailwind v4 (`lg:` kırılımı = 1024px), zustand 5, react-i18next, `@phosphor-icons/react` (ikon seti; DS §09), Google Identity Services (`https://accounts.google.com/gsi/client`), vitest + RTL. Node 22 zorunlu.

---

## UI Kaynağı: Claude Design (BAĞLAYICI)

Her UI görevine başlarken artboard'u **güncel** hâlinden oku (`mcp__claude_design__read_file`,
project `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, path `Web Ekranlar v2.dc.html`; bloğu
`data-screen-label` ile bul). Token/bileşen: project `b536b3aa-8945-4865-b7e5-e693f8d5a588`,
`Design System v2.dc.html` — bölümler **06 Uygulama kabuğu**, **07 Yerleşim**, **09 İkon seti**.
Mikro-kopya artboard'dan birebir `tr.json`'a; en/nl çevirisi ajan tarafından, `_status` işareti
korunur. Tasarımda olmayan durum icat edilmez → INDEX `blocked` + kullanıcıya sor.

| Artboard (`data-screen-label`) | Sayfa / bileşen |
|---|---|
| `Landing 1280`, `Landing 390` | `pages/Landing.tsx` |
| `Oturumlar 1280`, `Oturumlar 390 boş` | `pages/SessionsPage.tsx` |
| `Profil 1280`, `Profil 390` | `pages/ProfilePage.tsx` |
| `Hata 1280 bulunamadı`, `Hata 390 süresi dolmuş`, `Hata 390 404` | `pages/ErrorPage.tsx` |
| `Katıl 1280`, `Katıl 390 izin reddi` | `pages/JoinForm.tsx` (harita hariç → W-4) |
| `Bekle 1280`, `Bekle 390 hata` | `pages/WaitingRoom.tsx` (harita hariç) |
| `Deste 1280`, `Deste 390`, `Deste bitti 1280`, `Liste modu 390` | `pages/DeckScreen.tsx` |
| `Runoff 1280`, `Runoff 390 kilitli` | `pages/RunoffScreen.tsx` |
| `Karar 1280`, `Karar 390 davetli` | `pages/ResultScreen.tsx` (harita hariç) |
| `Katıl EN 1280`, `Katıl NL 1280` | en/nl onay referansı (Task 2) |

**Bilinçli sapma (kullanıcıya rapor edilir):** "Google ile devam et" butonu Google Identity
Services'in kendi render'ıdır (`renderButton`, `shape: pill`, `text: continue_with`). GIS
politikası özel stillenmiş butonla ID token vermez; artboard'daki beyaz pill'in yerine Google'ın
resmî pill'i gelir, sarmalayıcı alan artboard ölçüsündedir.

---

## Bu plana özel kurallar

- **INDEX güncelle**; **Git yazma YOK**. Komutlar repo kökünden, `rtk` ile.
- **Her shell'de önce:** `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"`.
- Utility yalnız `components/`; `pages/` içinde `className`/`style` YASAK (W-2 kuralı; kapanış gate'i `grep -rn "className=\|style=" src/pages` → boş).
- Tüm kullanıcı metni `t()`/`<Trans>`; tr = artboard kopyası birebir.
- İkonlar `@phosphor-icons/react` (regular); emoji yasak.
- Görev kapanış gate'i: `rtk pnpm --filter @bumpinto/web exec tsc --noEmit && rtk pnpm test:web` yeşil.
- **Backend bağımlılığı:** Task 1–3 backend'den bağımsız (W-2 ✓). Task 4–6 **B-6 `done`** ister (`/api/me`, `/api/sessions`, `/api/auth/logout`, `/api/sessions/{slug}/preview`); Task 4 Step 1 codegen'in güncel olduğunu doğrular.

---

### Task 1: Kabuk — `TopBar`, `LangMenu`, `AvatarMenu`, `AppShell`, `TwoZone`, `Page` genişliği, ikon paketi

**Files:**
- Modify: `frontend/web/package.json` (`@phosphor-icons/react`)
- Modify: `frontend/web/src/components/atoms/Page.tsx`
- Create: `frontend/web/src/components/molecules/TwoZone.tsx`
- Create: `frontend/web/src/components/molecules/LangMenu.tsx`
- Create: `frontend/web/src/components/molecules/AvatarMenu.tsx`
- Create: `frontend/web/src/components/molecules/TopBar.tsx`
- Create: `frontend/web/src/components/organisms/AppShell.tsx`
- Create: `frontend/web/src/store/authStore.ts` (bu görevde yalnız tip + `anon` iskeleti; `load/login/logout` Task 4)
- Modify: `frontend/web/src/components/index.ts`
- Create: `frontend/web/src/components/molecules/TopBar.test.tsx`
- Create: `frontend/web/src/components/molecules/LangMenu.test.tsx`

- [ ] **Step 1: Bağımlılık** — Run: `rtk pnpm --filter @bumpinto/web add @phosphor-icons/react` → hatasız.

- [ ] **Step 2: Failing tests** — `TopBar.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "../../store/authStore";
import TopBar from "./TopBar";

function renderBar() {
  return render(
    <MemoryRouter>
      <TopBar />
    </MemoryRouter>,
  );
}

describe("TopBar", () => {
  it("anonim: yalnız wordmark ve dil menüsü", () => {
    useAuthStore.setState({ status: "anon", me: null });
    renderBar();
    expect(screen.getByText("BumpInto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dil seç/i })).toBeInTheDocument();
    expect(screen.queryByText("Oturumlar")).not.toBeInTheDocument();
  });

  it("giriş yapmış: Oturumlar bağlantısı ve avatar menüsü", () => {
    useAuthStore.setState({
      status: "signed",
      me: { id: "u1", email: "m@x.test", displayName: "Mehmet", language: null,
        stats: { sessionsHosted: 0, friendsMet: 0 } },
    });
    renderBar();
    expect(screen.getByRole("link", { name: "Oturumlar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hesap menüsü/i })).toBeInTheDocument();
  });
});
```

`LangMenu.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import i18n from "../../i18n";
import LangMenu from "./LangMenu";

describe("LangMenu", () => {
  it("English seçince dil ve <html lang> değişir", async () => {
    render(
      <MemoryRouter>
        <LangMenu />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /dil seç/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "English" }));
    expect(i18n.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    await i18n.changeLanguage("tr"); // diğer testler tr bekler
  });
});
```

- [ ] **Step 3: FAIL doğrula** — Run: `rtk pnpm test:web -- src/components/molecules` (pnpm 11: `rtk pnpm --filter @bumpinto/web test --run src/components/molecules`) → modül bulunamadı.

- [ ] **Step 4: authStore iskeleti** — `store/authStore.ts`

```typescript
import type { MeResponse } from "@bumpinto/shared";
import { create } from "zustand";

/** Kimlik yalnız HttpOnly cookie'de; burada sadece "kimim" görünümü tutulur (bellek). */
export type AuthStatus = "unknown" | "anon" | "signed";

type AuthState = {
  status: AuthStatus;
  me: MeResponse | null;
  load: () => Promise<void>;
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setMe: (me: MeResponse) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: "unknown",
  me: null,
  load: async () => {}, // Task 4
  login: async () => {}, // Task 4
  logout: async () => {}, // Task 4
  setMe: (me) => set({ me, status: "signed" }),
}));
```

`MeResponse` tipi B-6 codegen'inden gelir; B-6 henüz `done` değilse `frontend/shared/src/api.ts`'e geçici olarak eklenmez — bunun yerine bu görevde `type MeResponse` yerine yerel `AuthMe` tipi tanımlanır ve Task 4'te `MeResponse` ile değiştirilir:

```typescript
export type AuthMe = {
  id: string; email: string; displayName: string; language: string | null;
  stats: { sessionsHosted: number; friendsMet: number };
};
```

- [ ] **Step 5: Page + TwoZone**

`atoms/Page.tsx` — mobilde mevcut 480px sütun, `lg`'de 1120px kap:

```tsx
/* Kaynak: DS v2 §07 Yerleşim — içerik max 1120px, yatay boşluk 24/48px */
import type { ReactNode } from "react";

const variants = {
  default: "gap-[0.9375rem] px-[1.125rem] pt-5 pb-8 lg:gap-[1.375rem] lg:px-12 lg:pt-[2.125rem] lg:pb-11",
  deck: "gap-0 px-[1.125rem] pt-4 pb-0 lg:gap-4 lg:px-12 lg:pt-[2.125rem] lg:pb-11",
  result: "gap-3.5 px-[1.125rem] pt-5 pb-8 relative lg:gap-[1.375rem] lg:px-12 lg:pt-[2.125rem] lg:pb-11",
};

export default function Page(props: {
  variant?: keyof typeof variants;
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={[
        "mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[30rem] flex-col lg:max-w-[70rem]",
        variants[props.variant ?? "default"],
        props.center ? "justify-center" : "",
      ]
        .join(" ")
        .trim()}
    >
      {props.children}
    </main>
  );
}
```

`molecules/TwoZone.tsx`:

```tsx
/* Kaynak: DS v2 §07 — ≥1024 grid 58fr 42fr gap 40; harita ekranlarında 42/58. */
import type { ReactNode } from "react";

const cols = {
  default: "lg:grid-cols-[58fr_42fr]",
  map: "lg:grid-cols-[42fr_58fr]",
};

export default function TwoZone(props: {
  left: ReactNode;
  right: ReactNode;
  variant?: keyof typeof cols;
  /** Landing: iki bölge dikeyde ortalanır. */
  centerY?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col gap-4 lg:grid lg:gap-10",
        cols[props.variant ?? "default"],
        props.centerY ? "lg:items-center" : "lg:items-start",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-col gap-4">{props.left}</div>
      <div className="flex min-w-0 flex-col gap-4">{props.right}</div>
    </div>
  );
}
```

- [ ] **Step 6: LangMenu**

```tsx
/* Kaynak: DS v2 §06 — .lg pill + .pop popover; artboard TR ▾ */
import { CaretDown, Check, Globe } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../lib/api";

export const LANGUAGES = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
] as const;

const PILL =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line2 " +
  "bg-white px-3 font-head text-[0.8125rem] font-bold text-ink";
const POP =
  "absolute right-0 top-[2.875rem] z-20 flex w-[11.75rem] flex-col gap-0.5 rounded-2xl " +
  "border border-line bg-white p-1.5 shadow-sh2";
const ROW = "flex cursor-pointer items-center justify-between rounded-[0.625rem] px-3 py-2.5 text-[0.875rem] font-semibold";

export default function LangMenu() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [, setParams] = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function choose(code: string) {
    setOpen(false);
    await i18n.changeLanguage(code);
    // Anonim: seçim URL'de yaşar (storage'a yazma yok). Giriş varsa sunucuda da tutulur.
    setParams((p) => { p.set("lng", code); return p; }, { replace: true });
    if (status === "signed") await api.updateMe({ language: code });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={PILL}
        aria-label={t("shell.langAria")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Globe size={15} className="text-ink2" aria-hidden />
        {i18n.language.slice(0, 2).toUpperCase()}
        <CaretDown size={15} className="text-ink2" aria-hidden />
      </button>
      {open && (
        <div className={POP} role="menu">
          {LANGUAGES.map((l) => {
            const on = i18n.language.startsWith(l.code);
            return (
              <button
                key={l.code}
                type="button"
                role="menuitem"
                className={`${ROW} ${on ? "bg-flame-wash text-flame-deep" : "text-ink"}`}
                onClick={() => void choose(l.code)}
              >
                {l.label}
                {on && <Check size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

`api.updateMe` B-6'dan gelir; B-6 `done` değilse bu satırı `// B-6` yorumuyla Task 6'ya kadar `if (status === "signed") { /* Task 6 */ }` bırak.

- [ ] **Step 7: AvatarMenu + TopBar + AppShell**

`molecules/AvatarMenu.tsx`:

```tsx
/* Kaynak: DS v2 §06 — avatar menüsü (Profil, Çıkış yap) */
import { SignOut, UserCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../atoms";

const POP =
  "absolute right-0 top-[2.875rem] z-20 flex w-[11.75rem] flex-col gap-0.5 rounded-2xl " +
  "border border-line bg-white p-1.5 shadow-sh2";
const ROW = "flex cursor-pointer items-center gap-2 rounded-[0.625rem] px-3 py-2.5 text-[0.875rem] font-semibold text-ink no-underline";

export default function AvatarMenu() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.me);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!me) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="cursor-pointer rounded-full"
        aria-label={t("shell.accountAria")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={me.displayName} ring />
      </button>
      {open && (
        <div className={POP} role="menu">
          <Link role="menuitem" className={ROW} to="/profile" onClick={() => setOpen(false)}>
            <UserCircle size={16} aria-hidden />
            {t("shell.profile")}
          </Link>
          <button
            type="button"
            role="menuitem"
            className={ROW}
            onClick={() => void logout().then(() => navigate("/"))}
          >
            <SignOut size={16} aria-hidden />
            {t("shell.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
```

`molecules/TopBar.tsx`:

```tsx
/* Kaynak: DS v2 §06 Uygulama kabuğu — 64px masaüstü / 56px mobil; anonimde yalnız wordmark + dil */
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Wordmark } from "../atoms";
import AvatarMenu from "./AvatarMenu";
import LangMenu from "./LangMenu";

const BAR =
  "sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line " +
  "bg-[rgba(255,251,246,0.92)] px-[1.125rem] backdrop-blur lg:h-16 lg:px-12";
const NAV_LINK = "rounded-full px-3 py-2 font-head text-[0.9375rem] font-bold no-underline";

export default function TopBar() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  return (
    <header className={BAR}>
      <Link to="/" className="no-underline text-ink">
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-2.5">
        {status === "signed" && (
          <NavLink
            to="/sessions"
            className={({ isActive }) =>
              `${NAV_LINK} ${isActive ? "bg-[#f4eee6] text-ink" : "text-ink2"}`
            }
          >
            {t("shell.sessions")}
          </NavLink>
        )}
        <LangMenu />
        {status === "signed" && <AvatarMenu />}
      </nav>
    </header>
  );
}
```

`organisms/AppShell.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import TopBar from "../molecules/TopBar";

/** react-router layout route: her sayfa üst çubuğun altında render olur. */
export default function AppShell() {
  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}
```

`components/index.ts`'e `TwoZone`, `LangMenu`, `AvatarMenu`, `TopBar`, `AppShell` export'larını ekle. `tr.json` `shell` bloğu (Task 2'de tamamı; testin geçmesi için şimdi ekle):

```json
  "shell": {
    "sessions": "Oturumlar",
    "profile": "Profil",
    "logout": "Çıkış yap",
    "langAria": "Dil seç",
    "accountAria": "Hesap menüsü"
  }
```

- [ ] **Step 8: `<html lang>` + başlık** — `src/i18n/index.ts` sonuna:

```typescript
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  document.title = i18n.t("common.title");
});
```

`tr.json` `common.title`: "BumpInto — ortada buluşun". (`fallbackLng` değişikliği Task 2'de.)

- [ ] **Step 9: PASS + gate** — Run: `rtk pnpm --filter @bumpinto/web test --run` → yeşil; `tsc --noEmit` yeşil.

- [ ] **Step 10: INDEX güncelle + Commit (kullanıcı)** — `feat(web): kabuk (TopBar, LangMenu, AvatarMenu, AppShell), TwoZone, Page genisligi`

---

### Task 2: i18n revizyonu — varsayılan `en`, yeni anahtarlar, en/nl çevirileri

**Files:**
- Modify: `frontend/web/src/i18n/index.ts`
- Modify: `frontend/web/src/i18n/locales/tr.json`, `en.json`, `nl.json`
- Modify: `frontend/web/src/test-setup.ts` (tr sabitleme kalır)
- Modify: `frontend/web/index.html` (`lang="en"`, `<title>` en)

- [ ] **Step 1: `i18n/index.ts`** — `fallbackLng: "en"`; algılama `["querystring", "navigator"]` kalır (sunucu tercihi `authStore.load` uygular, Task 4). `supportedLngs: ["tr", "en", "nl"]`, `nonExplicitSupportedLngs: true` ekle (navigator `nl-NL` → `nl`).

- [ ] **Step 2: tr.json — yeni bloklar** (artboard kopyası birebir; mevcut bloklar korunur, `session.*` hata metinleri `error.*`'a taşınmaz, kullanılır):

```json
  "common": { "wordmark": "BumpInto", "title": "BumpInto — ortada buluşun" },
  "landing": {
    "title": "<0>Ortada</0><1/>buluşalım.",
    "copy": "Sen Den Bosch'tasın, o Someren'de. Dert değil — adil orta noktayı ve oradaki en iyi mekânı birlikte bulun.",
    "hand": "kavga yok, kaydırma var →",
    "google": "Google ile devam et",
    "terms": "Devam edersen <0>Koşulları</0> kabul etmiş olursun.",
    "noClientId": "Google girişi bu ortamda yapılandırılmadı.",
    "step1": "Buluşmayı kur", "step1Copy": "Ne yapacağınızı ve nerede olduğunu söyle.",
    "step2": "Linki at", "step2Copy": "Arkadaşların uygulama indirmeden, hesapsız katılır.",
    "step3": "Kaydır, karar çıksın", "step3Copy": "Ortadaki mekanları herkes oylar; kesişim kazanır."
  },
  "sessions": {
    "title": "Nereye<0/>gidiyoruz?",
    "new": "Yeni buluşma kur",
    "open": "Açık buluşmalar",
    "past": "Geçmiş buluşmalar",
    "goDeck": "Desteye git", "goLobby": "Lobiye git", "goVenues": "Mekanlara git", "goResult": "Sonucu gör",
    "went": "Gidildi", "full": "Doldu", "noDecision": "karar çıkmadı",
    "cards": "{{count}} kart", "people": "{{count}} kişi",
    "retention": "Buluşmalar 24 saatte kapanır, 30 günde silinir.",
    "emptyTitle": "Henüz buluşma yok",
    "emptyCopy": "İlkini kur, linki at — konumlar toplanınca deste kendiliğinden gelir.",
    "emptyHand": "30 saniye sürer, söz",
    "status": {
      "COLLECTING": "konumlar toplanıyor", "SUGGESTING": "mekanlar bulunuyor",
      "BROWSING": "mekanlar hazır", "SWIPING": "deste açık", "RUNOFF": "son düzlük",
      "DECIDED": "karar verildi", "EXPIRED": "süresi doldu"
    },
    "solo": "Bireysel"
  },
  "activity": {
    "COFFEE": "Kahve", "FOOD": "Yemek", "BAR": "Bar", "WALK": "Yürüyüş", "HIKE": "Doğa yürüyüşü",
    "SWIM": "Yüzme", "FITNESS": "Fitness", "ADVENTURE": "Macera", "CINEMA": "Sinema",
    "MUSEUM": "Müze", "ART": "Sanat", "ACTIVITY": "Bowling", "GAMES": "Oyun",
    "THEME_PARK": "Tema parkı", "NIGHTLIFE": "Gece hayatı",
    "group": { "FOOD_DRINK": "Yeme-içme", "ACTIVE": "Hareket", "CULTURE": "Kültür", "FUN": "Eğlence" }
  },
  "profile": {
    "title": "Profil",
    "googleLogin": "Google ile giriş",
    "hosted": "buluşma kuruldu", "friends": "dost görüldü",
    "prefs": "Tercihler",
    "defaultLocation": "Varsayılan konum",
    "defaultActivity": "Varsayılan etkinlik",
    "language": "Dil", "languageNote": "hesabında tutulur",
    "unset": "Ayarlanmadı",
    "retention": "Buluşmalar 24 saatte kapanır, 30 günde silinir. Katılanlardan yalnızca ad + konum tutulur — o kadar.",
    "langHint": "Davet linkiyle gelenler kendi tarayıcı dilini görür; senin seçimin yalnız senin hesabın için.",
    "logout": "Çıkış yap"
  },
  "error": {
    "hmm": "Hmm.",
    "notFoundHint": "Linki atan kişiden yeniden iste; harf hatası olabilir.",
    "expiredHint": "Buluşmalar 24 saatte kapanır. Yenisi için kuran kişiye yaz.",
    "lostTitle": "Burada bir şey yok.",
    "lostCopy": "Aradığın sayfa taşınmış ya da hiç olmamış olabilir.",
    "home": "Ana sayfa"
  }
```

Ayrıca mevcut bloklara ek anahtarlar (Task 3 kullanır):

```json
  "join": { "...": "...", "whoHere": "Kimler var", "readyCount": "{{ready}} / {{total}} hazır",
            "whoCopy": "{{host}} ve arkadaşları hazır. Sıra sende — konumunu at, orta nokta belli olsun.",
            "hand": "ortada buluşuyoruz, adil olsun diye →",
            "invitedBy": "<0>{{host}}</0> seni buluşmaya çağırdı",
            "joinedCount": "{{count}} kişi katıldı",
            "locAuto": "Mevcut konumun", "locAutoHint": "{{label}} · otomatik alındı",
            "locOther": "Başka bir şehir ya da adres yaz", "locRetry": "Konumumu tekrar dene",
            "privacy": "Konumun bu buluşma için kullanılır ve gruba haritada yaklaşık gösterilir." },
  "deck": { "...": "...", "liked": "Beğendiklerin", "likedN": "{{count}} mekan",
            "likedNote": "Beğeni seni bağlamaz — bitirince listeden düzeltebilirsin. Diğerlerinin beğenileri sonuçta belli olur.",
            "undoKey": "geri al", "cardsOf": "{{current}} / {{total}} kart",
            "finishedCopy": "{{count}} mekanı beğendin. Herkes bitirince sonuç açıklanır.",
            "backToDeck": "Desteye dön", "listMeta": "{{total}} mekan · {{liked}} beğeni",
            "progressDone": "{{names}} bitirdi.", "progressWaiting": "{{names}} hâlâ kaydırıyor; herkes bitirince sonuç açıklanır." },
  "runoff": { "...": "...", "who": "Kim seçti", "choosing": "Seçiyor…", "lockedBadge": "Kilitledi",
              "lockedTitle": "Seçimin kilitli", "lockedCopy": "diğerlerini bekliyoruz — sonuç herkes seçince açıklanır",
              "countOf": "{{done}} / {{total}}" },
  "result": { "...": "...", "overlineAll": "Ortak nokta · hepiniz aynı yeri beğendi",
              "likedAll": "{{done}}/{{total}} beğendi!", "everyone": "herkes burada buluşuyor",
              "yourWay": "Senin yolun", "share": "Gruba paylaş", "openNow": "şu an açık",
              "viralHostTitle": "Bir sonrakini de sen mi kuracaksın?", "viralHostCta": "Yeni buluşma kur" }
```

`join.privacy` değeri **değişir** (spec §5 gizlilik notu). `"..."` satırları "mevcut anahtarlar aynen kalır" demektir; dosyaya yazılmaz.

- [ ] **Step 3: en/nl** — Aynı anahtarları `en.json`/`nl.json`'a çevir (`_status` işareti kalır). Katıl EN/NL artboard'larındaki metinler **birebir** (`Mehmet invited you to meet up`, `Who's here`, `Use my current location`, `Your location is used only for this meetup.` → yeni gizlilik metni EN: `Your location is used for this meetup and shown to the group on the map, approximately.`; NL: `Je locatie wordt voor deze afspraak gebruikt en bij benadering aan de groep op de kaart getoond.`). Etkinlik ve grup adları EN/NL 390 artboard'larından (`Food & drink / Active / Culture / Fun`, `Eten & drinken / Actief / Cultuur / Uitgaan`; `Theme park`/`Pretpark`, `Nightlife`/`Nachtleven`, `Games`, `Bowling`/`Bowlen`).

- [ ] **Step 4: index.html** — `<html lang="en">`, `<title>BumpInto — meet in the middle</title>` (SPA yüklenince `languageChanged` günceller).

- [ ] **Step 5: Taşma taraması** — Run: `rtk pnpm --filter @bumpinto/web test --run` yeşil; ardından `?lng=en` ve `?lng=nl` ile `rtk pnpm dev:web` altında Katıl ekranını 390 ve 1280'de gözle karşılaştır (artboard `Katıl EN 1280` / `Katıl NL 1280`). Kırılım yaratan çeviri varsa çeviri kısaltılır (tasarım değişmez), `_status` notuna yazılır.

- [ ] **Step 6: INDEX güncelle + Commit (kullanıcı)** — `feat(web-i18n): fallback en, yeni anahtarlar, en/nl`

---

### Task 3: Mevcut oturum ekranlarını iki bölgeye taşıma (Katıl, Bekle, Deste, Runoff, Karar)

**Files:**
- Create: `frontend/web/src/components/molecules/WhoIsHere.tsx`
- Create: `frontend/web/src/components/molecules/SessionHeader.tsx`
- Create: `frontend/web/src/components/molecules/LikedList.tsx`
- Create: `frontend/web/src/components/molecules/DeckProgressNote.tsx`
- Create: `frontend/web/src/components/molecules/FinishedCard.tsx`
- Create: `frontend/web/src/components/molecules/RunoffStatus.tsx`
- Create: `frontend/web/src/components/molecules/TravelList.tsx`
- Create: `frontend/web/src/components/molecules/ShareButton.tsx`
- Modify: `frontend/web/src/components/molecules/JoinIntro.tsx` (host adı + kişi sayısı props)
- Modify: `frontend/web/src/components/molecules/JoinFormFields.tsx` (konum alınmış hâl, tekrar dene, "Başka adres yaz")
- Modify: `frontend/web/src/components/molecules/DeckHeader.tsx` (oturum adı + sayaç; Wordmark kalkar)
- Modify: `frontend/web/src/components/molecules/ViralCard.tsx` (host/davetli varyantı)
- Modify: `frontend/web/src/components/organisms/RunoffList.tsx` → yalnız finalist seçimi (CTA `RunoffStatus`'a taşınır)
- Modify: `frontend/web/src/components/organisms/VenueDeck.tsx` (Progress kaldırılır — başlığa taşınır; `⌫ geri al` ipucu)
- Modify: `frontend/web/src/pages/JoinForm.tsx`, `WaitingRoom.tsx`, `DeckScreen.tsx`, `RunoffScreen.tsx`, `ResultScreen.tsx`
- Modify: `frontend/web/src/store/sessionStore.ts` (`preview` alanı; katılmadan önce `api.preview` — B-6; B-6 yoksa `preview: null` ve `JoinIntro` genel metne düşer)
- Modify: `frontend/web/src/components/index.ts`
- Create: `frontend/web/src/components/molecules/LikedList.test.tsx`, `RunoffStatus.test.tsx`

Sayfalar `<Wordmark />` render etmeyi bırakır (kabukta). Her sayfa `Page` + `TwoZone`; mobilde `TwoZone` tek sütuna katlanır → artboard 390 kompozisyonu korunur (sol bölge önce, sağ bölge sonra; 390 artboard'larında sağ bölge içerikleri alt sırada).

- [ ] **Step 1: Failing tests**

`LikedList.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LikedList from "./LikedList";

describe("LikedList", () => {
  it("yalnız beğenilen mekanları listeler ve sayar", () => {
    render(
      <LikedList
        venues={[
          { id: "a", name: "Café Berlage", rating: 4.6, travelMinutes: {} },
          { id: "b", name: "Koffie Top", rating: 4.4, travelMinutes: {} },
        ]}
        liked={{ a: true, b: false }}
      />,
    );
    expect(screen.getByText("1 mekan")).toBeInTheDocument();
    expect(screen.getByText("Café Berlage")).toBeInTheDocument();
    expect(screen.queryByText("Koffie Top")).not.toBeInTheDocument();
  });
});
```

`RunoffStatus.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RunoffStatus from "./RunoffStatus";

const people = [
  { id: "p1", displayName: "Mehmet", host: true, hasLocation: true, deckDone: true },
  { id: "p2", displayName: "Ayşe", host: false, hasLocation: true, deckDone: true },
];

describe("RunoffStatus", () => {
  it("kilitleyenleri rozetler, sayacı gösterir, kilit butonu seçime bağlı", () => {
    render(<RunoffStatus participants={people} votedIds={["p2"]} choice={null} sent={false}
      sending={false} onLock={vi.fn()} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("Kilitledi")).toBeInTheDocument();
    expect(screen.getByText("Seçiyor…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seçimimi kilitle" })).toBeDisabled();
  });

  it("gönderildiyse kilitli kartı gösterir", () => {
    render(<RunoffStatus participants={people} votedIds={["p1", "p2"]} choice="v" sent
      sending={false} onLock={vi.fn()} />);
    expect(screen.getByText("Seçimin kilitli")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seçimimi kilitle" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL doğrula** — Run: `rtk pnpm --filter @bumpinto/web test --run src/components/molecules` → modül yok.

- [ ] **Step 3: Molekül'ler**

`molecules/SessionHeader.tsx` (Deste/Runoff/Mekanlar başlığı — artboard `.hdr`):

```tsx
/* Kaynak: artboard Deste 1280 .hdr — oturum adı + meta + sağ aksiyon */
import type { ReactNode } from "react";

export default function SessionHeader(props: { title: string; meta?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[1.5rem]">{props.title}</h2>
        {props.meta && <span className="text-[0.75rem] text-ink2 tabular-nums">{props.meta}</span>}
      </div>
      {props.action}
    </div>
  );
}
```

`molecules/WhoIsHere.tsx` (Katıl sağ bölge — önizleme verisi; katılmadan önce kişi listesi YOK, yalnız sayı ve host adı):

```tsx
/* Kaynak: artboard Katıl 1280 sağ üst kart "Kimler var" */
import { useTranslation } from "react-i18next";
import { Avatar, HandNote } from "../atoms";

export default function WhoIsHere(props: { hostName: string | null; count: number }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-[1.125rem_1.25rem] shadow-sh1">
        <div className="flex items-center justify-between">
          <p className="m-0 text-[0.6875rem] font-bold tracking-[0.11em] text-ink3 uppercase">
            {t("join.whoHere")}
          </p>
          <span className="text-[0.75rem] text-ink2 tabular-nums">{t("join.joinedCount", { count: props.count })}</span>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="flex gap-1.5">
            {props.hostName && <Avatar name={props.hostName} ring />}
            {Array.from({ length: Math.max(0, props.count - 1) }).map((_, i) => (
              <Avatar key={i} name="?" index={i + 1} waiting />
            ))}
          </div>
          <span className="text-[0.8125rem] leading-[1.45] text-ink2">
            {t("join.whoCopy", { host: props.hostName ?? "" })}
          </span>
        </div>
      </div>
      <HandNote>{t("join.hand")}</HandNote>
    </>
  );
}
```

`molecules/LikedList.tsx`:

```tsx
/* Kaynak: artboard Deste 1280 sağ bölge "Beğendiklerin" kartı */
import { Check } from "@phosphor-icons/react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";

export default function LikedList(props: { venues: VenueDto[]; liked: Record<string, boolean> }) {
  const { t } = useTranslation();
  const rows = props.venues.filter((v) => v.id && props.liked[v.id]);
  return (
    <div className="rounded-card border border-line bg-card py-1 shadow-sh1">
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <p className="m-0 text-[0.6875rem] font-bold tracking-[0.11em] text-ink3 uppercase">{t("deck.liked")}</p>
        <span className="text-[0.75rem] text-ink2 tabular-nums">{t("deck.likedN", { count: rows.length })}</span>
      </div>
      {rows.map((v, i) => (
        <Fragment key={v.id}>
          {i > 0 && <div className="mx-4 h-px bg-line" />}
          <div className="flex items-center gap-3 px-4 py-[0.8125rem]">
            <div className="flex flex-1 flex-col gap-0.5">
              <h3>{v.name}</h3>
              {v.rating != null && <span className="text-[0.75rem] text-ink2">★ {v.rating}</span>}
            </div>
            <span className="flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full bg-[image:var(--grad)] text-white" aria-hidden>
              <Check size={14} />
            </span>
          </div>
        </Fragment>
      ))}
      <div className="mx-4 h-px bg-line" />
      <p className="px-4 py-3 text-[0.75rem] text-ink2">{t("deck.likedNote")}</p>
    </div>
  );
}
```

`molecules/DeckProgressNote.tsx` (artboard "Ayşe bitirdi. Kerem hâlâ kaydırıyor…"):

```tsx
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Avatar } from "../atoms";

export default function DeckProgressNote(props: { participants: ParticipantDto[]; selfId?: string }) {
  const { t } = useTranslation();
  const voters = props.participants.filter((p) => p.hasLocation && !p.manual && p.id !== props.selfId);
  const done = voters.filter((p) => p.deckDone).map((p) => p.displayName);
  const waiting = voters.filter((p) => !p.deckDone).map((p) => p.displayName);
  if (voters.length === 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-card p-[0.875rem_1rem] shadow-sh1">
      <div className="flex">
        {voters.map((p, i) => (
          <span key={p.id} className={i > 0 ? "-ml-[0.5625rem]" : ""}>
            <Avatar name={p.displayName ?? "?"} index={i} waiting={!p.deckDone} />
          </span>
        ))}
      </div>
      <span className="text-[0.8125rem] leading-[1.45] text-ink2">
        {done.length > 0 && <strong className="text-ink">{t("deck.progressDone", { names: done.join(", ") })} </strong>}
        {waiting.length > 0 && t("deck.progressWaiting", { names: waiting.join(", ") })}
      </span>
    </div>
  );
}
```

`molecules/FinishedCard.tsx` (artboard `Deste bitti 1280` sol kart):

```tsx
import { Trans, useTranslation } from "react-i18next";
import { Button, Highlight, Sticker } from "../atoms";
import Confetti from "./Confetti";

export default function FinishedCard(props: {
  likedCount: number; sending: boolean; onSend: () => void; onList: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col items-center gap-4 rounded-card border border-line bg-card px-8 pt-11 pb-9 text-center shadow-sh1">
      <Confetti />
      <Sticker>{t("deck.finishedSticker")}</Sticker>
      <h1 className="mt-1.5 text-[2.5rem]">
        <Trans i18nKey="deck.finishedTitle" components={[<Highlight key="0" />]} />
      </h1>
      <p className="max-w-[30ch] text-ink2">{t("deck.finishedCopy", { count: props.likedCount })}</p>
      <div className="mt-2 flex w-full max-w-[21.25rem] flex-col gap-2.5">
        <Button type="button" onClick={props.onSend} disabled={props.sending}>{t("deck.send")}</Button>
        <Button type="button" kind="white" onClick={props.onList}>{t("deck.backToList")}</Button>
      </div>
    </div>
  );
}
```

(`deck.finishedSticker`: "Deste bitti!" — tr/en/nl'ye ekle.)

`molecules/RunoffStatus.tsx`:

```tsx
/* Kaynak: artboard Runoff 1280 sağ kart "Kim seçti" + Runoff 390 kilitli kartı */
import { Check } from "@phosphor-icons/react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Avatar, Badge, Button, Progress } from "../atoms";

export default function RunoffStatus(props: {
  participants: ParticipantDto[];
  votedIds: string[];
  choice: string | null;
  sent: boolean;
  sending: boolean;
  onLock: () => void;
}) {
  const { t } = useTranslation();
  const voters = props.participants.filter((p) => p.hasLocation && !p.manual);
  const done = voters.filter((p) => props.votedIds.includes(p.id!)).length;
  if (props.sent) {
    return (
      <div className="flex items-center gap-[0.6875rem] rounded-card border border-[#bfe5cf] bg-grass-wash p-[0.875rem_1rem]">
        <span className="c-check"><i /></span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.875rem] font-bold text-grass">{t("runoff.lockedTitle")}</span>
          <span className="text-[0.75rem] text-ink2">{t("runoff.lockedCopy")}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3.5 rounded-card border border-line bg-card p-[1.375rem_1.375rem_1.25rem] shadow-sh1">
      <div className="flex items-baseline justify-between">
        <p className="m-0 text-[0.6875rem] font-bold tracking-[0.11em] text-ink3 uppercase">{t("runoff.who")}</p>
        <span className="font-head text-[1.75rem] font-extrabold tabular-nums">
          {t("runoff.countOf", { done, total: voters.length })}
        </span>
      </div>
      <Progress value={done / Math.max(voters.length, 1)} />
      <div className="flex flex-col">
        {voters.map((p, i) => {
          const locked = props.votedIds.includes(p.id!);
          return (
            <Fragment key={p.id}>
              {i > 0 && <div className="h-px bg-line" />}
              <div className="flex items-center gap-3 py-2.5">
                <Avatar name={p.displayName ?? "?"} index={i} ring />
                <span className="flex-1 text-[0.875rem] font-semibold">{p.displayName}</span>
                {locked ? (
                  <Badge tone="grass"><Check size={12} aria-hidden />{t("runoff.lockedBadge")}</Badge>
                ) : (
                  <Badge tone="amber">{t("runoff.choosing")}</Badge>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
      <span className="text-[0.75rem] text-ink2">{t("runoff.note")}</span>
      <Button type="button" onClick={props.onLock} disabled={!props.choice || props.sending}>
        {t("runoff.lockIn")}
      </Button>
    </div>
  );
}
```

(`votedIds` katılımcıda değil `SessionView.runoffVotedParticipantIds`'te — B-5 Task 5 Step 5b.)

`molecules/TravelList.tsx` (artboard Karar 1280 sağ üst kart):

```tsx
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { Avatar } from "../atoms";

export default function TravelList(props: { venue: VenueDto; participants: ParticipantDto[]; selfId?: string }) {
  const { t } = useTranslation();
  const rows = props.participants.filter((p) => p.id && props.venue.travelMinutes?.[p.id] != null);
  return (
    <div className="rounded-card border border-line bg-card py-1.5 shadow-sh1">
      {rows.map((p, i) => (
        <Fragment key={p.id}>
          {i > 0 && <div className="mx-4 h-px bg-line" />}
          <div className="flex items-center gap-3 px-4 py-[0.6875rem]">
            <Avatar name={p.displayName ?? "?"} index={i} />
            <span className="flex-1 text-[0.875rem] font-semibold">
              {p.id === props.selfId ? t("deck.travelSelf") : p.displayName}
            </span>
            <span className="text-[0.8125rem] font-bold text-ink tabular-nums">
              {t("deck.travel", { who: "", min: props.venue.travelMinutes![p.id!] }).trim()}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
```

`molecules/ShareButton.tsx` (spec §1: metin + link; Web Share API, yoksa panoya kopyala):

```tsx
import { ShareNetwork } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms";

export default function ShareButton(props: { text: string; url: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) {
      await navigator.share({ text: props.text, url: props.url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(`${props.text} ${props.url}`);
    setCopied(true);
  }
  return (
    <Button type="button" kind="white" onClick={() => void share()}>
      <ShareNetwork size={18} aria-hidden />
      {copied ? t("result.copied") : t("result.share")}
    </Button>
  );
}
```

(`result.copied`: "Kopyalandı" — tr/en/nl ekle.)

- [ ] **Step 4: Mevcut bileşen güncellemeleri**

`JoinIntro.tsx` — props: `hostName: string | null; sessionName: string | null; activity: string | null; count: number`. Host adı varsa `<Trans i18nKey="join.invitedBy" values={{ host }} components={[<strong key="0" />]} />`, yoksa mevcut `join.invited`. Başlık: `sessionName` varsa `<h1>{sessionName}</h1>` (artboard: ilk kelime `Highlight`), yoksa mevcut `join.title` Trans. Altında rozetler: `<Badge tone="flame">{activity}</Badge> <Badge>{t("join.joinedCount", {count})}</Badge>`.

`JoinFormFields.tsx` — yeni props: `locationState: "idle" | "granted" | "denied"`. `granted`: yeşil `.loc.on` kartı (`Mevcut konumun` + `{{label}} · otomatik alındı` + Badge Tamam) ve altında `<a>` "Başka bir şehir ya da adres yaz" (tıklanınca `idle`). `denied`: beyaz buton "Konumumu tekrar dene" + `ErrorText` `join.errGeolocation` + adres input'u odaklı (`autoFocus`). `idle`: bugünkü hâl. Mevcut `locationLabel` prop'u korunur.

`JoinForm.tsx` (sayfa) — açılışta `navigator.geolocation.getCurrentPosition` **otomatik** çağrılır (spec §5 "konum otomatik dolmuş"); izin gelirse `granted`, reddedilirse `denied`. `useSessionStore.preview` (Task 3 Step 5) `JoinIntro`'ya ve `WhoIsHere`'a verilir. Kompozisyon:

```tsx
    <Page>
      <TwoZone
        left={<><JoinIntro …/><JoinFormFields …/></>}
        right={<WhoIsHere hostName={preview?.hostDisplayName ?? null} count={preview?.participantCount ?? 0} />}
      />
    </Page>
```

`DeckHeader.tsx` — `Wordmark` kalkar; `SessionHeader`'ı kullanır: title = oturum adı (`view.name`), meta = `t("deck.cardsOf", {current,total})`, action = "Hepsini gör". Altında `Progress` (VenueDeck'ten buraya taşınır).

`VenueDeck.tsx` — `Progress` bloğunu kaldır; klavye ipucuna `⌫ geri al` ekle (`<span className={KBD}>⌫</span><span …>{t("deck.undoKey")}</span>`). Deste kabı `mx-auto w-full max-w-[26.25rem]` (artboard `.deck` 420px).

`RunoffList.tsx` — CTA ve not kaldırılır; props: `finalists, choice, onChoose, disabled, travelLabels`; masaüstünde yan yana: sarmalayıcı `grid gap-4 lg:grid-cols-2`, kart `variant="polaroid"` (artboard Runoff 1280: 150px foto + ad + meta + yol rozetleri + seçim dairesi → `VenueCard` `photoHeight={150}` + `selected`). Mobilde `variant="row"` (390 artboard). Kural: `lg` altı `row`, üstü polaroid — `useMediaQuery` yerine iki render (`hidden lg:block` / `lg:hidden`).

`ViralCard.tsx` — prop `host?: boolean`: host ise başlık `result.viralHostTitle`, buton `result.viralHostCta` → `/sessions/new`, çıkartma YOK; davetlide mevcut.

`RunoffScreen.tsx` — `choice/sent/sending` state sayfada; `TwoZone left={<><RunoffIntro/><Note/><RunoffList …/></>} right={<RunoffStatus participants={view.participants} votedIds={view.runoffVotedParticipantIds ?? []} …/>}`; `lockIn` → `api.runoffVote` (store'a taşı: `deckStore.vote(slug, venueId)`; sayfada HTTP yok).

`WaitingRoom.tsx` — `TwoZone left={<><JoinedCard/><ParticipantList/></>} right={<WaitingStatus …/>}` — `WaitingStatus` kart olur (artboard Bekle 1280 sağ kart: mark + başlık + kopya + "Konumumu değiştir" butonu + hata) → `WaitingStatus` props: `onChange, busy, error`.

`DeckScreen.tsx` — üstte `DeckHeader`; `finished && !listMode` → `TwoZone left={<FinishedCard …/>} right={<LikedList …/>}`; `listMode` → `TwoZone left={liste} right={<LikedList/>}`; aksi → `TwoZone left={<VenueDeck/>} right={<><LikedList/><DeckProgressNote/></>}`.

`ResultScreen.tsx` — `TwoZone left={<><WinnerCard/><ShareButton text={t("result.shareText",{venue,name})} url={location.href}/></>} right={<><TravelList/><ViralCard host={isHost}/></>}`; `isHost` = `view.participants.find(p => p.id === self?.id)?.host`. `result.shareText`: "{{name}}: {{venue}} — BumpInto ile ortada buluştuk." tr/en/nl. `WinnerCard` çıkartması: `view.voteTally` boşsa `result.likedAll` ({{done}} = deckDone sayısı, {{total}} = oy popülasyonu), doluysa `result.sticker`.

- [ ] **Step 5: sessionStore `preview`** — `SessionState`'e `preview: SessionPreview | null` ve `loadPreview: () => Promise<void>`; `bind` sonrası `refresh` 401 dönerse `loadPreview()` çağrılır (`api.preview(slug)`; B-6 öncesi bu çağrı yoksa `preview` null kalır, `JoinIntro` genel metne düşer). `useSessionLive` içinde `refresh` sonrası `if (needsJoin) void loadPreview()`.

- [ ] **Step 6: PASS + görsel karşılaştırma** — Run: `rtk pnpm --filter @bumpinto/web test --run` yeşil; `tsc` yeşil; `rtk pnpm dev:web` ile beş ekranı 1280 ve 390'da artboard'larla karşılaştır (Deste bitti, Liste modu, Runoff kilitli, Karar davetli dahil). `grep -rn "className=\|style=" src/pages` → boş.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(web): oturum ekranlari iki bolge (Katil/Bekle/Deste/Runoff/Karar)`

---

### Task 4: Google ile web girişi, `authStore`, route guard, Landing (B-6 gerekli)

**Files:**
- Modify: `frontend/web/src/store/authStore.ts`
- Create: `frontend/web/src/components/molecules/GoogleSignIn.tsx`
- Create: `frontend/web/src/components/molecules/StepList.tsx`
- Create: `frontend/web/src/components/molecules/PolaroidFan.tsx`
- Create: `frontend/web/src/components/organisms/RequireAuth.tsx`
- Create: `frontend/web/src/pages/Landing.tsx`
- Modify: `frontend/web/src/App.tsx` (layout route + guard)
- Modify: `frontend/web/src/main.tsx` (`authStore.load()` açılışta)
- Modify: `frontend/web/.env.development`, `.env.preprod`, `.env.production` (`VITE_GOOGLE_CLIENT_ID`)
- Create: `frontend/web/src/store/authStore.test.ts`
- Modify: `frontend/web/src/App.test.tsx`

- [ ] **Step 1: Codegen doğrula** — `frontend/shared/src/api.ts` içinde `me`, `updateMe`, `logout`, `listSessions`, `preview` var mı? Yoksa B-6 `done` değildir → INDEX'te `blocked`, dur.

- [ ] **Step 2: Failing tests** — `authStore.test.ts`

```typescript
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  api: { me: vi.fn(), loginGoogle: vi.fn(), logout: vi.fn() },
}));

import { api } from "../lib/api";
import { useAuthStore } from "./authStore";

const me = { id: "u1", email: "m@x.test", displayName: "Mehmet", language: "nl",
  defaultLocation: null, defaultActivity: null, stats: { sessionsHosted: 1, friendsMet: 2 } };

describe("authStore", () => {
  beforeEach(() => useAuthStore.setState({ status: "unknown", me: null }));

  it("load: 401 → anon", async () => {
    vi.mocked(api.me).mockRejectedValueOnce(
      new AxiosError("x", "401", undefined, undefined, { status: 401, data: {}, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } }));
    await useAuthStore.getState().load();
    expect(useAuthStore.getState().status).toBe("anon");
  });

  it("load: 200 → signed ve sunucu dili uygulanır", async () => {
    vi.mocked(api.me).mockResolvedValueOnce(me);
    await useAuthStore.getState().load();
    expect(useAuthStore.getState().status).toBe("signed");
    expect(document.documentElement.lang).toBe("nl");
  });

  it("logout → anon", async () => {
    vi.mocked(api.logout).mockResolvedValueOnce(undefined);
    useAuthStore.setState({ status: "signed", me });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe("anon");
  });
});
```

`App.test.tsx` güncelle:

```tsx
  it("anonim kök: landing", () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByText(/buluşalım\./)).toBeInTheDocument();
  });
  it("bilinmeyen yol: 404", () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<MemoryRouter initialEntries={["/nereye"]}><App /></MemoryRouter>);
    expect(screen.getByText("Burada bir şey yok.")).toBeInTheDocument();
  });
```

- [ ] **Step 3: FAIL doğrula** — Run: `rtk pnpm --filter @bumpinto/web test --run` → kırmızı.

- [ ] **Step 4: authStore**

```typescript
import type { MeResponse } from "@bumpinto/shared";
import { AxiosError } from "axios";
import { create } from "zustand";
import i18n from "../i18n";
import { api } from "../lib/api";

export type AuthStatus = "unknown" | "anon" | "signed";

type AuthState = {
  status: AuthStatus;
  me: MeResponse | null;
  load: () => Promise<void>;
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setMe: (me: MeResponse) => void;
};

/** Spec §6 algılama sırası: ?lng= > sunucu tercihi > tarayıcı. URL'de dil varsa sunucu ezmez. */
function applyServerLanguage(me: MeResponse) {
  const fromUrl = new URLSearchParams(location.search).get("lng");
  if (!fromUrl && me.language) void i18n.changeLanguage(me.language);
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "unknown",
  me: null,

  load: async () => {
    try {
      const me = await api.me();
      applyServerLanguage(me);
      set({ me, status: "signed" });
    } catch (e) {
      const status = e instanceof AxiosError ? e.response?.status : undefined;
      if (status === 401 || status === 403) set({ me: null, status: "anon" });
      // ağ hatası: durum "unknown" kalır, Landing yeniden dener
    }
  },

  login: async (idToken) => {
    await api.loginGoogle(idToken); // X-Client: web → HttpOnly cookie; body'de token yok
    const me = await api.me();
    applyServerLanguage(me);
    set({ me, status: "signed" });
  },

  logout: async () => {
    await api.logout();
    set({ me: null, status: "anon" });
  },

  setMe: (me) => set({ me, status: "signed" }),
}));
```

- [ ] **Step 5: GoogleSignIn** (GIS; script bir kez yüklenir; jsdom'da `window.google` yok → yalnız kap render edilir)

```tsx
/* Kaynak: artboard Landing — "Google ile devam et". GIS politikası: ID token yalnız Google'ın
   render ettiği butonla gelir; özel stil yok. Sapma INDEX notunda. */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Note } from "../atoms";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, string | number>) => void;
        };
      };
    };
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";

function loadScript(): Promise<void> {
  if (window.google) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi"));
    document.head.appendChild(s);
  });
}

export default function GoogleSignIn() {
  const { t, i18n } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !box.current) return;
    let cancelled = false;
    void loadScript().then(() => {
      if (cancelled || !window.google || !box.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (r) => void login(r.credential).then(() => navigate("/sessions")),
      });
      window.google.accounts.id.renderButton(box.current, {
        theme: "outline", size: "large", shape: "pill", text: "continue_with",
        width: 340, locale: i18n.language,
      });
    });
    return () => { cancelled = true; };
  }, [clientId, login, navigate, i18n.language]);

  if (!clientId) return <Note>{t("landing.noClientId")}</Note>;
  return <div ref={box} className="flex min-h-[3.25rem] w-full max-w-[21.25rem] items-center" aria-label={t("landing.google")} />;
}
```

- [ ] **Step 6: Landing parçaları + sayfa**

`molecules/StepList.tsx`:

```tsx
import { useTranslation } from "react-i18next";

const NUM = "flex h-7 w-7 flex-none items-center justify-center rounded-full border-[1.5px] border-ink bg-sun font-head text-[0.8125rem] font-extrabold";

export default function StepList() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-start gap-3">
          <b className={NUM}>{n}</b>
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.875rem] font-semibold">{t(`landing.step${n}`)}</span>
            <span className="text-[0.75rem] text-ink2">{t(`landing.step${n}Copy`)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

`molecules/PolaroidFan.tsx` (artboard Landing 1280 sağ üst: iki arka polaroid + önde "Café Berlage" + çıkartma "3/3 beğendi!") — `VenueCard photoOnly` ile iki arka kart (`absolute`), önde `VenueCard` (deckOrder 0, `photoHeight={160}`) + `Sticker`; sarmalayıcı `relative hidden h-[18.75rem] lg:block`. Sabit örnek veri (tasarım illüstrasyonu): `{ name: "Café Berlage", rating: 4.6, priceLevel: 2, deckOrder: 0 }`, arka kartlar deckOrder 1 ve 2.

`pages/Landing.tsx`:

```tsx
import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { HandNote, Heading, Highlight, Note, Page } from "../components/atoms";
import GoogleSignIn from "../components/molecules/GoogleSignIn";
import MapMark from "../components/molecules/MapMark";
import PolaroidFan from "../components/molecules/PolaroidFan";
import StepList from "../components/molecules/StepList";
import TwoZone from "../components/molecules/TwoZone";
import { useAuthStore } from "../store/authStore";

/** Artboard W0 · Landing — çıkış yapılmış kök; giriş burada. */
export default function Landing() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();
  useEffect(() => {
    if (status === "signed") navigate("/sessions", { replace: true });
  }, [status, navigate]);

  return (
    <Page center>
      <TwoZone
        centerY
        left={
          <>
            <MapMark />
            <Heading>
              <Trans i18nKey="landing.title" components={[<Highlight key="0" />, <br key="1" />]} />
            </Heading>
            <Note>{t("landing.copy")}</Note>
            <HandNote>{t("landing.hand")}</HandNote>
            <GoogleSignIn />
            <Note>
              <Trans i18nKey="landing.terms" components={[<a key="0" href="/terms" />]} />
            </Note>
          </>
        }
        right={
          <>
            <PolaroidFan />
            <StepList />
          </>
        }
      />
    </Page>
  );
}
```

`Note` atomunda `Trans` içindeki `<a>` çalışır (children). `Heading` 46px masaüstü: `Heading` atomuna `lg:text-[2.875rem]` ekle (`sizes.display`).

- [ ] **Step 7: Router + guard**

`organisms/RequireAuth.tsx`:

```tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const loc = useLocation();
  if (status === "unknown") return null; // load() sürüyor
  if (status === "anon") return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
```

`App.tsx`:

```tsx
import { Route, Routes } from "react-router-dom";
import AppShell from "./components/organisms/AppShell";
import RequireAuth from "./components/organisms/RequireAuth";
import ErrorPage from "./pages/ErrorPage";
import Landing from "./pages/Landing";
import ProfilePage from "./pages/ProfilePage";
import SessionPage from "./pages/SessionPage";
import SessionsPage from "./pages/SessionsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/j/:slug" element={<SessionPage />} />
        <Route path="/sessions" element={<RequireAuth><SessionsPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="*" element={<ErrorPage kind="lost" />} />
      </Route>
    </Routes>
  );
}
```

(`SessionsPage`, `ProfilePage`, `ErrorPage` Task 5–7'de; bu görevde geçici olarak `ErrorPage kind="lost"` ve boş `SessionsPage`/`ProfilePage` yer tutucuları oluşturulur — Task 5/6/7 içini doldurur.)

`main.tsx`: `import { useAuthStore } from "./store/authStore"; void useAuthStore.getState().load();` (render'dan önce).

`.env.*`: `VITE_GOOGLE_CLIENT_ID=` (değerler kullanıcıda; I-1 Ek A build-arg).

- [ ] **Step 8: PASS + gate** — testler yeşil, `tsc` yeşil; `rtk pnpm dev:web` ile gerçek Google client id'siyle giriş → `/sessions`'a yönlenir, çerez `bumpinto_at` HttpOnly.

- [ ] **Step 9: INDEX güncelle + Commit (kullanıcı)** — `feat(web): google girisi, authStore, RequireAuth, Landing`

---

### Task 5: Oturumlar sayfası (W1) — açık/geçmiş + boş durum (B-6 gerekli)

**Files:**
- Create: `frontend/web/src/components/molecules/SessionCard.tsx`
- Create: `frontend/web/src/components/molecules/PastSessionRow.tsx`
- Create: `frontend/web/src/components/molecules/EmptySessions.tsx`
- Create: `frontend/web/src/lib/activity.ts`
- Create: `frontend/web/src/store/sessionsStore.ts`
- Create: `frontend/web/src/pages/SessionsPage.tsx`
- Create: `frontend/web/src/pages/SessionsPage.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { listSessions: vi.fn() } }));
import { api } from "../lib/api";
import SessionsPage from "./SessionsPage";

describe("SessionsPage", () => {
  it("açık ve geçmiş oturumları listeler", async () => {
    vi.mocked(api.listSessions).mockResolvedValueOnce({
      open: [{ slug: "x", name: "Cuma kahvesi", activityType: "COFFEE", sessionType: "GROUP",
        status: "SWIPING", createdAt: "2026-09-01T10:00:00Z", expiresAt: "2026-09-02T10:00:00Z",
        participantCount: 3, decidedVenueName: null }],
      past: [{ slug: "y", name: "Öğle molası", activityType: "FOOD", sessionType: "GROUP",
        status: "EXPIRED", createdAt: "2026-08-02T10:00:00Z", expiresAt: "2026-08-03T10:00:00Z",
        participantCount: 2, decidedVenueName: null }],
    });
    render(<MemoryRouter><SessionsPage /></MemoryRouter>);
    expect(await screen.findByText("Cuma kahvesi")).toBeInTheDocument();
    expect(screen.getByText("Öğle molası")).toBeInTheDocument();
    expect(screen.getByText("Doldu")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Desteye git" })).toHaveAttribute("href", "/j/x");
  });

  it("boş durum", async () => {
    vi.mocked(api.listSessions).mockResolvedValueOnce({ open: [], past: [] });
    render(<MemoryRouter><SessionsPage /></MemoryRouter>);
    expect(await screen.findByText("Henüz buluşma yok")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL doğrula** → modül yok.

- [ ] **Step 3: `lib/activity.ts`** (DS §08 gruplar + ikonlar; W-4 chip'leri de bunu kullanır)

```typescript
import {
  Bank, Barbell, BeerStein, BowlingBall, Coffee, Compass, FilmSlate, ForkKnife, GameController,
  MoonStars, Mountains, Palette, PersonSimpleWalk, SwimmingPool, Ticket, type Icon,
} from "@phosphor-icons/react";

export type ActivityGroup = "FOOD_DRINK" | "ACTIVE" | "CULTURE" | "FUN";

export const ACTIVITY_GROUPS: Record<ActivityGroup, string[]> = {
  FOOD_DRINK: ["COFFEE", "FOOD", "BAR"],
  ACTIVE: ["WALK", "HIKE", "SWIM", "FITNESS", "ADVENTURE"],
  CULTURE: ["CINEMA", "MUSEUM", "ART"],
  FUN: ["ACTIVITY", "GAMES", "THEME_PARK", "NIGHTLIFE"],
};

export const ACTIVITY_ICONS: Record<string, Icon> = {
  COFFEE: Coffee, FOOD: ForkKnife, BAR: BeerStein, WALK: PersonSimpleWalk, HIKE: Mountains,
  SWIM: SwimmingPool, FITNESS: Barbell, ADVENTURE: Compass, CINEMA: FilmSlate, MUSEUM: Bank,
  ART: Palette, ACTIVITY: BowlingBall, GAMES: GameController, THEME_PARK: Ticket, NIGHTLIFE: MoonStars,
};

/** Fotoğrafsız kart gradyanı gruba göre: pA/pB/pC/pD (DS §08). */
export const GROUP_TINT: Record<ActivityGroup, 0 | 1 | 2 | 3> = { FOOD_DRINK: 0, ACTIVE: 1, CULTURE: 2, FUN: 3 };

export function groupOf(activity: string): ActivityGroup {
  return (Object.keys(ACTIVITY_GROUPS) as ActivityGroup[])
    .find((g) => ACTIVITY_GROUPS[g].includes(activity)) ?? "FOOD_DRINK";
}
```

`VenueCard.PHOTO_CLASSES`'a dördüncü (pD) gradyanı ekle: `"bg-[image:radial-gradient(130%_100%_at_20%_10%,#fff0b8_0%,transparent_60%),radial-gradient(110%_85%_at_85%_90%,#ffc24a_0%,transparent_55%),linear-gradient(165deg,#ffe08a_0%,#f2a93b_100%)]"` ve `tint?: 0|1|2|3` prop'u (verilirse `deckOrder` yerine tint'ten başlar: `PHOTO_CLASSES[(tint + deckOrder) % 4]`).

- [ ] **Step 4: Store + bileşenler**

`store/sessionsStore.ts`:

```typescript
import type { Schemas } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";

type Row = Schemas["SessionSummaryDto"];
type State = { open: Row[]; past: Row[]; loaded: boolean; load: () => Promise<void> };

export const useSessionsStore = create<State>((set) => ({
  open: [], past: [], loaded: false,
  load: async () => {
    const r = await api.listSessions();
    set({ open: r.open ?? [], past: r.past ?? [], loaded: true });
  },
}));
```

`molecules/SessionCard.tsx` (artboard Oturumlar 1280 açık kart):

```tsx
import { useTranslation } from "react-i18next";
import type { Schemas } from "@bumpinto/shared";
import { Badge, LinkButton, Progress, Sticker } from "../atoms";

type Row = Schemas["SessionSummaryDto"];

function cta(status: Row["status"]) {
  switch (status) {
    case "SWIPING": return "sessions.goDeck";
    case "BROWSING": return "sessions.goVenues";
    case "RUNOFF": return "sessions.goVenues";
    default: return "sessions.goLobby";
  }
}

export default function SessionCard({ row }: { row: Row }) {
  const { t } = useTranslation();
  const active = row.status === "SWIPING";
  return (
    <div className={`relative rounded-card bg-card p-[1.25rem_1.375rem] ${active ? "border-[1.5px] border-flame-deep shadow-sh2" : "border border-line shadow-sh1"}`}>
      {active && <span className="absolute -top-[0.8125rem] right-4 flex"><Sticker>{t("sessions.status.SWIPING")}!</Sticker></span>}
      <h3 className="mb-1 text-[1.3125rem]">{row.name ?? t(`activity.${row.activityType}`)}</h3>
      <p className="mb-3.5 text-[0.8125rem] text-ink2">
        {t(`activity.${row.activityType}`)} · {t(`sessions.status.${row.status}`)}
        {row.sessionType === "SOLO" && <> · {t("sessions.solo")}</>}
      </p>
      <div className="flex items-center justify-between gap-3">
        <Badge>{t("sessions.people", { count: row.participantCount })}</Badge>
        <LinkButton href={`/j/${row.slug}`} kind="white" size="sm" className="!w-auto">{t(cta(row.status))}</LinkButton>
      </div>
    </div>
  );
}
```

(`Progress` artboard'da "2/3 bitirdi" için — liste API'sinde bitirme sayısı yok; ilerleme çubuğu `SWIPING`'de gösterilmez, bilinçli sadeleştirme, INDEX notuna yaz.)

`molecules/PastSessionRow.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import type { Schemas } from "@bumpinto/shared";
import { Badge } from "../atoms";
import { groupOf, GROUP_TINT } from "../../lib/activity";
import VenueCard from "./VenueCard";

export default function PastSessionRow({ row, index }: { row: Schemas["SessionSummaryDto"]; index: number }) {
  const { t, i18n } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(new Date(row.createdAt!));
  const decided = !!row.decidedVenueName;
  return (
    <div className={`flex items-center gap-3 px-4 py-[0.8125rem] ${decided ? "" : "opacity-65"}`}>
      <div className="w-12 flex-none">
        <VenueCard venue={{ id: row.slug, name: row.decidedVenueName ?? row.name ?? "?", deckOrder: index }} tint={GROUP_TINT[groupOf(row.activityType!)]} photoOnly photoHeight={48} />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <h3>{row.decidedVenueName ?? row.name}</h3>
        <span className="text-[0.75rem] text-ink2">
          {date} · {decided ? t("sessions.people", { count: row.participantCount }) : t("sessions.noDecision")}
        </span>
      </div>
      <Badge tone={decided ? "grass" : "neutral"}>{decided ? t("sessions.went") : t("sessions.full")}</Badge>
    </div>
  );
}
```

`molecules/EmptySessions.tsx` (artboard `Oturumlar 390 boş`): kart; `MapMark` + `h2` `sessions.emptyTitle` + `Note` `sessions.emptyCopy` + `HandNote` `sessions.emptyHand`.

`molecules/PageHeader.tsx` (artboard `.hdr` — büyük başlık + sağda aksiyon; Oturumlar ve Profil kullanır):

```tsx
import type { ReactNode } from "react";

export default function PageHeader(props: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-5">
      <h1>{props.title}</h1>
      {props.action}
    </div>
  );
}
```

`atoms/Overline.tsx` (bölüm başlıkları "Açık buluşmalar", "Geçmiş buluşmalar"; `ParticipantList`/`LikedList`'teki tekrar eden sınıf da buraya taşınır):

```tsx
import type { ReactNode } from "react";

export default function Overline({ children }: { children: ReactNode }) {
  return <p className="m-0 text-[0.6875rem] font-bold tracking-[0.11em] text-ink3 uppercase">{children}</p>;
}
```

`pages/SessionsPage.tsx`:

```tsx
import { Plus } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { LinkButton, Note, Overline, Page } from "../components/atoms";
import EmptySessions from "../components/molecules/EmptySessions";
import PageHeader from "../components/molecules/PageHeader";
import PastSessionRow from "../components/molecules/PastSessionRow";
import SessionCard from "../components/molecules/SessionCard";
import TwoZone from "../components/molecules/TwoZone";
import { useSessionsStore } from "../store/sessionsStore";

/** Artboard W1 · Oturumlar — açık + geçmiş; boş durum. */
export default function SessionsPage() {
  const { t } = useTranslation();
  const { open, past, loaded, load } = useSessionsStore();
  useEffect(() => { void load(); }, [load]);
  if (!loaded) return null;
  const empty = open.length === 0 && past.length === 0;
  return (
    <Page>
      <PageHeader
        title={<Trans i18nKey="sessions.title" components={[<br key="0" />]} />}
        action={<LinkButton href="/sessions/new" className="!w-auto"><Plus size={18} aria-hidden />{t("sessions.new")}</LinkButton>}
      />
      {empty ? <EmptySessions /> : (
        <TwoZone
          left={<><Overline>{t("sessions.open")}</Overline>{open.map((r) => <SessionCard key={r.slug} row={r} />)}</>}
          right={<><Overline>{t("sessions.past")}</Overline>{past.map((r, i) => <PastSessionRow key={r.slug} row={r} index={i} />)}<Note>{t("sessions.retention")}</Note></>}
        />
      )}
    </Page>
  );
}
```

- [ ] **Step 5: `/sessions/new` yer tutucusu** — W-4'e kadar `SessionsPage`'deki "Yeni buluşma kur" `/sessions/new`'e gider; rota W-4'te eklenir. Bu görevde `App.tsx`'e `<Route path="/sessions/new" element={<RequireAuth><ErrorPage kind="soon" /></RequireAuth>} />` **eklenmez** — 404 gösterilir ve INDEX notuna "W-4 gelene dek /sessions/new 404" yazılır.

- [ ] **Step 6: PASS + görsel** — testler + `tsc` yeşil; artboard `Oturumlar 1280`/`390 boş` ile karşılaştır.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(web): oturumlar sayfasi (acik/gecmis/bos)`

---

### Task 6: Profil sayfası (W9) — kimlik, istatistik, tercihler, dil (B-6 gerekli)

**Files:**
- Create: `frontend/web/src/components/molecules/StatCard.tsx`
- Create: `frontend/web/src/components/molecules/PrefRow.tsx`
- Create: `frontend/web/src/components/organisms/ProfilePrefs.tsx`
- Create: `frontend/web/src/pages/ProfilePage.tsx`
- Create: `frontend/web/src/pages/ProfilePage.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { updateMe: vi.fn() } }));
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import ProfilePage from "./ProfilePage";

const me = { id: "u1", email: "m@x.test", displayName: "Mehmet Şerefoğlu", language: "tr",
  defaultLocation: { lat: 51.69, lng: 5.3, label: "'s-Hertogenbosch" }, defaultActivity: "COFFEE",
  stats: { sessionsHosted: 12, friendsMet: 31 } };

describe("ProfilePage", () => {
  it("kimlik, istatistik ve tercihleri gösterir; dil seçimi sunucuya yazar", async () => {
    useAuthStore.setState({ status: "signed", me });
    vi.mocked(api.updateMe).mockResolvedValueOnce({ ...me, language: "en" });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expect(screen.getByText("m@x.test")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("'s-Hertogenbosch")).toBeInTheDocument();
    expect(screen.getByText("Kahve")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    expect(api.updateMe).toHaveBeenCalledWith({ language: "en" });
  });
});
```

- [ ] **Step 2: FAIL doğrula** → modül yok.

- [ ] **Step 3: Bileşenler**

`molecules/StatCard.tsx`: `props: { value: number; label: string; tilt: -1 | 1 }` → `rounded-card border border-line bg-card p-[1.125rem] text-center shadow-sh1` + `transform-[rotate(-1deg)]`/`rotate(1deg)`; büyük sayı `font-head text-[2rem] font-extrabold tabular-nums`, altında `Note`.

`molecules/PrefRow.tsx`: `props: { label: string; value: string | null; children?: ReactNode }` — sol `lb` + `mi` (`value ?? t("profile.unset")`), sağ `CaretRight` (children yoksa) ya da children (chip/panel).

`organisms/ProfilePrefs.tsx` (artboard Profil 1280 sağ bölge): kart içinde üç `PrefRow`: Varsayılan konum (`me.defaultLocation?.label`), Varsayılan etkinlik (`t("activity.X")` + ikonlu chip — `lib/activity`), Dil: açılır panel (radio grubu `role="radiogroup"`: Türkçe/English/Nederlands; seçim → `api.updateMe({language})` + `i18n.changeLanguage` + `setMe`). Konum ve etkinlik düzenleme panelleri **W-4**'te (gruplu seçici ve harita seçimi orada gelir); bu görevde satırlar salt okunur (INDEX notu).

`pages/ProfilePage.tsx`: `Page` + `PageHeader title="Profil"` + `TwoZone left={<><IdentityCard/> <div grid 2 StatCard/> <Note profile.retention/> <Button kind="danger">Çıkış yap</Button></>} right={<><Overline profile.prefs/><ProfilePrefs/><Note profile.langHint/></>}`. `IdentityCard` (`molecules/IdentityCard.tsx`): `Avatar name ring` 80px (`Avatar` atomuna `size="xl"` ekle: `h-20 w-20 text-[1.875rem]`) + `h2` ad + `Note` "{{email}} · Google ile giriş". `Button` atomuna `kind: "danger"` ekle: `bg-transparent text-[#c0392b] border-[#efc9c2]` (DS `.b-dg`). Çıkış → `authStore.logout` → `/`.

- [ ] **Step 4: PASS + görsel** — testler + `tsc` yeşil; artboard `Profil 1280/390`.

- [ ] **Step 5: INDEX güncelle + Commit (kullanıcı)** — `feat(web): profil sayfasi + dil tercihi`

---

### Task 7: Hata sayfaları (W10), SessionPage hata yönlendirmesi, kapanış kapıları

**Files:**
- Create: `frontend/web/src/pages/ErrorPage.tsx`
- Modify: `frontend/web/src/pages/SessionPage.tsx` (hata → `ErrorPage kind="notFound" | "expired"`)
- Modify: `frontend/web/src/components/molecules/MapMark.tsx` (`muted` prop: gri iğne)
- Modify: `frontend/web/src/App.tsx` (`*` → `ErrorPage kind="lost"`)
- Modify: `frontend/web/src/App.test.tsx`

- [ ] **Step 1: ErrorPage**

```tsx
import { useTranslation } from "react-i18next";
import { Heading, LinkButton, Note, Page } from "../components/atoms";
import MapMark from "../components/molecules/MapMark";
import OneZone from "../components/molecules/OneZone";

type Kind = "notFound" | "expired" | "lost";

/** Artboard W10 · tek bölge, ortalanmış. */
export default function ErrorPage({ kind }: { kind: Kind }) {
  const { t } = useTranslation();
  const title = kind === "lost" ? t("error.lostTitle") : t("error.hmm");
  const copy = kind === "notFound" ? t("session.notFound")
    : kind === "expired" ? t("session.expired") : t("error.lostCopy");
  const hint = kind === "notFound" ? t("error.notFoundHint")
    : kind === "expired" ? t("error.expiredHint") : null;
  return (
    <Page center>
      <OneZone>
        <MapMark muted />
        <Heading center>{title}</Heading>
        <Note center>{copy}</Note>
        {hint && <Note center>{hint}</Note>}
        <LinkButton href="/" kind="white" className="!w-auto">{t("error.home")}</LinkButton>
      </OneZone>
    </Page>
  );
}
```

`molecules/OneZone.tsx`: `<div className="mx-auto flex w-full max-w-[34rem] flex-col items-center gap-3.5 text-center">`. `MapMark muted`: `c-mark-pin` yerine `c-mark-pin c-mark-pin--muted` (app.css'e `.c-mark-pin--muted{background:var(--color-ink3);box-shadow:none}`).

`SessionPage.tsx`: `if (error) return <ErrorPage kind={error === "session.expired" ? "expired" : "notFound"} />;` ve `default:` dalı `ErrorPage kind="expired"`.

- [ ] **Step 2: Kapanış kapıları**
  - `rtk pnpm --filter @bumpinto/web exec tsc --noEmit` yeşil
  - `rtk pnpm test:web` yeşil
  - `rtk pnpm build:web` ve `rtk pnpm build:web:preprod` yeşil
  - `grep -rn "className=\|style=" frontend/web/src/pages` → boş
  - `grep -rn "localStorage\|sessionStorage" frontend/web/src` → boş
  - Hard-coded Türkçe tarama: bileşen/sayfa dosyalarında `t()` dışı kullanıcı metni yok
  - `?lng=nl` ile açılış: `<html lang="nl">`, başlık NL
  - Giriş yapmış kullanıcıda `me.language=en` → sayfa en açılır, URL'de `?lng=tr` varsa tr kazanır

- [ ] **Step 3: INDEX'te W-3 `done` + Commit (kullanıcı)** — `feat(web): hata sayfalari + kapanis`

---

## Plan sonu doğrulaması

- [ ] Kabuk her sayfada; anonimde yalnız wordmark + dil; 1024 altı tek sütun, üstü iki bölge (Landing, Oturumlar, Profil, Katıl, Bekle, Deste, Runoff, Karar).
- [ ] Google girişi → HttpOnly çerez → `/sessions`; çıkış → çerez silinir → `/`.
- [ ] Dil: varsayılan en; `?lng=` > sunucu tercihi > tarayıcı; `<html lang>` + başlık güncel; Profil'den seçim sunucuya yazılır.
- [ ] en/nl `_status` işareti korunur (onay kullanıcıda); Katıl EN/NL 1280 artboard'larıyla görsel karşılaştırma yapıldı.
- [ ] Spec §3 rotaları (`/`, `/sessions`, `/profile`, `/j/:slug`, 404) ve §5'in W0, W1, W4–W10 satırları (harita hariç) kapandı; W2/W3/W3b/W3c/haritalar → W-4.
