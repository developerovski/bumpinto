import {
  GROUP_TINT,
  activityListLabel,
  formatDuration,
  groupOf,
  meetAtOptions,
  monogram,
  remainingMinutes,
  type SessionPreview,
} from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  CheckIcon,
  HandWavingIcon,
  LightningIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "phosphor-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AppState, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Avatar, Badge, Button, Card, Input, Sticker } from "../components/atoms";
import { ScreenHeader } from "../components/molecules";
import SignInBlock from "../components/molecules/SignInBlock";
import { goBackOr } from "../lib/nav";
import { useNow } from "../lib/useNow";
import { useAuthStore } from "../store/authStore";
import { useLocationStore } from "../store/locationStore";
import { useMeStore } from "../store/meStore";
import { useSeatStore } from "../store/seatStore";
import { colors, fonts, photoTints, radius, space } from "../theme";

/** Onay beklerken 10 sn'de bir sorulur: bekleyenin koltuğu yok, WS konusu ona KAPALI — tek yol bu. */
const POLL_MS = 10_000;
/** `Texts.note` sunucu sınırı. */
const NOTE_MAX = 140;

/** `.kv` satırı — 22px ikon sütunu + kalın satır ve isteğe bağlı alt satır. */
function Kv({ icon, main, sub }: { icon: ReactNode; main: string; sub?: string }) {
  return (
    <View style={s.kvRow}>
      <View style={s.kvIcon}>{icon}</View>
      <View style={s.kvText}>
        <AppText variant="body" style={s.bold}>
          {main}
        </AppText>
        {sub ? <AppText variant="muted">{sub}</AppText> : null}
      </View>
    </View>
  );
}

/**
 * Keşfet POC P2 (zamanlı, APPROVAL) / P2a (süren, OPEN) — açık planın ÜYE OLMAYANA görünen
 * detayı. `/j/[slug]` bunu önizleme `openPlan` taşıyınca çizer (K-B37: açık planda katılım formu
 * yok, koltuk yalnız istekle).
 *
 * YALNIZ kamu önizlemesini okur: semt, dakika, kesin nokta ve host'un alt satırı
 * `SessionPreview`'da YOK — olmayan alan çizilmez (artboard'daki "Stratum civarı" / "sana ~20 dk"
 * satırları bu yüzden basılmaz). Süren plan kararı sunucunun `openPlan.inProgress`'i; kalan süre
 * istemci saatinden.
 */
export default function PlanIntroScreen({ slug, preview }: { slug: string; preview: SessionPreview }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const insets = useSafeAreaInsets();
  const now = useNow();

  const status = useAuthStore((s) => s.status);
  const me = useMeStore((s) => s.me);
  const seatSlug = useSeatStore((s) => s.slug);
  const storedSeat = useSeatStore((s) => s.seat);
  const busy = useSeatStore((s) => s.busy);
  const error = useSeatStore((s) => s.error);
  const check = useSeatStore((s) => s.check);
  const request = useSeatStore((s) => s.request);
  const [note, setNote] = useState("");

  const signedIn = status === "in";
  // Durum YALNIZ bu planınsa: ilk karede depoda önceki planın durumu durabilir.
  const seat = seatSlug === slug ? storedSeat : "loading";

  // Anonimde SORULMAZ: hesap ucu 401 → yenileme kesicisi → çıkış işleyicisi.
  useEffect(() => {
    if (!signedIn) return;
    if (!useMeStore.getState().me) void useMeStore.getState().load();
    void check(slug);
  }, [signedIn, slug, check]);

  useEffect(() => {
    if (seat !== "PENDING") return;
    const id = setInterval(() => {
      // Arka planda sorulmaz; öne dönüşteki ilk tur onayı yakalar.
      if (AppState.currentState === "active") void check(slug);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [seat, slug, check]);

  // Koltuk hazır (onay, OPEN'da anında onay, host'un kendi planı): oturuma.
  useEffect(() => {
    if (seat === "APPROVED") router.replace(`/s/${slug}`);
  }, [seat, slug]);

  const plan = preview.openPlan ?? {};
  const open = plan.joinPolicy === "OPEN";
  const live = plan.inProgress === true && !!plan.openUntil;
  const approved = plan.approvedSeats ?? 0;
  const capacity = plan.capacity ?? 0;
  const free = Math.max(0, capacity - approved);
  const activities = preview.activityTypes ?? [];
  const first = activities[0];
  const tint = photoTints[GROUP_TINT[groupOf(first ?? "COFFEE")]];
  const fits = activities.filter((a) => me?.interests?.includes(a));
  const meetAt = plan.meetAt ? new Date(plan.meetAt) : null;
  // Host önce: kanonik kişi sırası (kişi rengi dizini) host'la başlar.
  const people = [...(preview.participants ?? [])].sort((a, b) => Number(!!b.host) - Number(!!a.host));
  const host = preview.hostDisplayName ?? t("plan.host");

  async function send() {
    // Konum: izin verilmiş o anki nokta, yoksa profil varsayılanı — KOORDİNAT gider, ETİKET gitmez:
    // host onaydan önce isteğin yerini görür ve kayıtlı etiket ev adresi olabilir.
    const loc = useLocationStore.getState();
    const at = loc.phase === "granted" && loc.point ? loc.point : (me?.defaultLocation ?? null);
    await request(slug, {
      displayName: me?.displayName ?? useAuthStore.getState().displayName ?? "",
      note: note.trim() || undefined,
      travelMode: me?.defaultTravelMode,
      ...(at ? { lat: at.lat, lng: at.lng } : {}),
    });
  }

  const cta = () => {
    if (status === "out" || status === "busy") return <SignInBlock />;
    if (!signedIn) return null;
    if (seat === "PENDING") {
      return (
        <View style={s.stateBox}>
          <Sticker tone="white">{t("seat.pending")}</Sticker>
          <AppText variant="muted" style={s.center}>
            {t("seat.pendingLead", { host })}
          </AppText>
        </View>
      );
    }
    if (seat === "DECLINED" || seat === "closed") {
      return (
        <View style={s.stateBox}>
          <AppText variant="body" style={s.center}>
            {t(seat === "closed" ? "seat.errClosed" : "seat.declined")}
          </AppText>
          <Button small kind="white" title={t("seat.backToDiscover")} onPress={() => goBackOr("/discover")} style={s.auto} />
        </View>
      );
    }
    if (seat !== "none") return null;
    return (
      <>
        <Button
          title={t(open ? "seat.join" : "seat.want")}
          icon={<HandWavingIcon size={18} color="#fff" />}
          disabled={busy}
          onPress={() => void send()}
        />
        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}
        <AppText variant="muted" style={s.ctaNote}>
          {open ? t("seat.joinNote") : t("seat.afterApprove", { host })}
        </AppText>
      </>
    );
  };

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={t("plan.title")}
        backLabel={t("common.back")}
        onBack={() => goBackOr(signedIn ? "/discover" : "/")}
      />

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[...tint]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.photo}>
          <AppText
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={s.mono}
          >
            {monogram(preview.name)}
          </AppText>
          {first ? (
            <View style={s.tag}>
              <AppText style={s.tagText}>{t(`activity.${first}`).toLocaleLowerCase(lang)}</AppText>
            </View>
          ) : null}
          {live ? (
            <Sticker
              tone="amber"
              icon={<LightningIcon size={13} color={colors.amberInk} weight="fill" />}
              style={s.sticker}
            >
              {t("discover.nowSticker", { approved, capacity })}
            </Sticker>
          ) : plan.confirmed ? (
            <Sticker style={s.sticker}>{t("plan.confirmedSticker", { approved, capacity })}</Sticker>
          ) : null}
        </LinearGradient>

        <View style={s.titleBlock}>
          {/* Adsız planda başlık BOŞ BIRAKILMAZ (K-M27): alan listesine düşülür. */}
          <AppText variant="h1">{preview.name || activityListLabel(activities, t, lang)}</AppText>
          {fits.length > 0 ? (
            <View style={s.fit}>
              <CheckCircleIcon size={14} color={colors.grass} />
              <AppText variant="muted" style={s.fitText}>
                {t("plan.fit", { activity: activityListLabel(fits, t, lang).toLocaleLowerCase(lang) })}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={s.kv}>
          {live ? (
            <Kv
              icon={<LightningIcon size={18} color={colors.flameDeep} />}
              main={t("discover.inProgress", {
                time: formatDuration(remainingMinutes(plan.openUntil!, now), t),
              })}
              sub={
                meetAt
                  ? t("plan.startedAt", {
                      time: new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(meetAt),
                    })
                  : undefined
              }
            />
          ) : meetAt ? (
            <Kv
              icon={<CalendarBlankIcon size={18} color={colors.flameDeep} />}
              main={new Intl.DateTimeFormat(lang, meetAtOptions(meetAt, now, "long")).format(meetAt)}
            />
          ) : null}
          <Kv
            icon={<MapPinIcon size={18} color={colors.flameDeep} />}
            main={t(open ? "plan.exactLaterOpen" : "plan.exactLater")}
          />
        </View>

        <Card style={s.who}>
          <AppText variant="over">{t("plan.who")}</AppText>
          {people.map((p, i) => (
            <View key={`${p.displayName ?? ""}-${i}`} style={s.whoRow}>
              <Avatar name={p.displayName ?? "?"} tint={i} ring={p.host} size="s" />
              <AppText variant="body" numberOfLines={1} style={s.whoName}>
                {p.host ? t("plan.hostRow", { name: p.displayName ?? "" }) : p.displayName}
              </AppText>
              {p.host ? (
                <Badge tone="grass">{t("plan.host")}</Badge>
              ) : (
                <Badge tone="grass" icon={<CheckIcon size={13} color={colors.grass} weight="bold" />}>
                  {null}
                </Badge>
              )}
            </View>
          ))}
          {free > 0 ? (
            <View style={s.whoRow}>
              <Avatar name="?" waiting size="s" />
              <AppText variant="muted" style={s.whoName}>
                {t("plan.seatFree", { count: free })}
              </AppText>
            </View>
          ) : null}
        </Card>

        <View style={s.safe}>
          <ShieldCheckIcon size={18} color={colors.grass} />
          <AppText variant="muted" style={s.safeText}>
            <Trans
              i18nKey={open ? "plan.safetyOpen" : "plan.safety"}
              components={[<AppText key="0" variant="muted" style={s.safeBold} />]}
            />
          </AppText>
        </View>

        {signedIn && seat === "none" ? (
          <View style={s.noteField}>
            <AppText variant="label" style={s.bold}>
              {t("seat.note")}
            </AppText>
            <Input
              value={note}
              onChangeText={setNote}
              maxLength={NOTE_MAX}
              accessibilityLabel={t("seat.note")}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* `.cta` — SABİT alt çubuk (K-M26), `.scroll`un KARDEŞİ. */}
      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>{cta()}</View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 24, gap: 14 },
  photo: {
    height: 150,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  mono: {
    fontFamily: fonts.head,
    fontSize: 48,
    color: colors.photoMono,
    transform: [{ rotate: "-4deg" }],
  },
  tag: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.photoTag,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 12, color: colors.card },
  sticker: { position: "absolute", left: 12, bottom: 12 },
  titleBlock: { gap: 6 },
  fit: { flexDirection: "row", alignItems: "center", gap: 6 },
  fitText: { color: colors.grass, fontWeight: "600" },
  kv: { gap: 8 },
  kvRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  kvIcon: { width: 22, paddingTop: 2 },
  kvText: { flex: 1, gap: 2 },
  bold: { fontWeight: "700" },
  who: { gap: 10, paddingVertical: 12 },
  whoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  whoName: { flex: 1 },
  safe: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.grassWash,
    borderWidth: 1,
    borderColor: colors.grassLine,
  },
  safeText: { flex: 1, color: colors.ink },
  safeBold: { color: colors.ink, fontWeight: "700" },
  noteField: { gap: 8 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, gap: 8, backgroundColor: colors.paper },
  ctaNote: { textAlign: "center", fontSize: 12 },
  stateBox: { alignItems: "center", gap: 10 },
  center: { textAlign: "center" },
  auto: { width: "auto" },
  error: { color: colors.flameDeep, fontWeight: "600", textAlign: "center" },
});
