# M-12 — "Buradayım" anlık plan + kitle + rozetler — Mobil Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobilde yeni buluşma formu "Ne zaman: Belirsiz | Şimdi | Tarih seç" + "Kim görsün?" kazanır; Keşfet "Buradayım" düğmesi, "Şimdi" süzgeci ve süren kart çizer; profil ve check-in rozet gösterir. Web (W-18) ile aynı shared kurallar, aynı i18n anahtarları.

**Architecture:** Kural yok, bağlantı var (K-M8): `@bumpinto/shared` `openPlan.ts` / `planRange.ts` / `badges.ts` (W-18 T1) ve `newSession.ts` taslağındaki `plan` alanı. Mobil `newSessionStore` yalnız `setPlan` bağlar; `toRequest` shared `toCreateRequest`'ten `openPlan` + anlık çapayı zaten alır. Ekranlar M-4 atomları (`Segmented`, `Input`, `Chip`, `Badge`, `Sticker`, `HandNote`) ve M-11'in `DiscoverScreen`/`PlanIntroScreen`/check-in sheet'ini genişletir.

**Tech Stack:** Expo 57 + expo-router + zustand + jest-expo/RNTL 14 (`await render`, test başına TEK `render`, `src/testUtils/interact.ts`).

**Spec:** `docs/superpowers/specs/2026-09-11-instant-plan-badges-design.md` §1, §5, §6, §11.

**Ön koşullar (sert):** B-18 T6 (codegen), W-18 T1 (shared modüller + `newSession.ts` `plan` alanı + i18n anahtarları W-18 T6'da shared locales'e girer — mobil ayrı çeviri dosyası taşımaz), M-11 M1–M5 done (ekranlar var). M-11 M2 henüz başlamadıysa M2 doğrudan aşağıdaki T1+T2 şekliyle uygulanır (INDEX çapraz kilit 23): mobil store'a W2-benzeri alan/`validate` YAZILMAZ — K-M8.

**Bağlayıcı kararlar:** W-18 ile aynı (spec §1, §11). Tasarım: POC P1m/P1c/P3/P3a/P2a/P5b/P6 (390). Git yazımı kullanıcıda.

## Test komutları

```bash
MTEST='source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test --'
MTYPE='source ./init-nvm.sh && pnpm --filter @bumpinto/mobile typecheck'
MLINT='source ./init-nvm.sh && pnpm --filter @bumpinto/mobile exec expo lint'
```

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| `frontend/mobile/src/store/newSessionStore.ts` | `setPlan` bağlantısı |
| `frontend/mobile/app/sessions/new.tsx` | Form alanları (P3/P3a) |
| `frontend/mobile/src/screens/DiscoverScreen.tsx`, `src/components/molecules/PlanCard.tsx` | Buradayım, Şimdi, süren kart (P1m/P1c) |
| `frontend/mobile/src/screens/PlanIntroScreen.tsx` | Süren satır + OPEN kopyası (P2a) |
| `frontend/mobile/app/(sheets)/check-in.tsx`, `src/components/molecules/BadgeGrid.tsx` (yeni), `app/profile.tsx` | Rozetler (P5b/P6) |

---

### Task 1: `newSessionStore` — `setPlan`

**Files:**
- Modify: `frontend/mobile/src/store/newSessionStore.ts`
- Test: `frontend/mobile/src/store/newSessionStore.test.ts`

- [ ] **Step 1: Başarısız test**

```ts
import { emptyOpenPlanDraft } from "@bumpinto/shared";
it("Şimdi: toRequest openPlan penceresi + çapa kendi konumdan; moda geçişte joinPolicy varsayılana döner", () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-09-13T10:00:00Z"));
  const s = useNewSessionStore.getState();
  s.toggleActivity("COFFEE");
  s.setOrigin({ lat: 51.44, lng: 5.47, label: "Stratum" });
  s.setPlan({ joinPolicy: "APPROVAL" });
  s.setPlan({ when: "NOW", durationHours: 1, whereLabel: "Café Zwart" });
  expect(useNewSessionStore.getState().plan.joinPolicy).toBeNull(); // varsayılan OPEN devrede
  const r = s.toRequest("M");
  expect(r.openPlan).toEqual({ meetAt: "2026-09-13T10:00:00.000Z", openUntil: "2026-09-13T11:00:00.000Z",
    capacity: 4, joinPolicy: "OPEN", audience: "PUBLIC" });
  expect(r.anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
  expect(s.canSubmit()).toBe(true);
  s.setPlan({ whereLabel: "" });
  expect(s.canSubmit()).toBe(false);
  jest.useRealTimers();
});

it("reset planı sıfırlar", () => {
  const s = useNewSessionStore.getState();
  s.setPlan({ when: "DATE" });
  s.reset();
  expect(useNewSessionStore.getState().plan).toEqual(emptyOpenPlanDraft());
});
```
(`reset` mobil store'da yoksa `set(emptyDraft())` olarak ekle; M-7'de vardıysa onu kullan.)

- [ ] **Step 2: Kırmızı gör** — `eval $MTEST src/store/newSessionStore.test.ts` → FAIL.

- [ ] **Step 3: Uygulama**

```ts
  setPlan: (patch: Partial<OpenPlanDraft>) =>
    set((s) => ({
      // Mod değişince joinPolicy null'a çekilir: varsayılan (NOW→OPEN, DATE→APPROVAL) yeniden
      // devreye girer; host politikaya dokunduysa patch'teki değer kalır. Kural shared'da
      // (`effectiveJoinPolicy`); burada yalnız "hangi alan sıfırlanır" var.
      plan: { ...s.plan, ...("when" in patch && patch.when !== s.plan.when ? { joinPolicy: null } : {}), ...patch },
    })),
  planError: () => openPlanError(get().plan, new Date()),
```
`toRequest`/`canSubmit` shared'a `new Date()` geçer (`toCreateRequest(get(), displayName, new Date())`, `canSubmit(get(), new Date())`).

- [ ] **Step 4: Yeşil gör** → PASS; `eval $MTYPE`.
- [ ] **Step 5:** Değişen dosyalar. Commit kullanıcıda.

---

### Task 2: `app/sessions/new.tsx` — Ne zaman / süre / Nerede / kişi / katılım / Kim görsün (P3, P3a)

**Files:**
- Modify: `frontend/mobile/app/sessions/new.tsx`
- Test: `frontend/mobile/app/__tests__/new.test.tsx` (M-7'nin dosyası; yoksa `src/screens/__tests__/NewSession.test.tsx`)

- [ ] **Step 1: Başarısız test**

```tsx
it("Şimdi seçilince süre, Nerede, kişi, katılım (Herkes gelebilir), Kim görsün görünür; Arkadaşlar yok; CTA 'Buradayım de'", async () => {
  const screen = await render(<NewSessionScreen />);
  await press(screen.getByLabelText("Şimdi"));
  expect(await screen.findByLabelText("2 sa")).toBeTruthy();
  expect(screen.getByLabelText("Nerede?")).toBeTruthy();
  expect(screen.getByLabelText("Herkes gelebilir").props.accessibilityState?.selected ?? screen.getByLabelText("Herkes gelebilir").props.accessibilityState?.checked).toBe(true);
  expect(screen.getByLabelText("Kim görsün?")).toBeTruthy();
  expect(screen.queryByLabelText("Arkadaşlar")).toBeNull();
  expect(screen.getByText("Buradayım de")).toBeTruthy();
});

it("?now=1 Şimdi'yi önceden seçer", async () => {
  mockSearchParams({ now: "1" }); // expo-router useLocalSearchParams mock'u (M-7 test kalıbı)
  const screen = await render(<NewSessionScreen />);
  expect(useNewSessionStore.getState().plan.when).toBe("NOW");
});
```
`Segmented`'ın seçili durumu hangi a11y state'iyle çıkıyorsa (`selected`/`checked`) mevcut `Segmented.test.tsx`'teki iddiayı kopyala.

- [ ] **Step 2: Kırmızı gör** → FAIL.

- [ ] **Step 3: Uygulama** — "Nasıl buluşuyorsunuz?" bloğunun altına, "Nerede buluşulsun?" bloğunun üstüne:

```tsx
const plan = useNewSessionStore((s) => s.plan);
const setPlan = useNewSessionStore((s) => s.setPlan);
const planError = useNewSessionStore((s) => s.planError);
const { now, open } = useLocalSearchParams<{ now?: string; open?: string }>();
useEffect(() => {
  if (now === "1") setPlan({ when: "NOW" });
  else if (open === "1") setPlan({ when: "DATE" });
}, [now, open, setPlan]);
const err = planError();
const isPlan = plan.when !== "UNSET";
const isNow = plan.when === "NOW";
// ...
<View style={s.field}>
  <AppText variant="label" style={s.label}>{t("plan.when")}</AppText>
  <Segmented value={plan.when} onChange={(w) => setPlan({ when: w })}
    options={[{ value: "UNSET", label: t("plan.whenUnset") }, { value: "NOW", label: t("plan.now") }, { value: "DATE", label: t("plan.pickDate") }]} />
  {isNow && (
    <View style={s.subField}>
      <AppText variant="muted" style={s.subLabel}>{t("plan.duration")}</AppText>
      <Segmented value={String(plan.durationHours)} onChange={(v) => setPlan({ durationHours: Number(v) as DurationHours })}
        options={DURATIONS.map((h) => ({ value: String(h), label: t("plan.durationHours", { count: h }) }))} />
      <AppText variant="muted" style={s.subLabel}>{t("plan.where")}</AppText>
      <Input value={plan.whereLabel} onChangeText={(v) => setPlan({ whereLabel: v })} maxLength={WHERE_LABEL_MAX}
        accessibilityLabel={t("plan.where")} placeholder={t("plan.wherePlaceholder")} invalid={err === "plan.errWhereRequired"} />
      <AppText variant="muted">{t("plan.whereHint")}</AppText>
    </View>
  )}
  {plan.when === "DATE" && (
    <View style={[s.subField, { flexDirection: "row", gap: space.sm }]}>
      <Input value={plan.meetDate} onChangeText={(v) => setPlan({ meetDate: v })} accessibilityLabel={t("plan.when")} placeholder="YYYY-MM-DD" containerStyle={{ flex: 1 }} />
      <Input value={plan.meetTime} onChangeText={(v) => setPlan({ meetTime: v })} accessibilityLabel={t("plan.time")} placeholder="HH:mm" containerStyle={{ width: 110 }} invalid={err === "plan.errMeetAtPast"} />
    </View>
  )}
  {isPlan && (
    <View style={s.subField}>
      <AppText variant="muted" style={s.subLabel}>{t("plan.capacity")}</AppText>
      <Segmented value={String(plan.capacity)} onChange={(v) => setPlan({ capacity: Number(v) as Capacity })}
        options={CAPACITIES.map((c) => ({ value: String(c), label: String(c) }))} />
      <AppText variant="muted">{t("plan.capacityHint")}</AppText>
      <AppText variant="muted" style={s.subLabel}>{t("plan.joinPolicy")}</AppText>
      <Segmented value={effectiveJoinPolicy(plan)} onChange={(p) => setPlan({ joinPolicy: p })}
        options={[{ value: "APPROVAL", label: t("plan.approval") }, { value: "OPEN", label: t("plan.openJoin") }]} />
      <AppText variant="muted" style={s.subLabel} accessibilityLabel={t("plan.audience")}>{t("plan.audience")}</AppText>
      <Segmented value={plan.audience} onChange={(a) => setPlan({ audience: a })}
        options={[{ value: "PUBLIC", label: t("plan.audiencePublic") }, { value: "NONE", label: t("plan.audienceNone") }]} />
      <AppText variant="muted">{t(plan.audience === "NONE" ? "plan.audienceNoneHint" : "plan.audiencePublicHint")}</AppText>
      {err && err !== "plan.errWhereRequired" && <AppText variant="error">{t(err)}</AppText>}
    </View>
  )}
</View>
```
Şimdi'de "Nerede buluşulsun?" bloğu gizlenir (çapa kendi konumdan; konum yoksa `locationStore` O3 ön-ekranı M-7'deki gibi tetiklenir) ve `sessionType` `GROUP`'a kilitlenir. CTA başlığı `isNow ? t("plan.ctaNow") : t("newSession.createGroup")`; `disabled={!canSubmit() || busy}`. Tarih/saat `@react-native-community/datetimepicker` **eklenmez** (plan.md §M kararı).

- [ ] **Step 4: Yeşil gör** → PASS; `eval $MTYPE`; `eval $MLINT`.
- [ ] **Step 5:** Değişen dosyalar. Commit kullanıcıda.

---

### Task 3: Keşfet — Buradayım, Şimdi süzgeci, süren kart (P1m, P1c)

**Files:**
- Modify: `frontend/mobile/src/screens/DiscoverScreen.tsx`, `frontend/mobile/src/components/molecules/PlanCard.tsx`, `frontend/mobile/src/store/discoverStore.ts` (M1'in `inRange`'i shared'a)
- Test: `frontend/mobile/src/screens/__tests__/DiscoverScreen.test.tsx` (+2)

- [ ] **Step 1: Başarısız testler**

```tsx
it("Buradayım düğmesi /sessions/new?now=1'e iter; süren kart kalan süreyi basar ve üstte", async () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-09-09T10:00:00Z"));
  (api.discover as jest.Mock).mockResolvedValueOnce({ filter: ["COFFEE"], plans: [
    { slug: "later", name: "Akşam kahvesi", activityTypes: ["COFFEE"], meetAt: "2026-09-09T16:00:00Z", capacity: 4, approvedSeats: 1, confirmed: false, joinPolicy: "APPROVAL", hostDisplayName: "Jonas", locality: "Merkez" },
    { slug: "live", name: "Öğleden sonra kahve", activityTypes: ["COFFEE"], meetAt: "2026-09-09T09:40:00Z", openUntil: "2026-09-09T11:20:00Z", capacity: 4, approvedSeats: 2, confirmed: false, joinPolicy: "OPEN", hostDisplayName: "Ayşe", locality: "Stratum" },
  ] });
  const screen = await render(<DiscoverScreen />);
  expect(await screen.findByText("şimdi · ~1 sa 20 dk daha")).toBeTruthy();
  const titles = screen.getAllByText(/kahve/i).map((n) => n.props.children);
  expect(titles[0]).toBe("Öğleden sonra kahve");
  await press(screen.getByText("Buradayım"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/sessions/new", params: { now: "1" } });
  jest.useRealTimers();
});

it("Şimdi süzgeci boşsa 'Şu an süren plan yok.'", async () => {
  (api.discover as jest.Mock).mockResolvedValueOnce({ filter: ["COFFEE"], plans: [] });
  const screen = await render(<DiscoverScreen />);
  await press(await screen.findByLabelText("Şimdi"));
  expect(await screen.findByText("Şu an süren plan yok.")).toBeTruthy();
});
```

- [ ] **Step 2: Kırmızı gör** → FAIL.

- [ ] **Step 3: Uygulama** — `Segmented` aralık seçenekleri `RANGES` (shared) ile `t(\`discover.range.${r}\`)`; liste `sortPlans(plans.filter(p => inRange(p, range, now)), now)`; `now` 60 sn'de bir tazelenen state. Alt CTA satırı iki `Button`: `discover.open` (flame) + `discover.here` (white, `MapPinIcon`) → `router.push({ pathname: "/sessions/new", params: { now: "1" } })`. Boş hâl `range === "now"` → `discover.emptyNowTitle` + `HandNote`(`discover.emptyNowHand`) + Buradayım. `PlanCard`: `isInProgress` ise tarih satırı yerine `discover.inProgress` (`remainingMinutes` → "1 sa 20 dk" biçimleyici W-18 T3'te shared'a girdiyse onu kullan) + `Sticker`(`discover.nowSticker`) amber ton (`colors.amber`/`amberSoft` tema token'ları yoksa `theme.ts`'e `amb`/`ambW` ekle — DS `--amb #7E4F06`, `--amb-w #FFF1D6`).

- [ ] **Step 4: Yeşil gör** → PASS.
- [ ] **Step 5:** Değişen dosyalar. Commit kullanıcıda.

---

### Task 4: Plan detayı — süren satır + OPEN kopyası (P2a)

**Files:**
- Modify: `frontend/mobile/src/screens/PlanIntroScreen.tsx`
- Test: `frontend/mobile/src/screens/__tests__/PlanIntroScreen.test.tsx` (+1)

- [ ] **Step 1: Başarısız test**

```tsx
it("süren OPEN planda 'şimdi · … daha' satırı ve 'Katıl' düğmesi", async () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-09-09T10:00:00Z"));
  (api.preview as jest.Mock).mockResolvedValueOnce({ slug: "gp", name: "Kahve", activityTypes: ["COFFEE"], hostDisplayName: "Ayşe",
    openPlan: { meetAt: "2026-09-09T09:40:00Z", openUntil: "2026-09-09T11:20:00Z", capacity: 4, approvedSeats: 2, confirmed: false, meetPassed: false, inProgress: true, joinPolicy: "OPEN", audience: "PUBLIC" } });
  (api.mySeat as jest.Mock).mockRejectedValueOnce({ response: { status: 404 } });
  const screen = await render(<PlanIntroScreen slug="gp" />);
  expect(await screen.findByText("şimdi · ~1 sa 20 dk daha")).toBeTruthy();
  expect(screen.getByText("Katıl")).toBeTruthy();
  expect(screen.getByText("Anında koltuk alırsın, kesin noktayı görürsün.")).toBeTruthy();
  jest.useRealTimers();
});
```

- [ ] **Step 2: Kırmızı gör** → FAIL.
- [ ] **Step 3: Uygulama** — `openPlan.inProgress` ise `kv` ilk satırı `discover.inProgress` + `plan.startedAt`; `joinPolicy === "OPEN"` ise CTA `seat.join` + `seat.joinNote`, güven metni `plan.safetyOpen`; değilse M3'ün hâli.
- [ ] **Step 4: Yeşil gör** → PASS.
- [ ] **Step 5:** Değişen dosyalar. Commit kullanıcıda.

---

### Task 5: Rozetler — check-in anı (P5b) + profil ızgarası (P6) + kapılar

**Files:**
- Create: `frontend/mobile/src/components/molecules/BadgeGrid.tsx`, `frontend/mobile/src/components/molecules/__tests__/BadgeGrid.test.tsx`
- Modify: `frontend/mobile/app/(sheets)/check-in.tsx`, `frontend/mobile/app/profile.tsx`
- Test: `frontend/mobile/app/__tests__/check-in.test.tsx` (+1), `frontend/mobile/app/__tests__/profile.test.tsx` (+1)
- Modify: `docs/superpowers/plans/INDEX.md` (M-12 → done)

- [ ] **Step 1: Başarısız testler**

```tsx
// BadgeGrid.test.tsx
it("3 sayaç + 4 rozet; kazanılmamış rozet ilerleme basar", async () => {
  const screen = await render(<BadgeGrid stats={{ sessionsHosted: 12, friendsMet: 9, plansMet: 7, metStreakWeeks: 3 }} />);
  expect(screen.getByText("12")).toBeTruthy();
  expect(screen.getByText("İlk buluşma")).toBeTruthy();
  expect(screen.getByText("7/10")).toBeTruthy();
  expect(screen.getByLabelText("3 hafta seri · kazanıldı")).toBeTruthy();
});
// check-in.test.tsx
it("evet sonrası yeni rozet varsa kutlama + haptik", async () => {
  (api.checkin as jest.Mock).mockResolvedValueOnce(undefined);
  useMeStore.setState({ me: { displayName: "M", stats: { plansMet: 2, metStreakWeeks: 0 } } as never });
  (api.me as jest.Mock).mockResolvedValueOnce({ displayName: "M", stats: { plansMet: 3, metStreakWeeks: 0 } });
  const screen = await render(<CheckInSheet />);
  await press(screen.getByText("Evet, buluştuk"));
  expect(await screen.findByText("3 buluşma!")).toBeTruthy();
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
});
```
`profile.test.tsx`: `me.stats` ile render → "Rozetler" başlığı ve "İlk buluşma" görünür.

- [ ] **Step 2: Kırmızı gör** → FAIL.
- [ ] **Step 3: Uygulama** — `BadgeGrid({ stats })`: `Card` içinde 3 sütun sayaç (`AppText variant="title"` rakam + `muted` etiket: `profile.hosted/met/streak`), altında 2×2 `Card` ızgara `BADGES.map`: ikon (`ConfettiIcon`/`MedalIcon`/`TrophyIcon`/`FlameIcon` phosphor-react-native), başlık, ipucu, kazanılmamışsa `opacity .45` + `{{have}}/{{goal}}`; `accessibilityLabel` `${title} · ${earned ? t("badge.earned") : t("badge.locked")}`; altta `HandNote`(`profile.badgesHand`). `check-in.tsx`: "Evet" → `api.checkin` → `before = badgesFor(me?.stats)`; `await meStore.load()`; `gained = newBadges(before, badgesFor(useMeStore.getState().me?.stats))`; `gained.length` → `Haptics.notificationAsync(Success)` + kutlama hâli (`Sticker`(`badge.new`), büyük ikon, `${t(\`badge.${id}.title\`)}!`, `badge.next`, `Button`(`common.ok`) → `router.back()`); yoksa doğrudan `router.back()`. `profile.tsx`: "Hesap ve veriler" satırının üstüne `BadgeGrid stats={me.stats}` (başlık `profile.badges`). i18n: `badge.earned` ("kazanıldı"), `badge.locked` ("kilitli") anahtarları shared locales'e (tr/en/nl) — W-18 T6'da yoksa burada ekle ve `pnpm i18n:check`.

- [ ] **Step 4: Kapılar** — `eval $MTEST` tam · `eval $MTYPE` · `eval $MLINT` · `source ./init-nvm.sh && pnpm i18n:check` · `pnpm test:web` (shared değişmediyse yalnız yeşil kalır) · `npx expo install --check` temiz.
- [ ] **Step 5:** INDEX M-12 `done`; değişen dosyalar. Commit kullanıcıda. **Cihaz borcu (K-M):** emülatörde Şimdi formu → Keşfet'te süren kart → Katıl → check-in rozet anı elle koşulur; Maestro akışı yazılmaz (M-11 kapsamı).

---

## Öz-inceleme

- **Spec kapsamı:** §5 M2 → T1+T2; M1 → T3; M3 → T4; M4 (rozet anı) + M5 (profil rozetleri) → T5. i18n anahtarları shared'da (W-18 T6); mobil yalnız `badge.earned/locked` ekler.
- **Tip tutarlılığı:** `setPlan(patch: Partial<OpenPlanDraft>)`, `planError()` T1 ↔ T2; `DURATIONS/CAPACITIES/WHERE_LABEL_MAX/effectiveJoinPolicy` shared (W-18 T1); `RANGES/inRange/sortPlans/isInProgress/remainingMinutes` T3/T4; `badgesFor/newBadges/BADGES` T5; `meStore.load()` mevcut ad.
- **K-M8 uyumu:** mobil store'da `if` yok — mod değişiminde `joinPolicy: null` sıfırlaması bir doğrulama değil alan sıfırlamasıdır; kural (`effectiveJoinPolicy`) shared'da.
