import {
  ACTIVITY_GROUPS,
  DURATIONS,
  MAX_CAPACITY,
  MIN_CAPACITY,
  WHERE_LABEL_MAX,
  defaultMeetAt,
  effectiveJoinPolicy,
  openPlanError,
  type Activity,
  type DurationHours,
  type WhenMode,
} from "@bumpinto/shared";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarBlankIcon, MapPinIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Input, Segmented } from "../../src/components/atoms";
import {
  ActivityPicker,
  LocationField,
  ScreenHeader,
  Stepper,
  TravelModeField,
} from "../../src/components/molecules";
import MapPickerSheet from "../../src/components/organisms/MapPickerSheet";
import { api, rememberParticipantToken } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { useLocationStore, type PrimerOutcome } from "../../src/store/locationStore";
import { MAX_ACTIVITIES, useNewSessionStore } from "../../src/store/newSessionStore";
import { colors, radius, space } from "../../src/theme";
import { goBackOr } from "../../src/lib/nav";

/** `?activity=` güvenilmez girdidir: bilinmeyen değer taslağa girerse sunucu 400 döner. */
const KNOWN_ACTIVITIES = new Set<string>(Object.values(ACTIVITY_GROUPS).flat());

/** `toCreateRequest`'in fırlattığı, kullanıcıya gösterilebilen anahtarlar (shared `openPlan.ts`). */
const PLAN_ERROR_KEYS = new Set([
  "plan.errWhereRequired",
  "plan.errMeetAtRequired",
  "plan.errMeetAtPast",
  "newSession.ownMissing",
]);

const pad = (n: number) => String(n).padStart(2, "0");

/** Taslağın yerel `YYYY-MM-DD` + `HH:mm` alanları (shared `openPlan` bu biçimi yerel saat okur). */
function dateFields(d: Date) {
  return {
    meetDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    meetTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/**
 * "Tarih seç"e giriş. Boş ya da GEÇMİŞ kalmış alanlar ileri bir saatle dolar: native seçici boş
 * değer taşıyamaz ve P3 alanları dolu çizer. Doluluk/geçmişlik kararı shared kuraldan okunur.
 */
function enterDate() {
  const { plan, setPlan } = useNewSessionStore.getState();
  const stale = openPlanError({ ...plan, when: "DATE" }, new Date()) != null;
  setPlan(stale ? { when: "DATE", ...dateFields(defaultMeetAt()) } : { when: "DATE" });
}

export default function NewSessionScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const insets = useSafeAreaInsets();
  const displayName = useAuthStore((s) => s.displayName);

  const sessionType = useNewSessionStore((s) => s.sessionType);
  const venueMode = useNewSessionStore((s) => s.venueMode);
  const activityTypes = useNewSessionStore((s) => s.activityTypes);
  const name = useNewSessionStore((s) => s.name);
  const anchor = useNewSessionStore((s) => s.anchor);
  const origin = useNewSessionStore((s) => s.origin);
  const travelMode = useNewSessionStore((s) => s.travelMode);
  const plan = useNewSessionStore((s) => s.plan);
  const setSessionType = useNewSessionStore((s) => s.setSessionType);
  const setVenueMode = useNewSessionStore((s) => s.setVenueMode);
  const toggleActivity = useNewSessionStore((s) => s.toggleActivity);
  const selectActivity = useNewSessionStore((s) => s.selectActivity);
  const isActivityLocked = useNewSessionStore((s) => s.isActivityLocked);
  const setName = useNewSessionStore((s) => s.setName);
  const setAnchor = useNewSessionStore((s) => s.setAnchor);
  const setOrigin = useNewSessionStore((s) => s.setOrigin);
  const setTravelMode = useNewSessionStore((s) => s.setTravelMode);
  const setPlan = useNewSessionStore((s) => s.setPlan);
  const reset = useNewSessionStore((s) => s.reset);
  const planError = useNewSessionStore((s) => s.planError);
  const canSubmit = useNewSessionStore((s) => s.canSubmit);
  const toRequest = useNewSessionStore((s) => s.toRequest);

  const point = useLocationStore((s) => s.point);
  const adopt = useLocationStore((s) => s.adopt);
  const refreshLocation = useLocationStore((s) => s.refresh);

  /* Alan, taslakla aynı kararı verir: taze açılışta taslak sıfırlanır → BOŞ başlar; O3 ön-ekranı
     dönüşünde (`locationPermission`) taslak korunur → çapanın adı kalır. Efekt içinde sıfırlamak
     ikinci bir çizim tetiklerdi. */
  const { locationPermission: returningFromPrimer } = useLocalSearchParams<{ locationPermission?: string }>();
  const [anchorQuery, setAnchorQuery] = useState(() =>
    returningFromPrimer ? (anchor?.label ?? "") : "",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** "Nerede?" hatası alandan çıkınca görünür: Şimdi'yi seçer seçmez kırmızı alan karşılamasın. */
  const [whereTouched, setWhereTouched] = useState(false);
  /** Android'de seçici kendi diyaloğunu açar — hangisinin açık olduğu. */
  const [picking, setPicking] = useState<"date" | "time" | null>(null);

  // O3 ön-ekranı sonucu rota parametresiyle döner (M-5 sözleşmesi) — store onu benimser,
  // İKİNCİ bir sistem diyaloğu açılmaz. Keşfet girişleri: `?now=1` (Buradayım) → Şimdi,
  // `?open=1&activity=X` (Plan aç) → Tarih seç.
  const {
    locationPermission,
    now: nowParam,
    open: openParam,
    activity: activityParam,
  } = useLocalSearchParams<{
    locationPermission?: string;
    now?: string;
    open?: string;
    activity?: string;
  }>();
  useEffect(() => {
    if (locationPermission) void adopt(locationPermission as PrimerOutcome);
  }, [locationPermission, adopt]);
  /* Taze açılış taslağı SIFIRLAR: global depoda kalmış bir Şimdi/OPEN/Herkes taslağı "Yeni buluşma"
     ile açılan forma taşınsaydı tek dokunuş istenmemiş bir herkese açık plan yayınlardı (web de
     mount'ta sıfırlar). O3 ön-ekranı dönüşü (`locationPermission`) YENİ ekran kurar ama taslak
     KORUNUR — kullanıcı formun ortasındaydı. Sıra önemli: bu efekt `setOrigin` efektinden ÖNCE
     durur, yoksa sıfırlama o anki konumu taslaktan da silerdi. */
  useEffect(() => {
    if (!locationPermission) reset();
    if (nowParam === "1") {
      setPlan({ when: "NOW" });
    } else if (openParam === "1") {
      enterDate();
      if (activityParam && KNOWN_ACTIVITIES.has(activityParam)) selectActivity(activityParam as Activity);
    }
  }, [locationPermission, nowParam, openParam, activityParam, reset, setPlan, selectActivity]);

  const isNow = plan.when === "NOW";
  const isPlan = plan.when !== "UNSET";

  /* Şimdi planının çapası O ANKİ konum (spec §1.3). Konum deposu globaldir: saatler önce okunmuş
     nokta ya da eski bir adres "buradayım" değildir ve OPEN planda koltuk alan herkes onu kesin
     buluşma yeri olarak görür. Şimdi'ye her girişte yeniden okunur. */
  useEffect(() => {
    if (isNow) void refreshLocation();
  }, [isNow, refreshLocation]);

  // Konum store'un; taslak onu istekte taşır. İki kaynak tutulmaz.
  useEffect(() => setOrigin(point), [point, setOrigin]);

  // Haritadan seçilen çapa alan metnini de günceller: alanla store ayrışırsa kullanıcı
  // yazdığından BAŞKA bir yerde buluşma kurar. `useEffect` DEĞİL çizim sırasında düzeltme
  // (React'in "prop değişince state'i ayarla" deseni): efektle yapılsaydı bir kare boyunca
  // eski adres görünür, üstelik her yazışta kullanıcının metnini geri alma riski doğardı.
  const [seenAnchorLabel, setSeenAnchorLabel] = useState(anchor?.label);
  if (anchor?.label !== seenAnchorLabel) {
    setSeenAnchorLabel(anchor?.label);
    if (anchor?.label) setAnchorQuery(anchor.label);
  }

  // Şimdi'de ekrandaki çapa modu YOK SAYILIR (shared `toCreateRequest` de öyle).
  const anchored = venueMode === "ANCHOR" && !isNow;
  const err = planError();
  const whereInvalid = isNow && whereTouched && err === "plan.errWhereRequired";
  const dateInvalid = plan.when === "DATE" && err === "plan.errMeetAtPast";
  const meetAt = plan.meetDate && plan.meetTime ? new Date(`${plan.meetDate}T${plan.meetTime}`) : null;

  /** Adres alanı çözülmemiş ya da DEĞİŞMİŞ olabilir — göndermeden önce çözülür. */
  async function resolveAnchor(): Promise<boolean> {
    const q = anchorQuery.trim();
    if (!q) {
      setAnchor(null);
      return false;
    }
    if (anchor && anchor.label === q) return true;
    try {
      const found = await api.geocode({ query: q });
      setAnchor({ lat: found.lat, lng: found.lng, label: found.label });
      return true;
    } catch {
      setError("join.errGeocode");
      return false;
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      if (anchored && !(await resolveAnchor())) {
        setError((e) => e ?? "newSession.errNoAnchor");
        return;
      }
      let body;
      try {
        body = toRequest(displayName ?? "");
      } catch (e) {
        // Çizim ile basış arasında saat geçmiş olabilir: planın KENDİ anahtarı gösterilir.
        const key = e instanceof Error ? e.message : "";
        setError(PLAN_ERROR_KEYS.has(key) ? key : "newSession.errCreate");
        return;
      }
      const res = await api.createSession(body);
      if (!res.slug) throw new Error("slug missing");
      if (res.participantToken) rememberParticipantToken(res.slug, res.participantToken);
      router.replace(`/s/${res.slug}`);
    } catch {
      setError("newSession.errCreate");
    } finally {
      setBusy(false);
    }
  }

  function pickWhen(when: WhenMode) {
    setWhereTouched(false);
    if (when === "DATE") enterDate();
    else setPlan({ when });
  }

  function onPicked(part: "date" | "time", picked: Date | undefined) {
    if (!picked) return;
    const fields = dateFields(picked);
    setPlan(part === "date" ? { meetDate: fields.meetDate } : { meetTime: fields.meetTime });
  }

  const dateText = meetAt
    ? new Intl.DateTimeFormat(lang, { weekday: "short", day: "numeric", month: "short" }).format(meetAt)
    : "";
  const timeText = meetAt
    ? new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(meetAt)
    : "";

  /* Artboard P3: "Tarih" esnek, "Saat" 120px. iOS'ta seçici satır içi `compact` kontroldür,
     Android'de kendi diyaloğunu açar (meet-time alt sayfasıyla aynı iki yol). */
  const dateField = (part: "date" | "time") => {
    const label = t(part === "date" ? "plan.date" : "plan.time");
    const value = meetAt ?? defaultMeetAt();
    return (
      <View style={part === "date" ? s.dateCol : s.timeCol}>
        <AppText variant="label" style={s.subLabel}>
          {label}
        </AppText>
        {Platform.OS === "ios" ? (
          <DateTimePicker
            value={value}
            mode={part}
            display="compact"
            minimumDate={part === "date" ? new Date() : undefined}
            accessibilityLabel={label}
            onChange={(_e, picked) => onPicked(part, picked)}
            style={s.iosPicker}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityValue={{ text: part === "date" ? dateText : timeText }}
            onPress={() => setPicking(part)}
            style={[s.pickField, dateInvalid ? s.pickInvalid : null]}
          >
            {part === "date" ? <CalendarBlankIcon size={18} color={colors.ink2} /> : null}
            <AppText variant="body">{part === "date" ? dateText : timeText}</AppText>
          </Pressable>
        )}
      </View>
    );
  };

  const ctaTitle =
    sessionType === "SOLO"
      ? t("newSession.findVenues")
      : t(isNow ? "plan.ctaNow" : isPlan ? "plan.ctaDate" : "newSession.createGroup");

  return (
    <View style={s.screen}>
      {/* `.top` — SABİT (K-M26). P3/P3a: plan modunda başlık "Plan aç" / "Buradayım". */}
      <ScreenHeader
        title={t(isNow ? "plan.titleNow" : isPlan ? "plan.titleDate" : "newSession.title")}
        backLabel={t("newSession.back")}
        onBack={() => goBackOr("/sessions")}
      />

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {/* Artboard P3: tip rayı ORTALANMIŞ, altında ne olacağını anlatan tek satır. */}
        <View style={s.typeRow}>
          <Segmented
            options={[
              { value: "GROUP", label: t("newSession.group") },
              { value: "SOLO", label: t("newSession.solo") },
            ]}
            value={sessionType}
            onChange={setSessionType}
            style={s.typeSeg}
          />
        </View>
        <AppText variant="muted" style={s.typeCopy}>
          {t(sessionType === "GROUP" ? "newSession.groupCopy" : "newSession.soloCopy")}
        </AppText>

        <View style={s.field}>
          <View style={s.fieldHead}>
            <AppText variant="label" style={s.label}>
              {t("newSession.what")}
            </AppText>
            <AppText variant="muted">{t("newSession.whatHint", { max: MAX_ACTIVITIES })}</AppText>
          </View>
          <ActivityPicker
            value={activityTypes}
            onToggle={toggleActivity}
            isLocked={isActivityLocked}
          />
        </View>

        <View style={s.field}>
          <AppText variant="label" style={s.label}>
            {t("newSession.name")}
            <AppText variant="muted"> {t("newSession.nameOptional")}</AppText>
          </AppText>
          <Input
            value={name}
            onChangeText={setName}
            accessibilityLabel={t("newSession.name")}
            placeholder={t("newSession.namePlaceholder")}
          />
        </View>

        {/* Artboard P3/P3a "Ne zaman" — yalnız GRUP: Bireysel'in davet linki yok, açık plan olamaz. */}
        {sessionType === "GROUP" ? (
          <>
            <View style={s.field}>
              <AppText variant="label" style={s.label}>
                {t("plan.when")}
              </AppText>
              <Segmented
                options={[
                  { value: "UNSET", label: t("plan.whenUnset") },
                  { value: "NOW", label: t("plan.now") },
                  { value: "DATE", label: t("plan.pickDate") },
                ]}
                value={plan.when}
                onChange={pickWhen}
              />
              {isNow ? (
                /* P3a: "Kaç saat" etiketi rayla AYNI satırda, 76px sabit sütun. */
                <View style={s.durationRow}>
                  <AppText variant="label" style={s.durationLabel}>
                    {t("plan.duration")}
                  </AppText>
                  <Segmented
                    options={DURATIONS.map((h) => ({
                      value: String(h),
                      label: t("plan.durationHours", { count: h }),
                    }))}
                    value={String(plan.durationHours)}
                    onChange={(v) => setPlan({ durationHours: Number(v) as DurationHours })}
                    style={s.flex}
                  />
                </View>
              ) : (
                <AppText variant="muted">{t("plan.whenHint")}</AppText>
              )}
            </View>

            {isNow ? (
              <View style={s.field}>
                <AppText variant="label" style={s.label}>
                  {t("plan.where")}
                </AppText>
                <Input
                  value={plan.whereLabel}
                  onChangeText={(v) => setPlan({ whereLabel: v })}
                  onBlur={() => setWhereTouched(true)}
                  maxLength={WHERE_LABEL_MAX}
                  accessibilityLabel={t("plan.where")}
                  placeholder={t("plan.wherePlaceholder")}
                  invalid={whereInvalid}
                />
                {whereInvalid ? (
                  <AppText variant="muted" style={s.error}>
                    {t("plan.errWhereRequired")}
                  </AppText>
                ) : (
                  <AppText variant="muted">{t("plan.whereHint")}</AppText>
                )}
              </View>
            ) : null}

            {plan.when === "DATE" ? (
              <View style={s.field}>
                <View style={s.dateRow}>
                  {dateField("date")}
                  {dateField("time")}
                </View>
                {dateInvalid ? (
                  <AppText variant="muted" style={s.error}>
                    {t("plan.errMeetAtPast")}
                  </AppText>
                ) : null}
                {Platform.OS !== "ios" && picking ? (
                  <DateTimePicker
                    value={meetAt ?? defaultMeetAt()}
                    mode={picking}
                    display="default"
                    minimumDate={picking === "date" ? new Date() : undefined}
                    onChange={(_e, picked) => {
                      const part = picking;
                      setPicking(null);
                      onPicked(part, picked);
                    }}
                  />
                ) : null}
              </View>
            ) : null}

            {isPlan ? (
              <>
                <View style={s.capacityRow}>
                  <View style={s.capacityText}>
                    <AppText variant="label" style={s.label}>
                      {t("plan.capacity")}
                    </AppText>
                    <AppText variant="muted">{t("plan.capacityHint")}</AppText>
                  </View>
                  <Stepper
                    value={plan.capacity}
                    min={MIN_CAPACITY}
                    max={MAX_CAPACITY}
                    onChange={(capacity) => setPlan({ capacity })}
                    label={t("plan.capacity")}
                    decLabel={t("plan.capacityDec")}
                    incLabel={t("plan.capacityInc")}
                  />
                </View>

                <View style={s.field}>
                  <AppText variant="label" style={s.label}>
                    {t("plan.joinPolicy")}
                  </AppText>
                  <Segmented
                    options={[
                      { value: "APPROVAL", label: t("plan.approval") },
                      { value: "OPEN", label: t("plan.openJoin") },
                    ]}
                    value={effectiveJoinPolicy(plan)}
                    onChange={(joinPolicy) => setPlan({ joinPolicy })}
                  />
                  {isNow ? <AppText variant="muted">{t("plan.joinDefaultNow")}</AppText> : null}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {/* Şimdi'de buluşma yeri seçimi YOK: çapa kuranın o anki konumu + "Nerede?" etiketi. */}
        {isNow ? null : (
          <View style={s.field}>
            <AppText variant="label" style={s.label}>
              {t("newSession.meetWhere")}
            </AppText>
            <Segmented
              options={[
                { value: "MIDPOINT", label: t("newSession.modeMidpoint") },
                { value: "ANCHOR", label: t("newSession.modeAnchor") },
              ]}
              value={venueMode}
              onChange={(m) => {
                setVenueMode(m);
                // Moddan çıkarken alan da temizlenir: dolu görünen ama store'da karşılığı
                // olmayan bir adres kullanıcıyı çıkmaza sokar.
                if (m === "MIDPOINT") setAnchorQuery("");
              }}
            />
            {anchored ? (
              <View style={s.subField}>
                <AppText variant="muted" style={s.subLabel}>
                  {t("newSession.anchorLabel")}
                </AppText>
                <Input
                  value={anchorQuery}
                  onChangeText={setAnchorQuery}
                  onBlur={() => void resolveAnchor()}
                  accessibilityLabel={t("newSession.anchorLabel")}
                  placeholder={t("newSession.anchorPlaceholder")}
                />
                <Button
                  small
                  kind="white"
                  title={t("map.pickOnMap")}
                  icon={<MapPinIcon size={18} color={colors.ink} />}
                  onPress={() => setPickerOpen(true)}
                />
                {anchor?.label ? (
                  <AppText variant="muted">
                    {t("newSession.anchorSet", { label: anchor.label })}
                  </AppText>
                ) : null}
                <AppText variant="muted">{t("newSession.anchorHint")}</AppText>
              </View>
            ) : (
              <AppText variant="muted">{t("newSession.midpointHint")}</AppText>
            )}
          </View>
        )}

        {/* "Kim görsün?" — Arkadaşlar B-19'la gelir; olmayan seçenek soluk bile çizilmez (§11.5). */}
        {isPlan && sessionType === "GROUP" ? (
          <View style={s.field}>
            <AppText variant="label" style={s.label}>
              {t("plan.audience")}
            </AppText>
            <Segmented
              options={[
                { value: "PUBLIC", label: t("plan.audiencePublic") },
                { value: "NONE", label: t("plan.audienceNone") },
              ]}
              value={plan.audience}
              onChange={(audience) => setPlan({ audience })}
            />
            <AppText variant="muted">{t("plan.audienceHint")}</AppText>
          </View>
        ) : null}

        <LocationField
          title={t("newSession.where")}
          next="/sessions/new"
          /* Artboard P4: çapalı oturumda kuranın konumu ZORUNLU DEĞİL — "…ya da adres yaz"
             bağlantısının yerini bu not alır (`canSubmit` de aynı kapıyı uyguluyor). */
          hint={anchored ? t("newSession.ownOptional") : undefined}
        />

        <TravelModeField value={travelMode} onChange={setTravelMode} />

        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}
      </ScrollView>

      {/* `.fade` — kaydırılacak içerik olduğunu belli eden alt gradyan. */}
      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + (isPlan ? 84 : 64) }]}
        pointerEvents="none"
      />

      {/* `.cta` — SABİT alt çubuk (K-M26). P3/P3a `.f-note`: CTA'nın altında ortalı not. */}
      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          title={ctaTitle}
          icon={isNow ? <MapPinIcon size={18} color="#fff" /> : undefined}
          disabled={busy || !canSubmit()}
          onPress={() => void create()}
        />
        {isNow && !origin ? (
          <AppText variant="muted" style={s.ctaNote}>
            {t("newSession.ownMissing")}
          </AppText>
        ) : isPlan ? (
          <AppText variant="muted" style={s.ctaNote}>
            {t("plan.publicPlaceNote")}
          </AppText>
        ) : null}
      </View>

      {/* Formun ÜSTÜNDE açılan yerinde alt sayfa (artboard P4 `.scrim` + `.sheet`): kullanıcı
          çapayı seçerken doldurduğu formu scrim'in arkasında görmeye devam eder. */}
      <MapPickerSheet
        visible={pickerOpen}
        center={anchor ?? point}
        onCancel={() => setPickerOpen(false)}
        onPick={(picked) => {
          setAnchor(picked);
          setAnchorQuery(picked.label ?? "");
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 110, gap: 14 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, gap: 6, backgroundColor: colors.paper },
  ctaNote: { textAlign: "center", fontSize: 12 },
  typeRow: { flexDirection: "row", justifyContent: "center" },
  typeSeg: { alignSelf: "center", minWidth: 220 },
  typeCopy: { textAlign: "center", marginTop: -6 },
  field: { gap: 10 },
  fieldHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 },
  label: { fontWeight: "600" },
  subField: { gap: 8, marginTop: 2 },
  subLabel: { fontWeight: "600", color: colors.ink },
  error: { color: colors.flameDeep, fontWeight: "600" },
  flex: { flex: 1 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  durationLabel: { width: 76, fontWeight: "600" },
  dateRow: { flexDirection: "row", gap: 10 },
  dateCol: { flex: 1, gap: 8 },
  timeCol: { width: 120, gap: 8 },
  iosPicker: { alignSelf: "flex-start" },
  pickField: {
    minHeight: 52,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.lineIn,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickInvalid: { borderColor: colors.flameDeep, backgroundColor: colors.flameWash },
  capacityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  capacityText: { flex: 1, gap: 2 },
});
