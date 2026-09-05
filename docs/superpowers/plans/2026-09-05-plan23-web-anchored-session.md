# W-9 — Çapalı oturum + harita seçici (web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host "orta noktada" yerine "belli bir yerde" seçebilsin; host ve katılımcı konumu
haritadan işaretleyebilsin; harita pop kartından Google Haritalar'a çıkılabilsin.

**Architecture:** `MapPicker` tek nokta toplayan yeni bir organism — `MapView` genişletilmez.
Çapa bayrağı bileşenlere prop olarak **sürüklenmez**: `FairnessBadge`'in dört render yerinin
hepsi zaten `TravelInfo` nesnesini alıyor, bayrak oraya girer. Harita ancak düğmeye basınca
mount edilir; faturalanan birim `new google.maps.Map()`.

**Tech Stack:** React 19, TypeScript, Zustand, react-i18next, Tailwind v4, Vitest +
Testing Library, `@googlemaps/js-api-loader`.

**Kaynak spec:** [2026-09-05-anchored-session-design.md](../specs/2026-09-05-anchored-session-design.md)
**Önkoşul:** B-10 ([plan22](2026-09-05-plan22-backend-anchored-session.md)) tamamlanmış olmalı.

---

## Yürütme grupları

**W-8'in aksine bu planda `tsc`'nin kırmızı kaldığı bir aralık YOK:** backend'den gelen iki
alan da (`anchor`, `anchored`) eklemeli/opsiyonel, `TravelInfo.anchored` opsiyonel. Bu yüzden
gruplar **bağımsız commit edilebilir** — biri geri alınsa diğerleri ayakta kalır.

| Grup | Görev | Bağımsız mı |
|---|---|---|
| **W-G1** | T1 | Codegen — backend ayakta olmalı. Diğer her şeyin önkoşulu. |
| **W-G2** | T2, T3 | `venueLink` + pop kart bağlantısı. Çapadan tamamen bağımsız, tek başına sevk edilebilir. |
| **W-G3** | T4 | `TravelInfo.anchored` + `FairnessBadge` kapısı. |
| **W-G4** | T5, T6 | `MapPicker` + `LocationField` düğmesi + katılım akışı. |
| **W-G5** | T7, T8, T9 | Çapa modu: store, `NewSessionPage`, `MidpointCard`. |
| **W-G6** | T10 | Harita sayacı + i18n denetimi. |

> **Vitest tipleri sıyırır, denetlemez.** `pnpm test:web` yeşilken `tsc --noEmit` kırmızı
> olabilir (W-8 dersi). Her grup sonunda **dördünü de** koş:
> `tsc --noEmit` · `pnpm test:web` · `pnpm i18n:check` · `pnpm build:web`.
> Test **sayısını** karşılaştır, yalnız "passed" yazısına bakma.

**Başlangıç referansı:** 289 test / 52 dosya, `tr 350 · en 358 · nl 358`.

---

## Dosya haritası

**Oluşturulacak**
- `frontend/web/src/lib/venueLink.ts` — mekanın kanonik dış bağlantısı
- `frontend/web/src/lib/venueLink.test.ts`
- `frontend/web/src/components/organisms/MapPicker.tsx` — tek nokta toplayan harita
- `frontend/web/src/components/organisms/MapPicker.test.tsx`

**Değişecek**
- `frontend/shared/openapi.json` + üretilen tipler (codegen)
- `lib/useTravelLabels.ts` — `TravelInfo.anchored`
- `components/molecules/FairnessBadge.tsx` — tek satırlık kapı
- `components/molecules/WinnerCard.tsx` — satır içi zincir → `venueLink`
- `components/molecules/VenuePopCard.tsx` — bağlantı satırı
- `components/molecules/LocationField.tsx` — "haritadan seç" düğmesi
- `components/molecules/JoinFormFields.tsx` — prop geçişi
- `components/molecules/MidpointCard.tsx` — çapa metni
- `pages/JoinForm.tsx` — picker katmanı
- `pages/NewSessionPage.tsx` — çapa alanı + picker katmanı
- `store/newSessionStore.ts` — `anchorMode`, `anchor`
- `lib/maps.ts` — sayaç yeri
- `i18n/locales/{tr,en,nl}.json` — 16 anahtar (4 harita + 8 çapa + 4 orta nokta kartı), 1 taşıma

---

# W-G1 — Tipler

### Task 1: Codegen

**Files:**
- Modify: `frontend/shared/openapi.json` (üretilir)

- [ ] **Step 1: Backend'i ayağa kaldır**

```bash
cd backend && mvn -o spring-boot:run
```

Başka bir terminalde devam et. Süreç bu görev bitince **kapatılmalı** (W-8'de 8060'ta
başıboş bir süreç kalmıştı).

- [ ] **Step 2: Tipleri üret**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && pnpm codegen
```

- [ ] **Step 3: İki alanın geldiğini doğrula**

```bash
grep -c "anchored" frontend/shared/openapi.json   # >= 1
grep -c "AnchorDto" frontend/shared/openapi.json  # >= 1
```

Expected: ikisi de sıfırdan büyük. Sıfırsa backend eski sürümü koşuyor — B-10 commit'lerinin
hepsi uygulanmış mı bak.

- [ ] **Step 4: Derlemenin bozulmadığını gör**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && pnpm exec tsc --noEmit -p frontend/web
```

Expected: 0 hata. İki alan da opsiyonel/eklemeli olduğu için hiçbir çağrı yeri kırılmaz.

- [ ] **Step 5: Backend sürecini kapat**

```bash
lsof -ti:8060 | xargs -r kill
```

- [ ] **Step 6: Commit**

```
chore(shared): regenerate API types for session anchor
```

---

# W-G2 — Google Haritalar çıkışı

### Task 2: `venueLink`

**Files:**
- Create: `frontend/web/src/lib/venueLink.ts`
- Create: `frontend/web/src/lib/venueLink.test.ts`
- Modify: `frontend/web/src/components/molecules/WinnerCard.tsx:77-84`

- [ ] **Step 1: Önce testi yaz**

`frontend/web/src/lib/venueLink.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { venueLink } from "./venueLink";

describe("venueLink", () => {
  it("mekanın kendi sayfası varsa onu döner — 'detay' isteği yorum/fotoğraf demek", () => {
    expect(venueLink({ placeLink: "https://maps/place/x", mapsUrl: "https://maps/dir/x" }))
      .toBe("https://maps/place/x");
  });

  it("kendi sayfası yoksa yol tarifi adresine düşer", () => {
    expect(venueLink({ mapsUrl: "https://maps/dir/x" })).toBe("https://maps/dir/x");
  });

  it("ikisi de yoksa null — ölü href='#' basılmaz", () => {
    expect(venueLink({})).toBeNull();
  });

  it("boş dize bağlantı sayılmaz", () => {
    expect(venueLink({ placeLink: "", mapsUrl: "https://maps/dir/x" }))
      .toBe("https://maps/dir/x");
  });
});
```

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/lib/venueLink.test.ts`
Expected: FAIL — `Failed to resolve import "./venueLink"`.

- [ ] **Step 3: `venueLink.ts`'i yaz**

```ts
import type { VenueDto } from "@bumpinto/shared";

/** Mekanın kanonik dış bağlantısı: önce kendi sayfası (yorum/fotoğraf — "detay" isteğinin
    karşılığı), sonra yol tarifi. Zincir TEK yerde: WinnerCard ve VenuePopCard aynı sıralamayı
    okur; iki yerde ayrı yazılsaydı sessizce ayrışırdı.

    Üçüncü halka (lat/lng'den hesaplanan yol tarifi adresi) YOK: backend'in
    SessionViewAssembler.directionsUrl'i mapsUrl boşsa onu zaten üretip DTO'ya koyuyor. */
export function venueLink(v: Pick<VenueDto, "placeLink" | "mapsUrl">): string | null {
  return v.placeLink || v.mapsUrl || null;
}
```

- [ ] **Step 4: Yeşil olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/lib/venueLink.test.ts`
Expected: PASS, 4 test.

- [ ] **Step 5: `WinnerCard`'ı tek kaynağa bağla**

`WinnerCard.tsx` içindeki şu bloğu SİL:

```tsx
  // "Yol tarifi al" kalktı (§4.7 harita politikası) — tek bağlantı, tek href kaynağı.
  // href yoksa buton HİÇ render edilmez (ölü href="#" düzelir).
  const href =
    props.venue.placeLink ??
    props.venue.mapsUrl ??
    (props.venue.lat != null && props.venue.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${props.venue.lat},${props.venue.lng}`
      : null);
```

Yerine:

```tsx
  // "Yol tarifi al" kalktı (§4.7 harita politikası) — tek bağlantı, tek href kaynağı.
  // href yoksa buton HİÇ render edilmez (ölü href="#" düzelir).
  const href = venueLink(props.venue);
```

Import ekle: `import { venueLink } from "../../lib/venueLink";`

`{t("result.openInMaps")}` → `{t("venue.openInMaps")}`.

- [ ] **Step 6: i18n anahtarını taşı**

`i18n/locales/tr.json`, `en.json`, `nl.json` — `result.openInMaps` **silinir**,
`venue` bloğuna eklenir:

| dosya | değer |
|---|---|
| `tr.json` | `"openInMaps": "Haritada aç"` |
| `en.json` | `"openInMaps": "Open in Maps"` |
| `nl.json` | `"openInMaps": "Openen in Maps"` |

> Mevcut `result.openInMaps` değerlerini önce oku ve **aynı metni** taşı; yukarıdaki tablo
> yalnız yer tutucu değil, gerçek değerle eşleşmiyorsa gerçeği kullan.

- [ ] **Step 7: Kapıları koş**

```bash
pnpm exec tsc --noEmit -p frontend/web && pnpm test:web && pnpm i18n:check
```

Expected: 0 tip hatası; **293 test** (289 + 4); i18n sayıları değişmez (`tr 350 · en 358 ·
nl 358`) çünkü anahtar taşındı, eklenmedi.

---

### Task 3: `VenuePopCard` bağlantı satırı

**Files:**
- Modify: `frontend/web/src/components/molecules/VenuePopCard.tsx:41-49`
- Create: `frontend/web/src/components/molecules/VenuePopCard.test.tsx` (planın tek yeni test dosyası)

- [ ] **Step 1: Önce testi yaz**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VenuePopCard from "./VenuePopCard";

const venue = {
  id: "v1",
  name: "Café Berlage",
  lat: 52.36,
  lng: 4.9,
  placeLink: "https://maps/place/berlage",
} as never;

describe("VenuePopCard", () => {
  it("Google Haritalar bağlantısını basar — pini tıklayan zaten inceleme modunda", () => {
    render(<VenuePopCard venue={venue} tint={0} travel={{ labels: {} }} />);
    const link = screen.getByRole("link", { name: /maps/i });
    expect(link).toHaveAttribute("href", "https://maps/place/berlage");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("action yuvası doluyken de bağlantı durur — ikisi aynı yeri paylaşmıyor", () => {
    render(
      <VenuePopCard
        venue={venue}
        tint={0}
        travel={{ labels: {} }}
        action={<button type="button">Kilitle</button>}
      />,
    );
    expect(screen.getByRole("link", { name: /maps/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kilitle" })).toBeInTheDocument();
  });

  it("bağlantı yoksa hiç link basılmaz — ölü href üretilmez", () => {
    render(<VenuePopCard venue={{ id: "v2", name: "X" } as never} tint={0} travel={{ labels: {} }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
```

> `VenuePopCard.test.tsx` bu planda **yeni açılan tek test dosyasıdır**. i18n kurulumu için
> `components/molecules/VenueRow.test.tsx`'in render yardımcısını birebir taklit et; yeni
> kurgu icat etme.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/components/molecules/VenuePopCard.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "link"`.

- [ ] **Step 3: Bağlantıyı ekle**

`VenuePopCard.tsx` içinde `{props.action}` satırının HEMEN ÜSTÜNE:

```tsx
        {/* Bağlantı `action` yuvasına GİRMEZ: orası onay durumunda SelectionCard ile dolu ve
            dış çıkış "Kilitle" ile birincillik yarışına girmemeli — ghost, kendi satırında. */}
        {link && (
          <LinkButton href={link} target="_blank" rel="noreferrer" kind="ghost" size="fit">
            {t("venue.openInMaps")}
          </LinkButton>
        )}
```

Bileşenin başına, `const v = props.venue;` altına:

```tsx
  const link = venueLink(v);
```

Import ekle:

```tsx
import { venueLink } from "../../lib/venueLink";
import { LinkButton, Overline } from "../atoms";
```

(mevcut `import { Overline } from "../atoms";` satırı yukarıdakiyle değiştirilir)

- [ ] **Step 4: Yeşil olduğunu gör ve kapıları koş**

```bash
pnpm exec tsc --noEmit -p frontend/web && pnpm test:web && pnpm i18n:check && pnpm build:web
```

Expected: 0 tip hatası; **296 test** (293 + 3); i18n değişmez; build başarılı.

- [ ] **Step 5: Commit (T2 + T3)**

```
feat(venue): link out to Google Maps from the map pop card

The fallback chain moves to lib/venueLink so WinnerCard and VenuePopCard
read one ordering. Deliberately not added to the swipe deck or the list.
```

---

# W-G3 — Çapada adalet rozeti

### Task 4: `TravelInfo.anchored` + `FairnessBadge` kapısı

**Files:**
- Modify: `frontend/web/src/lib/useTravelLabels.ts`
- Modify: `frontend/web/src/components/molecules/FairnessBadge.tsx`
- Test: `frontend/web/src/components/molecules/FairnessBadge.test.tsx` (var — sonuna ekle)

- [ ] **Step 1: Önce testi yaz**

Dört render yerinin de aynı kapıdan geçtiğini kanıtlamak için rozetin **kendisi** ve iki
sarmalayıcısı denenir.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FairnessBadge from "./FairnessBadge";
import VenueCard from "./VenueCard";
import VenueMeta from "./VenueMeta";

const fair = {
  id: "v1",
  name: "Café",
  lat: 52.3,
  lng: 4.9,
  travelMinutes: { a: 20, b: 25 },
  fairness: { maxMinutes: 25, spreadMinutes: 5, longestParticipantId: "b" },
} as never;

const labels = { labels: { a: "Ali", b: "Ayşe" }, selfId: "a" };

describe("FairnessBadge çapalı oturumda", () => {
  it("çapasızken rozet basılır", () => {
    render(<FairnessBadge venue={fair} travel={labels} />);
    expect(screen.getByText(/aynı|same|zelfde/i)).toBeInTheDocument();
  });

  it("çapalıyken rozet HİÇ basılmaz — 20 kartın hepsinde aynı şeyi yazardı", () => {
    render(<FairnessBadge venue={fair} travel={{ ...labels, anchored: true }} />);
    expect(screen.queryByText(/aynı|same|zelfde/i)).not.toBeInTheDocument();
  });

  it("VenueMeta yolu da kapanır (VenueRow ve VenuePopCard buradan geçer)", () => {
    render(<VenueMeta venue={fair} travel={{ ...labels, anchored: true }} />);
    expect(screen.queryByText(/aynı|same|zelfde/i)).not.toBeInTheDocument();
  });

  it("VenueCard polaroid dalı da kapanır", () => {
    render(<VenueCard venue={fair} travel={{ ...labels, anchored: true }} />);
    expect(screen.queryByText(/aynı|same|zelfde/i)).not.toBeInTheDocument();
  });

  it("VenueCard row dalı da kapanır", () => {
    render(<VenueCard venue={fair} variant="row" travel={{ ...labels, anchored: true }} />);
    expect(screen.queryByText(/aynı|same|zelfde/i)).not.toBeInTheDocument();
  });

  it("çapalıyken yol süreleri KALIR — kişi başı dakika gerçek bilgi", () => {
    render(<VenueCard venue={fair} travel={{ ...labels, anchored: true }} />);
    expect(screen.getByText(/20/)).toBeInTheDocument();
  });
});
```

> `FairnessBadge.test.tsx` **zaten var** — yeni dosya açma, bu testleri mevcut dosyanın
> sonuna ekle ve oradaki render yardımcısını kullan. Bu kod tabanının test kuralı **birebir
> Türkçe metindir**, regex değil (bkz. `NewSessionPage.test.tsx`): yukarıdaki
> `/aynı|same|zelfde/i` yerine mevcut testlerin `fairness.same` için kullandığı tam dizeyi
> kullan.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/components/molecules/FairnessBadge.test.tsx`
Expected: FAIL — `anchored` özelliği `TravelInfo` üzerinde yok (tsc) ve rozet basılmaya
devam ediyor (5 test kırmızı).

- [ ] **Step 3: `TravelInfo`'ya alanı ekle**

`lib/useTravelLabels.ts`:

```ts
export type TravelInfo = {
  labels: Record<string, string>;
  selfId?: string | null;
  /** Çapalı oturum: FairnessBadge mekanları KIYASLADIĞI için çizilmez — 2 km'lik daire
      içinde 20 kartın hepsinde aynı şeyi yazar. Ayrı bir prop olarak dört render yerine
      sürüklenseydi biri sessizce düşerdi (W-8 `mixedDeck` dersi); bu nesne dördüne de
      zaten geçiyor. */
  anchored?: boolean;
};
```

`useTravelLabels`'ın dönüşü:

```ts
    return {
      labels,
      selfId: view?.viewer?.participantId ?? null,
      anchored: view?.anchored ?? false,
    };
```

- [ ] **Step 4: `FairnessBadge`'e kapıyı koy**

`const f = fairnessOf(props.venue);` satırının ÜSTÜNE:

```tsx
  // Çapalı oturumda rozet ayırt etmiyor (spec K6) — çizilmez. Yol süreleri (TravelChips)
  // ve karar ekranındaki tek mekanlık ADALET ekseni (WhyHere) etkilenmez: onlar kıyas
  // değil olgu bildirir.
  if (props.travel.anchored) return null;
```

- [ ] **Step 5: Kapıları koş**

```bash
pnpm exec tsc --noEmit -p frontend/web && pnpm test:web && pnpm i18n:check
```

Expected: 0 tip hatası; **302 test** (296 + 6); i18n değişmez.

- [ ] **Step 6: Commit**

```
feat(fairness): hide the fairness badge in anchored sessions

The flag rides on TravelInfo, which all four render sites already receive,
so no call site changes. Travel chips and WhyHere's fairness axis stay.
```

---

# W-G4 — Harita seçici

### Task 5: `MapPicker` organism

**Files:**
- Create: `frontend/web/src/components/organisms/MapPicker.tsx`
- Create: `frontend/web/src/components/organisms/MapPicker.test.tsx`

- [ ] **Step 1: Önce testi yaz**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MapPicker from "./MapPicker";

vi.mock("../../lib/maps", () => ({
  mapsConfigured: () => false,
  loadMaps: vi.fn(),
  MAP_ID: "test-map",
}));

describe("MapPicker", () => {
  it("Maps yapılandırılmamışsa harita yerine açıklama basar, çökmez", () => {
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/harita|map|kaart/i)).toBeInTheDocument();
  });

  it("iptal düğmesi onCancel çağırır", async () => {
    const onCancel = vi.fn();
    const { getByRole } = render(
      <MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={onCancel} />,
    );
    getByRole("button", { name: /iptal|cancel|annuleren/i }).click();
    expect(onCancel).toHaveBeenCalled();
  });
});
```

> jsdom'da gerçek Google haritası mount edilemez; bu yüzden test `mapsConfigured: false`
> yolunu doğrular. Harita davranışının kendisi (tıklama → koordinat) elle denenir — bunu
> sahte bir `google.maps` küresi kurarak test etmek, test ettiğimiz şeyin kendi taklidimiz
> olması demek olurdu.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/components/organisms/MapPicker.test.tsx`
Expected: FAIL — `Failed to resolve import "./MapPicker"`.

- [ ] **Step 3: `MapPicker`'ı yaz**

```tsx
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAP_ID, loadMaps, mapsConfigured } from "../../lib/maps";
import type { LatLng } from "../../lib/geo";
import { reverseGeocode } from "../../lib/geocode";
import { Button, Note } from "../atoms";

/** Tek nokta toplayan harita. `MapView` genişletilmedi: o katılımcı/mekan çizip kamera
    sığdırıyor, bu tek koordinat topluyor — aynı bileşene sıkıştırmak ikisini de bozar.
    Ortak olan `loadMaps`/`MAP_ID` zaten ayrı modülde.

    Ters geocode ONAYDA bir kez çalışır, sürüklemede değil: Nominatim kullanım politikası
    saniyede bir isteği aşan trafiği kabul etmiyor. */
const PICK_ZOOM = 13;

export default function MapPicker(props: {
  center: LatLng;
  onPick: (loc: { lat: number; lng: number; label: string | null }) => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [point, setPoint] = useState<LatLng>(props.center);
  const [busy, setBusy] = useState(false);
  const configured = mapsConfigured();

  useEffect(() => {
    if (!configured || !box.current) return;
    let alive = true;
    loadMaps(i18n.language)
      .then(() => {
        if (!alive || !box.current) return;
        const map = new google.maps.Map(box.current, {
          mapId: MAP_ID,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          center: props.center,
          zoom: PICK_ZOOM,
        });
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: props.center,
          gmpDraggable: true,
        });
        markerRef.current = marker;
        marker.addListener("dragend", () => {
          const p = marker.position;
          if (p) setPoint({ lat: Number(p.lat), lng: Number(p.lng) });
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.position = next;
          setPoint(next);
        });
      })
      .catch(() => {
        /* yapılandırma yoksa aşağıdaki not zaten basılı */
      });
    return () => {
      alive = false;
    };
    // yalnız ilk mount: merkez sonradan değişse kullanıcının seçimi ezilmemeli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  async function confirm() {
    setBusy(true);
    try {
      const label = await reverseGeocode(point.lat, point.lng);
      props.onPick({ ...point, label });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="h-[16rem] overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7]">
        {configured ? (
          <div ref={box} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Note center>{t("map.notConfigured")}</Note>
          </div>
        )}
      </div>
      <Note>{t("map.pickHint")}</Note>
      <div className="flex gap-2">
        <Button type="button" size="fit" onClick={() => void confirm()} disabled={busy || !configured}>
          {t("map.pickConfirm")}
        </Button>
        <Button type="button" kind="white" size="fit" onClick={props.onCancel}>
          {t("map.pickCancel")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: i18n anahtarlarını ekle** (üç dosyaya da, `map` bloğuna)

| anahtar | tr | en | nl |
|---|---|---|---|
| `map.pickOnMap` | Haritadan seç | Pick on map | Kies op de kaart |
| `map.pickHint` | Haritaya dokun ya da pini sürükle | Tap the map or drag the pin | Tik op de kaart of sleep de speld |
| `map.pickConfirm` | Burayı seç | Use this spot | Kies deze plek |
| `map.pickCancel` | İptal | Cancel | Annuleren |

- [ ] **Step 5: Yeşil olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/components/organisms/MapPicker.test.tsx`
Expected: PASS, 2 test.

---

### Task 6: `LocationField` düğmesi + katılım akışı

**Files:**
- Modify: `frontend/web/src/components/molecules/LocationField.tsx`
- Modify: `frontend/web/src/components/molecules/JoinFormFields.tsx`
- Modify: `frontend/web/src/pages/JoinForm.tsx`
- Test: `frontend/web/src/pages/JoinForm.test.tsx`

- [ ] **Step 1: Önce testi yaz** (`JoinForm.test.tsx`, mevcut `describe` içine)

```tsx
  it("390'da harita seçici VARSAYILAN mount edilmez — yükleme başına ücret buradan doğar", () => {
    renderJoin();
    expect(screen.queryByRole("button", { name: "Burayı seç" })).not.toBeInTheDocument();
  });

  it("'haritadan seç'e basılınca seçici açılır", async () => {
    renderJoin();
    await userEvent.click(screen.getByRole("button", { name: "Haritadan seç" }));
    expect(await screen.findByRole("button", { name: "Burayı seç" })).toBeInTheDocument();
  });
```

> `pages/JoinForm.test.tsx` **zaten var** — bu iki testi sonuna ekle ve dosyadaki mevcut
> render yardımcısını kullan (`renderJoin` yoksa oradaki adı neyse o). `userEvent` importu
> yoksa ekle.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/pages/JoinForm.test.tsx`
Expected: İlk test PASS (henüz seçici yok), ikinci FAIL — düğme bulunamıyor.

- [ ] **Step 3: `LocationField`'a düğmeyi ekle**

Props tipine ekle:

```tsx
  /** Verilirse "haritadan seç" düğmesi çıkar. Harita AÇILINCA mount edilir — faturalanan
      birim `new google.maps.Map()` ve 390'da katılım ekranı bugün hiç harita mount etmiyor. */
  onPickOnMap?: () => void;
```

`state === "idle"` ve `state === "denied"` dallarının SONUNA (her ikisine de, `TextInput`'un
hemen altına) ekle:

```tsx
          {props.onPickOnMap && (
            <button
              type="button"
              onClick={props.onPickOnMap}
              className="self-start text-[0.75rem] font-normal text-flame-deep underline-offset-2 hover:underline focus-visible:underline"
            >
              {t("map.pickOnMap")}
            </button>
          )}
```

`state === "granted"` dalına EKLENMEZ: konum zaten var, üçüncü bir yol sunmak kartın
"tamam" mesajıyla çelişir; kullanıcı önce "başka adres"e basar.

- [ ] **Step 4: `JoinFormFields`'ten geçir**

Props tipine `onPickOnMap?: () => void;` ekle ve `<LocationField ... />`'a
`onPickOnMap={props.onPickOnMap}` geçir.

- [ ] **Step 5: `JoinForm`'a katmanı koy**

`JoinForm.tsx` başına:

```tsx
const MapPicker = lazy(() => import("../components/organisms/MapPicker"));
```

Bileşen içine:

```tsx
  const [pickerOpen, setPickerOpen] = useState(false);
```

`<JoinFormFields ... />`'a `onPickOnMap={() => setPickerOpen(true)}` ekle ve HEMEN ALTINA:

```tsx
            {pickerOpen && (
              <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                  <MapPicker
                    center={loc.coords ?? { lat: 52.0907, lng: 5.1214 }}
                    onPick={(picked) => {
                      loc.setPicked(picked);
                      setPickerOpen(false);
                    }}
                    onCancel={() => setPickerOpen(false)}
                  />
                </Suspense>
              </LazyBoundary>
            )}
```

- [ ] **Step 6: `useOwnLocation`'a `setPicked` ekle**

`store/useOwnLocation.ts` içine, `otherAddress`'in yanına:

```ts
  /** Haritadan seçilen nokta: adres alanı temizlenir, konum "granted" sayılır — kullanıcı
      açıkça bir yer işaretledi, tarayıcı izni beklemenin anlamı yok. */
  function setPicked(picked: Coords) {
    setAddressState("");
    addressRef.current = "";
    setCoords(picked);
    setState("granted");
  }
```

`return { ... }` nesnesine `setPicked` ekle.

- [ ] **Step 7: Kapıları koş**

```bash
pnpm exec tsc --noEmit -p frontend/web && pnpm test:web && pnpm i18n:check && pnpm build:web
```

Expected: 0 tip hatası; **306 test** (302 + 2 MapPicker + 2 JoinForm); i18n
`tr 354 · en 362 · nl 362` (+4).

- [ ] **Step 8: Commit (T5 + T6)**

```
feat(location): pick a location on the map from the join form

The map mounts only after the button is pressed: a map instance is the
billable unit and the 390px join screen mounts none today.
```

---

# W-G5 — Çapa modu

### Task 7: `newSessionStore` çapa alanları

**Files:**
- Modify: `frontend/web/src/store/newSessionStore.ts`
- Test: `frontend/web/src/store/newSessionStore.test.ts`

- [ ] **Step 1: Önce testi yaz**

```ts
  it("çapa modunda istek anchor taşır ve host konumu göndermez", async () => {
    const spy = vi.spyOn(api, "createSession").mockResolvedValue({ slug: "abc" } as never);
    const s = useNewSessionStore.getState();
    s.setAnchorMode("ANCHOR");
    s.setAnchor({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });

    await useNewSessionStore.getState().submit("Mehmet", null);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        anchor: { lat: 52.3676, lng: 4.9041, label: "Amsterdam" },
        lat: undefined,
        lng: undefined,
      }),
    );
  });

  it("orta nokta modunda anchor gönderilmez", async () => {
    const spy = vi.spyOn(api, "createSession").mockResolvedValue({ slug: "abc" } as never);
    useNewSessionStore.getState().reset();

    await useNewSessionStore.getState().submit("Mehmet", { lat: 51.7, lng: 5.3, label: "Den Bosch" });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ anchor: undefined, lat: 51.7 }));
  });

  it("reset çapayı da temizler — önceki oturumun yeri sızmaz", () => {
    const s = useNewSessionStore.getState();
    s.setAnchorMode("ANCHOR");
    s.setAnchor({ lat: 52.3, lng: 4.9, label: "Amsterdam" });
    useNewSessionStore.getState().reset();
    expect(useNewSessionStore.getState().anchor).toBeNull();
    expect(useNewSessionStore.getState().anchorMode).toBe("MIDPOINT");
  });
```

> `store/newSessionStore.test.ts` **zaten var** — bu üç testi sonuna ekle. `api` mock'unun
> mevcut dosyada nasıl kurulduğuna bak ve aynısını kullan.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/store/newSessionStore.test.ts`
Expected: FAIL — `setAnchorMode is not a function`.

- [ ] **Step 3: Store'u genişlet**

`State` tipine:

```ts
  anchorMode: AnchorMode; anchor: Loc | null;
  setAnchorMode: (m: AnchorMode) => void; setAnchor: (a: Loc | null) => void;
```

Dosya başına:

```ts
export type AnchorMode = "MIDPOINT" | "ANCHOR";
```

`initial()`'ın `Pick<...>` listesine `"anchorMode" | "anchor"` ekle ve nesneye:

```ts
  anchorMode: "MIDPOINT",
  anchor: null,
```

Eylemler:

```ts
  /** Moddan çıkınca çapa DA temizlenir: ekranda görünmeyen bir çapanın istekte kalması
      "orta nokta seçtim ama Amsterdam geldi" demek olurdu. */
  setAnchorMode: (m) => set(m === "MIDPOINT" ? { anchorMode: m, anchor: null } : { anchorMode: m }),
  setAnchor: (a) => set({ anchor: a }),
```

`submit`'in imzası `own`'ı nullable alır ve gövdesi:

```ts
  submit: async (displayName, own) => {
    const { type, activities, name, points, travelMode, anchorMode, anchor } = get();
    const anchored = anchorMode === "ANCHOR" && anchor != null;
    set({ busy: true, error: null });
    try {
      let slug: string;
      try {
        const r = await api.createSession({
          activityTypes: activities,
          sessionType: type,
          name: name.trim() || undefined,
          lat: own?.lat,
          lng: own?.lng,
          displayName,
          locationLabel: own?.label ?? undefined,
          travelMode,
          anchor: anchored ? { lat: anchor.lat, lng: anchor.lng, label: anchor.label ?? undefined } : undefined,
        });
```

(gövdenin geri kalanı aynen kalır)

Tip: `submit: (displayName: string, own: Loc | null) => Promise<string>;`

- [ ] **Step 4: Yeşil olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/store/newSessionStore.test.ts`
Expected: PASS.

---

### Task 8: `NewSessionPage` çapa alanı

**Files:**
- Modify: `frontend/web/src/pages/NewSessionPage.tsx:107-155`
- Test: `frontend/web/src/pages/NewSessionPage.test.tsx`

- [ ] **Step 1: Önce testi yaz**

```tsx
  it("varsayılan orta nokta modu — çapa alanı görünmez", () => {
    renderNewSession();
    expect(screen.queryByLabelText("Buluşma yeri")).not.toBeInTheDocument();
  });

  it("'belli bir yerde' seçilince çapa alanı çıkar", async () => {
    renderNewSession();
    await userEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    expect(screen.getByLabelText("Buluşma yeri")).toBeInTheDocument();
  });

  it("çapa modunda host konumu olmadan da kurulabilir — düğme kilitli değil", async () => {
    renderNewSession();
    await userEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    expect(screen.getByRole("button", { name: "Buluşmayı kur" })).toBeEnabled();
  });
```

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/pages/NewSessionPage.test.tsx`
Expected: 2. ve 3. test FAIL — radio bulunamıyor.

- [ ] **Step 3: Çapa alanını ekle**

`<LocationField ... />`'ın ÜSTÜNE:

```tsx
            <Overline>{t("newSession.meetWhere")}</Overline>
            <Segmented
              value={anchorMode}
              onChange={setAnchorMode}
              ariaLabel={t("newSession.meetWhere")}
              options={[
                { value: "MIDPOINT", label: t("newSession.modeMidpoint") },
                { value: "ANCHOR", label: t("newSession.modeAnchor") },
              ]}
            />
            {anchorMode === "ANCHOR" && (
              <>
                <Field
                  id="session-anchor"
                  label={t("newSession.anchorLabel")}
                  placeholder={t("newSession.anchorPlaceholder")}
                  value={anchorQuery}
                  onChange={(e) => setAnchorQuery(e.target.value)}
                  onBlur={() => void resolveAnchor()}
                />
                <Note>{anchor ? t("newSession.anchorSet", { label: anchor.label ?? "" }) : t("newSession.anchorHint")}</Note>
                <button
                  type="button"
                  onClick={() => setPicker("anchor")}
                  className="self-start text-[0.75rem] font-normal text-flame-deep underline-offset-2 hover:underline focus-visible:underline"
                >
                  {t("map.pickOnMap")}
                </button>
              </>
            )}
```

Bileşen gövdesine:

```tsx
  const anchorMode = useNewSessionStore((s) => s.anchorMode);
  const anchor = useNewSessionStore((s) => s.anchor);
  const setAnchorMode = useNewSessionStore((s) => s.setAnchorMode);
  const setAnchor = useNewSessionStore((s) => s.setAnchor);
  const [anchorQuery, setAnchorQuery] = useState("");
  const [picker, setPicker] = useState<"own" | "anchor" | null>(null);

  /** Adres yazıp alandan çıkınca çözülür — her tuşta değil: Nominatim politikası. */
  async function resolveAnchor() {
    const q = anchorQuery.trim();
    if (!q) return;
    const found = await geocode(q);
    if (found) setAnchor(found);
  }
```

Import ekle: `import Segmented from "../components/molecules/Segmented";`,
`import { geocode } from "../lib/geocode";`

`LocationField`'a `onPickOnMap={() => setPicker("own")}` ekle ve `TravelModeField`'ın
altına picker katmanını koy:

```tsx
            {picker && (
              <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                  <MapPicker
                    center={anchor ?? own ?? { lat: 52.0907, lng: 5.1214 }}
                    onPick={(picked) => {
                      if (picker === "anchor") {
                        setAnchor(picked);
                        setAnchorQuery(picked.label ?? "");
                      } else {
                        loc.setPicked(picked);
                      }
                      setPicker(null);
                    }}
                    onCancel={() => setPicker(null)}
                  />
                </Suspense>
              </LazyBoundary>
            )}
```

`const MapPicker = lazy(() => import("../components/organisms/MapPicker"));` dosya başına.

- [ ] **Step 4: `create()`'in konum kapısını gevşet**

```tsx
  async function create() {
    setSubmitting(true);
    try {
      setLocalError(null);
      const resolvedOwn = await loc.resolve();
      // Çapalı oturumda host'un konumu ZORUNLU DEĞİL: modun var oluş sebebi sürtünmeyi
      // kaldırmak. Veren host için yol süresi yine hesaplanır.
      if (!resolvedOwn && anchorMode !== "ANCHOR") {
        setLocalError(t(loc.address.trim() ? "join.errGeocode" : "join.errGeolocation"));
        return;
      }
      if (anchorMode === "ANCHOR" && !anchor) {
        setLocalError(t("newSession.errNoAnchor"));
        return;
      }
      try {
        const slug = await submit(me?.displayName ?? "", resolvedOwn);
        navigate(`/j/${slug}`);
      } catch {
        // store zaten error anahtarını ayarladı
      }
    } finally {
      setSubmitting(false);
    }
  }
```

SOLO'nun `count < 2` kapısı da çapalı modda düşer:

```tsx
                <Button onClick={create} disabled={busy || submitting || (anchorMode !== "ANCHOR" && count < 2)}>
```

- [ ] **Step 5: i18n anahtarlarını ekle** (üç dosya, `newSession` bloğu)

| anahtar | tr | en | nl |
|---|---|---|---|
| `meetWhere` | Nerede buluşulsun? | Where should you meet? | Waar spreken jullie af? |
| `modeMidpoint` | Orta noktada | At the midpoint | Op het middelpunt |
| `modeAnchor` | Belli bir yerde | At a specific place | Op een vaste plek |
| `anchorLabel` | Buluşma yeri | Meeting spot | Ontmoetingsplek |
| `anchorPlaceholder` | Şehir ya da adres | City or address | Stad of adres |
| `anchorHint` | Mekanlar bu noktanın 2 km çevresinde aranır. | Venues are searched within 2 km of this spot. | Locaties worden binnen 2 km van deze plek gezocht. |
| `anchorSet` | {{label}} çevresinde aranacak | Searching around {{label}} | Zoeken rond {{label}} |
| `errNoAnchor` | Önce bir buluşma yeri seç. | Pick a meeting spot first. | Kies eerst een ontmoetingsplek. |

---

### Task 9: `MidpointCard` çapa metni

**Files:**
- Modify: `frontend/web/src/components/molecules/MidpointCard.tsx:29-39`
- Test: `frontend/web/src/components/molecules/MidpointCard.test.tsx` (var — sonuna ekle)

- [ ] **Step 1: Önce testi yaz**

```tsx
  it("çapalı oturumda 'orta nokta' değil buluşma yeri yazar", () => {
    render(<MidpointCard view={{ anchored: true, midpointLabel: "Amsterdam", radiusKm: 2, participants: [] } as never} />);
    expect(screen.getByText("Amsterdam")).toBeInTheDocument();
    expect(screen.getByText("BULUŞMA YERİ")).toBeInTheDocument();
  });

  it("çapasız oturumda bugünkü üst başlık aynen durur", () => {
    render(<MidpointCard view={{ anchored: false, midpointLabel: null, radiusKm: null, participants: [] } as never} />);
    expect(screen.queryByText("BULUŞMA YERİ")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `pnpm --filter @bumpinto/web test --run src/components/molecules/MidpointCard.test.tsx`
Expected: 1. test FAIL — "Orta nokta" üst başlığı hâlâ basılıyor.

- [ ] **Step 3: Çapa dalını ekle**

```tsx
  const anchored = v.anchored === true;
```

`<Overline>` ve `<h2>`:

```tsx
        <Overline>{anchored ? t("midpoint.anchorOverline") : t("midpoint.overline")}</Overline>
        <h2 className="text-[1.125rem]">
          {v.midpointLabel
            ? t(anchored ? "midpoint.anchorNear" : "midpoint.near", { label: v.midpointLabel })
            : t("midpoint.title")}
        </h2>
```

Meta satırı — çapalıda "herkes ~25–35 dk" aralığı YAZILMAZ (spec K6: kıyas değeri yok):

```tsx
        <span className="text-[0.8125rem] text-ink2 tabular-nums">
          {anchored
            ? km != null ? t("midpoint.anchorMeta", { km }) : t("midpoint.anchorPending")
            : km != null && range
              ? t("midpoint.meta", { km, min: range.min, max: range.max })
              : km != null
                ? t("midpoint.metaKm", { km })
                : t("midpoint.pending")}
        </span>
```

- [ ] **Step 4: i18n anahtarları** (üç dosya, `midpoint` bloğu)

| anahtar | tr | en | nl |
|---|---|---|---|
| `anchorOverline` | BULUŞMA YERİ | MEETING SPOT | ONTMOETINGSPLEK |
| `anchorNear` | {{label}} | {{label}} | {{label}} |
| `anchorMeta` | {{km}} km çevresinde aranıyor | Searching within {{km}} km | Zoeken binnen {{km}} km |
| `anchorPending` | Mekanlar aranıyor | Looking for venues | Locaties zoeken |

- [ ] **Step 5: Kapıları koş**

```bash
pnpm exec tsc --noEmit -p frontend/web && pnpm test:web && pnpm i18n:check && pnpm build:web
```

Expected: 0 tip hatası; **314 test** (306 + 3 store + 3 sayfa + 2 kart); i18n
`tr 366 · en 374 · nl 374` (+12).

- [ ] **Step 6: Commit (T7 + T8 + T9)**

```
feat(session): host can anchor a session to a fixed place

Anchor mode drops the host-location requirement and the SOLO two-point
gate; the lobby card names the place instead of promising a midpoint.
```

---

# W-G6 — Sayaç

### Task 10: Harita yükleme sayacını örneğe taşı

**Files:**
- Modify: `frontend/web/src/lib/maps.ts:20-22`
- Modify: `frontend/web/src/components/organisms/MapView.tsx:130-138`
- Modify: `frontend/web/src/components/organisms/MapPicker.tsx`

- [ ] **Step 1: `loadMaps`'ten sayacı çıkar**

`maps.ts` içindeki `.then(() => { track("maps_js_load"); })` bloğu silinir; `track` importu
kullanılmıyorsa o da silinir. Yerine dosyaya:

```ts
/** Faturalanan birim betiğin yüklenmesi DEĞİL, harita ÖRNEĞİdir (Dynamic Maps, örnek
    başına). `loadMaps` tekil promise olduğu için kullanıcı başına bir kez koşuyordu ve
    gerçek maliyeti ~3 kat eksik sayıyordu: masaüstü katılımcı yolu Katıl → Bekle →
    Mekanlar üç ayrı örnek kuruyor. Sayacı örneği yaratan her yer çağırır. */
export function trackMapInstance() {
  track("maps_map_instance");
}
```

- [ ] **Step 2: İki örnek yaratıcıyı da çağır**

`MapView.tsx` — `mapRef.current = new google.maps.Map(...)` satırından hemen sonra:

```tsx
          trackMapInstance();
```

`MapPicker.tsx` — `const map = new google.maps.Map(...)` satırından hemen sonra aynısı.

Her iki dosyada import: `trackMapInstance`'ı `../../lib/maps` satırına ekle.

- [ ] **Step 3: Bilinen sızıntıyı belgele**

`MapView.tsx`'in init effect'inin bağımlılık satırının ÜSTÜNE:

```tsx
    // BILINEN KUSUR (spec R3, bu işin kapsamı DEĞİL): `desktop` reaktif olduğu için pencere
    // 1024px'i geçince effect yeniden koşar ve YENİ bir harita örneği kurulur; temizlik
    // yalnız `alive`i düşürüyor, eski haritayı yıkmıyor. Ölçüm `trackMapInstance` ile
    // görünür; sayılar düzeltmeyi gerekçelendirdiğinde ayrı bir iz açılır.
```

- [ ] **Step 4: Kapıları koş**

```bash
pnpm exec tsc --noEmit -p frontend/web && pnpm test:web && pnpm i18n:check && pnpm build:web
```

Expected: 0 tip hatası; **314 test** (yeni test yok — bu bir ölçüm değişikliği, davranış
değil); i18n değişmez.

> Analitik çağrısının kendisine test yazılmaz: `track`'in çağrıldığını doğrulayan bir test
> yalnız kendi taklidimizi doğrular (AGENTS.md "test çöplüğü yapma").

- [ ] **Step 5: Commit**

```
fix(maps): count map instances, not the one-time script load

The billable unit is `new google.maps.Map()`. The old counter fired once
per user and undercounted roughly threefold.
```

---

## Öz-inceleme notları

**Spec kapsaması:** §5.1 → T4; §6.1 → T5, T6; §6.2 → T7; §6.3 → T9; §6.4 → T2, T3;
§6.5 → T10; §7 (maliyet gerekçesi) → T6 Step 1 testi ve T10 yorumu; §9 R3 → T10 Step 3
belgesi; §10 web kapıları → T2, T3, T4, T6, T8, T9.

**Backend'de kalan, burada olmayan:** `SessionView.anchored` üretimi ve `midpoint`'in
çapada yuvarlanmaması B-10 T7'de. Bu plan onları TÜKETİR, üretmez.

**Beklenen test sayısı yolu:** 289 → 289 (W-G1, yalnız tip) → 296 (W-G2) → 302 (W-G3)
→ 306 (W-G4) → 314 (W-G5) → 314 (W-G6).

**i18n yolu:** `tr 350 · en 358 · nl 358` → (W-G2: taşıma, değişmez) → (W-G4: +4)
→ (W-G5: +12) → `tr 366 · en 374 · nl 374`.

**Bilerek test yazılmayanlar:** `MapPicker`'ın gerçek harita davranışı (jsdom'da Google
haritası mount edilemez; sahte bir `google.maps` küresi kurmak, testin kendi taklidimizi
doğrulaması olurdu — elle denenir) ve `trackMapInstance`'ın çağrılması (aynı sebep).
