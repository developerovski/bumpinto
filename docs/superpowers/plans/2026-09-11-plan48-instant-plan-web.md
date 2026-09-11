# W-18 — "Buradayım" anlık plan + kitle + rozetler — Web Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web'de plan formu "Ne zaman: Belirsiz | Şimdi | Tarih seç" + "Kim görsün? Herkes | Kimse" kazanır; Keşfet "Buradayım" kısayolu, "Şimdi" aralığı ve süren-plan kartı çizer; profil ve check-in rozet gösterir.

**Architecture:** Kurallar `@bumpinto/shared`'da saf modüllerde yaşar (`openPlan.ts` taslak→`OpenPlanInput`, `planRange.ts` aralık/kalan süre, `badges.ts` sayaç→rozet) — mobil (M-12) aynı modülleri kullanır. Web store'lar bu fonksiyonları bağlar; sayfalar mevcut atom/molekülleri (`Segmented`, `Field`, `TextInput`, `Sticker`, `Badge`, `LinkButton`) kullanır. Yeni sayfa yok.

**Tech Stack:** React + Vite + zustand + vitest/RTL · `@bumpinto/shared` (openapi tipleri B-18 codegen'inden) · react-i18next (tr/en/nl `frontend/shared/src/i18n/locales`).

**Spec:** `docs/superpowers/specs/2026-09-11-instant-plan-badges-design.md` §1, §4, §6, §11.

**Ön koşullar (sert):** B-18 T6 (`api-types.ts`'te `OpenPlanInput.openUntil/audience`, `PlanCardDto.openUntil`, `StatsDto.plansMet/metStreakWeeks`). W-17'nin W2/W3/W4/W6/W7 görevleri **ya bitmiş olmalı ya da bu planın ilgili görevleriyle birleştirilerek yapılmalı** (INDEX çapraz kilit 22): W2 henüz başlamadıysa, W2'yi doğrudan aşağıdaki T2 şekliyle uygula (ara şekil üretme).

**Bağlayıcı kararlar:** spec §1.2 (1/2/3 sa), §1.3 (çapa = kendi konum + "Nerede?" etiketi), §1.4 (Şimdi'de OPEN varsayılan), §1.10–11 (kitle; "Keşfet'te göster" anahtarı yok), §11 tasarım turu (başlık isteğe bağlı; Şimdi bir FİLTRE; Arkadaşlar seçeneği ÇİZİLMEZ; sayaç `sessionsHosted`; P7 Katıl → detay). Tasarım: Claude Design `Web Ekranlar v3 - Keşfet POC.dc.html` P1/P1m/P1c/P3/P3a/P2a/P5b/P6. Git yazımı kullanıcıda.

## Test komutları

```bash
# repo kökünden
WTEST='source ./init-nvm.sh && pnpm --filter @bumpinto/web vitest run'
STEST='source ./init-nvm.sh && pnpm --filter @bumpinto/web vitest run ../shared/src'   # shared testleri web vitest include'u üzerinden koşar
I18N='source ./init-nvm.sh && pnpm i18n:check'
TSC='source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b'
```

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| `frontend/shared/src/openPlan.ts` (+test) | `OpenPlanDraft`, `emptyOpenPlanDraft`, `openPlanInputOf`, `openPlanError`, `anchorForInstant` |
| `frontend/shared/src/planRange.ts` (+test) | `PlanRange`, `inRange`, `remainingMinutes`, `sortPlans` |
| `frontend/shared/src/badges.ts` (+test) | `BADGES`, `badgesFor(stats)`, `newBadges(before, after)` |
| `frontend/shared/src/newSession.ts` | Taslağa `plan` alanı; `toCreateRequest` `openPlan` + anlık çapa üretir (mobil için) |
| `frontend/web/src/store/newSessionStore.ts`, `pages/NewSessionPage.tsx` | Form durumu + UI (P3/P3a) |
| `frontend/web/src/pages/DiscoverPage.tsx`, `store/discoverStore.ts`, `components/molecules/PlanCard.tsx` | Buradayım, Şimdi, süren kart (P1/P1m/P1c) |
| `frontend/web/src/components/molecules/PlanIntro.tsx`, `components/organisms/SeatRequestCard.tsx` | Süren plan detayı + OPEN kopyası (P2a) |
| `frontend/web/src/components/organisms/ProfilePrefs.tsx`, `components/molecules/BadgeRow.tsx` (yeni), `components/organisms/CheckinSheet.tsx` | Rozetler (P6/P5b) |
| `frontend/shared/src/i18n/locales/{tr,en,nl}.json` | Anahtarlar |

---

### Task 1: Shared saf modüller — `openPlan.ts`, `planRange.ts`, `badges.ts` + `newSession.ts` taslağı

**Files:**
- Create: `frontend/shared/src/openPlan.ts`, `frontend/shared/src/openPlan.test.ts`
- Create: `frontend/shared/src/planRange.ts`, `frontend/shared/src/planRange.test.ts`
- Create: `frontend/shared/src/badges.ts`, `frontend/shared/src/badges.test.ts`
- Modify: `frontend/shared/src/newSession.ts`, `frontend/shared/src/newSession.test.ts`, `frontend/shared/src/index.ts`

- [ ] **Step 1: Başarısız testler**

`openPlan.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { anchorForInstant, emptyOpenPlanDraft, openPlanError, openPlanInputOf } from "./openPlan";

const NOW = new Date("2026-09-13T10:00:00Z");
const draft = (patch: Partial<ReturnType<typeof emptyOpenPlanDraft>> = {}) => ({ ...emptyOpenPlanDraft(), ...patch });

describe("openPlanInputOf", () => {
  it("Belirsiz → openPlan yok", () => {
    expect(openPlanInputOf(draft(), NOW)).toBeUndefined();
  });

  it("Şimdi → meetAt = now, openUntil = now + süre, OPEN ve PUBLIC varsayılan", () => {
    expect(openPlanInputOf(draft({ when: "NOW", durationHours: 2, whereLabel: "Café Zwart" }), NOW)).toEqual({
      meetAt: "2026-09-13T10:00:00.000Z",
      openUntil: "2026-09-13T12:00:00.000Z",
      capacity: 4,
      joinPolicy: "OPEN",
      audience: "PUBLIC",
    });
  });

  it("Tarih seç → yerel tarih+saat ISO'ya çevrilir, openUntil yok, APPROVAL varsayılan", () => {
    const input = openPlanInputOf(draft({ when: "DATE", meetDate: "2026-09-20", meetTime: "10:00" }), NOW);
    expect(input?.meetAt).toBe(new Date("2026-09-20T10:00").toISOString());
    expect(input?.openUntil).toBeUndefined();
    expect(input?.joinPolicy).toBe("APPROVAL");
  });

  it("Kimse → audience NONE", () => {
    expect(openPlanInputOf(draft({ when: "NOW", whereLabel: "x", audience: "NONE" }), NOW)?.audience).toBe("NONE");
  });
});

describe("openPlanError", () => {
  it("Belirsiz hatasız", () => expect(openPlanError(draft(), NOW)).toBeNull());
  it("Şimdi + Nerede boş → plan.errWhereRequired", () => {
    expect(openPlanError(draft({ when: "NOW", whereLabel: "  " }), NOW)).toBe("plan.errWhereRequired");
  });
  it("Tarih seç + geçmiş → plan.errMeetAtPast", () => {
    expect(openPlanError(draft({ when: "DATE", meetDate: "2020-01-01", meetTime: "10:00" }), NOW)).toBe("plan.errMeetAtPast");
  });
  it("Tarih seç + boş tarih → plan.errMeetAtRequired", () => {
    expect(openPlanError(draft({ when: "DATE" }), NOW)).toBe("plan.errMeetAtRequired");
  });
});

describe("anchorForInstant", () => {
  it("Şimdi'de çapa = kendi konum + Nerede etiketi", () => {
    expect(anchorForInstant(draft({ when: "NOW", whereLabel: " Café Zwart " }), { lat: 51.44, lng: 5.47 }))
      .toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
  });
  it("Şimdi değilse ya da konum yoksa null", () => {
    expect(anchorForInstant(draft({ when: "DATE" }), { lat: 1, lng: 2 })).toBeNull();
    expect(anchorForInstant(draft({ when: "NOW", whereLabel: "x" }), null)).toBeNull();
  });
});
```

`planRange.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { inRange, remainingMinutes, sortPlans } from "./planRange";

const NOW = new Date("2026-09-09T10:00:00Z"); // Çarşamba
const plan = (meetAt: string, openUntil?: string) => ({ slug: meetAt, meetAt, openUntil });

describe("inRange", () => {
  it("now: yalnız süren pencereli plan", () => {
    expect(inRange(plan("2026-09-09T09:30:00Z", "2026-09-09T11:00:00Z"), "now", NOW)).toBe(true);
    expect(inRange(plan("2026-09-09T11:00:00Z", "2026-09-09T13:00:00Z"), "now", NOW)).toBe(false); // henüz başlamadı
    expect(inRange(plan("2026-09-10T09:00:00Z"), "now", NOW)).toBe(false); // noktasal
  });
  it("week: 7 gün içinde; weekend: Cmt/Paz; all: hepsi", () => {
    expect(inRange(plan("2026-09-12T09:00:00Z"), "week", NOW)).toBe(true);
    expect(inRange(plan("2026-09-17T09:00:00Z"), "week", NOW)).toBe(false);
    expect(inRange(plan("2026-09-12T09:00:00Z"), "weekend", NOW)).toBe(true); // Cumartesi
    expect(inRange(plan("2026-09-11T09:00:00Z"), "weekend", NOW)).toBe(false); // Cuma
    expect(inRange(plan("2026-09-30T09:00:00Z"), "all", NOW)).toBe(true);
  });
});

describe("remainingMinutes", () => {
  it("5 dk'ya yuvarlar, geçmişte 0", () => {
    expect(remainingMinutes("2026-09-09T11:23:00Z", NOW)).toBe(85);
    expect(remainingMinutes("2026-09-09T09:00:00Z", NOW)).toBe(0);
  });
});

describe("sortPlans", () => {
  it("sürenler önce, sonra meetAt artan", () => {
    const list = [plan("2026-09-10T09:00:00Z"), plan("2026-09-09T09:30:00Z", "2026-09-09T11:00:00Z"), plan("2026-09-09T12:00:00Z")];
    expect(sortPlans(list, NOW).map((p) => p.meetAt)).toEqual([
      "2026-09-09T09:30:00Z", "2026-09-09T12:00:00Z", "2026-09-10T09:00:00Z",
    ]);
  });
});
```

`badges.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { BADGES, badgesFor, newBadges } from "./badges";

describe("badgesFor", () => {
  it("eşikler: 1 / 3 / 10 buluşma, 3 hafta seri", () => {
    expect(badgesFor({ plansMet: 0, metStreakWeeks: 0 })).toEqual([]);
    expect(badgesFor({ plansMet: 1, metStreakWeeks: 1 })).toEqual(["first_met"]);
    expect(badgesFor({ plansMet: 3, metStreakWeeks: 0 })).toEqual(["first_met", "met_3"]);
    expect(badgesFor({ plansMet: 10, metStreakWeeks: 3 })).toEqual(["first_met", "met_3", "met_10", "streak_3"]);
  });
  it("stats yoksa boş", () => expect(badgesFor(undefined)).toEqual([]));
  it("BADGES sırası kazanım sırasıdır", () => expect(BADGES.map((b) => b.id)).toEqual(["first_met", "met_3", "met_10", "streak_3"]));
});

describe("newBadges", () => {
  it("sonradan kazanılanları verir", () => {
    expect(newBadges(["first_met"], ["first_met", "met_3"])).toEqual(["met_3"]);
    expect(newBadges(["first_met"], ["first_met"])).toEqual([]);
  });
});
```

`newSession.test.ts`'e:
```ts
describe("toCreateRequest · açık plan", () => {
  const NOW = new Date("2026-09-13T10:00:00Z");
  it("Şimdi: openPlan + çapa kendi konumdan, venueMode'a bakmadan", () => {
    const d = draft({ activityTypes: ["COFFEE"], origin: { lat: 51.44, lng: 5.47, label: "Stratum" },
      plan: { ...emptyOpenPlanDraft(), when: "NOW", durationHours: 1, whereLabel: "Café Zwart" } });
    const r = toCreateRequest(d, "M", NOW);
    expect(r.openPlan).toEqual({ meetAt: "2026-09-13T10:00:00.000Z", openUntil: "2026-09-13T11:00:00.000Z",
      capacity: 4, joinPolicy: "OPEN", audience: "PUBLIC" });
    expect(r.anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
  });
  it("Belirsiz: openPlan yok (bugünkü gövde)", () => {
    expect(toCreateRequest(draft({ activityTypes: ["COFFEE"], origin: { lat: 1, lng: 2 } }), "M", NOW).openPlan).toBeUndefined();
  });
});

describe("canSubmit · açık plan", () => {
  it("Şimdi: konum + Nerede şart", () => {
    const base = draft({ activityTypes: ["COFFEE"], origin: { lat: 1, lng: 2 } });
    expect(canSubmit({ ...base, plan: { ...emptyOpenPlanDraft(), when: "NOW" } })).toBe(false);
    expect(canSubmit({ ...base, plan: { ...emptyOpenPlanDraft(), when: "NOW", whereLabel: "x" } })).toBe(true);
  });
});
```
(`emptyOpenPlanDraft` import'u eklenir.)

- [ ] **Step 2: Kırmızı gör** — `eval $STEST` → FAIL (modüller yok).

- [ ] **Step 3: `openPlan.ts`**

```ts
/* Açık plan TASLAĞI kuralları (B-18 · W-18/M-12). Saf: iki istemci de aynı `OpenPlanInput`'u
   üretir. "Ne zaman" planı TANIMLAR: UNSET = bugünkü gizli oturum (openPlan yok), NOW = pencereli
   "buradayım", DATE = zamanlı plan. Kitle: PUBLIC | NONE (FRIENDS B-19 — burada bilerek yok). */
import type { Schemas } from "./api";

export type WhenMode = "UNSET" | "NOW" | "DATE";
export type DurationHours = 1 | 2 | 3;
export type Capacity = 3 | 4 | 6 | 8;
export type Audience = "PUBLIC" | "NONE";
export type JoinPolicy = NonNullable<Schemas["OpenPlanInput"]["joinPolicy"]>;
export type OpenPlanErrorKey = "plan.errWhereRequired" | "plan.errMeetAtRequired" | "plan.errMeetAtPast";

export type OpenPlanDraft = {
  when: WhenMode;
  /** DATE: `YYYY-MM-DD` + `HH:mm` (yerel saat; `<input type=date/time>` biçimi). */
  meetDate: string;
  meetTime: string;
  /** NOW: pencere. */
  durationHours: DurationHours;
  capacity: Capacity;
  /** null = moda göre varsayılan (NOW → OPEN, DATE → APPROVAL); host dokununca dolar. */
  joinPolicy: JoinPolicy | null;
  audience: Audience;
  /** NOW: mekân adı — çapanın etiketi olur (üyelere özel; Keşfet semti sunucudan). */
  whereLabel: string;
};

export const DURATIONS: readonly DurationHours[] = [1, 2, 3];
export const CAPACITIES: readonly Capacity[] = [3, 4, 6, 8];
export const WHERE_LABEL_MAX = 60;

export function emptyOpenPlanDraft(): OpenPlanDraft {
  return { when: "UNSET", meetDate: "", meetTime: "", durationHours: 2, capacity: 4,
    joinPolicy: null, audience: "PUBLIC", whereLabel: "" };
}

/** Şimdi'de OPEN: push yok, 2 saatlik pencerede onay beklemek planı öldürür (spec karar 4). */
export function defaultJoinPolicy(when: WhenMode): JoinPolicy {
  return when === "NOW" ? "OPEN" : "APPROVAL";
}

export function effectiveJoinPolicy(d: OpenPlanDraft): JoinPolicy {
  return d.joinPolicy ?? defaultJoinPolicy(d.when);
}

function dateOf(d: OpenPlanDraft): Date | null {
  if (!d.meetDate || !d.meetTime) return null;
  const t = new Date(`${d.meetDate}T${d.meetTime}`);
  return Number.isNaN(t.getTime()) ? null : t;
}

export function openPlanError(d: OpenPlanDraft, now: Date): OpenPlanErrorKey | null {
  if (d.when === "NOW") return d.whereLabel.trim() ? null : "plan.errWhereRequired";
  if (d.when === "DATE") {
    const t = dateOf(d);
    if (!t) return "plan.errMeetAtRequired";
    return t.getTime() <= now.getTime() ? "plan.errMeetAtPast" : null;
  }
  return null;
}

/** Sözleşme gövdesi; UNSET ya da hatalı taslakta undefined (gövdeye `openPlan` girmez). */
export function openPlanInputOf(d: OpenPlanDraft, now: Date): Schemas["OpenPlanInput"] | undefined {
  if (d.when === "UNSET" || openPlanError(d, now)) return undefined;
  const base = { capacity: d.capacity, joinPolicy: effectiveJoinPolicy(d), audience: d.audience };
  if (d.when === "NOW") {
    return { meetAt: now.toISOString(),
      openUntil: new Date(now.getTime() + d.durationHours * 3_600_000).toISOString(), ...base };
  }
  return { meetAt: dateOf(d)!.toISOString(), ...base };
}

/** Şimdi'de çapa = kuranın konumu + "Nerede?" etiketi; sunucu pencereli planı çapasız reddeder. */
export function anchorForInstant(
  d: OpenPlanDraft,
  own: { lat: number; lng: number } | null,
): { lat: number; lng: number; label: string } | null {
  if (d.when !== "NOW" || !own) return null;
  return { lat: own.lat, lng: own.lng, label: d.whereLabel.trim().slice(0, WHERE_LABEL_MAX) };
}
```
`Schemas["OpenPlanInput"].audience` codegen'de `"PUBLIC" | "FRIENDS" | "NONE"`; buradaki `Audience` daraltılmış alt kümedir, atama uyumludur.

- [ ] **Step 4: `planRange.ts`**

```ts
/* Keşfet aralık süzgeci ve süren-plan yardımcıları (W-18/M-12 ortak). */
export type PlanRange = "now" | "week" | "weekend" | "all";
type PlanLike = { meetAt?: string; openUntil?: string };

export const RANGES: readonly PlanRange[] = ["now", "week", "weekend", "all"];

export function isInProgress(p: PlanLike, now: Date): boolean {
  if (!p.meetAt || !p.openUntil) return false;
  const t = now.getTime();
  return Date.parse(p.meetAt) <= t && t < Date.parse(p.openUntil);
}

export function inRange(p: PlanLike, range: PlanRange, now: Date): boolean {
  if (!p.meetAt) return false;
  if (range === "now") return isInProgress(p, now);
  if (range === "all") return true;
  const t = new Date(p.meetAt);
  if (range === "week") return t.getTime() - now.getTime() < 7 * 86_400_000;
  const day = t.getDay(); // weekend
  return day === 0 || day === 6;
}

/** Pencere sonuna kalan dakika, 5'e yuvarlı; geçmişte 0. */
export function remainingMinutes(openUntil: string, now: Date): number {
  const min = Math.max(0, (Date.parse(openUntil) - now.getTime()) / 60_000);
  return Math.round(min / 5) * 5;
}

/** Sürenler önce (başlangıcı erken olan önde), sonra meetAt artan. Girdiyi DEĞİŞTİRMEZ. */
export function sortPlans<T extends PlanLike>(plans: readonly T[], now: Date): T[] {
  return [...plans].sort((a, b) => {
    const ia = isInProgress(a, now) ? 0 : 1;
    const ib = isInProgress(b, now) ? 0 : 1;
    return ia !== ib ? ia - ib : Date.parse(a.meetAt ?? "") - Date.parse(b.meetAt ?? "");
  });
}
```

- [ ] **Step 5: `badges.ts`**

```ts
/* Rozetler İSTEMCİDE türer (spec karar 7): sunucu yalnız sayar. Sıra kazanım sırasıdır. */
export type BadgeId = "first_met" | "met_3" | "met_10" | "streak_3";
type Stats = { plansMet?: number; metStreakWeeks?: number } | undefined | null;

export const BADGES: readonly { id: BadgeId; earned: (s: NonNullable<Stats>) => boolean; goal: number; of: "met" | "streak" }[] = [
  { id: "first_met", goal: 1, of: "met", earned: (s) => (s.plansMet ?? 0) >= 1 },
  { id: "met_3", goal: 3, of: "met", earned: (s) => (s.plansMet ?? 0) >= 3 },
  { id: "met_10", goal: 10, of: "met", earned: (s) => (s.plansMet ?? 0) >= 10 },
  { id: "streak_3", goal: 3, of: "streak", earned: (s) => (s.metStreakWeeks ?? 0) >= 3 },
];

export function badgesFor(stats: Stats): BadgeId[] {
  if (!stats) return [];
  return BADGES.filter((b) => b.earned(stats)).map((b) => b.id);
}

export function newBadges(before: readonly BadgeId[], after: readonly BadgeId[]): BadgeId[] {
  return after.filter((id) => !before.includes(id));
}
```

- [ ] **Step 6: `newSession.ts`** — taslağa `plan: OpenPlanDraft` (`emptyDraft` → `plan: emptyOpenPlanDraft()`); `canSubmit`:

```ts
export function canSubmit(draft: NewSessionDraft, now: Date = new Date()): boolean {
  if (draft.activityTypes.length === 0) return false;
  if (openPlanError(draft.plan, now)) return false;
  if (draft.plan.when === "NOW") return draft.origin != null; // çapa kendi konumdan türer
  return draft.venueMode === "ANCHOR" ? draft.anchor != null : draft.origin != null;
}
```
`toCreateRequest(draft, displayName, now: Date = new Date())`: `const instantAnchor = anchorForInstant(draft.plan, draft.origin);` → `anchor: instantAnchor ?? (anchored ? {...} : undefined)`, gövdeye `openPlan: openPlanInputOf(draft.plan, now)`. `index.ts`'e üç modülün dışa aktarımı (`openPlan`, `planRange`, `badges`: tüm export'lar) ve `newSession`'dan `OpenPlanDraft` tipini yeniden dışa aktar.

- [ ] **Step 7: Yeşil gör** — `eval $STEST` → PASS; `eval $TSC` temiz (mobil `typecheck` M-12'de).

- [ ] **Step 8:** Değişen dosyalar. Commit kullanıcıda.

---

### Task 2: `newSessionStore` + `NewSessionPage` — Ne zaman / süre / Nerede / Kim görsün (P3, P3a)

**Files:**
- Modify: `frontend/web/src/store/newSessionStore.ts`, `frontend/web/src/store/newSessionStore.test.ts`
- Modify: `frontend/web/src/pages/NewSessionPage.tsx`, `frontend/web/src/pages/NewSessionPage.test.tsx`

W-17 W2'nin store'a eklediği `openPlan/meetDate/meetTime/capacity/joinPolicy/setOpenPlan/setMeetAt/setCapacity/setJoinPolicy/validate` alanları **kaldırılır**; yerine tek `plan: OpenPlanDraft` + `setPlan`. W2 testleri aşağıdaki şekle taşınır.

- [ ] **Step 1: Başarısız testler** — `newSessionStore.test.ts`:

```ts
import { emptyOpenPlanDraft } from "@bumpinto/shared";
vi.mock("../lib/api", () => ({ api: { createSession: vi.fn(), addPoint: vi.fn(), findVenues: vi.fn() } }));
const NOW = new Date("2026-09-13T10:00:00Z");
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); useNewSessionStore.getState().reset(); });
afterEach(() => vi.useRealTimers());

it("Şimdi: openPlan penceresi + çapa kendi konumdan, OPEN ve PUBLIC varsayılan", async () => {
  vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "abc" } as never);
  const s = useNewSessionStore.getState();
  s.setPlan({ when: "NOW", durationHours: 2, whereLabel: "Café Zwart" });
  await s.submit("Ayşe", { lat: 51.44, lng: 5.47, label: "Stratum" });
  const body = vi.mocked(api.createSession).mock.calls[0][0];
  expect(body.openPlan).toEqual({ meetAt: "2026-09-13T10:00:00.000Z", openUntil: "2026-09-13T12:00:00.000Z",
    capacity: 4, joinPolicy: "OPEN", audience: "PUBLIC" });
  expect(body.anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
});

it("Tarih seç: openPlan noktasal, APPROVAL; Kimse → NONE", async () => {
  vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "abc" } as never);
  const s = useNewSessionStore.getState();
  s.setPlan({ when: "DATE", meetDate: "2026-09-20", meetTime: "10:00", audience: "NONE" });
  await s.submit("Ayşe", { lat: 51.44, lng: 5.47, label: "Stratum" });
  const body = vi.mocked(api.createSession).mock.calls[0][0];
  expect(body.openPlan).toEqual({ meetAt: new Date("2026-09-20T10:00").toISOString(), capacity: 4,
    joinPolicy: "APPROVAL", audience: "NONE" });
});

it("Belirsiz: openPlan gönderilmez", async () => {
  vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "abc" } as never);
  await useNewSessionStore.getState().submit("Ayşe", { lat: 1, lng: 2, label: null });
  expect(vi.mocked(api.createSession).mock.calls[0][0].openPlan).toBeUndefined();
});

it("validate: geçmiş tarih ve boş Nerede anahtar döner", () => {
  const s = useNewSessionStore.getState();
  s.setPlan({ when: "DATE", meetDate: "2020-01-01", meetTime: "10:00" });
  expect(s.validate()).toBe("plan.errMeetAtPast");
  s.setPlan({ when: "NOW", whereLabel: "" });
  expect(s.validate()).toBe("plan.errWhereRequired");
});

it("reset planı da sıfırlar", () => {
  const s = useNewSessionStore.getState();
  s.setPlan({ when: "NOW" });
  s.reset();
  expect(useNewSessionStore.getState().plan).toEqual(emptyOpenPlanDraft());
});
```

`NewSessionPage.test.tsx`:
```tsx
it("Ne zaman = Şimdi: süre, Nerede, kişi, katılım (Herkes gelebilir seçili) ve Kim görsün görünür; Keşfet'te göster anahtarı yok", async () => {
  render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
  expect(screen.queryByRole("switch", { name: "Keşfet'te göster" })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "Şimdi" }));
  expect(await screen.findByRole("radiogroup", { name: "Kaç saat" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "2 sa" })).toBeChecked();
  expect(screen.getByLabelText("Nerede?")).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Herkes gelebilir" })).toBeChecked();
  expect(screen.getByRole("radiogroup", { name: "Kim görsün?" })).toBeInTheDocument();
  expect(screen.queryByRole("radio", { name: "Arkadaşlar" })).toBeNull();
  expect(screen.getByRole("button", { name: "Buradayım de" })).toBeInTheDocument();
});

it("?now=1 Şimdi'yi, ?open=1 Tarih seç'i önceden seçer", async () => {
  render(<MemoryRouter initialEntries={["/sessions/new?now=1"]}><NewSessionPage /></MemoryRouter>);
  expect(await screen.findByRole("radio", { name: "Şimdi" })).toBeChecked();
  cleanup();
  render(<MemoryRouter initialEntries={["/sessions/new?open=1&activity=SWIM"]}><NewSessionPage /></MemoryRouter>);
  expect(await screen.findByRole("radio", { name: "Tarih seç" })).toBeChecked();
  expect(screen.getByLabelText("Ne zaman")).toBeInTheDocument(); // tarih alanı
});
```
`Segmented` `radiogroup`/`radio` rolleriyle çizilmiyorsa, molekülün gerçek rollerini kullan (test iddiası rol adına değil davranışa bağlı).

- [ ] **Step 2: Kırmızı gör** — `eval $WTEST src/store/newSessionStore.test.ts src/pages/NewSessionPage.test.tsx` → FAIL.

- [ ] **Step 3: Store** — `State`'e:

```ts
  plan: OpenPlanDraft;
  setPlan: (patch: Partial<OpenPlanDraft>) => void;
  /** i18n hata anahtarı ya da null; CTA disabled ve alt hata satırı bunu okur. */
  validate: () => OpenPlanErrorKey | null;
```
`initial()` → `plan: emptyOpenPlanDraft()`. Uygulama:
```ts
  /* Moda geçişte joinPolicy'yi null'a çekmek varsayılanı (NOW→OPEN, DATE→APPROVAL) yeniden
     devreye sokar; host politikaya dokunduysa (patch içinde) o kalır. */
  setPlan: (patch) => set((s) => ({
    plan: { ...s.plan, ...("when" in patch && patch.when !== s.plan.when ? { joinPolicy: null } : {}), ...patch },
  })),
  validate: () => openPlanError(get().plan, new Date()),
```
`submit`: `const now = new Date(); const openPlan = openPlanInputOf(plan, now); const instantAnchor = anchorForInstant(plan, own);` → gövdede `anchor: instantAnchor ?? (anchored ? {...} : undefined), openPlan`. Şimdi'de `type` `GROUP`'a zorlanır (`sessionType: plan.when === "UNSET" ? type : "GROUP"`). Importlar `@bumpinto/shared`'dan.

- [ ] **Step 4: Sayfa** — plan bölümü (`TwoZone` sağ sütun, W2'nin yerleştirdiği yer):

```tsx
const plan = useNewSessionStore((s) => s.plan);
const setPlan = useNewSessionStore((s) => s.setPlan);
const [params] = useSearchParams();
useEffect(() => {
  if (params.get("now") === "1") setPlan({ when: "NOW" });
  else if (params.get("open") === "1") setPlan({ when: "DATE" });
}, [params, setPlan]);
const err = validate();
const isPlan = plan.when !== "UNSET";
// ...
<Segmented ariaLabel={t("plan.when")} fill value={plan.when} onChange={(w) => setPlan({ when: w })}
  options={[{ value: "UNSET", label: t("plan.whenUnset") }, { value: "NOW", label: t("plan.now") }, { value: "DATE", label: t("plan.pickDate") }]} />
{plan.when === "NOW" && (
  <>
    <Segmented ariaLabel={t("plan.duration")} fill value={String(plan.durationHours)}
      onChange={(v) => setPlan({ durationHours: Number(v) as DurationHours })}
      options={DURATIONS.map((h) => ({ value: String(h), label: t("plan.durationHours", { count: h }) }))} />
    <Field id="plan-where" label={t("plan.where")} value={plan.whereLabel} maxLength={WHERE_LABEL_MAX}
      placeholder={t("plan.wherePlaceholder")} onChange={(e) => setPlan({ whereLabel: e.target.value })}
      error={err === "plan.errWhereRequired" ? t(err) : undefined} />
    <Note small>{t("plan.whereHint")}</Note>
  </>
)}
{plan.when === "DATE" && (
  <div className="flex gap-3">
    <Field id="plan-date" label={t("plan.when")} type="date" value={plan.meetDate} onChange={(e) => setPlan({ meetDate: e.target.value })} />
    <Field id="plan-time" label={t("plan.time")} type="time" value={plan.meetTime} onChange={(e) => setPlan({ meetTime: e.target.value })}
      error={err === "plan.errMeetAtPast" ? t(err) : undefined} />
  </div>
)}
{isPlan && (
  <>
    <Segmented ariaLabel={t("plan.capacity")} fill value={String(plan.capacity)} onChange={(v) => setPlan({ capacity: Number(v) as Capacity })}
      options={CAPACITIES.map((c) => ({ value: String(c), label: String(c) }))} />
    <Note small>{t("plan.capacityHint")}</Note>
    <Segmented ariaLabel={t("plan.joinPolicy")} fill value={effectiveJoinPolicy(plan)} onChange={(p) => setPlan({ joinPolicy: p })}
      options={[{ value: "APPROVAL", label: t("plan.approval") }, { value: "OPEN", label: t("plan.openJoin") }]} />
    <Segmented ariaLabel={t("plan.audience")} fill value={plan.audience} onChange={(a) => setPlan({ audience: a })}
      options={[{ value: "PUBLIC", label: t("plan.audiencePublic") }, { value: "NONE", label: t("plan.audienceNone") }]} />
    <Note small>{t(plan.audience === "NONE" ? "plan.audienceNoneHint" : "plan.audiencePublicHint")}</Note>
    <Note small>{t("plan.publicPlaceNote")}</Note>
  </>
)}
```
Şimdi'de çapa modu seçici gizlenir (çapa kendi konumdan türer; `useOwnLocation` konum yoksa CTA disabled + `newSession.ownMissing`). CTA etiketi: `plan.when === "NOW" ? t("plan.ctaNow") : t("newSession.createGroup")`; `disabled` koşuluna `err != null` eklenir. `Field` `TextInput`'a `type`/`maxLength`'i `...rest` ile geçirir.

- [ ] **Step 5: Yeşil gör** — `eval $WTEST src/store/newSessionStore.test.ts src/pages/NewSessionPage.test.tsx` → PASS; `eval $TSC`.

- [ ] **Step 6:** Değişen dosyalar. Commit kullanıcıda.

---

### Task 3: Keşfet — "Buradayım", "Şimdi" aralığı, süren kart (P1, P1m, P1c)

**Files:**
- Modify: `frontend/web/src/store/discoverStore.ts` (W3'ün `inRange`'i shared'a taşınır), `frontend/web/src/pages/DiscoverPage.tsx`, `frontend/web/src/components/molecules/PlanCard.tsx`
- Test: `frontend/web/src/pages/DiscoverPage.test.tsx` (+2), `frontend/web/src/store/discoverStore.test.ts`

- [ ] **Step 1: Başarısız testler** — `DiscoverPage.test.tsx`:

```tsx
it("Buradayım kısayolu ve Şimdi aralığı; süren kart kalan süreyi basar ve üstte durur", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-09T10:00:00Z"));
  vi.mocked(api.discover).mockResolvedValueOnce({ filter: ["COFFEE"], plans: [
    { slug: "later", name: "Akşam kahvesi", activityTypes: ["COFFEE"], meetAt: "2026-09-09T16:00:00Z", capacity: 4, approvedSeats: 1, confirmed: false, joinPolicy: "APPROVAL", hostDisplayName: "Jonas", locality: "Merkez" },
    { slug: "live", name: "Öğleden sonra kahve", activityTypes: ["COFFEE"], meetAt: "2026-09-09T09:40:00Z", openUntil: "2026-09-09T11:20:00Z", capacity: 4, approvedSeats: 2, confirmed: false, joinPolicy: "OPEN", hostDisplayName: "Ayşe", locality: "Stratum" },
  ] });
  useAuthStore.setState({ status: "signed", me: { displayName: "M", interests: ["COFFEE"] } as never });
  render(<MemoryRouter><DiscoverPage /></MemoryRouter>);
  expect(await screen.findByRole("link", { name: "Buradayım" })).toHaveAttribute("href", "/sessions/new?now=1");
  const cards = screen.getAllByRole("link", { name: /kahve/i });
  expect(cards[0]).toHaveTextContent("Öğleden sonra kahve");
  expect(screen.getByText("şimdi · ~1 sa 20 dk daha")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("radio", { name: "Şimdi" }));
  expect(screen.queryByText("Akşam kahvesi")).toBeNull();
  vi.useRealTimers();
});

it("Şimdi aralığında süren plan yoksa 'ilkini sen aç' değil 'buradayım de' hâli", async () => {
  vi.mocked(api.discover).mockResolvedValueOnce({ filter: ["COFFEE"], plans: [] });
  useAuthStore.setState({ status: "signed", me: { displayName: "M", interests: ["COFFEE"] } as never });
  render(<MemoryRouter><DiscoverPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("radio", { name: "Şimdi" }));
  expect(await screen.findByText("Şu an süren plan yok.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Buradayım" })).toHaveAttribute("href", "/sessions/new?now=1");
});
```

- [ ] **Step 2: Kırmızı gör** — `eval $WTEST src/pages/DiscoverPage.test.tsx src/store/discoverStore.test.ts` → FAIL.

- [ ] **Step 3: Uygulama**
- `discoverStore.ts`: `type Range` yerine `PlanRange` (shared); W3'ün yerel `inRange`'i silinir, sayfa `inRange`/`sortPlans`'ı shared'dan alır; `range` başlangıcı `"week"` kalır (Şimdi bir FİLTRE, spec §11).
- `DiscoverPage.tsx`: başlık satırında `LinkButton`(`/sessions/new?open=1&activity=…`, `discover.open`) yanına `LinkButton kind="white"`(`/sessions/new?now=1`, `discover.here`, `MapPin` ikonu); 390'da `MobileCta` iki düğme. Aralık `Segmented` seçenekleri `RANGES.map(r => ({ value: r, label: t(\`discover.range.${r}\`) }))`. Liste: `sortPlans(plans.filter(p => inRange(p, range, now)), now)`. Boş hâl: `range === "now"` → `discover.emptyNowTitle` + `HandNote`(`discover.emptyNowHand`) + Buradayım düğmesi; diğer aralıklar W3'teki boş hâl.
- `PlanCard.tsx`: `isInProgress(plan, now)` ise takvim satırı yerine `discover.inProgress` (`{ time: formatRemaining(remainingMinutes(plan.openUntil, now)) }`; `formatRemaining` 85 → "1 sa 20 dk", 45 → "45 dk" — `shared/travelText.ts`'te böyle bir biçimleyici varsa onu kullan, yoksa `PlanCard` içinde 4 satırlık yardımcı) + `Sticker` "{{approved}}/{{capacity}} · şimdi" (`discover.nowSticker`, amber ton: `Sticker` `white` değil; tasarım `.stk.now` — `Badge tone="amber"` benzeri bir sınıfla, DS'de amber `--amb-w/--amb` token'ları var). `now` = render anında `new Date()` (60 sn'de bir `setInterval` ile tazelenen state — kalan süre sayfa açıkken donmasın).

- [ ] **Step 4: Yeşil gör** — `eval $WTEST src/pages/DiscoverPage.test.tsx src/store/discoverStore.test.ts` → PASS.

- [ ] **Step 5:** Değişen dosyalar. Commit kullanıcıda.

---

### Task 4: Plan detayı — süren plan satırı + OPEN kopyası (P2a)

**Files:**
- Modify: `frontend/web/src/components/molecules/PlanIntro.tsx`, `frontend/web/src/components/organisms/SeatRequestCard.tsx`
- Test: `frontend/web/src/components/organisms/SeatRequestCard.test.tsx` (+1), `frontend/web/src/pages/SessionPage.test.tsx` (+1)

- [ ] **Step 1: Başarısız testler**

```tsx
// SeatRequestCard.test.tsx
it("OPEN planda düğme 'Katıl' ve not 'anında koltuk'", async () => {
  vi.mocked(api.mySeat).mockRejectedValueOnce({ response: { status: 404 } });
  useAuthStore.setState({ status: "signed", me: { displayName: "Priya" } as never });
  render(<SeatRequestCard slug="gp" hostName="Ayşe" joinPolicy="OPEN" />);
  expect(await screen.findByRole("button", { name: "Katıl" })).toBeInTheDocument();
  expect(screen.getByText("Anında koltuk alırsın, kesin noktayı görürsün.")).toBeInTheDocument();
});
// SessionPage.test.tsx
it("süren açık planda PlanIntro 'şimdi · … daha' basar", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-09T10:00:00Z"));
  vi.mocked(api.preview).mockResolvedValueOnce({ slug: "gp", name: "Kahve", activityTypes: ["COFFEE"], hostDisplayName: "Ayşe",
    openPlan: { meetAt: "2026-09-09T09:40:00Z", openUntil: "2026-09-09T11:20:00Z", capacity: 4, approvedSeats: 2, confirmed: false, meetPassed: false, inProgress: true, joinPolicy: "OPEN", audience: "PUBLIC" } } as never);
  render(<MemoryRouter initialEntries={["/j/gp"]}><Routes><Route path="/j/:slug" element={<SessionPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByText("şimdi · ~1 sa 20 dk daha")).toBeInTheDocument();
  vi.useRealTimers();
});
```

- [ ] **Step 2: Kırmızı gör** → FAIL.

- [ ] **Step 3: Uygulama** — `PlanIntro`: `openPlan.inProgress` (sunucu) ise `kv` ilk satırı `discover.inProgress` + `plan.startedAt` ("başladı {{time}}", `Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" })`); değilse W4'ün tarih satırı. `SeatRequestCard` yeni prop `joinPolicy?: "OPEN" | "APPROVAL"` (W4 `SessionPage` `preview.openPlan.joinPolicy` geçirir): OPEN'da düğme `seat.join`, not `seat.joinNote`; güven metni `plan.safety` yerine OPEN'da `plan.safetyOpen` (host onayı cümlesi yok; bildir/engelle var).

- [ ] **Step 4: Yeşil gör** → PASS.

- [ ] **Step 5:** Değişen dosyalar. Commit kullanıcıda.

---

### Task 5: Rozetler — profil satırı (P6) + check-in anı (P5b)

**Files:**
- Create: `frontend/web/src/components/molecules/BadgeRow.tsx`, `frontend/web/src/components/molecules/BadgeRow.test.tsx`
- Modify: `frontend/web/src/components/organisms/ProfilePrefs.tsx` (ya da profil sayfasının stats kartı — `stats` hangi bileşende basılıyorsa oraya), `frontend/web/src/components/organisms/CheckinSheet.tsx`
- Test: `frontend/web/src/components/organisms/CheckinSheet.test.tsx` (+1)

- [ ] **Step 1: Başarısız testler**

```tsx
// BadgeRow.test.tsx
it("sayaçları ve 4 rozeti basar; kazanılmamış rozet soluk ve ilerleme taşır", () => {
  render(<BadgeRow stats={{ sessionsHosted: 12, friendsMet: 9, plansMet: 7, metStreakWeeks: 3 }} />);
  expect(screen.getByText("12")).toBeInTheDocument();
  expect(screen.getByText("7")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("İlk buluşma")).toBeInTheDocument();
  expect(screen.getByText("10 buluşma").closest("[data-earned]")).toHaveAttribute("data-earned", "false");
  expect(screen.getByText("7/10")).toBeInTheDocument();
  expect(screen.getByText("3 hafta seri").closest("[data-earned]")).toHaveAttribute("data-earned", "true");
});
// CheckinSheet.test.tsx
it("evet sonrası yeni rozet varsa kutlama hâli", async () => {
  vi.mocked(api.checkin).mockResolvedValueOnce(undefined);
  useAuthStore.setState({ status: "signed", me: { displayName: "M", stats: { plansMet: 2, metStreakWeeks: 0 } } as never });
  vi.spyOn(useAuthStore.getState(), "load").mockImplementation(async () => {
    useAuthStore.setState({ me: { displayName: "M", stats: { plansMet: 3, metStreakWeeks: 0 } } as never });
  });
  render(<CheckinSheet slug="gp" people={["Ayşe", "M"]} onDone={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Evet, buluştuk" }));
  expect(await screen.findByText("3 buluşma!")).toBeInTheDocument();
  expect(screen.getByText("yeni rozet")).toBeInTheDocument();
});
```

- [ ] **Step 2: Kırmızı gör** → FAIL.

- [ ] **Step 3: Uygulama** — `BadgeRow({ stats })`: üstte 3 sayaç (`profile.hosted` ← `sessionsHosted`, `profile.met` ← `plansMet`, `profile.streak` ← `metStreakWeeks`), altında `BADGES.map` 2×2 ızgara: `data-earned`, ikon (`Confetti`/`Medal`/`Trophy`/`Fire` phosphor), `t(\`badge.${id}.title\`)`, `t(\`badge.${id}.hint\`)`, kazanılmamışsa `{{have}}/{{goal}}` (`of === "met" ? plansMet : metStreakWeeks`); en altta `HandNote`(`profile.badgesHand`). `CheckinSheet`: "Evet" → `api.checkin` → `const before = badgesFor(me?.stats); await authStore.load(); const gained = newBadges(before, badgesFor(useAuthStore.getState().me?.stats));` → `gained.length` ise sheet içinde kutlama hâli (`Sticker`(`badge.new`), büyük ikon, `t(\`badge.${gained[0]}.title\`)` "!" ile, `badge.next` ipucu, `Button`(`common.ok`) → `onDone`); yoksa doğrudan `onDone`. `localStorage` işareti W6'daki gibi.

- [ ] **Step 4: Yeşil gör** → PASS.

- [ ] **Step 5:** Değişen dosyalar. Commit kullanıcıda.

---

### Task 6: i18n (tr/en/nl) + kapılar + INDEX

**Files:**
- Modify: `frontend/shared/src/i18n/locales/tr.json`, `en.json`, `nl.json`
- Modify: `docs/superpowers/plans/INDEX.md` (W-18 → done)

- [ ] **Step 1: Anahtarlar** (tr; en/nl aynı anahtar seti, çeviri):

```json
"plan": {
  "when": "Ne zaman", "whenUnset": "Belirsiz", "now": "Şimdi", "pickDate": "Tarih seç", "time": "Saat",
  "duration": "Kaç saat", "durationHours_one": "{{count}} sa", "durationHours_other": "{{count}} sa",
  "where": "Nerede?", "wherePlaceholder": "Café Zwart, Kleine Berg", "whereHint": "konumun otomatik, adı sen yaz",
  "errWhereRequired": "Nerede olduğunu yaz.", "errMeetAtRequired": "Tarih ve saat seç.", "errMeetAtPast": "Buluşma saati geçmiş olamaz.",
  "audience": "Kim görsün?", "audiencePublic": "Herkes", "audienceNone": "Kimse", "audiencePublicHint": "Keşfet'te listelenir", "audienceNoneHint": "Yalnız davet linkiyle; listelenmez.",
  "ctaNow": "Buradayım de", "startedAt": "başladı {{time}}",
  "safetyOpen": "<0>Herkese açık yerde</0> buluşulur; bu plana herkes gelebilir, en az 3 kişi olmadan kesinleşmez. Sorun olursa bildir, engelle."
},
"discover": {
  "here": "Buradayım", "range": { "now": "Şimdi", "week": "Bu hafta", "weekend": "Hafta sonu", "all": "Hepsi" },
  "inProgress": "şimdi · ~{{time}} daha", "nowSticker": "{{approved}}/{{capacity}} · şimdi",
  "emptyNowTitle": "Şu an süren plan yok.", "emptyNowHand": "kahvedeysen söyle, 3 kişi olunca kesinleşir ↓"
},
"seat": { "join": "Katıl", "joinNote": "Anında koltuk alırsın, kesin noktayı görürsün." },
"profile": { "hosted": "açtığın", "met": "buluşma", "streak": "hafta seri", "badges": "Rozetler", "badgesHand": "rozetler sende, kimseyle yarışmıyorsun" },
"badge": {
  "new": "yeni rozet", "next": "Bir sonraki: {{title}}",
  "first_met": { "title": "İlk buluşma", "hint": "Bir planda gerçekten buluştun." },
  "met_3": { "title": "3 buluşma", "hint": "Üç kez buluştun." },
  "met_10": { "title": "10 buluşma", "hint": "On kez buluştun." },
  "streak_3": { "title": "3 hafta seri", "hint": "Üç hafta üst üste buluştun." }
},
"common": { "ok": "Tamam" }
```
W-17'nin W1'de eklediği `discover.thisWeek/weekend/all` anahtarları `discover.range.*` altına taşınır (W3 sayfası bunları kullanıyorsa güncelle); `plan.capacity/capacityHint/joinPolicy/approval/openJoin/publicPlaceNote`, `seat.*`, `checkin.*` W1'den gelir. `common.ok` zaten varsa ekleme.

- [ ] **Step 2: Kapılar** — `eval $I18N` temiz · `eval $TSC` · `eval $WTEST` tam yeşil · `source ./init-nvm.sh && pnpm build:web` temiz.
- [ ] **Step 3:** INDEX W-18 `done`; değişen dosyalar. Commit kullanıcıda.

---

## Öz-inceleme

- **Spec kapsamı:** §4 W2 → T2; W3 → T3; W4 → T4; W6 (rozet anı) + W7 (profil rozetleri) → T5; i18n → T6; §11 kararları T2 (Arkadaşlar çizilmez, başlık isteğe bağlı), T3 (Şimdi filtre), T5 (`sessionsHosted` sayacı). Shared modüller T1 — M-12 aynı modülleri kullanır.
- **Tip tutarlılığı:** `OpenPlanDraft` alanları (`when, meetDate, meetTime, durationHours, capacity, joinPolicy, audience, whereLabel`) T1'de tanımlandı, T2'de aynı adlarla; `openPlanInputOf/openPlanError/anchorForInstant/effectiveJoinPolicy/DURATIONS/CAPACITIES/WHERE_LABEL_MAX` T1 ↔ T2; `inRange/sortPlans/isInProgress/remainingMinutes/RANGES` T1 ↔ T3/T4; `badgesFor/newBadges/BADGES` T1 ↔ T5; `authStore.load()` mevcut ad.
- **Bilinen bağımlılık:** `SeatRequestCard`'ın `joinPolicy` prop'u W4'te yoksa T4 ekler; `SessionPage` `preview.openPlan.joinPolicy` geçirir. W3'ün `inRange`'i sayfada değil store'daysa T3 oradan siler.
