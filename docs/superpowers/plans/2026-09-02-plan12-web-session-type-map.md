# Plan 12: Web — Oturum Tipi, Yeni Buluşma, Lobi, Mekanlar ve Google Haritası

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web'i tam ürüne tamamlamak: host akışı (Yeni buluşma: Grup / Bireysel, gruplu etkinlik seçici, Bireysel'de elle konumlar), Lobi, yeni **Mekanlar** ekranı (BROWSING: liste + Google haritası, "Karıştır ve kaydır", "Bunu seç"), Katıl/Bekle/Karar ekranlarına gerçek harita, rol ve duruma göre `/j/:slug` yönlendirmesi, Profil tercih düzenleme.

**Architecture:** Harita tek organizmada (`organisms/MapView`): Google Maps JS + `AdvancedMarkerElement` (DOM pinler → `organisms/mapPins.ts`), yükleyici `lib/maps.ts` (tekil). Sayfa mantığı store'larda: `newSessionStore` (form + create + points), `sessionStore` (rol/durum: `viewer`), `deckStore` (+ `shuffle`, `pick`). Pin dili DS §10; kompozisyon spec §4b, §5. Spec: `docs/superpowers/specs/2026-09-01-web-parity-design.md` (BAĞLAYICI). **Öncül: W-3 `done`, B-5 `done`** (`sessionType`, `BROWSING`, `shuffle`, `points`, `approxLocation`, `midpoint`, `viewer` — `viewer` B-6'da).

**Tech Stack:** `@googlemaps/js-api-loader`, Maps JavaScript API (Map ID ile bulut stili), `AdvancedMarkerElement`, react-router 7, zustand, Tailwind v4, `@phosphor-icons/react`, vitest + RTL (haritasız: `MapView` jsdom'da yer tutucu render eder).

---

## UI Kaynağı: Claude Design (BAĞLAYICI)

`719fcd5f-…/Web Ekranlar v2.dc.html` — bloklar `data-screen-label`:

| Artboard | Sayfa / bileşen |
|---|---|
| `Yeni oturum 1280` (Bireysel), `Yeni oturum 390` (Grup), `Yeni oturum EN 390`, `Yeni oturum NL 390` | `pages/NewSessionPage.tsx` |
| `Lobi 1280`, `Lobi 390` | `pages/LobbyPage.tsx` |
| `Mekanlar grup 1280` (host), `Mekanlar grup 390 davetli` | `pages/VenuesPage.tsx` |
| `Mekanlar bireysel 1280`, `Mekanlar bireysel 390` | `pages/VenuesPage.tsx` (solo) |
| `Katıl 1280` (sağ harita), `Bekle 1280` (sağ harita), `Karar 1280` (sağ harita) | W-3 sayfalarına `MapView` |
| DS `b536b3aa-…/Design System v2.dc.html` **10 · Harita dili**, **08 · Etkinlik seçici** | `MapView`, `mapPins.ts`, `ActivityPicker` |

Mockup'taki harita **yer tutucudur**; gerçek Google döşemesi kodda gelir. Pin sözlüğü DS §10.

---

## Bu plana özel kurallar

- W-3 kuralları aynen (INDEX, git yok, PATH, utility yalnız `components/`, `t()` zorunlu, gate'ler).
- **Google Maps yalnız** (Places ToS); başka harita kütüphanesi eklenmez.
- `VITE_GOOGLE_MAPS_KEY` ve `VITE_GOOGLE_MAPS_MAP_ID` `.env.*`'a boş eklenir; değer kullanıcıda (I-1 Ek A). Anahtar yoksa `MapView` "Harita bu ortamda yapılandırılmadı" notu gösterir, akış kırılmaz.
- Koordinat gizliliği: istemci yalnız `approxLocation` çizer; kendi tam konumunu da çizmez (tutarlılık).
- Haritada rota çizimi yok; "Yol tarifi al" `mapsUrl`'e gider.

---

### Task 1: Harita altyapısı — `lib/maps.ts`, `organisms/mapPins.ts`, `organisms/MapView.tsx`

**Files:**
- Modify: `frontend/web/package.json` (`@googlemaps/js-api-loader`, `@types/google.maps`)
- Modify: `frontend/web/.env.development`, `.env.preprod`, `.env.production`
- Create: `frontend/web/src/lib/maps.ts`
- Create: `frontend/web/src/components/organisms/mapPins.ts`
- Create: `frontend/web/src/components/organisms/MapView.tsx`
- Create: `frontend/web/src/components/organisms/MapView.test.tsx`

- [ ] **Step 1: Bağımlılıklar** — Run: `rtk pnpm --filter @bumpinto/web add @googlemaps/js-api-loader && rtk pnpm --filter @bumpinto/web add -D @types/google.maps`. `.env.*`'a `VITE_GOOGLE_MAPS_KEY=` ve `VITE_GOOGLE_MAPS_MAP_ID=` satırları.

- [ ] **Step 2: Failing test** — `MapView.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MapView from "./MapView";

describe("MapView", () => {
  it("anahtar yokken yapılandırma notu ve erişilebilir özet gösterir", () => {
    render(
      <MapView
        participants={[{ id: "p1", displayName: "Mehmet", host: true, hasLocation: true,
          deckDone: false, manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } }]}
        venues={[]}
        midpoint={null}
        radiusKm={null}
      />,
    );
    expect(screen.getByText(/harita bu ortamda yapılandırılmadı/i)).toBeInTheDocument();
    expect(screen.getByText(/Mehmet · Den Bosch/)).toBeInTheDocument(); // ekran okuyucu özeti
  });
});
```

- [ ] **Step 3: FAIL doğrula** → modül yok.

- [ ] **Step 4: `lib/maps.ts`** (tekil yükleyici; `marker` kütüphanesi)

```typescript
import { Loader } from "@googlemaps/js-api-loader";

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
export const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

let loading: Promise<typeof google> | null = null;

export function mapsConfigured() {
  return !!KEY && !!MAP_ID;
}

/** Tek yükleme; hangi dilde açıldıysa o dilde etiketler (i18n `language`). */
export function loadMaps(language: string): Promise<typeof google> {
  if (!KEY) return Promise.reject(new Error("maps key missing"));
  loading ??= new Loader({ apiKey: KEY, version: "weekly", language, libraries: ["marker"] }).load();
  return loading;
}
```

- [ ] **Step 5: `organisms/mapPins.ts`** (DS §10 pin sözlüğü; DOM üretimi — utility sınıfları `components/` altında)

```typescript
/* Kaynak: DS v2 §10 Harita dili — .pin-av / .pin-av.man / .mpin / .vpin(.on/.big) */
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";

const PALETTE = [
  "linear-gradient(135deg,#fd3e6b,#d91e52)", "linear-gradient(135deg,#18b26b,#0b7a44)",
  "linear-gradient(135deg,#7c4dff,#5a2fd0)", "linear-gradient(135deg,#ffb020,#e08900)",
];

function el(className: string, text?: string) {
  const d = document.createElement("div");
  d.className = className;
  if (text != null) d.textContent = text;
  return d;
}

/** Katılımcı pini: story-ring avatar; elle konum kesikli. Kuyruk 2×8px. */
export function participantPin(p: ParticipantDto, index: number, label?: string) {
  const wrap = el("flex flex-col items-center");
  const ring = el(p.manual ? "" : "rounded-full bg-[image:var(--story-ring)] p-0.5");
  const av = el(
    "flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-full border-2 border-white " +
    "font-head text-[0.75rem] font-bold shadow-[0_2px_6px_rgba(39,32,59,0.2)] " +
    (p.manual ? "border-dashed border-line-in bg-white text-ink2" : "text-white"),
    (p.displayName ?? "?")[0]?.toUpperCase(),
  );
  if (!p.manual) av.style.background = PALETTE[index % PALETTE.length];
  ring.appendChild(av);
  wrap.appendChild(ring);
  wrap.appendChild(el("h-2 w-0.5 rounded-sm bg-ink2"));
  if (label) wrap.appendChild(el("mt-0.5 rounded-full bg-[rgba(255,255,255,0.9)] px-1.5 text-[0.625rem] font-bold text-ink", label));
  return wrap;
}

/** Orta nokta: alev iğne (mk-pin ile aynı geometri). */
export function midpointPin() {
  const pin = el("h-[1.6875rem] w-[1.6875rem] rotate-45 rounded-[50%_50%_50%_0.1875rem] bg-[image:var(--grad)] " +
    "shadow-[0_4px_14px_rgba(222,36,86,0.4),0_0_0_2.5px_#fff]");
  const wrap = el("flex flex-col items-center pb-2");
  wrap.appendChild(pin);
  return wrap;
}

/** Mekan pini: puan rozeti + tint swatch; seçili = alev dolgu + büyük. */
export function venuePin(v: VenueDto, tint: number, selected: boolean) {
  const badge = el(
    "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2 py-0.5 font-head font-extrabold shadow-sh1 " +
    (selected
      ? "h-[1.875rem] border-flame-deep bg-flame-deep text-[0.8125rem] text-white shadow-[0_8px_20px_rgba(222,36,86,0.35)]"
      : "h-[1.625rem] border-line2 bg-white text-[0.75rem] text-ink"),
  );
  const swatch = el("h-[1.125rem] w-[1.125rem] rounded-md " + ["bg-[#f9c08a]", "bg-[#8fddbb]", "bg-[#c1a8f5]", "bg-[#ffe08a]"][tint % 4]);
  badge.appendChild(swatch);
  badge.appendChild(el("", v.rating != null ? String(v.rating) : (v.name ?? "").slice(0, 12)));
  const tail = el("mx-auto -mt-1 h-2 w-2 rotate-45 border-b-[1.5px] border-r-[1.5px] " +
    (selected ? "border-flame-deep bg-flame-deep" : "border-line2 bg-white"));
  const wrap = el("flex flex-col items-center");
  wrap.appendChild(badge);
  wrap.appendChild(tail);
  return wrap;
}
```

- [ ] **Step 6: `organisms/MapView.tsx`**

```tsx
/* Kaynak: DS v2 §10 — Google harita + bizim pinler; spec §4b (yuvarlanmış konum, halka, seçili kart) */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { loadMaps, MAP_ID, mapsConfigured } from "../../lib/maps";
import { Note } from "../atoms";
import { midpointPin, participantPin, venuePin } from "./mapPins";

type LatLng = { lat: number; lng: number };

export type MapViewProps = {
  participants: ParticipantDto[];
  venues: VenueDto[];
  midpoint: LatLng | null;
  radiusKm: number | null;
  selectedVenueId?: string | null;
  onSelectVenue?: (venueId: string | null) => void;
  /** Katılımcı id → pin altı etiket ("sen", "bekleniyor"). */
  pinLabels?: Record<string, string>;
  /** Fotoğrafsız tint başlangıcı (etkinlik grubu) — venuePin swatch'ı. */
  tint?: number;
  heightClass?: string;
};

export default function MapView(props: MapViewProps) {
  const { t, i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const circle = useRef<google.maps.Circle | null>(null);
  const [failed, setFailed] = useState(false);
  const configured = mapsConfigured();

  useEffect(() => {
    if (!configured || !box.current) return;
    let alive = true;
    void loadMaps(i18n.language).then((g) => {
      if (!alive || !box.current) return;
      mapRef.current ??= new g.maps.Map(box.current, {
        mapId: MAP_ID, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy",
        center: props.midpoint ?? { lat: 51.44, lng: 5.47 }, zoom: 10,
      });
    }).catch(() => setFailed(true));
    return () => { alive = false; };
  }, [configured, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    const g = window.google;
    markers.current.forEach((m) => { m.map = null; });
    markers.current = [];
    circle.current?.setMap(null);
    const bounds = new g.maps.LatLngBounds();

    props.participants.forEach((p, i) => {
      if (!p.approxLocation) return;
      const m = new g.maps.marker.AdvancedMarkerElement({
        map, position: p.approxLocation, content: participantPin(p, i, props.pinLabels?.[p.id!]),
        title: `${p.displayName}${p.locationLabel ? ` · ${p.locationLabel}` : ""}`,
      });
      markers.current.push(m);
      bounds.extend(p.approxLocation);
    });
    if (props.midpoint) {
      markers.current.push(new g.maps.marker.AdvancedMarkerElement({ map, position: props.midpoint, content: midpointPin() }));
      bounds.extend(props.midpoint);
      if (props.radiusKm) {
        circle.current = new g.maps.Circle({
          map, center: props.midpoint, radius: props.radiusKm * 1000,
          strokeColor: "#DE2456", strokeOpacity: 0.35, strokeWeight: 2, fillOpacity: 0,
        });
      }
    }
    props.venues.forEach((v) => {
      const selected = v.id === props.selectedVenueId;
      const m = new g.maps.marker.AdvancedMarkerElement({
        map, position: { lat: v.lat!, lng: v.lng! }, content: venuePin(v, props.tint ?? 0, selected),
        zIndex: selected ? 3 : 2, title: v.name ?? "",
      });
      m.addListener("click", () => props.onSelectVenue?.(v.id ?? null));
      markers.current.push(m);
      bounds.extend({ lat: v.lat!, lng: v.lng! });
    });
    if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
  });

  // Ekran okuyucu özeti — harita salt görsel; bilgi liste olarak da var (WCAG).
  const summary = props.participants.filter((p) => p.approxLocation)
    .map((p) => `${p.displayName} · ${p.locationLabel ?? ""}`.trim()).join(", ");

  return (
    <div className={`relative overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7] ${props.heightClass ?? "h-[20rem]"}`}>
      {configured && !failed ? <div ref={box} className="h-full w-full" /> : (
        <div className="flex h-full items-center justify-center p-6"><Note center>{t("map.notConfigured")}</Note></div>
      )}
      <p className="sr-only">{summary}</p>
    </div>
  );
}
```

`tr.json` `map` bloğu: `"notConfigured": "Harita bu ortamda yapılandırılmadı."`, `"midpoint": "Orta nokta · {{label}} · ~{{km}} km"`, `"midpointPending": "Orta nokta sen katılınca netleşir"`, `"googleTag": "Google Maps"` (+ en/nl). `MapView` sol-alt kapsül (`mcap`) için `caption?: string` prop'u ekle: `absolute bottom-2.5 left-3.5 inline-flex items-center gap-2 rounded-full border border-line bg-[rgba(255,255,255,0.92)] px-[0.6875rem] py-1.5 text-[0.75rem] font-bold`.

- [ ] **Step 7: PASS + gerçek anahtarla göz kontrolü** — testler yeşil; `rtk pnpm dev:web` + geçerli anahtar/Map ID ile pinlerin ve halkanın çizildiğini gör. Map ID stili I-1 Ek A (kullanıcı).

- [ ] **Step 8: INDEX güncelle + Commit (kullanıcı)** — `feat(web-map): google maps yukleyici, pin sozlugu, MapView`

---

### Task 2: Yeni buluşma (W2) — tip seçimi, `ActivityPicker`, konum, `PointsEditor`, `newSessionStore`

**Files:**
- Create: `frontend/web/src/lib/geocode.ts` (JoinForm'daki Nominatim yardımcısı buraya taşınır)
- Create: `frontend/web/src/store/newSessionStore.ts`
- Create: `frontend/web/src/components/molecules/TypeCard.tsx`
- Create: `frontend/web/src/components/molecules/ActivityPicker.tsx`
- Create: `frontend/web/src/components/molecules/LocationField.tsx`
- Create: `frontend/web/src/components/organisms/PointsEditor.tsx`
- Create: `frontend/web/src/pages/NewSessionPage.tsx`
- Modify: `frontend/web/src/App.tsx` (`/sessions/new`)
- Create: `frontend/web/src/components/molecules/ActivityPicker.test.tsx`, `frontend/web/src/store/newSessionStore.test.ts`

- [ ] **Step 1: Failing tests**

`ActivityPicker.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActivityPicker from "./ActivityPicker";

describe("ActivityPicker", () => {
  it("4 grup başlığı, 15 chip, seçim geri çağrısı", () => {
    const onChange = vi.fn();
    render(<ActivityPicker value="COFFEE" onChange={onChange} />);
    expect(screen.getByText("Yeme-içme")).toBeInTheDocument();
    expect(screen.getByText("Eğlence")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(15);
    expect(screen.getByRole("radio", { name: "Bowling" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Müze" }));
    expect(onChange).toHaveBeenCalledWith("MUSEUM");
  });
});
```

`newSessionStore.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  api: { createSession: vi.fn(), addPoint: vi.fn(), findVenues: vi.fn() },
}));
import { api } from "../lib/api";
import { useNewSessionStore } from "./newSessionStore";

describe("newSessionStore", () => {
  beforeEach(() => useNewSessionStore.getState().reset());

  it("SOLO: kur → noktaları ekle → mekanları bul; slug döner", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "q9d4p", sessionId: "s", participantId: "h", participantToken: null, expiresAt: "" });
    vi.mocked(api.addPoint).mockResolvedValue({ id: "m1", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: true, locationLabel: "Someren", approxLocation: { lat: 51.39, lng: 5.71 } });
    vi.mocked(api.findVenues).mockResolvedValueOnce({} as never);
    const s = useNewSessionStore.getState();
    s.setType("SOLO");
    s.setActivity("COFFEE");
    s.setOwnLocation({ lat: 51.6978, lng: 5.3037, label: "'s-Hertogenbosch" });
    s.addLocalPoint({ displayName: "Ayşe", locationLabel: "Someren", lat: 51.3855, lng: 5.712 });
    const slug = await useNewSessionStore.getState().submit("Mehmet");
    expect(slug).toBe("q9d4p");
    expect(api.createSession).toHaveBeenCalledWith(expect.objectContaining({ sessionType: "SOLO", locationLabel: "'s-Hertogenbosch" }));
    expect(api.addPoint).toHaveBeenCalledWith("q9d4p", expect.objectContaining({ displayName: "Ayşe" }));
    expect(api.findVenues).toHaveBeenCalledWith("q9d4p");
  });

  it("GROUP: kur; nokta ve find-venues çağrılmaz", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "x7k2m", sessionId: "s", participantId: "h", participantToken: null, expiresAt: "" });
    const s = useNewSessionStore.getState();
    s.setType("GROUP");
    s.setOwnLocation({ lat: 51.7, lng: 5.3, label: "Den Bosch" });
    await useNewSessionStore.getState().submit("Mehmet");
    expect(api.addPoint).not.toHaveBeenCalled();
    expect(api.findVenues).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: FAIL doğrula** → modül yok.

- [ ] **Step 3: `lib/geocode.ts`** — `JoinForm.tsx`'teki `geocode(query)` fonksiyonu buraya taşınır (aynı kod, `export`). `JoinForm` import eder.

- [ ] **Step 4: Store**

```typescript
import type { Schemas } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";

export type SessionType = "GROUP" | "SOLO";
export type Loc = { lat: number; lng: number; label: string };
export type LocalPoint = { displayName: string; locationLabel: string | null; lat: number; lng: number };

type State = {
  type: SessionType;
  activity: Schemas["CreateSessionRequest"]["activityType"];
  name: string;
  own: Loc | null;
  points: LocalPoint[];
  busy: boolean;
  error: string | null;
  setType: (t: SessionType) => void;
  setActivity: (a: State["activity"]) => void;
  setName: (n: string) => void;
  setOwnLocation: (l: Loc | null) => void;
  addLocalPoint: (p: LocalPoint) => void;
  removeLocalPoint: (index: number) => void;
  /** Kur (+ SOLO: noktaları ekle, mekanları bul). Oturum slug'ını döner. */
  submit: (displayName: string) => Promise<string>;
  reset: () => void;
};

const initial = { type: "GROUP" as SessionType, activity: "COFFEE" as State["activity"], name: "", own: null, points: [], busy: false, error: null };

export const useNewSessionStore = create<State>((set, get) => ({
  ...initial,
  setType: (type) => set({ type }),
  setActivity: (activity) => set({ activity }),
  setName: (name) => set({ name }),
  setOwnLocation: (own) => set({ own }),
  addLocalPoint: (p) => set((s) => ({ points: [...s.points, p] })),
  removeLocalPoint: (i) => set((s) => ({ points: s.points.filter((_, k) => k !== i) })),
  submit: async (displayName) => {
    const { type, activity, name, own, points } = get();
    if (!own) throw new Error("own location required");
    set({ busy: true, error: null });
    try {
      const created = await api.createSession({
        activityType: activity, sessionType: type, name: name.trim() || undefined,
        lat: own.lat, lng: own.lng, displayName, locationLabel: own.label,
      });
      if (type === "SOLO") {
        for (const p of points) await api.addPoint(created.slug!, p);
        await api.findVenues(created.slug!);
      }
      return created.slug!;
    } catch (e) {
      set({ error: "newSession.errCreate" });
      throw e;
    } finally {
      set({ busy: false });
    }
  },
  reset: () => set(initial),
}));
```

- [ ] **Step 5: Bileşenler**

`molecules/TypeCard.tsx` (artboard `.typ`):

```tsx
import type { Icon } from "@phosphor-icons/react";

export default function TypeCard(props: { icon: Icon; title: string; copy: string; selected: boolean; onSelect: () => void }) {
  const I = props.icon;
  return (
    <button type="button" role="radio" aria-checked={props.selected} onClick={props.onSelect}
      className={`flex flex-1 cursor-pointer items-start gap-3 rounded-[1.125rem] border-[1.5px] p-[0.875rem_1rem] text-left ${props.selected ? "border-flame-deep bg-flame-wash" : "border-line2 bg-card"}`}>
      <I size={22} className="mt-px flex-none text-flame-deep" aria-hidden />
      <span className="flex flex-col gap-0.5">
        <span className="text-[0.875rem] font-semibold">{props.title}</span>
        <span className="text-[0.75rem] leading-[1.35] text-ink2">{props.copy}</span>
      </span>
    </button>
  );
}
```

`molecules/ActivityPicker.tsx` (DS §08):

```tsx
import { useTranslation } from "react-i18next";
import { ACTIVITY_GROUPS, ACTIVITY_ICONS, type ActivityGroup } from "../../lib/activity";
import { Overline } from "../atoms";

const CHIP = "inline-flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-4 text-[0.90625rem] font-semibold";

export default function ActivityPicker(props: { value: string; onChange: (a: string) => void; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" className={`grid gap-x-5 gap-y-4 ${props.compact ? "" : "lg:grid-cols-2"}`}>
      {(Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).map((g) => (
        <div key={g} className="flex flex-col gap-2">
          <Overline>{t(`activity.group.${g}`)}</Overline>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_GROUPS[g].map((a) => {
              const I = ACTIVITY_ICONS[a];
              const on = a === props.value;
              return (
                <button key={a} type="button" role="radio" aria-checked={on} onClick={() => props.onChange(a)}
                  className={`${CHIP} ${on ? "border-flame-deep bg-flame-wash text-flame-deep" : "border-line2 bg-card text-ink2"}`}>
                  <I size={18} aria-hidden />{t(`activity.${a}`)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

`molecules/LocationField.tsx` (artboard `.loc.on` + adres): props `value: Loc | null; onUseMine: () => void; onGeocode: (q: string) => Promise<void>; busy; error; labels: { title, hint }` — `value` doluysa yeşil kart (ad + "Şu anki konumun"/etiket + Badge Tamam) + "…ya da adres yaz" bağlantısı; boşsa `Button kind="white" align="start"` "Mevcut konumumu kullan" + `orr` "veya" + `TextInput` (Enter → `onGeocode`).

`organisms/PointsEditor.tsx` (artboard Yeni oturum 1280 sağ "Konumlar" kartı):

```tsx
import { Plus, X } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { geocode } from "../../lib/geocode";
import { useNewSessionStore } from "../../store/newSessionStore";
import { Avatar, Badge, Button, ErrorText, Overline, TextInput } from "../atoms";

export default function PointsEditor() {
  const { t } = useTranslation();
  const own = useNewSessionStore((s) => s.own);
  const points = useNewSessionStore((s) => s.points);
  const add = useNewSessionStore((s) => s.addLocalPoint);
  const remove = useNewSessionStore((s) => s.removeLocalPoint);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const count = (own ? 1 : 0) + points.length;

  async function submit() {
    // "Ayşe · Someren" ya da "Ayşe, Someren" → ad + adres; tek parça ise adres = ad
    const [name, ...rest] = draft.split(/[·,]/).map((s) => s.trim()).filter(Boolean);
    if (!name) return;
    const query = rest.join(" ") || name;
    const found = await geocode(query);
    if (!found) { setErr(t("join.errGeocode")); return; }
    add({ displayName: name, locationLabel: found.label, lat: found.lat, lng: found.lng });
    setDraft(""); setErr(null);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Overline>{t("newSession.points")}</Overline>
        <span className="text-[0.75rem] text-ink2 tabular-nums">{t("newSession.pointsCount", { count })}</span>
      </div>
      <div className="rounded-card border border-line bg-card py-0.5 shadow-sh1">
        <div className="flex items-center gap-3 px-4 py-[0.6875rem]">
          <Avatar name={t("deck.travelSelf")} ring />
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[0.875rem] font-bold">{t("deck.travelSelf")}</span>
            <span className="text-[0.75rem] text-ink2">{own ? `${own.label} · ${t("newSession.ownHint")}` : t("newSession.ownMissing")}</span>
          </div>
          {own && <Badge tone="grass">{t("newSession.ok")}</Badge>}
        </div>
        {points.map((p, i) => (
          <div key={`${p.displayName}-${i}`}>
            <div className="mx-4 h-px bg-line" />
            <div className="flex items-center gap-3 px-4 py-[0.6875rem]">
              <Avatar name={p.displayName} waiting />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[0.875rem] font-bold">{p.displayName}</span>
                <span className="text-[0.75rem] text-ink2">{p.locationLabel}</span>
              </div>
              <Badge>{t("newSession.manual")}</Badge>
              <button type="button" aria-label={t("newSession.remove", { name: p.displayName })} onClick={() => remove(i)} className="cursor-pointer text-ink3"><X size={16} /></button>
            </div>
          </div>
        ))}
        <div className="mx-4 h-px bg-line" />
        <form className="flex gap-2 p-[0.625rem_0.75rem]" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("newSession.pointPlaceholder")} aria-label={t("newSession.pointPlaceholder")} />
          <Button type="submit" kind="white" shape="pill" align="center" style={{ width: "auto", minHeight: "2.75rem" }}><Plus size={18} aria-hidden />{t("newSession.add")}</Button>
        </form>
        {err && <div className="px-4 pb-3"><ErrorText>{err}</ErrorText></div>}
      </div>
    </>
  );
}
```

`tr.json` `newSession` bloğu (artboard kopyası):

```json
  "newSession": {
    "back": "Oturumlar", "title": "Yeni buluşma",
    "how": "Nasıl buluşuyorsunuz?",
    "group": "Grup", "groupCopy": "Link at; arkadaşların konumunu paylaşır, mekanları görür, birlikte kaydırırsınız.",
    "solo": "Bireysel", "soloCopy": "Konumları sen girersin, haritadan kendin seçersin. Link ve deste yok.",
    "what": "Ne yapıyorsunuz?",
    "name": "Buluşmaya isim ver", "nameOptional": "· istersen", "namePlaceholder": "Cuma kahvesi",
    "where": "Sen neredesin?", "ownHint": "şu anki konumun", "ownMissing": "Konumun henüz yok",
    "ok": "Tamam", "orAddress": "…ya da adres yaz",
    "points": "Konumlar", "pointsCount": "{{count}} / en az 2", "manual": "elle",
    "pointPlaceholder": "Ad · şehir ya da adres", "add": "Ekle", "remove": "{{name}} konumunu kaldır",
    "swipeToggle": "Ben de kaydıracağım", "swipeToggleCopy": "Kapatırsan kararı arkadaşların verir.",
    "createGroup": "Buluşmayı kur", "createGroupHint": "Link hemen oluşur, sonra atarsın.",
    "findVenues": "Mekanları bul", "findHint": "{{count}} konum var. Kaydırmak zorunda değilsin; haritadan seçersin.",
    "needTwo": "En az 2 konum gerekir.",
    "previewTitle": "Davetlinin göreceği", "previewLink": "link kurunca oluşur",
    "previewHand": "linki WhatsApp'a at, yeter →", "soloHand": "kaydırmak zorunda değilsin, haritadan seç →",
    "errCreate": "Buluşma kurulamadı — tekrar dene."
  }
```

(+ en/nl; EN/NL 390 artboard'larındaki `New meetup / What are you up to? / Name the meetup · optional / Create the meetup` ve `Nieuwe afspraak / Wat gaan jullie doen? / Geef de afspraak een naam · optioneel / Afspraak maken` birebir.)

"Ben de kaydıracağım" anahtarı: backend'de host'un kaydırmama seçeneği YOK (host her zaman oy popülasyonunda). Anahtar artboard'da var; MVP'de **görünür ama devre dışı (açık, kilitli)** ve INDEX notuna "host kaydırmama seçeneği backend'de yok — B-7 adayı" yazılır. İcat edilmez.

- [ ] **Step 6: Sayfa** — `pages/NewSessionPage.tsx`: `Page` + geri bağlantı + `Heading` + `TwoZone` (variant default):
  - sol: `TypeCard`×2 (`ShareNetwork` / `MapPin` ikonları), `ActivityPicker`, isim `Field`, GROUP: `LocationField` (kendi konumu) + swipeToggle satırı + `Button` "Buluşmayı kur" + hint; SOLO: `LocationField` + `Button` "Mekanları bul" (`disabled` if count<2) + hint `findHint`.
  - sağ: SOLO → `PointsEditor` + `MapView` (participants = kendi + noktalar `approxLocation` yuvarlanmış: `Math.round(x*100)/100`, midpoint istemcide `lib/geo.ts` centroid (backend `GeoMath.centroid`'in TS kopyası) + radius yok → `radiusKm` null) + `HandNote soloHand`; GROUP → önizleme kartı (`molecules/InvitePreview.tsx`: ring avatar + "Mehmet seni buluşmaya çağırdı" (`join.invitedBy`), `h2` isim, rozetler, kopya, "link kurunca oluşur") + `HandNote previewHand`.
  - `submit(me.displayName)` → `navigate('/j/'+slug)`.
  - Mobil (390): `TypeCard`'lar yerine `seg` (`molecules/Segmented.tsx`: `role="radiogroup"`, iki `radio`).
  - `App.tsx`: `<Route path="/sessions/new" element={<RequireAuth><NewSessionPage /></RequireAuth>} />`.

- [ ] **Step 7: PASS + görsel** — testler + `tsc`; artboard `Yeni oturum 1280` (Bireysel) ve `390` (Grup) karşılaştırması; EN/NL 390.

- [ ] **Step 8: INDEX güncelle + Commit (kullanıcı)** — `feat(web): yeni bulusma (tip, etkinlik gruplari, elle konumlar, canli harita)`

---

### Task 3: `/j/:slug` rol + durum yönlendirmesi, Lobi (W3), Bekle/Katıl/Karar haritaları

**Files:**
- Modify: `frontend/web/src/store/sessionStore.ts` (`viewer`, `isHost`, `findVenues`, `changeLocation`)
- Modify: `frontend/web/src/pages/SessionPage.tsx`
- Create: `frontend/web/src/components/molecules/InviteCard.tsx`
- Create: `frontend/web/src/pages/LobbyPage.tsx`
- Create: `frontend/web/src/pages/SoloSetupPage.tsx`
- Modify: `frontend/web/src/pages/JoinForm.tsx`, `WaitingRoom.tsx`, `ResultScreen.tsx` (`MapView`)
- Create: `frontend/web/src/pages/SessionPage.test.tsx`

- [ ] **Step 1: Failing routing test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../store/useSessionLive", () => ({ useSessionLive: () => undefined }));
import { useSessionStore } from "../store/sessionStore";
import SessionPage from "./SessionPage";

const base = { slug: "x", name: "Cuma kahvesi", activityType: "COFFEE", sessionType: "GROUP",
  expiresAt: "", participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } },
    { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false, locationLabel: "Someren", approxLocation: { lat: 51.39, lng: 5.71 } },
  ], venues: [], runoffVenueIds: [], decidedVenueId: null, voteTally: {}, midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 4 };

function at(view: object) {
  useSessionStore.setState({ slug: "x", view: view as never, needsJoin: false, error: null });
  render(<MemoryRouter initialEntries={["/j/x"]}><Routes><Route path="/j/:slug" element={<SessionPage />} /></Routes></MemoryRouter>);
}

describe("SessionPage yönlendirme", () => {
  it("COLLECTING + host → Lobi", () => {
    at({ ...base, status: "COLLECTING", viewer: { participantId: "h", host: true } });
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeInTheDocument();
  });
  it("COLLECTING + davetli → Bekle", () => {
    at({ ...base, status: "COLLECTING", viewer: { participantId: "a", host: false } });
    expect(screen.getByText("Deste hazırlanıyor…")).toBeInTheDocument();
  });
  it("COLLECTING + SOLO host → konum düzenleme", () => {
    at({ ...base, status: "COLLECTING", sessionType: "SOLO", viewer: { participantId: "h", host: true } });
    expect(screen.getByText("Konumlar")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL doğrula** → kırmızı.

- [ ] **Step 3: sessionStore** — `SessionView.viewer` (B-6) ile:

```typescript
  // türetilmiş yardımcılar (store dışı saf fonksiyonlar, aynı dosyada export)
  export function viewerId(view: SessionView | null) { return view?.viewer?.participantId ?? null; }
  export function isHost(view: SessionView | null) { return !!view?.viewer?.host; }
```

`self` alanı kaldırılır; `ParticipantList`/`ParticipantRow` `isSelf = p.id === viewerId(view)` ve şehir etiketini `p.locationLabel`'dan okur (W-3 Task 3'teki `locationLabel` prop'u düşer). Yeni aksiyonlar:

```typescript
  findVenues: async () => { await api.findVenues(get().slug); await get().refresh(); },
  changeLocation: async (loc: { lat: number; lng: number; label: string | null }) => {
    await api.updateLocation(get().slug, { lat: loc.lat, lng: loc.lng, label: loc.label ?? undefined });
    await get().refresh();
  },
```

- [ ] **Step 4: SessionPage**

```tsx
  if (error) return <ErrorPage kind={error === "session.expired" ? "expired" : "notFound"} />;
  if (needsJoin || !view) return <JoinForm slug={slug} onJoined={() => void refresh()} />;
  const host = isHost(view);
  const solo = view.sessionType === "SOLO";
  switch (view.status) {
    case "COLLECTING":
    case "SUGGESTING":
      if (solo) return <SoloSetupPage view={view} />;
      return host ? <LobbyPage view={view} /> : <WaitingRoom view={view} />;
    case "BROWSING":
      return <VenuesPage slug={slug} view={view} />;            // Task 4
    case "SWIPING":
      return host || viewerId(view) ? <DeckScreen slug={slug} view={view} /> : <JoinForm slug={slug} onJoined={() => void refresh()} />;
    case "RUNOFF":
      return <RunoffScreen slug={slug} view={view} />;
    case "DECIDED":
      return <ResultScreen view={view} />;
    default:
      return <ErrorPage kind="expired" />;
  }
```

- [ ] **Step 5: Lobi + SoloSetup**

`molecules/InviteCard.tsx` (artboard Lobi 1280 davet kartı): flame-wash kart, `Sticker white` "linki at gitsin", `Overline` "Davet linki" (flame), mono link `bumpinto.app/j/{slug}` + `Button` "Kopyala" (`navigator.clipboard.writeText(location.origin + '/j/' + slug)`; sonra "Kopyalandı"), `Note` "Tıklayan uygulama indirmeden katılır — WhatsApp'a at, yeter." `tr.json` `lobby`: `sticker`, `invite`, `copy`, `copied`, `hint`, `collecting` ("konumlar toplanıyor"), `find` ("Mekanları bul"), `late` ("{{name}} yetişemezse sonradan katılır, sorun olmaz."), `needTwo`.

`pages/LobbyPage.tsx`: `Page` + `PageHeader` (h1 oturum adı + rozetler Kahve · konumlar toplanıyor) + `TwoZone left={<><InviteCard/><ParticipantList/></>} right={<><MapView participants midpoint radiusKm pinLabels={{[viewerId]: "sen", ...konumsuzlar: "bekleniyor"}} caption={midpoint ? t("map.midpoint",{label: "?", km: Math.round(radiusKm*4)}) : t("map.midpointPending")} /><Button onClick={findVenues} disabled={located<2}>Mekanları bul</Button><Note center>{late}</Note></>}`. `map.midpoint` etiketi: en yakın şehir adı API'de yok → yalnız "Orta nokta · ~{{km}} km" (`map.midpointKm`), spec §8 #9 çerçevesinde; ad istenirse B-7 adayı (ters geocode).

`pages/SoloSetupPage.tsx` (SOLO, COLLECTING; oturum zaten kurulmuş): sol `PointsEditor` (**sunucuya yazan** sürüm: `useNewSessionStore` yerine `sessionStore.addPoint/removePoint` — `api.addPoint`/`api.removePoint` + refresh; `PointsEditor` prop'la iki mod: `mode: "local" | "remote"`) + `Button` "Mekanları bul"; sağ `MapView` (katılımcılar = host + manual) + `HandNote soloHand`.

- [ ] **Step 6: Katıl / Bekle / Karar haritaları**
  - `JoinForm` sağ bölge: `WhoIsHere` + `MapView participants=[]` (katılmadan konumlar gizli; `preview` yalnız sayı) — kendi konumu alındıysa tek pin (kesikli, etiket "sen · katılınca"), `caption=map.midpointPending`.
  - `WaitingRoom` sağ bölge: `MapView` (view.participants, midpoint, radius, `pinLabels[viewerId]="sen"`) + `WaitingStatus` kartı.
  - `ResultScreen` sağ bölge: `TravelList` + `MapView venues=[winner] selectedVenueId=winner.id participants` (`heightClass="h-[10.625rem]"`, caption = adres yok → mekan adı) + `ViralCard`.

- [ ] **Step 7: PASS + görsel** — testler, `tsc`; artboard `Lobi 1280/390`, `Katıl 1280`, `Bekle 1280`, `Karar 1280`.

- [ ] **Step 8: INDEX güncelle + Commit (kullanıcı)** — `feat(web): rol/durum yonlendirmesi, lobi, solo kurulum, haritalar`

---

### Task 4: Mekanlar (W3b/W3c) — liste ↔ harita, Karıştır, Bunu seç, davetli salt okunur

**Files:**
- Create: `frontend/web/src/components/molecules/VenueRow.tsx`
- Create: `frontend/web/src/components/molecules/VenuePopCard.tsx`
- Create: `frontend/web/src/components/organisms/VenueBrowser.tsx`
- Create: `frontend/web/src/pages/VenuesPage.tsx`
- Modify: `frontend/web/src/store/deckStore.ts` (`shuffle`, `pick`)
- Create: `frontend/web/src/components/organisms/VenueBrowser.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VenueBrowser from "./VenueBrowser";

const venues = [
  { id: "v1", name: "Café Berlage", rating: 4.6, priceLevel: 2, lat: 51.44, lng: 5.47, deckOrder: 0, travelMinutes: { h: 34, a: 28 } },
  { id: "v2", name: "Koffie Top Hundred", rating: 4.4, priceLevel: 1, lat: 51.5, lng: 5.4, deckOrder: 1, travelMinutes: { h: 26, a: 35 } },
];
const people = [
  { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, approxLocation: { lat: 51.7, lng: 5.3 } },
  { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false, approxLocation: { lat: 51.39, lng: 5.71 } },
];

describe("VenueBrowser", () => {
  it("host: satırda 'Bunu seç', liste seçimi harita seçimine bağlanır", () => {
    const onPick = vi.fn();
    render(<VenueBrowser venues={venues} participants={people} midpoint={{ lat: 51.5, lng: 5.5 }} radiusKm={4}
      mode="host" travelLabels={{ h: "Sen", a: "Ayşe" }} onPick={onPick} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Bunu seç" })[1]);
    expect(onPick).toHaveBeenCalledWith("v2");
  });
  it("davetli: salt okunur, 'Bunu seç' yok", () => {
    render(<VenueBrowser venues={venues} participants={people} midpoint={null} radiusKm={null} mode="guest" travelLabels={{}} onPick={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Bunu seç" })).not.toBeInTheDocument();
    expect(screen.getByText("Café Berlage")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL doğrula** → modül yok.

- [ ] **Step 3: deckStore** — ekle:

```typescript
  shuffle: async () => { await api.shuffle(get().slug); },
  pick: async (venueId: string) => { await api.forceDecision(get().slug, { venueId }); },
```

(`sessionStore.refresh` STOMP/polling ile yeni durumu getirir.)

- [ ] **Step 4: Bileşenler**

`molecules/VenueRow.tsx` (artboard `.vrow`): props `venue, selected, onHover, onSelect, travelLabels, action?: ReactNode` — 64px foto (`VenueCard photoOnly photoHeight={64}` + tint), ad + Badge (Açık/`openNow` bilgisi API'de yok → rozet YOK; INDEX notu), meta `★ 4.6 · €€`, yol rozetleri (`Badge size="sm"`), sağda `action`. Seçili: `border-[1.5px] border-flame-deep bg-white shadow-sh2`. `onMouseEnter`/`onFocus` → `onHover(id)`.

`molecules/VenuePopCard.tsx` (artboard `.popcard`): harita üstü kart (`absolute left-4 top-4 z-5 w-[15.625rem]`): 52px foto + ad + meta + yol rozetleri + `action`.

`organisms/VenueBrowser.tsx`:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { Button, HandNote, Note } from "../atoms";
import Segmented from "../molecules/Segmented";
import VenuePopCard from "../molecules/VenuePopCard";
import VenueRow from "../molecules/VenueRow";
import MapView from "./MapView";

export type BrowserMode = "host" | "guest" | "solo";

export default function VenueBrowser(props: {
  venues: VenueDto[]; participants: ParticipantDto[];
  midpoint: { lat: number; lng: number } | null; radiusKm: number | null;
  mode: BrowserMode; travelLabels: Record<string, string>; onPick: (venueId: string) => void;
  tint?: number; pinLabels?: Record<string, string>;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(props.venues[0]?.id ?? null);
  const [tab, setTab] = useState<"list" | "map">("map");
  const sel = props.venues.find((v) => v.id === selected) ?? null;
  const pickBtn = (id: string, primary: boolean) => props.mode === "guest" ? null : (
    <Button type="button" kind={primary ? "flame" : "white"} onClick={() => props.onPick(id)}
      style={{ width: "auto", minHeight: "2.375rem", fontSize: "0.8125rem" }}>{t("venues.pick")}</Button>
  );
  const list = (
    <div className="flex flex-col gap-1.5">
      {props.venues.map((v) => (
        <VenueRow key={v.id} venue={v} selected={v.id === selected} tint={props.tint}
          travelLabels={props.travelLabels} onHover={() => setSelected(v.id!)} onSelect={() => setSelected(v.id!)}
          action={pickBtn(v.id!, props.mode === "solo" && v.id === selected)} />
      ))}
      {props.mode === "solo" ? <HandNote>{t("venues.soloHand")}</HandNote> : <Note>{t("venues.everyoneSees")}</Note>}
    </div>
  );
  const map = (
    <div className="relative">
      <MapView venues={props.venues} participants={props.participants} midpoint={props.midpoint} radiusKm={props.radiusKm}
        selectedVenueId={selected} onSelectVenue={setSelected} tint={props.tint} pinLabels={props.pinLabels} heightClass="h-[35rem]" />
      {sel && <VenuePopCard venue={sel} travelLabels={props.travelLabels} action={pickBtn(sel.id!, props.mode === "solo")} />}
    </div>
  );
  return (
    <>
      {/* ≥1024: yan yana (42/58); altında Liste/Harita anahtarı — artboard 390 */}
      <div className="lg:hidden">
        <div className="mb-3 flex justify-end"><Segmented value={tab} onChange={setTab} options={[{ value: "list", label: t("venues.list") }, { value: "map", label: t("venues.map") }]} /></div>
        {tab === "list" ? list : map}
      </div>
      <div className="hidden lg:grid lg:grid-cols-[42fr_58fr] lg:gap-10 lg:items-start">
        {list}{map}
      </div>
    </>
  );
}
```

`tr.json` `venues`: `title` (oturum adı sayfadan), `meta` "{{count}} mekan · orta noktadan ≤ {{km}} km", `pick` "Bunu seç", `shuffle` "Karıştır ve kaydır", `everyoneSees` "Herkes bu listeyi görüyor. Karıştırınca deste açılır; kim neyi beğendi, sonuçta belli olur.", `guestWait` "host karıştırınca deste açılır", `soloBadge` "Bireysel · {{count}} konum", `soloHand` "kaydırmak yok, beğendiğini seç →", `editPoints` "Konumları düzenle", `list` "Liste", `map` "Harita" (+ en/nl).

- [ ] **Step 5: Sayfa** — `pages/VenuesPage.tsx`: `Page` + `SessionHeader` (title = `view.name`, meta = `venues.meta`, action: host GROUP → avatar dizisi + `Button` "Karıştır ve kaydır" (`deckStore.shuffle`); SOLO → `Button white` "Konumları düzenle" (**BROWSING'de konumlar donmuş** — backend 409; buton yerine `Badge` "Bireysel · N konum" gösterilir, düzenleme yok; artboard'daki buton INDEX notuyla düşer); guest → `Badge amber` "host karıştırınca deste açılır") + `VenueBrowser mode={solo ? "solo" : host ? "host" : "guest"} onPick={deckStore.pick}`. Mobil davetli: `Segmented` haritada açılır (artboard 390 davetli). `tint = GROUP_TINT[groupOf(view.activityType)]`.

- [ ] **Step 6: PASS + görsel** — testler + `tsc`; artboard `Mekanlar grup 1280`, `Mekanlar grup 390 davetli`, `Mekanlar bireysel 1280/390`; gerçek anahtarla pin tıklama → satır seçimi, satır hover → pin büyümesi.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(web): Mekanlar (liste+harita, karistir, bunu sec)`

---

### Task 5: Profil tercihleri düzenleme + kapanış

**Files:**
- Modify: `frontend/web/src/components/organisms/ProfilePrefs.tsx`
- Modify: `frontend/web/src/pages/JoinForm.tsx` (`api.join` `locationLabel`)

- [ ] **Step 1: Profil tercihleri** — "Varsayılan konum" satırı açılır panel: `LocationField` (konumum / adres) → `api.updateMe({ defaultLocation: {lat,lng,label} })` + `setMe`. "Varsayılan etkinlik" satırı: `ActivityPicker compact` açılır panelde → `updateMe({ defaultActivity })`. `NewSessionPage` açılışta `me.defaultActivity`/`me.defaultLocation` ile ön-doldurur.

- [ ] **Step 2: Katıl etiketi** — `JoinForm.submit`: `api.join(slug, { displayName, lat, lng, locationLabel: location?.label })`; `WaitingRoom.changeLocation` → `sessionStore.changeLocation({..., label})`.

- [ ] **Step 3: Kapanış kapıları** — `tsc`, `test:web`, `build:web`, `build:web:preprod` yeşil; `grep -rn "className=\|style=" src/pages` → boş; storage taraması boş; anahtar yokken tüm ekranlar hatasız (harita notu ile).

- [ ] **Step 4: Uçtan uca (gerçek anahtarlar, kullanıcı ile):**
  - Grup: kur → link → ikinci tarayıcıda katıl (konum otomatik) → Lobi'de pinler → Mekanları bul → Mekanlar (iki tarafta) → Karıştır → deste → karar → Karar haritası.
  - Bireysel: kur → 2 konum → Mekanları bul → Bunu seç → Karar.

- [ ] **Step 5: INDEX'te W-4 `done` + Commit (kullanıcı)** — `feat(web): profil tercihleri + kapanis`

---

## Plan sonu doğrulaması

- [ ] Spec §3 durum tablosu birebir: COLLECTING (host Lobi / davetli Katıl-Bekle / SOLO kurulum), BROWSING (Mekanlar; host Karıştır + Bunu seç; SOLO Bunu seç; davetli salt okunur), SWIPING/RUNOFF/DECIDED eski akış.
- [ ] Harita yalnız Google; pinler DS §10; katılımcı konumu 2 ondalık; kendi tam konumu da çizilmiyor.
- [ ] Anahtarsız ortamda uygulama çalışır (yer tutucu notu).
- [ ] INDEX notları: "Ben de kaydıracağım" devre dışı (backend yok), Mekanlar'da "Açık/kapanır" rozeti yok (API'de yok), SOLO BROWSING'de konum düzenleme yok (backend donduruyor), orta nokta şehir adı yok (ters geocode yok) — B-7 adayları.
