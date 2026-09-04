# Plan 19: Web — Presence yüzeyi ve harita mount politikası (W-7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Kimlik:** `W-7` · İz: Web · Durum INDEX'te tutulur (bu plan INDEX'i **düzenlemez**).

**Goal:** `docs/superpowers/specs/2026-09-04-session-presence-design.md`'nin web kapsamını uygulamak: WS bağlantısını oturum yoluna taşımak, çevrimiçilik durumunu roster/harita/Katıl ekranında göstermek, Lobi ve Bekle ekranlarında haritayı `lg`+ genişlikte varsayılan olarak açmak, ve `shuffle` 409'unu çıkmaz sokak yerine yol gösteren bir mesaja çevirmek.

**Architecture:** Presence sunucudan gelen iki alandan ibarettir (`ParticipantDto.online`, `SessionPreview.hostOnline`) — istemci hiçbir şey türetmez, hiçbir zamanlayıcı tutmaz. `presence_changed` olayı zaten `useSessionLive`'ın genel "tazele" yoluna düşer, ek kod istemez. Harita değişikliği tamamen **mount politikasıdır**: `lib/mapCamera.ts`'teki otomatik kadrajlama koduna dokunulmaz.

**Tech Stack:** React 18 + react-router 7, zustand, Tailwind v4, `@phosphor-icons/react`, react-i18next (tr/en/nl), vitest + RTL, `@stomp/stompjs` v7.

**Öncül:** **B-8 (plan18) T8 bitmiş olmalı** — `pnpm codegen` çalıştırılmış ve `frontend/shared/src/api-types.ts` `online` + `hostOnline` alanlarını taşıyor olmalı. Aksi hâlde bu planın tamamı tip hatası verir.

**Testleri çalıştırma (repo kökünden):**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && pnpm test:web
```

Tek dosya: `pnpm --filter @bumpinto/web test --run src/pages/LobbyPage.test.tsx`
i18n paritesi: `pnpm i18n:check`
Tip kontrolü: `pnpm build:web`

**Git kuralı:** Ajan git yazma işlemi yapmaz (AGENTS.md). "Commit" adımları kullanıcıya bırakılır; ajan yalnız gruplamayı yazar.

---

## Dosya haritası

| Dosya | Değişiklik |
|---|---|
| **Modify** `store/useSessionLive.ts` | brokerURL `/api/sessions/{slug}/ws` |
| **Modify** `store/useSessionAction.ts` | `run(...)` HTTP durumuna göre özel hata anahtarı alabilsin |
| **Modify** `components/molecules/ParticipantRow.tsx` | Çevrimdışı katılımcı: soluk satır + "çevrimdışı" alt metni |
| **Modify** `components/molecules/JoinIntro.tsx` | `hostOnline=false` ise nötr not (engel DEĞİL) |
| **Modify** `pages/JoinForm.tsx` | `preview.hostOnline`'ı `JoinIntro`'ya geçir |
| **Modify** `components/organisms/mapPins.ts` | Çevrimdışı katılımcı pini soluk |
| **Modify** `pages/LobbyPage.tsx` | `lg`+ harita varsayılan açık, ghost yalnız 390'da |
| **Modify** `pages/WaitingRoom.tsx` | `lg`+ harita eklenir, 390'da ghost |
| **Modify** `pages/VenuesPage.tsx` | `shuffle` 409 → yol gösteren mesaj |
| **Modify** `i18n/locales/{tr,en,nl}.json` | 4 yeni anahtar |
| **Modify** `pages/WaitingRoom.test.tsx` | §4.7 testi yeni politikaya göre yazılır |
| **Modify** `pages/LobbyPage.test.tsx`, `components/molecules/WhoIsHere.test.tsx` | Yeni davranışlar |

---

## Yeni i18n anahtarları (üç dilde birlikte eklenir)

| Anahtar | tr | en | nl |
|---|---|---|---|
| `waiting.offline` | `çevrimdışı` | `offline` | `offline` |
| `join.hostAway` | `{{host}} şu an oturumda değil — yine de katılabilirsin, konumun onu bekler.` | `{{host}} isn't in the session right now — you can still join, your location will be waiting.` | `{{host}} is er nu niet — je kunt toch meedoen, je locatie wacht op hen.` |
| `waiting.openMap` | `Haritayı aç` | `Open the map` | `Kaart openen` |
| `venues.errAlone` | `Şu an oturumda tek kişisin — deste açmak için en az iki kişi gerek. Beklemek istemiyorsan listeden bir yer seçip kararı kapatabilirsin.` | `You're the only one here right now — starting the deck needs at least two people. If you'd rather not wait, pick a place from the list and close the decision.` | `Je bent nu de enige hier — voor een deck zijn minstens twee mensen nodig. Wil je niet wachten, kies dan een plek uit de lijst en sluit de beslissing af.` |

Dört anahtar eklenir. Lobi'nin ghost metni için yeni anahtar **yok**: `lobby.openMap` (`Haritayı aç`) zaten mevcut ve olduğu gibi kullanılır.

---

## Task 1: WebSocket adresi ve tip yenilemesi

**Files:**
- Modify: `frontend/web/src/store/useSessionLive.ts`
- Manuel (kullanıcı): `frontend/web/.env.development`, `.env.development.local`, `.env.preprod`, `.env.production`

- [ ] **Step 1: Üretilmiş tiplerin hazır olduğunu doğrula**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto
grep -n "hostOnline" frontend/shared/src/api-types.ts
```

Beklenen: en az bir eşleşme. Hiç eşleşme yoksa **DUR** — B-8 T8 (`pnpm codegen`) koşulmamış demektir.

- [ ] **Step 2: `useSessionLive`'ın brokerURL'ini değiştir**

`store/useSessionLive.ts` içinde `wsUrl` bloğunu şununla değiştir:

```ts
    // Kanal artik oturum yolunun ALTINDA: katilimci cerezinin path'i /api/sessions/{slug} oldugu
    // icin tarayici cerezi handshake'e kendiliginden gonderir ve sunucu soketi kimliklendirir
    // (B-8). VITE_WS_URL artik yalniz ORIGIN tasir, /ws sonekini TASIMAZ.
    const origin =
      (import.meta.env.VITE_WS_URL as string | undefined) ||
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
    const client = new Client({
      brokerURL: `${origin}/api/sessions/${slug}/ws`,
      reconnectDelay: 5000,
      // Bağlantı kurulunca BİR KEZ tazele: abone olana kadar kaçan olaylar burada kapanır,
      // yoksa açılıştaki boşluk artık 30 sn sürerdi.
      onConnect: () => {
        void refresh();
        client.subscribe(`/topic/session/${slug}`, () => void refresh());
      },
    });
```

`presence_changed` için ek kod **yok**: abonelik geri çağrısı olayın türüne bakmadan `refresh()` çağırıyor.

- [ ] **Step 3: `.env` değişikliğini kullanıcıya bildir**

Ajan `.env` dosyalarını **okumaz ve yazmaz** (AGENTS.md). Kullanıcıya şunu ilet:

> `frontend/web/.env.*` dosyalarındaki `VITE_WS_URL` artık yalnız origin olmalı: sonundaki `/ws` kaldırılmalı (ör. `wss://bumpinto.example` — `wss://bumpinto.example/ws` değil). Değişken boşsa dokunmaya gerek yok, kod `location.host`'a düşer.

- [ ] **Step 4: Tip kontrolü**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && pnpm build:web
```

Beklenen: `tsc -b` hatasız.

- [ ] **Step 5: Commit — kullanıcıya bırak**

`store/useSessionLive.ts`. Önerilen mesaj: `feat(web): connect the live channel under the session path`.

---

## Task 2: Roster'da çevrimdışı durumu

**Files:**
- Modify: `frontend/web/src/components/molecules/ParticipantRow.tsx`
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`
- Test: `frontend/web/src/pages/WaitingRoom.test.tsx`

- [ ] **Step 1: Başarısız testi yaz**

`pages/WaitingRoom.test.tsx` — dosya sonuna:

```tsx
  it("çevrimdışı katılımcı roster'da işaretlenir, çevrimiçi olan işaretlenmez", () => {
    const withPresence = {
      ...view,
      participants: [
        { ...view.participants[0], online: true },
        { ...view.participants[1], online: false },
      ],
    };
    render(<WaitingRoom view={withPresence as never} />);
    expect(screen.getByText("çevrimdışı")).toBeInTheDocument();
    expect(screen.getAllByText("çevrimdışı")).toHaveLength(1);
  });
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto
pnpm --filter @bumpinto/web test --run src/pages/WaitingRoom.test.tsx
```

Beklenen: FAIL — `Unable to find an element with the text: çevrimdışı`.

- [ ] **Step 3: i18n anahtarını üç dile ekle**

`i18n/locales/tr.json` → `waiting` nesnesine: `"offline": "çevrimdışı",`
`i18n/locales/en.json` → `waiting` nesnesine: `"offline": "offline",`
`i18n/locales/nl.json` → `waiting` nesnesine: `"offline": "offline",`

- [ ] **Step 4: `ParticipantRow`'u güncelle**

`components/molecules/ParticipantRow.tsx` — javadoc yorumunun sonuna bir cümle ekle:

```tsx
    Çevrimdışı satır SOLUK çizilir ve alt satırda tek kelimeyle söylenir; ayrı bir rozet ya da
    "geç kaldı" damgası YOK (karar dokümanı §4.8: suçlayıcı işaret yok).
```

`const icons = ...` satırının altına:

```tsx
  // `online` sunucudan gelir (B-8); istemci canlilik TURETMEZ. Elle eklenen noktalarda daima
  // false gelir ve gosterilmez — onlarin soketi hic olmaz (SOLO).
  const away = p.online === false && !p.manual;
```

Kök `div`'in className'ini şununla değiştir:

```tsx
    <div
      className={`flex items-center gap-3 px-4 py-[0.8125rem] animate-appear ${away ? "opacity-55" : ""}`}
    >
```

Alt satırdaki `<span>` içine, konum metninden hemen sonra:

```tsx
          {away && (
            <>
              <span aria-hidden>·</span>
              <span>{t("waiting.offline")}</span>
            </>
          )}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

```bash
pnpm --filter @bumpinto/web test --run src/pages/WaitingRoom.test.tsx
```

Beklenen: PASS.

- [ ] **Step 6: i18n paritesini kontrol et**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && pnpm i18n:check
```

Beklenen: eksik anahtar raporu yok.

- [ ] **Step 7: Commit — kullanıcıya bırak**

`ParticipantRow.tsx`, üç locale dosyası, `WaitingRoom.test.tsx`. Önerilen mesaj: `feat(web): mark offline participants in the roster`.

---

## Task 3: Katıl ekranında "host şu an yok" notu

**Files:**
- Modify: `frontend/web/src/components/molecules/JoinIntro.tsx`
- Modify: `frontend/web/src/pages/JoinForm.tsx`
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`
- Test: `frontend/web/src/pages/JoinForm.test.tsx`

- [ ] **Step 1: Başarısız testi yaz**

`pages/JoinForm.test.tsx` — dosya sonuna yeni bir `describe`:

```tsx
describe("JoinForm — host çevrimiçiliği", () => {
  const preview = {
    slug: "x7k2m", name: "Cuma kahvesi", activityType: "COFFEE", sessionType: "GROUP",
    status: "COLLECTING", hostDisplayName: "Mehmet", participantCount: 1,
    participants: [{ displayName: "Mehmet", host: true, hasLocation: true }],
  };

  it("host çevrimdışıyken not gösterir ama Katıl butonu ÇALIŞIR (kapı değil, bilgi)", () => {
    useAuthStore.setState({ status: "anon", me: null });
    useSessionStore.setState({
      slug: "x7k2m",
      preview: { ...preview, hostOnline: false } as never,
      join: vi.fn().mockResolvedValue(undefined),
    });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);

    expect(screen.getByText(/Mehmet şu an oturumda değil/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Katıl" })).toBeEnabled();
  });

  it("host çevrimiçiyken not görünmez", () => {
    useAuthStore.setState({ status: "anon", me: null });
    useSessionStore.setState({
      slug: "x7k2m",
      preview: { ...preview, hostOnline: true } as never,
      join: vi.fn().mockResolvedValue(undefined),
    });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);

    expect(screen.queryByText(/şu an oturumda değil/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

```bash
pnpm --filter @bumpinto/web test --run src/pages/JoinForm.test.tsx
```

Beklenen: ilk test FAIL — metin yok.

- [ ] **Step 3: i18n anahtarını üç dile ekle**

`tr.json` → `join`: `"hostAway": "{{host}} şu an oturumda değil — yine de katılabilirsin, konumun onu bekler.",`
`en.json` → `join`: `"hostAway": "{{host}} isn't in the session right now — you can still join, your location will be waiting.",`
`nl.json` → `join`: `"hostAway": "{{host}} is er nu niet — je kunt toch meedoen, je locatie wacht op hen.",`

- [ ] **Step 4: `JoinIntro`'ya prop ve notu ekle**

`components/molecules/JoinIntro.tsx` — props tipine ekle:

```tsx
  /** Host su an oturumda mi (preview.hostOnline). KAPI DEGIL: katilim her durumda acik —
      davet linkinin ana akisi asenkrondur (spec §2a). */
  hostOnline?: boolean;
```

`<Note>{t("join.subtitle")}</Note>` satırının **altına**:

```tsx
        {props.hostOnline === false && props.hostName && (
          <Note>{t("join.hostAway", { host: props.hostName })}</Note>
        )}
```

- [ ] **Step 5: `JoinForm`'dan geçir**

`pages/JoinForm.tsx` — `<JoinIntro ... />` çağrısına satır ekle:

```tsx
              hostOnline={preview?.hostOnline}
```

- [ ] **Step 6: Testi çalıştır**

```bash
pnpm --filter @bumpinto/web test --run src/pages/JoinForm.test.tsx
```

Beklenen: PASS (yeni iki test + mevcut üç test).

- [ ] **Step 7: Commit — kullanıcıya bırak**

`JoinIntro.tsx`, `JoinForm.tsx`, üç locale, `JoinForm.test.tsx`. Önerilen mesaj: `feat(web): tell invitees when the host is away without blocking the join`.

---

## Task 4: Haritada çevrimdışı pin

**Files:**
- Modify: `frontend/web/src/components/organisms/mapPins.ts`

- [ ] **Step 1: `participantPin`'i güncelle**

`components/organisms/mapPins.ts` — `participantPin` gövdesinde `const wrap = ...` satırını şununla değiştir:

```ts
  // Cevrimdisi katilimci SOLUK cizilir: konumu hala gecerlidir (satir silinmez), yalnizca kisi
  // su an odada degildir. Ayri ikon ya da damga YOK (karar dokumani §4.8).
  const away = p.online === false && !p.manual;
  const wrap = el("flex flex-col items-center" + (away ? " opacity-50" : ""));
```

- [ ] **Step 2: Tip kontrolü ve mevcut testler**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto
pnpm build:web && pnpm --filter @bumpinto/web test --run src/components/organisms/MapView.test.tsx
```

Beklenen: derleme hatasız, MapView testi PASS.

Bu görev için ayrı test **yazılmaz**: `participantPin` yalıtılmış DOM düğümü üretir ve haritasız ortamda hiç çağrılmaz; sınanacak davranış tek bir CSS sınıfıdır (AGENTS.md test eşiği).

- [ ] **Step 3: Commit — kullanıcıya bırak**

`mapPins.ts`. Önerilen mesaj: `feat(web): dim offline participants on the map`.

---

## Task 5: Lobi haritası — `lg`+ varsayılan açık

**Files:**
- Modify: `frontend/web/src/pages/LobbyPage.tsx`
- Test: `frontend/web/src/pages/LobbyPage.test.tsx`

- [ ] **Step 1: Başarısız testi yaz**

`pages/LobbyPage.test.tsx` — dosya sonuna:

```tsx
  it("lg: harita ghost'a basmadan mount edilir", async () => {
    const desktop = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      const view = { ...base, participants: [host, ayse] };
      useSessionStore.setState({ slug: "x7k2m", view: view as never });
      render(<LobbyPage view={view as never} />);
      expect(await screen.findByTestId("mapview")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Haritayı aç" })).not.toBeInTheDocument();
    } finally {
      window.matchMedia = desktop;
    }
  });

  it("390: harita mount edilmez, ghost görünür", () => {
    const view = { ...base, participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Haritayı aç" })).toBeInTheDocument();
  });
```

(jsdom'da `matchMedia` varsayılanı "hiçbir sorgu eşleşmiyor" olduğu için ikinci test 390 davranışını ölçer — `test-setup.ts`'teki not.)

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

```bash
pnpm --filter @bumpinto/web test --run src/pages/LobbyPage.test.tsx
```

Beklenen: ilk yeni test FAIL — bugün harita ghost'un arkasında.

- [ ] **Step 3: `LobbyPage`'i güncelle**

`pages/LobbyPage.tsx` — dosya başındaki `MapView` yorumunu değiştir:

```tsx
/* Harita ayrı chunk — lg+ genişlikte varsayılan olarak mount edilir (2026-09-04 presence
   karari §7; §4.7'nin "Lobi'de ghost arkasinda" maddesi bu kararla degisti). 390'da hala
   ghost: mobilde harita chunk'i ve Maps faturasi bedava degil. */
const MapView = lazy(() => import("../components/organisms/MapView"));
```

Bileşen gövdesine, `const [mapOpen, setMapOpen] = useState(false);` satırını **değiştirerek**:

```tsx
  const desktop = useMediaQuery("(min-width: 1024px)");
  // 390'da ghost'a basilinca; lg'de dogrudan. Kullanicinin ghost'a bastigi durum genislik
  // degisse de korunur (tek yonlu OR).
  const [mapOpen, setMapOpen] = useState(false);
  const showMap = desktop || mapOpen;
```

Import ekle: `import { useMediaQuery } from "../lib/useMediaQuery";`

Sağ bölgedeki `{mapOpen ? ( ... ) : ( <LgOnly>…</LgOnly> )}` bloğunu şununla değiştir:

```tsx
            {showMap ? (
              <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                  <MapView
                    participants={mapParticipants}
                    venues={[]}
                    midpoint={midpoint}
                    radiusKm={radiusKm}
                    pinLabels={pinLabels}
                    heightClass="h-[20rem] lg:h-[calc(100dvh-14rem)]"
                  />
                </Suspense>
              </LazyBoundary>
            ) : (
              <Button type="button" kind="white" size="fit" onClick={() => setMapOpen(true)}>
                {t("lobby.openMap")}
              </Button>
            )}
```

Dikkat: `lgOnly` prop'u **kaldırıldı** (artık mount kararını sayfa veriyor) ve ghost `LgOnly` sarmalayıcısından çıkarıldı (artık 390'ın butonu). `LgOnly` bileşeni başka dört sayfada kullanılıyor — **silme**; yalnız `LobbyPage.tsx`'teki artık kullanılmayan `LgOnly` import satırını kaldır.

- [ ] **Step 4: Testleri çalıştır**

```bash
pnpm --filter @bumpinto/web test --run src/pages/LobbyPage.test.tsx
```

Beklenen: dört testin hepsi PASS.

- [ ] **Step 5: Commit — kullanıcıya bırak**

`LobbyPage.tsx`, `LobbyPage.test.tsx`. Önerilen mesaj: `feat(web): show the lobby map by default on large screens`.

---

## Task 6: Bekle ekranına harita

**Files:**
- Modify: `frontend/web/src/pages/WaitingRoom.tsx`
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`
- Test: `frontend/web/src/pages/WaitingRoom.test.tsx`

- [ ] **Step 1: Eski §4.7 testini yeni politikaya göre yeniden yaz**

`pages/WaitingRoom.test.tsx` — şu testi **sil**:

```tsx
  it("harita hiçbir genişlikte mount edilmez (§4.7)", () => {
    render(<WaitingRoom view={view as never} />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
  });
```

Yerine iki test koy:

```tsx
  /* §4.7'nin "Bekle'de harita yok" maddesi 2026-09-04 presence kararı §7 ile değişti:
     lg'de varsayılan açık, 390'da ghost arkasında. */
  it("lg: harita ghost'a basmadan mount edilir", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      render(<WaitingRoom view={view as never} />);
      expect(await screen.findByTestId("mapview")).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it("390: harita mount edilmez, ghost görünür", () => {
    render(<WaitingRoom view={view as never} />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Haritayı aç" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

```bash
pnpm --filter @bumpinto/web test --run src/pages/WaitingRoom.test.tsx
```

Beklenen: iki yeni test FAIL.

- [ ] **Step 3: i18n anahtarını üç dile ekle**

`tr.json` → `waiting`: `"openMap": "Haritayı aç",`
`en.json` → `waiting`: `"openMap": "Open the map",`
`nl.json` → `waiting`: `"openMap": "Kaart openen",`

- [ ] **Step 4: `WaitingRoom`'a haritayı ekle**

`pages/WaitingRoom.tsx` — import bloğuna ekle:

```tsx
import { Suspense, lazy, useState } from "react";
```

(mevcut `import { useState } from "react";` satırının yerine)

```tsx
import { Button, Note, Page } from "../components/atoms";
import LazyBoundary from "../components/molecules/LazyBoundary";
import { mapProps, useSessionStore, viewerOf } from "../store/sessionStore";
import { useMediaQuery } from "../lib/useMediaQuery";
```

(`Note, Page` importunu `Button` ile genişlet; `useSessionStore, viewerOf` importunu `mapProps` ile genişlet)

Dosyanın üst kısmına, bileşenden **önce**:

```tsx
/* Harita ayrı chunk — lg+ varsayılan, 390'da ghost (2026-09-04 presence kararı §7). */
const MapView = lazy(() => import("../components/organisms/MapView"));
```

Bileşen gövdesinde, `const loc = useOwnLocation();` satırının altına:

```tsx
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [mapOpen, setMapOpen] = useState(false);
  const showMap = desktop || mapOpen;
  const { participants: mapParticipants, midpoint, radiusKm, pinLabels } = mapProps(view, t("map.you"));
```

Sağ bölgede `<MidpointCard view={view} />` satırının **hemen altına**:

```tsx
            {showMap ? (
              <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                  <MapView
                    participants={mapParticipants}
                    venues={[]}
                    midpoint={midpoint}
                    radiusKm={radiusKm}
                    pinLabels={pinLabels}
                    heightClass="h-[20rem] lg:h-[24rem]"
                  />
                </Suspense>
              </LazyBoundary>
            ) : (
              <Button type="button" kind="white" size="fit" onClick={() => setMapOpen(true)}>
                {t("waiting.openMap")}
              </Button>
            )}
```

Bileşenin javadoc yorumunu güncelle: `Harita YOK (§4.7 …)` cümlesini şununla değiştir:

```tsx
    Harita lg+ genişlikte varsayılan açık, 390'da ghost arkasında (2026-09-04 presence kararı
    §7 — §4.7'nin "Bekle'de harita yok" maddesi değişti). Kadraj otomatik: yeni katılımcı
    geldiğinde `refresh()` görünümü tazeler, `MapView` kamerayı kendisi yeniden sığdırır.
```

- [ ] **Step 5: Testleri çalıştır**

```bash
pnpm --filter @bumpinto/web test --run src/pages/WaitingRoom.test.tsx
```

Beklenen: hepsi PASS.

- [ ] **Step 6: Commit — kullanıcıya bırak**

`WaitingRoom.tsx`, üç locale, `WaitingRoom.test.tsx`. Önerilen mesaj: `feat(web): put the live map on the waiting screen`.

---

## Task 7: `shuffle` 409'u yol gösteren mesaja çevir

**Files:**
- Modify: `frontend/web/src/store/useSessionAction.ts`
- Modify: `frontend/web/src/pages/VenuesPage.tsx` (satır 34)
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`
- Test: `frontend/web/src/store/sessionStore.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`store/sessionStore.test.ts` — dosya sonuna yeni bir `describe`:

```ts
describe("useSessionAction — duruma özel hata", () => {
  it("409 verilen anahtara, diğer hatalar genel anahtara düşer", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { useSessionAction } = await import("./useSessionAction");
    const { AxiosError } = await import("axios");

    const conflict = new AxiosError("conflict");
    conflict.response = { status: 409 } as never;

    const { result } = renderHook(() => useSessionAction());

    await act(async () => {
      await result.current.run(() => Promise.reject(conflict), "venues.errShuffle", {
        409: "venues.errAlone",
      });
    });
    expect(result.current.error).toContain("tek kişisin");

    await act(async () => {
      await result.current.run(() => Promise.reject(new Error("boom")), "venues.errShuffle", {
        409: "venues.errAlone",
      });
    });
    expect(result.current.error).toBe("Deste açılamadı — tekrar dene.");
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

```bash
pnpm --filter @bumpinto/web test --run src/store/sessionStore.test.ts
```

Beklenen: FAIL — `run` üçüncü argüman almıyor.

- [ ] **Step 3: i18n anahtarını üç dile ekle**

`tr.json` → `venues`:

```json
    "errAlone": "Şu an oturumda tek kişisin — deste açmak için en az iki kişi gerek. Beklemek istemiyorsan listeden bir yer seçip kararı kapatabilirsin.",
```

`en.json` → `venues`:

```json
    "errAlone": "You're the only one here right now — starting the deck needs at least two people. If you'd rather not wait, pick a place from the list and close the decision.",
```

`nl.json` → `venues`:

```json
    "errAlone": "Je bent nu de enige hier — voor een deck zijn minstens twee mensen nodig. Wil je niet wachten, kies dan een plek uit de lijst en sluit de beslissing af.",
```

- [ ] **Step 4: `useSessionAction`'ı genişlet**

`store/useSessionAction.ts` dosyasını tamamen şununla değiştir:

```ts
import { useState } from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

/** Sayfa aksiyonu: tek çalıştırma kilidi + i18n hata anahtarı → metin (Lobi, Bireysel kurulum, Mekanlar).
    `byStatus` verilirse o HTTP kodu için özel anahtar kullanılır: bazı 409'lar çıkmaz sokak değil,
    kullanıcıya yol gösteren bir durumdur (ör. "tek kişisin, listeden seçebilirsin"). */
export function useSessionAction() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(
    action: () => Promise<void>,
    errorKey: string,
    byStatus?: Record<number, string>,
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      const status = e instanceof AxiosError ? e.response?.status : undefined;
      const special = status == null ? undefined : byStatus?.[status];
      setError(t(special ?? errorKey));
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, error };
}
```

- [ ] **Step 5: `VenuesPage`'i güncelle**

`pages/VenuesPage.tsx` satır 34'teki `onClick`'i değiştir:

```tsx
              onClick={() => void run(shuffle, "venues.errShuffle", { 409: "venues.errAlone" })}
```

- [ ] **Step 6: Testleri çalıştır**

```bash
pnpm --filter @bumpinto/web test --run src/store/sessionStore.test.ts
```

Beklenen: PASS.

- [ ] **Step 7: Commit — kullanıcıya bırak**

`useSessionAction.ts`, `VenuesPage.tsx`, üç locale, `sessionStore.test.ts`. Önerilen mesaj: `feat(web): explain the alone-in-session shuffle conflict instead of a bare error`.

---

## Task 8: Tam tur ve elle doğrulama

- [ ] **Step 1: Tüm web testleri**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && pnpm test:web
```

Beklenen: sıfır failure.

- [ ] **Step 2: i18n paritesi**

```bash
pnpm i18n:check
```

Beklenen: eksik/fazla anahtar yok.

- [ ] **Step 3: Derleme**

```bash
pnpm build:web
```

Beklenen: `tsc -b` + `vite build` hatasız.

- [ ] **Step 4: Elle duman testi (backend ayakta, `pnpm dev:web`)**

1. Normal pencerede oturum kur → Lobi'de harita **ghost'a basmadan** görünüyor (1280 genişlik).
2. Davet linkini gizli pencerede aç, konumla katıl → Lobi haritasında yeni pin **kendiliğinden** belirdi ve kadraj ikisini birden kapsayacak şekilde genişledi.
3. Gizli penceredeki Bekle ekranında da harita var ve iki pini gösteriyor.
4. Gizli pencereyi kapat → ~50 sn içinde Lobi roster'ında davetli **soluk** + "çevrimdışı", pini soluk.
5. "Mekanları bul" → Mekanlar → "Karıştır ve kaydır" → `Şu an oturumda tek kişisin…` mesajı.
6. Gizli pencereyi geri aç ve katıl → "Karıştır ve kaydır" çalışıyor.
7. Davet linkini host sekmesi **kapalıyken** yeni bir tarayıcıda aç → Katıl formu açılıyor, "Mehmet şu an oturumda değil" notu var, **Katıl butonu çalışıyor**.

- [ ] **Step 5: Commit — kullanıcıya bırak**

Kalan değişiklikler. Önerilen mesaj: `test(web): cover presence surfaces and the new map mount policy`.

---

## W-7 tamamlanma kriteri

- [ ] `pnpm test:web` yeşil, `pnpm i18n:check` temiz, `pnpm build:web` hatasız
- [ ] WS `/api/sessions/{slug}/ws` üzerinden bağlanıyor, `presence_changed` ekranı tazeliyor
- [ ] Çevrimdışı katılımcı roster'da ve haritada soluk + "çevrimdışı"
- [ ] Katıl ekranı host çevrimdışıyken uyarıyor ama **engellemiyor**
- [ ] Lobi ve Bekle'de `lg` haritası varsayılan açık, 390'da ghost
- [ ] Yeni katılımcı geldiğinde harita kendiliğinden yeniden kadrajlanıyor
- [ ] Tek kişilik `shuffle` 409'u yol gösteren metne düşüyor
