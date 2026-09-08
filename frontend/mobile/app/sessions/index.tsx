import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Avatar, Button, HandNote, Input, Skeleton } from "../../src/components/atoms";
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
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={[
        s.page,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={s.bar}>
        <AppText variant="h2">{t("common.wordmark")}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("shell.profile")}
          onPress={() => router.push("/profile")}
        >
          <Avatar name={displayName ?? ""} tint={0} />
        </Pressable>
      </View>

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
          {past.map((session, i) => (
            <PastSessionRow
              key={session.slug ?? i}
              session={session}
              index={i}
              onOpen={(slug) => router.push(futureRoute(`/s/${slug}`))}
            />
          ))}
          <AppText variant="muted" style={s.retention}>
            {t(list?.pastTruncated ? "sessions.retentionTruncated" : "sessions.retention", {
              count: past.length,
            })}
          </AppText>
        </>
      ) : null}

      {empty ? null : (
        <Button
          title={t("sessions.new")}
          onPress={() => router.push(futureRoute("/new"))}
          style={{ marginTop: 20 }}
        />
      )}
    </ScrollView>
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

      <Button
        title={t("sessions.new")}
        onPress={() => router.push(futureRoute("/new"))}
        style={{ marginTop: 20 }}
      />

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
  page: { flexGrow: 1, paddingHorizontal: space.screenX },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
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
