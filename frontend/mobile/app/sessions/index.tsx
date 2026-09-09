import { router } from "expo-router";
import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { PlusIcon } from "phosphor-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AppText,
  Avatar,
  Button,
  Card,
  HandNote,
  Skeleton,
  Wordmark,
} from "../../src/components/atoms";
import {
  InviteEntryCard,
  MapMark,
  OfflineBanner,
  PastSessionRow,
  SessionCard,
} from "../../src/components/molecules";
import { useAuthStore } from "../../src/store/authStore";
import { useNetStore } from "../../src/store/netStore";
import { useSessionStore } from "../../src/store/sessionStore";
import { colors, space } from "../../src/theme";
import { useOncePress } from "../../src/lib/useOncePress";

export default function SessionsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const displayName = useAuthStore((s) => s.displayName);
  const list = useSessionStore((s) => s.list);
  const loading = useSessionStore((s) => s.loading);
  const error = useSessionStore((s) => s.error);
  const loadList = useSessionStore((s) => s.loadList);
  const online = useNetStore((s) => s.online);
  // Çift dokunuşta profil İKİ KEZ yığına girmesin.
  const openProfile = useOncePress(() => router.push("/profile"));

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const open = list?.open ?? [];
  const past = list?.past ?? [];
  const empty = !loading && open.length === 0 && past.length === 0;

  return (
    <View style={s.screen}>
      {/* Artboard P2 `.top` — `.scroll`un KARDEŞİ, yani SABİT. Marka ve profil her an
          erişilebilir kalır; kaydırma içine konursa liste uzadıkça ikisi de kaybolur. */}
      <View style={[s.bar, { paddingTop: insets.top + 10 }]}>
        <Wordmark />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("shell.profile")}
          onPress={openProfile}
        >
          <Avatar name={displayName ?? ""} tint={0} />
        </Pressable>
      </View>

      <OfflineBanner onRetry={() => void loadList()} />

      {/* P24: liste SON GÖRÜLEN hâliyle okunur kalır, yalnız solar — çevrimdışıyken elindeki
          bilgiyi de elinden almak kullanıcıyı hiç bilgisiz bırakırdı. */}
      <ScrollView
        contentContainerStyle={[s.page, online ? null : s.stale]}
        showsVerticalScrollIndicator={false}
      >
      {/* Artboard P1/P2 `<h1 class="big">Nereye<br/>gidiyoruz?</h1>` — DOLU ve BOŞ durumun
          ikisinde de ekranın ilk öğesi. Kodda hiç çizilmiyordu; `sessions.title` anahtarı
          vardı ama kullanılmıyordu. */}
      <AppText variant="display" style={s.title}>
        <Trans i18nKey="sessions.title" components={[<AppText key="0">{"\n"}</AppText>]} />
      </AppText>

      {loading && !list ? (
        <View style={s.skeletons}>
          <Skeleton height={120} radius={22} />
          <Skeleton height={120} radius={22} />
        </View>
      ) : null}

      {error ? (
        <AppText variant="muted" style={{ color: colors.flameDeep }}>
          {t(error)}
        </AppText>
      ) : null}

      {empty ? <EmptyState /> : null}

      {open.length > 0 ? (
        <>
          <AppText variant="over" style={s.over}>
            {t("sessions.open")}
          </AppText>
          <View style={s.cards}>
            {open.map((session, i) => (
              <SessionCard
                key={session.slug ?? i}
                session={session}
                featured={i === 0}
                onOpen={(slug) => router.push(`/s/${slug}`)}
              />
            ))}
          </View>
        </>
      ) : null}

      {past.length > 0 ? (
        <>
          <AppText variant="over" style={s.over}>
            {t("sessions.past")}
          </AppText>
          {/* Artboard P1: geçmiş satırları tek KART içinde, aralarında 16px içeriden
              başlayan ayırıcı. Kağıt üstünde serbest dururken liste dağılmış görünüyordu. */}
          <Card padded={false} style={s.pastCard}>
            {past.map((session, i) => (
              <View key={session.slug ?? i}>
                {i > 0 ? <View style={s.divider} /> : null}
                <PastSessionRow
                  session={session}
                  index={i}
                  onOpen={(slug) => router.push(`/s/${slug}`)}
                />
              </View>
            ))}
          </Card>
          <AppText variant="muted" style={s.retention}>
            {t(list?.pastTruncated ? "sessions.retentionTruncated" : "sessions.retention", {
              count: past.length,
            })}
          </AppText>
        </>
      ) : null}

      </ScrollView>

      {/* Artboard P2 `.fade` — kaydırılacak içerik olduğunu belli eden alt gradyan. */}
      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + 64 }]}
        pointerEvents="none"
      />

      {/* Artboard P2 `.cta` — SABİT alt çubuk, `.scroll`un KARDEŞİ. Kaydırma içine konursa
          geçmiş buluşmalar uzadıkça birincil eylem ekranın dışına düşüyor ve kullanıcı
          "Yeni buluşma"yı hiç göremiyor (2026-09-08 emülatörde görüldü). */}
      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          title={t("sessions.new")}
          icon={<PlusIcon size={18} color="#fff" weight="bold" />}
          // Çevrimdışıyken kurma akışı SUNUCUYA yazar: düğmeyi açık bırakmak kullanıcıyı
          // formu doldurup hata almaya gönderirdi (P24: pasif).
          disabled={!online}
          onPress={() => router.push("/sessions/new")}
        />
      </View>
    </View>
  );
}

/** Artboard P2 — hiç buluşma yokken: işaret, kopya ve davet kutusu. */
function EmptyState() {
  const { t } = useTranslation();

  return (
    <View style={s.empty}>
      <MapMark />
      <AppText variant="h1" style={s.emptyTitle}>
        {t("sessions.emptyTitle")}
      </AppText>
      <AppText variant="body" style={s.emptyCopy}>
        {t("sessions.emptyCopy")}
      </AppText>
      <HandNote>{t("sessions.emptyHand")}</HandNote>

      {/* "Yeni buluşma" burada TEKRARLANMAZ: sabit alt çubukta duruyor (artboard P2 boş).
          Kod/link çözümlemesi `InviteEntryCard`ta TEK yerde — QR taraması ve `by-code`
          sorgusu da oradan gelir (M-9). */}
      <View style={s.invite}>
        <InviteEntryCard />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  // Alt boşluk = CTA çubuğunun yüksekliği; son satır sabit düğmenin altında kalmaz.
  page: { flexGrow: 1, paddingHorizontal: space.screenX, paddingBottom: 84 },
  stale: { opacity: 0.6 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, backgroundColor: colors.paper },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    paddingBottom: 14,
    backgroundColor: colors.paper,
  },
  title: { marginBottom: 4 },
  pastCard: { paddingVertical: 2 },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: space.cardX },
  skeletons: { gap: space.gap },
  over: { marginTop: 18, marginBottom: 8 },
  cards: { gap: space.gap },
  retention: { marginTop: 12 },
  empty: { alignItems: "center", paddingTop: 24 },
  emptyTitle: { textAlign: "center", marginTop: 18 },
  emptyCopy: { textAlign: "center", color: colors.ink2, marginTop: 8 },
  invite: { marginTop: 22, width: "100%" },
});
