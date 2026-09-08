import { router } from "expo-router";
import { useEffect, useState } from "react";
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
  Input,
  Skeleton,
  Wordmark,
} from "../../src/components/atoms";
import { MapMark, PastSessionRow, SessionCard } from "../../src/components/molecules";
import { useAuthStore } from "../../src/store/authStore";
import { slugFromInvite, useSessionStore } from "../../src/store/sessionStore";
import { colors, space } from "../../src/theme";

/**
 * Artboard P1 (dolu liste) · P2 (boş durum).
 *
 * Ekran YALNIZ kompozisyon + store bağlama yapar; kart/satır çizimi moleküllerde.
 */

/**
 * `/new`, `/j/[slug]` ve `/s/[slug]` rotalarını **M-7** açar (plan41 T1/T3/T4). `typedRoutes`
 * henüz var olmayan yolu derleme hatası yapıyor; hedefleri uydurma ekranlarla doldurmak yerine
 * ileri referans TEK yerde işaretlenir. **M-7 o üç dosyayı ekleyince bu yardımcı SİLİNİR** ve
 * çağrılar doğrudan tiplenir (K-M10).
 */
const futureRoute = (path: string) => path as Parameters<typeof router.push>[0];
export default function SessionsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const displayName = useAuthStore((s) => s.displayName);
  const list = useSessionStore((s) => s.list);
  const loading = useSessionStore((s) => s.loading);
  const error = useSessionStore((s) => s.error);
  const loadList = useSessionStore((s) => s.loadList);

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
          onPress={() => router.push("/profile")}
        >
          <Avatar name={displayName ?? ""} tint={0} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
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
                onOpen={(slug) => router.push(futureRoute(`/s/${slug}`))}
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
                  onOpen={(slug) => router.push(futureRoute(`/s/${slug}`))}
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
          onPress={() => router.push(futureRoute("/new"))}
        />
      </View>
    </View>
  );
}

/** Artboard P2 — hiç buluşma yokken: işaret, kopya ve davet kutusu. */
function EmptyState() {
  const { t } = useTranslation();
  const [invite, setInvite] = useState("");
  const slug = slugFromInvite(invite);

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

      {/* "Yeni buluşma" burada TEKRARLANMAZ: sabit alt çubukta duruyor (artboard P2 boş). */}
      <View style={s.invite}>
        <Input
          value={invite}
          onChangeText={setInvite}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t("sessions.pastePlaceholder")}
          placeholder={t("sessions.pastePlaceholder")}
          containerStyle={{ flex: 1 }}
        />
        <Button
          small
          kind="white"
          title={t("join.submit")}
          disabled={!slug}
          onPress={() => slug && router.push(futureRoute(`/j/${slug}`))}
          style={s.inviteCta}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  // Alt boşluk = CTA çubuğunun yüksekliği; son satır sabit düğmenin altında kalmaz.
  page: { flexGrow: 1, paddingHorizontal: space.screenX, paddingBottom: 84 },
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
  invite: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22, width: "100%" },
  inviteCta: { width: "auto", flexShrink: 0 },
});
