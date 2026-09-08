import { router } from "expo-router";
import { TrashIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Card, Input } from "../../src/components/atoms";
import { ScreenHeader } from "../../src/components/molecules";
import { api } from "../../src/lib/api";
import { colors, radius, space } from "../../src/theme";
import { useAuthStore } from "../../src/store/authStore";
import { useMeStore } from "../../src/store/meStore";

/**
 * O15 + O16 — hesabı sil (R-M6). Apple 5.1.1(v) ve Play "hesap silme" şartı.
 *
 * ÜÇ adım bilinçlidir: (1) ne silinir / ne kalır, (2) onay sözcüğünü yazarak doğrulama,
 * (3) sonuç ekranı. Oturum yalnız sunucu 204 döndükten SONRA kapanır — silme başarısızken
 * çıkış yapmak kullanıcıyı verisi hâlâ dururken dışarıda bırakırdı.
 *
 * Onay sözcüğü ÇEVRİLİR (`del.confirmWord`: SİL / DELETE / VERWIJDER) — web ile aynı davranış.
 * Sabit kodlanırsa İngilizce arayüzde kullanıcıdan Türkçe bir sözcük istenirdi.
 */

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmWord = t("del.confirmWord");
  // TR'de "sil".toUpperCase() → "SIL" (noktasız I); karşılaştırma yerele duyarlı yapılır.
  const canDelete =
    typed.trim().toLocaleUpperCase("tr") === confirmWord.toLocaleUpperCase("tr");

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteMe(); // Apple bağlantısının iptali (revoke) sunucu tarafındadır (§2).
      await useAuthStore.getState().signOut();
      useMeStore.getState().clear();
      router.replace("/account/deleted");
    } catch {
      setError("del.errDelete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={t("account.delete")}
        backLabel={t("common.back")}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={s.page}>
        <AppText variant="display" style={s.title}>
          {t("del.title")}
        </AppText>
        <AppText variant="body" style={s.muted}>
          {t("del.warn")}
        </AppText>

        <AppText variant="over">{t("del.willDelete")}</AppText>
        <Card style={s.list}>
          {[t("del.d1"), t("del.d2"), t("del.d3"), t("del.d4")].map((item) => (
            <Bullet key={item}>{item}</Bullet>
          ))}
        </Card>

        <AppText variant="over">{t("del.willKeep")}</AppText>
        <Card style={s.list}>
          {[t("del.k1"), t("del.k2")].map((item) => (
            <Bullet key={item}>{item}</Bullet>
          ))}
        </Card>

        <AppText variant="muted">{t("del.pause")}</AppText>
        <Button
          kind="ghost"
          small
          title={t("profile.logout")}
          style={s.logout}
          onPress={() => {
            void useAuthStore
              .getState()
              .signOut()
              .then(() => router.replace("/"));
          }}
        />

      </ScrollView>

      <View style={[s.cta, { paddingBottom: insets.bottom + 10 }]}>
        <Button
          kind="danger"
          title={t("del.mobileSubmit")}
          icon={<TrashIcon size={18} color={colors.flameDeep} />}
          onPress={() => {
            setTyped("");
            setError(null);
            setSheetOpen(true);
          }}
        />
      </View>

      {/* O16 onay alt sayfası — artboard'daki gibi ÇERÇEVE İÇİNDE karartma + sayfa
          (yerel `Modal` DEĞİL: ayrı bir kök ağaca çizilir, karartmanın altındaki ekran
          görünmez kalır ve tasarımdaki katman etkisi kaybolur). Karartmaya dokunmak kapatır. */}
      {sheetOpen ? (
      <View style={s.overlay} pointerEvents="box-none">
        <Pressable
          style={s.scrim}
          onPress={() => setSheetOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
        />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 26 }]}>
          <View style={s.grab} />
          <AppText variant="h2">{t("del.sheetTitle")}</AppText>
          <AppText variant="body">
            {t("del.confirmLabel", { word: confirmWord })}
          </AppText>
          <Input
            value={typed}
            onChangeText={setTyped}
            accessibilityLabel={t("del.confirmText")}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <AppText variant="muted">{t("del.appleNote")}</AppText>
          {error ? (
            <AppText variant="muted" style={s.error}>
              {t(error)}
            </AppText>
          ) : null}
          <View style={s.row}>
            <Button
              kind="ghost"
              title={t("common.cancel")}
              onPress={() => setSheetOpen(false)}
              style={s.half}
            />
            <Button
              kind="danger"
              title={t("del.submit")}
              disabled={!canDelete || busy}
              onPress={() => void remove()}
              style={s.half}
            />
          </View>
        </View>
      </View>
      ) : null}
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={s.li}>
      <AppText variant="body" style={s.muted}>
        {"•"}
      </AppText>
      <AppText variant="body" style={s.liText}>
        {children}
      </AppText>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, gap: 12, paddingTop: 4, paddingBottom: 24 },
  title: { fontSize: 28, lineHeight: 32 },
  muted: { color: colors.ink2 },
  list: { gap: 6 },
  li: { flexDirection: "row", gap: 8 },
  liText: { flex: 1 },
  logout: { alignSelf: "flex-start", width: undefined, paddingHorizontal: 18 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 8 },
  error: { color: colors.flameDeep },
  overlay: { position: "absolute", inset: 0, justifyContent: "flex-end" },
  scrim: { position: "absolute", inset: 0, backgroundColor: "rgba(39,32,59,0.42)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    gap: 12,
  },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line2, alignSelf: "center" },
  row: { flexDirection: "row", gap: 8 },
  half: { flex: 1, width: undefined },
});
