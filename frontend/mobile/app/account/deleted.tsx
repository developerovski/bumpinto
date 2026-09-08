import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, HandNote } from "../../src/components/atoms";
import MapMark from "../../src/components/molecules/MapMark";
import { colors, space } from "../../src/theme";

export default function AccountDeletedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 10 }]}>
      <View style={s.body}>
        <MapMark muted />
        <AppText variant="display" style={s.title}>
          {t("del.doneTitle")}
        </AppText>
        <AppText variant="body" style={s.copy}>
          {t("del.doneCopy")}
        </AppText>
        <HandNote>{t("del.doneHand")}</HandNote>
      </View>
      <View style={s.cta}>
        <Button kind="white" title={t("common.close")} onPress={() => router.replace("/")} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 30 },
  title: { fontSize: 26, lineHeight: 30, textAlign: "center" },
  copy: { textAlign: "center", color: colors.ink2 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 8 },
});
