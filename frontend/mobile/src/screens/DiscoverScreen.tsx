import {
  RANGES,
  activityListLabel,
  inRange,
  sortPlans,
  type ActivityType,
} from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MapPinIcon, PlusIcon, ShieldCheckIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Chip, HandNote, Segmented, Skeleton } from "../components/atoms";
import { MapMark, PlanCard, ScreenHeader } from "../components/molecules";
import { ACTIVITY_ICON } from "../icons";
import { goBackOr } from "../lib/nav";
import { useNow } from "../lib/useNow";
import { ALL_ACTIVITIES, useDiscoverStore, type DiscoverOrigin } from "../store/discoverStore";
import { useLocationStore } from "../store/locationStore";
import { useMeStore } from "../store/meStore";
import { colors, space } from "../theme";

/** Konum ~1 km'ye yuvarlanır: dakika hesabı kesin konum istemez (spec — yuvarlanmış konumdan). */
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Artboard P1m: 390'da aralık rayı 3'lü ("Hepsi" yok). */
const MOBILE_RANGES = RANGES.filter((r) => r !== "all");

/** Bu sürümün tanıdığı türler — sunucu yeni bir tür eklerse eski sürüm onu çip olarak ÇİZMEZ
    (ikonu yok; `<undefined />` ekranı çökertirdi). */
const KNOWN_ACTIVITIES = new Set<string>(ALL_ACTIVITIES);

/**
 * Dakika konumu. Keşfet açılışında YENİ izin istenmez: izin zaten verilmiş ve nokta okunmuşsa
 * o, yoksa profil varsayılanı; ikisi de yoksa `null` — kart dakika satırını düşürür.
 * Ulaşım türü profilden; profil yüklenmemişse önce yüklenir (`load` çıkışa düşürmez).
 */
async function discoverOrigin(): Promise<DiscoverOrigin | null> {
  if (!useMeStore.getState().me) await useMeStore.getState().load();
  const me = useMeStore.getState().me;
  const loc = useLocationStore.getState();
  const at = loc.phase === "granted" && loc.point ? loc.point : (me?.defaultLocation ?? null);
  if (!at) return null;
  return { lat: round2(at.lat), lng: round2(at.lng), travelMode: me?.defaultTravelMode };
}

/**
 * Keşfet POC P1m (liste) · P1b (boş hafta) · P1c (Şimdi boş). Alt sekme YOK (plan38 "tek
 * stack"): Oturumlar'ın üst çubuğundan itilir, hesap ister.
 *
 * Çerçeve K-M26: `.top` / `.scroll` / `.cta` KARDEŞ — ikili CTA sabit alt çubukta.
 */
export default function DiscoverScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const insets = useSafeAreaInsets();
  const now = useNow();

  const plans = useDiscoverStore((s) => s.plans);
  const filter = useDiscoverStore((s) => s.filter);
  const range = useDiscoverStore((s) => s.range);
  const loaded = useDiscoverStore((s) => s.loaded);
  const error = useDiscoverStore((s) => s.error);
  const load = useDiscoverStore((s) => s.load);
  const toggle = useDiscoverStore((s) => s.toggle);
  const selectAll = useDiscoverStore((s) => s.selectAll);
  const setRange = useDiscoverStore((s) => s.setRange);

  useEffect(() => {
    // Spec §11.2: her açılış "Bu hafta" — Şimdi bir süzgeçtir, kalıcı sekme değil.
    setRange("week");
    let alive = true;
    void discoverOrigin().then((origin) => {
      if (alive) void load(origin);
    });
    return () => {
      alive = false;
    };
  }, [load, setRange]);

  /* Çip sırası İLK yüklemede donar: seçili türler önde, sonra kanonik sıra. Her dokunuşta
     yeniden sıralamak çipi parmağın altından kaçırırdı. Çizim sırasında düzeltme (efekt değil):
     efektle bir kare boyunca kanonik sıra görünürdü. */
  const [order, setOrder] = useState<ActivityType[] | null>(null);
  if (loaded && !order) {
    setOrder([
      ...filter.filter((a) => KNOWN_ACTIVITIES.has(a)),
      ...ALL_ACTIVITIES.filter((a) => !filter.includes(a)),
    ]);
  }
  const chips = order ?? ALL_ACTIVITIES;

  const visible = sortPlans(plans.filter((p) => inRange(p, range, now)), now);
  const single = filter.length === 1 ? filter[0] : null;

  const openHere = () => router.push({ pathname: "/sessions/new", params: { now: "1" } });
  const openPlan = () =>
    router.push({
      pathname: "/sessions/new",
      params: single ? { open: "1", activity: single } : { open: "1" },
    });

  /* Bileşen DEĞİL çizim fonksiyonu: çizim içinde tanımlanan bileşen her çizimde yeni tür olur ve
     alt ağacı sıfırlardı (`react-hooks/static-components`). */
  const emptyWeek = () => {
    const r = range === "now" ? "week" : range;
    // 3+ tür adı başlığı okunmaz kılar — o durumda türsüz başlık.
    const label =
      filter.length > 0 && filter.length <= 2
        ? activityListLabel(filter, t, lang).toLocaleLowerCase(lang)
        : null;
    return (
      <>
        <AppText variant="h1" style={s.center}>
          {label ? t(`discover.emptyTitle.${r}`, { activity: label }) : t(`discover.emptyTitlePlain.${r}`)}
        </AppText>
        <AppText variant="body" style={[s.center, s.lead]}>
          {t("discover.emptyLead")}
        </AppText>
        <HandNote>{t("discover.emptyHand")}</HandNote>
        <Button
          title={single ? t("discover.openFor", { activity: t(`activity.${single}`) }) : t("discover.open")}
          icon={<PlusIcon size={18} color="#fff" weight="bold" />}
          onPress={openPlan}
          style={s.emptyCta}
        />
        {filter.length < ALL_ACTIVITIES.length ? (
          <Button small kind="ghost" title={t("discover.otherTypes")} onPress={selectAll} style={s.ghost} />
        ) : null}
      </>
    );
  };

  const emptyNow = () => (
    <>
      <AppText variant="h1" style={s.center}>
        {t("discover.emptyNowTitle")}
      </AppText>
      <AppText variant="body" style={[s.center, s.lead]}>
        {t("discover.emptyNowLead")}
      </AppText>
      <HandNote>{t("discover.emptyNowHand")}</HandNote>
      <Button
        title={t("discover.here")}
        icon={<MapPinIcon size={18} color="#fff" />}
        onPress={openHere}
        style={s.emptyCta}
      />
      <Button
        small
        kind="ghost"
        title={t("discover.backToWeek")}
        onPress={() => setRange("week")}
        style={s.ghost}
      />
    </>
  );

  const listed = loaded && !error && visible.length > 0;

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={t("shell.discover")}
        backLabel={t("common.back")}
        onBack={() => goBackOr("/sessions")}
      />

      <ScrollView
        contentContainerStyle={[s.page, listed ? null : s.pageEmpty]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          accessibilityLabel={t("discover.filterAria")}
          showsHorizontalScrollIndicator={false}
          style={s.chipsRail}
          contentContainerStyle={s.chips}
        >
          {chips.map((a) => {
            const Icon = ACTIVITY_ICON[a];
            const on = filter.includes(a);
            return (
              <Chip
                key={a}
                label={t(`activity.${a}`)}
                on={on}
                onPress={() => toggle(a)}
                icon={Icon ? <Icon size={18} color={on ? colors.flameDeep : colors.ink2} /> : undefined}
              />
            );
          })}
        </ScrollView>

        <View style={s.rangeRow}>
          <AppText variant="over" style={s.overline}>
            {t("discover.overline", {
              range: t(`discover.range.${range}`).toLocaleLowerCase(lang),
              count: visible.length,
            })}
          </AppText>
          <Segmented
            options={MOBILE_RANGES.map((r) => ({ value: r, label: t(`discover.range.${r}`) }))}
            value={range}
            onChange={setRange}
          />
        </View>

        {!loaded ? (
          <View style={s.cards}>
            <Skeleton height={190} radius={20} />
            <Skeleton height={190} radius={20} />
          </View>
        ) : error ? (
          <View style={s.error}>
            <AppText variant="muted" style={s.errorText}>
              {t("discover.errLoad")}
            </AppText>
            <Button small kind="white" title={t("common.retry")} onPress={() => void load()} style={s.retry} />
          </View>
        ) : visible.length === 0 ? (
          <View style={s.empty}>
            <MapMark size={72} />
            {range === "now" ? emptyNow() : emptyWeek()}
          </View>
        ) : (
          <>
            <View style={s.cards}>
              {visible.map((plan, i) => (
                <PlanCard
                  key={plan.slug ?? i}
                  plan={plan}
                  now={now}
                  onOpen={(slug) => router.push(`/j/${slug}`)}
                />
              ))}
            </View>
            <HandNote align="left">{t("discover.hand")}</HandNote>
            <View style={s.trust}>
              <ShieldCheckIcon size={14} color={colors.ink2} />
              <AppText variant="muted" style={s.trustText}>
                {t("discover.trust")}
              </AppText>
            </View>
          </>
        )}
      </ScrollView>

      {/* Artboard P1b/P1c: boş hâllerde alt CTA şeridi YOK — çağrı boş kartın içinde. */}
      {listed ? (
        <>
          <LinearGradient
            colors={["rgba(255,251,246,0)", colors.paper]}
            style={[s.fade, { bottom: insets.bottom + 74 }]}
            pointerEvents="none"
          />
          <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
            <Button
              kind="white"
              title={t("discover.here")}
              icon={<MapPinIcon size={18} color={colors.ink} />}
              onPress={openHere}
              style={s.half}
            />
            <Button
              title={t("discover.open")}
              icon={<PlusIcon size={18} color="#fff" weight="bold" />}
              onPress={openPlan}
              style={s.half}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 96, gap: space.gap },
  pageEmpty: { paddingBottom: 32 },
  chipsRail: { marginHorizontal: -space.screenX, flexGrow: 0 },
  chips: { paddingHorizontal: space.screenX, gap: 8 },
  rangeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  overline: { flexShrink: 1 },
  cards: { gap: 15 },
  error: { alignItems: "flex-start", gap: 10 },
  errorText: { color: colors.flameDeep, fontWeight: "600" },
  retry: { width: "auto" },
  empty: { alignItems: "center", gap: 12, paddingTop: 26, paddingHorizontal: 8 },
  center: { textAlign: "center" },
  lead: { color: colors.ink2, maxWidth: 300 },
  emptyCta: { maxWidth: 260 },
  ghost: { width: "auto" },
  trust: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustText: { fontSize: 11, flexShrink: 1 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: space.screenX,
    paddingTop: 12,
    backgroundColor: colors.paper,
  },
  half: { flex: 1, width: undefined },
});
