# Plan 21: Web — Çoklu ilgi alanı seçimi ve karışık deste sunumu (W-8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Kimlik:** `W-8` · İz: Web · Durum INDEX'te tutulur (bu plan INDEX'i **düzenlemez**).

**Goal:** Yeni buluşma ekranında 1–3 ilgi alanı seçilebilmesi; oturumun her ekranında tekil rozet yerine seçili alanların listesinin görünmesi; ve karışık destede her kartın **kendi** ilgi alanını söylemesi.

**Architecture:** `sessionActivity()` (tekil, eksikse `COFFEE`) yerine `sessionActivities()` gelir. Cümle içine giren alan adları `Intl.ListFormat` ile birleştirilir — bu sayede `lobby.meetingFor`, `lobby.promise`, `venue.fitOk/fitOff` **anahtarları değişmez**, yalnız `{{activity}}`'ye giden dize çoğullaşır. Karışık destede uyum satırının doğru çalışması `VenueDto.activityType`'a bağlıdır: `VenueCard` artık dışarıdan `activity` prop'u almaz, mekânın kendi alanını okur — bugünkü davranıştan **daha** doğrudur.

**Tech Stack:** React 19 · TypeScript · Zustand · react-i18next · Tailwind v4 · Vitest + Testing Library.

**Öncül:** **`B-9` (plan20) `done` olmadan başlamaz.** İlk adım `pnpm codegen`; backend `activityTypes` yayınlamadan üretilen tipler yanlış olur.

**Testleri çalıştırma:**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto
pnpm test:web                                             # tümü
pnpm --filter @bumpinto/web test --run src/pages/LobbyPage.test.tsx   # tek dosya
pnpm i18n:check                                           # 3 dil anahtar paritesi
```

**Git kuralı:** Ajan git yazma işlemi yapmaz (AGENTS.md). "Commit" adımları **kullanıcıya bırakılır**; ajan yalnız hangi dosyaların bir arada gideceğini yazar.

---

## Yürütme grupları (ÖNCE BUNU OKU)

**Web'in tuzağı Java'nınkinin tersi.** `vitest` esbuild ile tipleri *sıyırır*, denetlemez: bir
prop'u kaldırdığında onu hâlâ geçen çağrı yerleri **testleri kırmaz**, sessizce geçer. Yani
yeşil test burada tek başına hiçbir şey kanıtlamaz.

**Her grubun gerçek kapısı `pnpm build:web`'dir** (tipleri denetler). Test yeşil + build kırmızı
= iş bitmemiştir.

| Grup | Görevler | Sonunda |
|---|---|---|
| **W-G1** | T1 | `pnpm codegen` + `activity.ts` yardımcıları + `MAX_ACTIVITIES` — build yeşil |
| **W-G2** | T2 | `ActivityPicker` çoklu seçim — build yeşil |
| **W-G3** | **T3 + T4 + T5 + T6 + `ProfilePrefs`** | Tip/prop sweep'i: store, sayfa, kart, tüm çağrı yerleri — build yeşil |
| **W-G4** | T7 + `VenueRow` rozeti | Boş alan uyarısı + 3 dil + parite + liste satırı rozeti — build yeşil |

**W-G3 tek bir iştir, parçalanamaz.** `sessionActivity()` kalkması ~11 ekranı, `VenueCard`'ın
`activity` prop'unun kalkması 4 çağrı yerini, `InvitePreview`'un `activities` alması `NewSessionPage`'i
aynı anda etkiler. Ara adımlarda `pnpm build:web` kırmızıdır — beklenendir.

## `ProfilePrefs` — tekil seçim, dürüst rol (W-G3'e ek)

`ProfilePrefs` de `ActivityPicker` kullanıyor ama profil varsayılanı **tekil** kalıyor
(backend de tekil bıraktı). Ucuz çözüm — `value={[defaultActivity]}` diye sarmalamak —
çalışır ama picker'a `role="checkbox"` bastırır; ekran okuyucuya "birden fazla seçebilirsin"
der. Rolü çoğul yapmamızın **tek sebebi** bu yalanı ortadan kaldırmaktı, profil ekranında
geri getirmek tutarsızlık olur.

`ActivityPicker`'a `max` prop'u eklenir:

```tsx
export default function ActivityPicker<A extends string>(props: {
  value: A[];
  onToggle: (a: A) => void;
  /** Tekil seçim için 1 (Profil varsayılanı); varsayılan MAX_ACTIVITIES. */
  max?: number;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  const max = props.max ?? MAX_ACTIVITIES;
  const single = max === 1;
  // Tekil seçimde rol de tekil olmalı: "checkbox" ekran okuyucuya birden fazla
  // secilebilecegini soyler, oysa tiklamak DEGISTIRIR.
  const groupRole = single ? "radiogroup" : "group";
  const itemRole = single ? "radio" : "checkbox";
  const full = props.value.length >= max;
```

ve chip'te `const locked = !single && full && !on;` — tekil modda hiçbir chip kilitlenmez,
tıklamak değiştirir. `role`/`aria-checked` `groupRole`/`itemRole`'den gelir.

`ProfilePrefs` çağrısı:

```tsx
          <ActivityPicker
            compact
            max={1}
            value={me.defaultActivity ? [me.defaultActivity] : []}
            onToggle={(a) => void onActivity(a).catch(() => setError(t("profile.errSave")))}
            ariaLabel={t("profile.defaultActivity")}
          />
```

`ActivityPicker.test.tsx`'e tek test eklenir:

```tsx
  /** Profil varsayılanı tekildir: rol de tekil olmalı, ve seçili chip kilitlenmemeli. */
  it("max=1 iken radio rolü kullanır ve seçim değiştirilebilir", () => {
    const onToggle = vi.fn();
    render(<ActivityPicker value={["COFFEE"]} onToggle={onToggle} max={1} />);
    expect(screen.getAllByRole("radio")).toHaveLength(15);
    const other = screen.getByRole("radio", { name: "Müze" });
    expect(other).toBeEnabled();
    fireEvent.click(other);
    expect(onToggle).toHaveBeenCalledWith("MUSEUM");
  });
```

## Liste satırı rozeti (W-G4'e ek)

Mekanlar ekranı **liste-önce** tasarlandı (karar 2026-09-03). Karışık destede satırlar hangi
ilgi alanından geldiklerini söylemezse çoklu seçimin değeri **ana ekranda görünmez** olur:
kullanıcı 20 satır görür, hangisi kahve hangisi hike bilemez. Deste/runoff kartlarında rozet
var, listede yok.

`VenueRow` zaten `venue: VenueDto` alıyor, yani `v.activityType` elinin altında — prop zinciri
gerekmiyor. İnmesi gereken tek şey "deste karışık mı" boolean'ı:

`VenuesPage` → `VenueBrowser` → `VenueRow`, `mixedDeck?: boolean`. `RunoffList`'e W-G3'te
yapılan aktarımın aynısı.

`VenueRow` içinde, başlık satırının yanında:

```tsx
      {props.mixedDeck && v.activityType && <ActivityBadge activity={v.activityType} />}
```

`activityType` yoksa rozet **hiç çizilmez** (atıf uydurulmaz — bkz. "Backend gerçeği").
Tek alanlı destede `mixedDeck` false olduğu için her satıra gereksiz rozet basılmaz.

## Backend gerçeği: `activityType` sık sık `null` gelir

Sağlayıcı atfı **garanti değil**:

- **Foursquare çoklu seçimde her zaman `null` atfeder** — yanıttan yalnız kategori *adı* okunuyor,
  eşleme tablosu üst düzey id tutuyor.
- Google da tip takma adı yüzünden bazı mekânları atfedemez.

Dolayısıyla her tüketici `null` atfı **düzgün şekilde yutmalı**: `FitLine` hiç çizilmez,
kart rozeti basılmaz, tint oturumun ilk alanına düşer. Hiçbir yerde "COFFEE" varsayılanı
uydurulmaz.

**Ayrıca:** seçili bir ilgi alanının desteye gireceği backend'de **garanti edilmiyor** (deste
dengeleme katmanı denendi ve geri alındı — sağlayıcı zaten `DECK_MAX`'tan fazla aday
döndürmüyor, elenecek bir şey yok). Bu yüzden T7'deki "bulunamadı" uyarısı kozmetik değil,
**ürünün dürüst cevabıdır**.

---

## Kapsam dışı (bilerek)

- **Oy/kaydırma mekaniği değişmiyor.** Karışık deste tek eksende kaydırılır.
- **Profil `defaultActivity` tekil kalır** (`ProfilePrefs`, `authStore`) — backend de tekil bıraktı.
- **Yeni ekran yok.** Boş kalan ilgi alanı bilgisi mevcut Mekanlar ekranına bir uyarı satırı olarak girer.

---

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| **Modify** `src/lib/activity.ts` | `sessionActivities()`, `activityListLabel()`; `sessionActivity()` kalkar |
| **Create** `src/components/molecules/ActivityBadges.tsx` | Rozet listesi — 5 çağrı yerinden kullanılır |
| **Modify** `src/components/molecules/ActivityPicker.tsx` | `radiogroup` → çoklu seçim, 3'te kilit |
| **Modify** `src/components/molecules/ActivityStrip.tsx` | `activity: string` → `activities: string[]` |
| **Modify** `src/components/molecules/VenueCard.tsx` | `activity` prop kalkar; mekânın kendi alanı + karışık destede rozet |
| **Modify** `src/components/molecules/FitLine.tsx` | `activity` zorunlu değil; `venue.activityType`'tan gelir |
| **Modify** `src/components/molecules/WhyHere.tsx` | Uyum ekseni mekânın kendi alanına bakar |
| **Modify** `src/components/molecules/InvitePreview.tsx`, `JoinIntro.tsx` | Rozet listesi |
| **Modify** `src/components/molecules/SessionCard.tsx`, `PastSessionRow.tsx` | Liste satırı çoğul etiket + ilk alanın tint'i |
| **Modify** `src/components/organisms/VenueDeck.tsx` | `activity` prop'unun aktarımı kalkar |
| **Modify** `src/store/newSessionStore.ts` | `activity` → `activities`, `toggleActivity` |
| **Modify** `src/pages/NewSessionPage.tsx` | Çoklu seçim + ipucu + önizleme |
| **Modify** `src/pages/LobbyPage.tsx`, `WaitingRoom.tsx`, `SoloSetupPage.tsx`, `VenuesPage.tsx`, `DeckScreen.tsx`, `ResultScreen.tsx`, `RunoffScreen.tsx`, `JoinForm.tsx` | Çoğul sunum |
| **Modify** `src/i18n/locales/{en,nl,tr}.json` | 2 yeni anahtar (mevcutlar değişmez) |

---

## Sözleşme (B-9 üretir, bu plan tüketir)

| Alan | Tip | Kural |
|---|---|---|
| `SessionView.activityTypes` | `ActivityType[]` | 1–3, host'un seçim sırasında |
| `SessionPreview.activityTypes` | `ActivityType[]` | Aynı |
| `SessionSummaryDto.activityTypes` | `ActivityType[]` | Aynı |
| `VenueDto.activityType` | `ActivityType \| null` | Mekânın geldiği alan; atıf çözülemediyse `null` |
| `SessionView.emptyActivityTypes` | `ActivityType[]` | Hiç mekân üretmemiş alanlar. Deste yokken **ve** hiçbir mekân atfedilememişken boş — ikinci durumda backend'in sinyali yoktur, susar |
| `CreateSessionRequest.activityTypes` | `ActivityType[]` | 1–3, **tekrarsız**; boş / 4+ / tekrarlı → 400 |

---

## Task 1: Codegen + `activity.ts` yardımcıları

**Files:**
- Modify: `frontend/web/src/lib/activity.ts`
- Test: `frontend/web/src/lib/activity.test.ts` (yoksa oluştur)

`Intl.ListFormat` seçimi bilinçli: elle `", "` + `" ve "` birleştirmek üç dilde de yanlış olur (Hollandaca `en`, İngilizce Oxford virgülü, Türkçe `ve`). Tarayıcı zaten doğrusunu biliyor.

- [ ] **Step 1: Tipleri üret**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto
pnpm codegen
```

Beklenen: `frontend/shared/openapi.json` içinde `activityTypes` ve `emptyActivityTypes` görünür. Görünmüyorsa **dur** — B-9 tamamlanmamıştır.

- [ ] **Step 2: Write the failing test**

`frontend/web/src/lib/activity.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { activityListLabel, sessionActivities } from "./activity";

describe("sessionActivities", () => {
  it("görünümün alanlarını olduğu gibi verir", () => {
    expect(sessionActivities({ activityTypes: ["COFFEE", "HIKE"] })).toEqual(["COFFEE", "HIKE"]);
  });

  /** Alan hiç yoksa ekran boş rozet çizmemeli — eski `?? "COFFEE"` varsayılanı YALAN söylüyordu. */
  it("alan yoksa boş dizi döner, uydurmaz", () => {
    expect(sessionActivities({})).toEqual([]);
  });
});

describe("activityListLabel", () => {
  const t = (key: string) => ({ "activity.COFFEE": "Kahve", "activity.HIKE": "Doğa yürüyüşü", "activity.BAR": "Bar" })[key] ?? key;

  it("tek alanı olduğu gibi bırakır", () => {
    expect(activityListLabel(["COFFEE"], t, "tr")).toBe("Kahve");
  });

  it("üç alanı locale kuralıyla birleştirir", () => {
    expect(activityListLabel(["COFFEE", "HIKE", "BAR"], t, "tr")).toBe("Kahve, Doğa yürüyüşü ve Bar");
  });

  it("İngilizcede kendi bağlacını kullanır", () => {
    expect(activityListLabel(["COFFEE", "HIKE"], (k) => ({ "activity.COFFEE": "Coffee", "activity.HIKE": "Hike" })[k] ?? k, "en")).toBe("Coffee and Hike");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @bumpinto/web test --run src/lib/activity.test.ts
```

Expected: FAIL — `sessionActivities is not a function`.

- [ ] **Step 4: `activity.ts`'i güncelle**

`sessionActivity` fonksiyonunu **sil** ve yerine ekle:

```typescript
/** SessionView.activityTypes — alan yoksa BOŞ dizi. Eski tekil yardımcı eksikte `COFFEE`
    varsayıyordu; çoklu seçimde bu uydurma bir rozet çizerdi. */
export function sessionActivities(view: { activityTypes?: string[] }): string[] {
  return view.activityTypes ?? [];
}

/** Cümle içine giren alan adları: `Intl.ListFormat` bağlacı locale'den alır (tr "ve",
    nl "en", en Oxford). Elle birleştirme üç dilden ikisinde yanlış olurdu. */
export function activityListLabel(
  activities: string[],
  t: (key: string) => string,
  locale: string,
): string {
  const labels = activities.map((a) => t(`activity.${a}`));
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(labels);
}
```

Sınırı da buraya koy — hem picker hem store okuyacak, ve bir store'un bileşenden import etmesi ters bağımlılık olurdu:

```typescript
/** Deste 20 mekân taşır; 4 ilgi alanı her birine 5 kart bırakır — uzlaşma için çok ince. */
export const MAX_ACTIVITIES = 3;
```

`groupOf` ve `GROUP_TINT` olduğu gibi kalır — artık **mekânın kendi** alanıyla çağrılırlar.

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @bumpinto/web test --run src/lib/activity.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit (kullanıcı yapar)**

Birlikte: `activity.ts`, `activity.test.ts`, `frontend/shared/openapi.json`. Mesaj: `feat(web): activity list helpers with locale-aware joining`

---

## Task 2: `ActivityPicker` — çoklu seçim, 3'te kilit

**Files:**
- Modify: `frontend/web/src/components/molecules/ActivityPicker.tsx`
- Test: `frontend/web/src/components/molecules/ActivityPicker.test.tsx`

`radio` → `checkbox` rol değişikliği zorunlu: `radiogroup` semantiği ekran okuyucuya "yalnız biri seçilebilir" der, çoklu seçimde bu yanlış bilgidir.

- [ ] **Step 1: Write the failing test**

`ActivityPicker.test.tsx`'i tamamen değiştir:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActivityPicker from "./ActivityPicker";

describe("ActivityPicker", () => {
  it("4 grup başlığı, 15 chip, seçim geri çağrısı", () => {
    const onToggle = vi.fn();
    render(<ActivityPicker value={["COFFEE"]} onToggle={onToggle} />);
    expect(screen.getByText("Yeme-içme")).toBeInTheDocument();
    expect(screen.getByText("Eğlence")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(15);
    expect(screen.getByRole("checkbox", { name: "Kahve" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Müze" }));
    expect(onToggle).toHaveBeenCalledWith("MUSEUM");
  });

  /** Üç seçiliyken dördüncü TIKLANAMAZ: sınır sessizce yutulmaz, chip devre dışı görünür. */
  it("3 seçiliyken seçilmemiş chip'ler devre dışı kalır", () => {
    const onToggle = vi.fn();
    render(<ActivityPicker value={["COFFEE", "HIKE", "BAR"]} onToggle={onToggle} />);
    const fourth = screen.getByRole("checkbox", { name: "Müze" });
    expect(fourth).toBeDisabled();
    fireEvent.click(fourth);
    expect(onToggle).not.toHaveBeenCalled();
  });

  /** Sınırdayken SEÇİLİ olanlar tıklanabilir kalır — yoksa seçim kilitlenir, geri alınamaz. */
  it("3 seçiliyken seçili chip kaldırılabilir", () => {
    const onToggle = vi.fn();
    render(<ActivityPicker value={["COFFEE", "HIKE", "BAR"]} onToggle={onToggle} />);
    const chosen = screen.getByRole("checkbox", { name: "Kahve" });
    expect(chosen).toBeEnabled();
    fireEvent.click(chosen);
    expect(onToggle).toHaveBeenCalledWith("COFFEE");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @bumpinto/web test --run src/components/molecules/ActivityPicker.test.tsx
```

Expected: FAIL — `getAllByRole("checkbox")` boş döner.

- [ ] **Step 3: Bileşeni değiştir**

```tsx
import { useTranslation } from "react-i18next";
import { ACTIVITY_GROUPS, ACTIVITY_ICONS, MAX_ACTIVITIES, type ActivityGroup } from "../../lib/activity";
import { Overline } from "../atoms";

const CHIP = "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-4 text-[0.90625rem] font-semibold";

export default function ActivityPicker<A extends string>(props: {
  value: A[];
  onToggle: (a: A) => void;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  const full = props.value.length >= MAX_ACTIVITIES;
  return (
    <div role="group" aria-label={props.ariaLabel} className={`grid gap-x-5 gap-y-4 ${props.compact ? "" : "lg:grid-cols-2"}`}>
      {(Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).map((g) => (
        <div key={g} className="flex flex-col gap-2">
          <Overline>{t(`activity.group.${g}`)}</Overline>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_GROUPS[g].map((a) => {
              const I = ACTIVITY_ICONS[a];
              const on = props.value.includes(a as A);
              // Sinirdayken SECILI chip acik kalir: kapatilsaydi kullanici secimini
              // geri alamaz, ekran kilitlenirdi.
              const locked = full && !on;
              return (
                <button key={a} type="button" role="checkbox" aria-checked={on} disabled={locked}
                  onClick={() => props.onToggle(a as A)}
                  className={`${CHIP} ${locked ? "cursor-not-allowed opacity-40" : "cursor-pointer"} ${on ? "border-flame-deep bg-flame-wash text-flame-deep" : "border-line2 bg-card text-ink2"}`}>
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

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @bumpinto/web test --run src/components/molecules/ActivityPicker.test.tsx
```

Expected: PASS (3 test).

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte: `ActivityPicker.tsx` + testi. Mesaj: `feat(web): activity picker selects up to three`

---

## Task 3: `newSessionStore` + `NewSessionPage`

**Files:**
- Modify: `frontend/web/src/store/newSessionStore.ts`
- Modify: `frontend/web/src/pages/NewSessionPage.tsx`
- Test: `frontend/web/src/store/newSessionStore.test.ts` (yoksa oluştur)

- [ ] **Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { useNewSessionStore } from "./newSessionStore";

describe("newSessionStore aktivite seçimi", () => {
  beforeEach(() => useNewSessionStore.getState().reset());

  it("COFFEE ile başlar", () => {
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE"]);
  });

  it("toggle ekler ve seçim sırasını korur", () => {
    useNewSessionStore.getState().toggleActivity("HIKE");
    useNewSessionStore.getState().toggleActivity("BAR");
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE", "HIKE", "BAR"]);
  });

  it("toggle seçiliyi kaldırır", () => {
    useNewSessionStore.getState().toggleActivity("HIKE");
    useNewSessionStore.getState().toggleActivity("HIKE");
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE"]);
  });

  /** Son alan kaldırılamaz: backend boş listeyi 400'le reddediyor, kullanıcıyı oraya sokma. */
  it("son kalan alanı kaldırmaz", () => {
    useNewSessionStore.getState().toggleActivity("COFFEE");
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE"]);
  });

  /** Sınır store'da da tutulur: picker devre dışı bıraksa bile store tek doğrudur. */
  it("üçten fazlasını eklemez", () => {
    ["HIKE", "BAR", "SWIM"].forEach((a) => useNewSessionStore.getState().toggleActivity(a as never));
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE", "HIKE", "BAR"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @bumpinto/web test --run src/store/newSessionStore.test.ts
```

Expected: FAIL — `activities` undefined.

- [ ] **Step 3: Store'u güncelle**

`newSessionStore.ts` içinde:

```typescript
import { MAX_ACTIVITIES } from "../lib/activity";

type Activity = Schemas["CreateSessionRequest"]["activityTypes"][number];
```

`State` tipinde `activity: Activity` → `activities: Activity[]`, `setActivity` → `toggleActivity`:

```typescript
type State = {
  type: SessionType; activities: Activity[]; name: string; points: LocalPoint[]; travelMode: TravelMode;
  busy: boolean; error: string | null;
  setType: (t: SessionType) => void; toggleActivity: (a: Activity) => void; setName: (n: string) => void;
  // ... gerisi aynı
};
```

`initial()` içinde `activity: "COFFEE"` → `activities: ["COFFEE"]`.

`setActivity` uygulamasını değiştir:

```typescript
  /** Sınırlar TEK yerde: picker chip'i devre dışı bıraksa bile store son sözü söyler.
      Son alan kaldırılmaz — backend boş listeyi 400'le reddediyor. */
  toggleActivity: (a) =>
    set((s) => {
      if (s.activities.includes(a)) {
        return s.activities.length === 1 ? s : { activities: s.activities.filter((x) => x !== a) };
      }
      return s.activities.length >= MAX_ACTIVITIES ? s : { activities: [...s.activities, a] };
    }),
```

`submit` içinde destructuring ve gövde:

```typescript
    const { type, activities, name, points, travelMode } = get();
```

```typescript
        const r = await api.createSession({
          activityTypes: activities,
          sessionType: type,
```

- [ ] **Step 4: `NewSessionPage`'i güncelle**

`type Activity` satırı:

```tsx
type Activity = Schemas["CreateSessionRequest"]["activityTypes"][number];
```

Seçici bağlantıları:

```tsx
  const activities = useNewSessionStore((s) => s.activities);
  const toggleActivity = useNewSessionStore((s) => s.toggleActivity);
```

İlk mount efekti. Profil varsayılanı **tekil** kaldığı (B-9 kapsam dışı) ve `reset()` zaten
`["COFFEE"]` bıraktığı için varsayılan `toggleActivity` ile **eklenemez** — `COFFEE` gelirse
kaldırma denemesi olur, başka bir değer gelirse liste `["COFFEE", X]` olurdu. Varsayılan
doğrudan `reset()`'e geçer:

`newSessionStore.ts` — `State` tipinde `reset: (defaultActivity?: Activity) => void;` ve
uygulama:

```typescript
  /** Varsayılan geçilirse başlangıç seçimi ODUR; yoksa COFFEE. Profil varsayılanını
      toggle ile eklemek yanlış olurdu: reset zaten tek elemanlı bir seçim bırakıyor. */
  reset: (defaultActivity?: Activity) =>
    set({ ...initial(), activities: [defaultActivity ?? "COFFEE"] }),
```

`NewSessionPage.tsx`:

```tsx
  useEffect(() => {
    reset((me?.defaultActivity as Activity) ?? undefined);
    if (me?.defaultTravelMode) setTravelMode(me.defaultTravelMode);
    // yalnız ilk mount'ta — reset ve varsayılan etkinlik/ulaşım
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Picker kullanımı ve ipucu satırı:

```tsx
            <Overline>{t("newSession.what")}</Overline>
            <Note>{t("newSession.whatHint", { max: 3 })}</Note>
            <ActivityPicker value={activities} onToggle={toggleActivity} />
```

Önizleme (`InvitePreview`) `activity` yerine `activities` alır — T5'te değişecek; şimdilik:

```tsx
            <InvitePreview hostName={...} sessionName={name} activities={activities} />
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @bumpinto/web test --run src/store/newSessionStore.test.ts src/pages/NewSessionPage.test.tsx
```

Expected: `newSessionStore.test.ts` PASS. `NewSessionPage.test.tsx` `InvitePreview` yüzünden hâlâ kırık olabilir — T5'te kapanır.

- [ ] **Step 6: Commit (kullanıcı yapar)**

Birlikte: `newSessionStore.ts`, `newSessionStore.test.ts`, `NewSessionPage.tsx`. Mesaj: `feat(web): new session form selects up to three activities`

---

## Task 4: Kart uyum satırı — mekânın kendi ilgi alanı

**Files:**
- Modify: `frontend/web/src/components/molecules/FitLine.tsx`
- Modify: `frontend/web/src/components/molecules/VenueCard.tsx`
- Modify: `frontend/web/src/components/molecules/WhyHere.tsx`
- Modify: `frontend/web/src/components/organisms/VenueDeck.tsx`
- Test: `frontend/web/src/components/molecules/VenueCard.test.tsx`

**Düzeltilen hata:** `FitLine` bugün oturumun **tek** alanına bakıyor. Karışık destede her hike kartı "kahve için uygun değil" derdi. Mekânın kendi `activityType`'ı geldiği için satır artık tahmin etmiyor.

- [ ] **Step 1: Write the failing test**

`VenueCard.test.tsx` içine ekle:

```tsx
  /** Karışık destede kart KENDİ alanını söyler: hike kartı "kahve değil" demez. */
  it("uyum satırı mekânın kendi ilgi alanına bakar", () => {
    render(
      <VenueCard
        venue={{ ...baseVenue, category: "Hiking area", activityType: "HIKE" }}
        categories={["Coffee shop", "Hiking area"]}
      />,
    );
    expect(screen.getByText(/Doğa yürüyüşü için/)).toBeInTheDocument();
  });

  /** Atıf yoksa satır HİÇ çizilmez — uydurma bir alan adı yazmaktansa sussun. */
  it("atıfsız mekânda uyum satırı çizilmez", () => {
    render(
      <VenueCard
        venue={{ ...baseVenue, category: "Hiking area", activityType: null }}
        categories={["Coffee shop", "Hiking area"]}
      />,
    );
    expect(screen.queryByText(/için:/)).not.toBeInTheDocument();
  });

  /** Karışık destede kart rozeti gösterilir; tek alanlı destede gereksiz gürültüdür. */
  it("karışık destede aktivite rozeti basar", () => {
    render(
      <VenueCard venue={{ ...baseVenue, activityType: "HIKE" }} mixedDeck />,
    );
    expect(screen.getByText("Doğa yürüyüşü")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @bumpinto/web test --run src/components/molecules/VenueCard.test.tsx
```

Expected: FAIL — `mixedDeck` prop'u yok, uyum satırı `activity` prop'una bağlı.

- [ ] **Step 3: `FitLine`'ı güncelle**

```tsx
/* Karar dokümanı §4.6 — "uyum satırı", DS v2 §11 `.f-fit`. Tek uygulama: VenueCard (deste/liste)
   VE WhyHere'in UYUM ekseni bunu çağırır — sözcük/renk mantığı tek yerde yaşar.
   Aktivite MEKÂNIN KENDİ alanıdır (B-9 `VenueDto.activityType`): karışık destede oturumun
   ilk alanına bakmak her hike kartına "kahve değil" yazdırırdı. */
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { fitsActivity } from "../../lib/activity";

export default function FitLine(props: {
  venue: VenueDto;
  /** Destedeki TÜM kategoriler — ≥2 farklı değer yoksa satır gizlenir (§4.6, "12 aynı kart").
      Geçilmezse (ör. Karar ekranında tek mekan) çeşitlilik denetimi atlanır. */
  categories?: string[];
}) {
  const { t, i18n } = useTranslation();
  const c = props.venue.category;
  const a = props.venue.activityType;
  // Atıf çözülemediyse SUS: uydurma bir alan adı yanlış bilgidir.
  if (!c || !a) return null;
  if (props.categories && new Set(props.categories.filter(Boolean)).size < 2) return null;
  const ok = fitsActivity(a, c);
  const activity = t(`activity.${a}`);
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  return (
    <span className={`text-[0.8125rem] ${ok ? "text-ink2" : "font-semibold text-amber"}`}>
      {ok
        ? t("venue.fitOk", { activity, category: c.toLocaleLowerCase(locale) })
        : t("venue.fitOff", { activity, category: c.toLocaleLowerCase(locale) })}
    </span>
  );
}
```

- [ ] **Step 4: `VenueCard`'ı güncelle**

`activity?: string` prop'unu **sil**, yerine:

```tsx
  /** Karışık deste (>1 ilgi alanı): kart kendi alanının rozetini de basar. */
  mixedDeck?: boolean;
```

`ActivityBadge` importunu ekle ve gövdedeki `FitLine` bloğunu değiştir:

```tsx
              {!props.hideTitle && <h2 className="text-[1.25rem]">{v.name}</h2>}
              {props.mixedDeck && v.activityType && (
                <div className="flex"><ActivityBadge activity={v.activityType} /></div>
              )}
              <FitLine venue={v} categories={props.categories ?? []} />
```

- [ ] **Step 5: `WhyHere` ve `VenueDeck`'i güncelle**

`WhyHere.tsx` — `sessionActivity` importunu kaldır, satırı değiştir:

```tsx
          <FitLine venue={props.venue} />
```

`VenueDeck.tsx` — `activity` prop'unu **sil**, yerine `mixedDeck?: boolean` ekle ve `VenueCard`'a aktar:

```tsx
  /** Oturum >1 ilgi alanı taşıyorsa kartlar kendi rozetlerini basar. */
  mixedDeck?: boolean;
```

```tsx
        <VenueCard ... mixedDeck={props.mixedDeck} />
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter @bumpinto/web test --run src/components/molecules/VenueCard.test.tsx src/components/molecules/WhyHere.test.tsx src/components/molecules/FitLine.test.tsx
```

Expected: PASS. Kırılan eski testlerde `activity="COFFEE"` prop'unu silip mekâna `activityType: "COFFEE"` ekle.

- [ ] **Step 7: Commit (kullanıcı yapar)**

Birlikte: `FitLine.tsx`, `VenueCard.tsx`, `WhyHere.tsx`, `VenueDeck.tsx` + testleri. Mesaj: `fix(web): fit line reads the venue's own activity, not the session's first`

---

## Task 5: Rozet ve şerit çağrı yerleri

**Files:**
- Create: `frontend/web/src/components/molecules/ActivityBadges.tsx`
- Modify: `frontend/web/src/components/molecules/ActivityStrip.tsx`
- Modify: `frontend/web/src/components/molecules/InvitePreview.tsx`, `JoinIntro.tsx`
- Modify: `frontend/web/src/pages/LobbyPage.tsx`, `WaitingRoom.tsx`, `SoloSetupPage.tsx`, `VenuesPage.tsx`, `JoinForm.tsx`
- Test: `frontend/web/src/pages/LobbyPage.test.tsx`

`ActivityBadges` yeni dosyayı hak ediyor (AGENTS.md eşiği): 5 çağrı yerinden kullanılıyor, tek sorumluluğu var, bağımsız test edilebilir.

- [ ] **Step 1: Write the failing test**

`LobbyPage.test.tsx` içine ekle:

```tsx
  /** Lobi seçili alanların HEPSİNİ gösterir ve vaat cümlesini çoğullar. */
  it("üç ilgi alanını rozet ve cümle olarak basar", () => {
    renderLobby({ ...baseView, activityTypes: ["COFFEE", "HIKE", "BAR"] });
    expect(screen.getByText("Kahve")).toBeInTheDocument();
    expect(screen.getByText("Doğa yürüyüşü")).toBeInTheDocument();
    expect(screen.getByText("Bar")).toBeInTheDocument();
    expect(screen.getByText(/Kahve, Doğa yürüyüşü ve Bar için buluşuyoruz/)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @bumpinto/web test --run src/pages/LobbyPage.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: `ActivityBadges`'i oluştur**

```tsx
import ActivityBadge from "./ActivityBadge";

/** Seçili ilgi alanlarının rozet listesi — Lobi/Bekle/Solo/Mekanlar/Davet ortak. */
export default function ActivityBadges({ activities }: { activities: string[] }) {
  return (
    <>
      {activities.map((a) => (
        <ActivityBadge key={a} activity={a} />
      ))}
    </>
  );
}
```

- [ ] **Step 4: `ActivityStrip`'i çoğullaştır**

```tsx
/* "Kahve, Doğa yürüyüşü ve Bar için buluşuyoruz" + vaat satırı (karar dokümanı §5.C).
   i18n ANAHTARLARI DEĞİŞMEDİ: `{{activity}}` artık `Intl.ListFormat` ile birleştirilmiş
   çoklu etiket alıyor — üç dilin bağlacı da doğru çıkıyor. */
import { useTranslation } from "react-i18next";
import { ACTIVITY_ICONS, activityListLabel } from "../../lib/activity";

export default function ActivityStrip(props: { activities: string[]; km?: number | null }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  if (props.activities.length === 0) return null;
  // İkon: ilk alanınki — şerit tek satır, rozet listesi zaten yukarıda duruyor.
  const I = ACTIVITY_ICONS[props.activities[0]];
  const label = activityListLabel(props.activities, t, locale);
  const lower = label.toLocaleLowerCase(locale);
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-flame-wash px-4 py-3">
      {I && <I size={20} className="text-flame-deep" aria-hidden />}
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.875rem] font-bold">{t("lobby.meetingFor", { activity: label })}</span>
        <span className="text-[0.75rem] text-ink2">
          {props.km != null
            ? t("lobby.promiseKm", { activity: lower, km: props.km })
            : t("lobby.promise", { activity: lower })}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Çağrı yerlerini güncelle**

`InvitePreview.tsx` — prop ve kullanım:

```tsx
export default function InvitePreview(props: { hostName: string; sessionName: string; activities: string[] }) {
```

```tsx
          <ActivityBadges activities={props.activities} />
```

`JoinIntro.tsx`:

```tsx
          {props.activities.length > 0 && <ActivityBadges activities={props.activities} />}
```

prop tipini `activities: string[]` yap.

`JoinForm.tsx:98`:

```tsx
              activities={preview?.activityTypes ?? []}
```

`LobbyPage.tsx`:

```tsx
  const activities = sessionActivities(view);
```

```tsx
            <ActivityBadges activities={activities} />
```

```tsx
            <ActivityStrip activities={activities} km={km} />
```

`WaitingRoom.tsx` — `const activities = sessionActivities(view);` ve `<ActivityStrip activities={activities} km={km} />`.

`SoloSetupPage.tsx` — `const activities = sessionActivities(view);` ve `<ActivityBadges activities={activities} />`.

`VenuesPage.tsx`:

```tsx
  const activities = sessionActivities(view);
  // Tint artık kartın KENDİ alanından: karışık destede tek grup rengi yanıltırdı.
  const mixedDeck = activities.length > 1;
```

```tsx
         badges={<ActivityBadges activities={activities} />}
```

`VenueCard`/`VenueDeck` kullanan yerlerde `tint={GROUP_TINT[groupOf(v.activityType ?? activities[0] ?? "COFFEE")]}` ve `mixedDeck={mixedDeck}` geçir.

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter @bumpinto/web test --run src/pages/LobbyPage.test.tsx src/pages/WaitingRoom.test.tsx src/pages/SoloSetupPage.test.tsx src/pages/VenuesPage.test.tsx src/pages/JoinForm.test.tsx src/pages/NewSessionPage.test.tsx
```

Expected: PASS. Kırılan testlerde `activityType: "COFFEE"` → `activityTypes: ["COFFEE"]`.

- [ ] **Step 7: Commit (kullanıcı yapar)**

Birlikte: `ActivityBadges.tsx`, `ActivityStrip.tsx`, 2 molekül, 5 sayfa + testleri. Mesaj: `feat(web): every session screen shows the full activity selection`

---

## Task 6: Liste ve özet ekranları

**Files:**
- Modify: `frontend/web/src/components/molecules/SessionCard.tsx`, `PastSessionRow.tsx`
- Modify: `frontend/web/src/pages/DeckScreen.tsx`, `ResultScreen.tsx`, `RunoffScreen.tsx`
- Test: `frontend/web/src/pages/SessionsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

`SessionsPage.test.tsx` içine ekle:

```tsx
  /** Adsız oturumun başlığı seçili alanların birleşimidir. */
  it("adsız çok alanlı oturumu birleşik etiketle listeler", () => {
    renderSessions([{ ...baseRow, name: null, activityTypes: ["COFFEE", "BAR"] }]);
    expect(screen.getByRole("heading", { name: "Kahve ve Bar" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @bumpinto/web test --run src/pages/SessionsPage.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: `SessionCard`'ı güncelle**

`activityListLabel` importunu ekle ve üç satırı değiştir:

```tsx
  const { t, i18n } = useTranslation();
  const label = activityListLabel(row.activityTypes ?? [], t, i18n.resolvedLanguage ?? "en");
```

```tsx
      <h3 className="mb-1 text-[1.3125rem]">{row.name ?? label}</h3>
```

```tsx
        {label} · {row.sessionType === "SOLO" ? t("sessions.solo") : t("sessions.group")}
```

```tsx
          aria-label={`${t(cta(row.status))} · ${row.name ?? label}`}
```

- [ ] **Step 4: Kalan dört dosyayı güncelle**

`PastSessionRow.tsx:22` — tint ilk alandan:

```tsx
          tint={GROUP_TINT[groupOf(row.activityTypes?.[0] ?? "COFFEE")]}
```

`DeckScreen.tsx`:

```tsx
  const activities = sessionActivities(props.view);
  const label = activityListLabel(activities, t, i18n.resolvedLanguage ?? "en");
  const title = props.view.name ?? label;
```

`activity:` interpolasyonu geçen satırda `activity: label`. `VenueDeck`'e `mixedDeck={activities.length > 1}` geçir.

`ResultScreen.tsx`:

```tsx
  // Tint KAZANANIN kendi alanından: karışık destede oturumun ilk alanı yanlış renk verirdi.
  const tint = GROUP_TINT[groupOf(winner.activityType ?? sessionActivities(v)[0] ?? "COFFEE")];
```

```tsx
             <BackupPlan view={v} winnerId={winner.id ?? ""} tint={tint} />
```

`sessionActivity` importunu `sessionActivities` yap.

`RunoffScreen.tsx:86` — `activity` prop'u T4'te kalktı, satırı **sil** ve yerine:

```tsx
              mixedDeck={sessionActivities(v).length > 1}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @bumpinto/web test --run src/pages/SessionsPage.test.tsx src/pages/DeckScreen.test.tsx src/pages/ResultScreen.test.tsx src/pages/RunoffScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit (kullanıcı yapar)**

Birlikte: 2 molekül, 3 sayfa + testleri. Mesaj: `feat(web): list and result screens read the activity list`

---

## Task 7: Boş kalan ilgi alanı uyarısı + i18n

**Files:**
- Modify: `frontend/web/src/pages/VenuesPage.tsx`
- Modify: `frontend/web/src/i18n/locales/en.json`, `nl.json`, `tr.json`
- Test: `frontend/web/src/pages/VenuesPage.test.tsx`

Backend telafi çağrısı yapmıyor (Places bütçesi). Bir alandan hiç mekân gelmediyse kullanıcı bunu **görmeli**; yoksa "hike seçtim ama 20 kafe geldi" sessiz bir hata gibi okunur.

- [ ] **Step 1: Write the failing test**

```tsx
  /** Seçili ama boş kalan alan sessizce yutulmaz — ek çağrı yapılmadığı için açıkça söylenir. */
  it("mekân üretmemiş ilgi alanını bildirir", () => {
    renderVenues({
      ...baseView,
      activityTypes: ["COFFEE", "HIKE"],
      emptyActivityTypes: ["HIKE"],
    });
    expect(screen.getByText(/Doğa yürüyüşü için yakında yer bulunamadı/)).toBeInTheDocument();
  });

  /** Hepsi doluysa uyarı hiç çizilmez. */
  it("boş alan yoksa uyarı basmaz", () => {
    renderVenues({ ...baseView, activityTypes: ["COFFEE"], emptyActivityTypes: [] });
    expect(screen.queryByText(/bulunamadı/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @bumpinto/web test --run src/pages/VenuesPage.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: `VenuesPage`'e uyarıyı ekle**

Rozet satırının altına:

```tsx
      {(view.emptyActivityTypes ?? []).length > 0 && (
        <Note tone="amber">
          {t("venues.noneFor", {
            activity: activityListLabel(view.emptyActivityTypes ?? [], t, i18n.resolvedLanguage ?? "en"),
          })}
        </Note>
      )}
```

`Note` `tone` prop'unu desteklemiyorsa mevcut uyarı deseninin sınıfını kullan (`text-amber font-semibold`).

- [ ] **Step 4: i18n anahtarlarını ekle**

`tr.json`:

```json
  "newSession": { "whatHint": "En fazla {{max}} tane seç" },
  "venues": { "noneFor": "{{activity}} için yakında yer bulunamadı." }
```

`en.json`:

```json
  "newSession": { "whatHint": "Pick up to {{max}}" },
  "venues": { "noneFor": "No {{activity}} spots nearby." }
```

`nl.json`:

```json
  "newSession": { "whatHint": "Kies er maximaal {{max}}" },
  "venues": { "noneFor": "Geen plekken voor {{activity}} in de buurt." }
```

Anahtarları mevcut `newSession` / `venues` nesnelerinin **içine** ekle, yeni kök nesne açma.

- [ ] **Step 5: Run tests and parity check**

```bash
pnpm --filter @bumpinto/web test --run src/pages/VenuesPage.test.tsx
pnpm i18n:check
```

Expected: PASS ve parity check temiz.

- [ ] **Step 6: Tüm süiti koş**

```bash
pnpm test:web
pnpm build:web
```

Expected: tüm testler yeşil, build başarılı.

- [ ] **Step 7: Commit (kullanıcı yapar)**

Birlikte: `VenuesPage.tsx`, 3 dil dosyası + testi. Mesaj: `feat(web): tell the user which selected activity found nothing`

---

## Bitirme kontrolü

- [ ] `pnpm test:web` yeşil
- [ ] `pnpm i18n:check` temiz (3 dil parite)
- [ ] `pnpm build:web` başarılı
- [ ] Tek alanlı oturum eskisi gibi görünüyor (rozet tek, şerit tekil, kart rozeti **yok**)
- [ ] 3 alanlı oturumda deste kartları kendi rozetlerini ve doğru uyum satırını basıyor
- [ ] 4. chip devre dışı; 3 seçiliyken seçili chip kaldırılabiliyor
- [ ] Profil `defaultActivity` tekil kaldı, yeni oturum ekranını doğru açıyor
- [ ] `emptyActivityTypes` dolu geldiğinde Mekanlar ekranında uyarı görünüyor

---

## W-8 sonrası açık kalanlar (INDEX'e aday)

| Aday | Not |
|---|---|
| Mobil parite (M-*) | `frontend/shared` dil dosyaları ve `ActivityPicker` karşılığı RN tarafında çoğullaşmalı |
| Profil çoklu varsayılan | `defaultActivity` tekil bırakıldı (YAGNI); istek gelirse ayrı iz |
| `EXPECTED_CATEGORIES` sadeleşmesi | Atıf backend'den geldiği için anahtar kelime listesi artık yalnız "uyuyor mu" denetimi; küçültülebilir |
