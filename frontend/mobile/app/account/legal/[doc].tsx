import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowSquareOutIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, IconButton } from "../../../src/components/atoms";
import { ScreenHeader } from "../../../src/components/molecules";
import { LegalReader } from "../../../src/components/organisms";
import { isLegalKey, legalDoc } from "../../../src/content/legal";
import { webBase } from "../../../src/lib/api";
import { colors, space } from "../../../src/theme";

/**
 * Uygulama içi yasal okuyucu (R-M4). Rota oturum MUHAFIZININ DIŞINDADIR: giriş ekranındaki
 * (O2) "Kullanım şartları" ve "Gizlilik politikası" bağlantıları anonim açılır.
 *
 * "Tarayıcıda aç" mağazaya verilen W-14 URL'sine gider: uygulama içi metinle web metni
 * aynı kaynaktan geldiği için ikisi ayrışamaz, denetimde tek belge görünür.
 */
export default function LegalDocScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!doc || !isLegalKey(doc)) return <Redirect href="/account" />;

  const language = i18n.resolvedLanguage ?? i18n.language;
  const item = legalDoc(doc, t, language, webBase);
  const date = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(item.updated));

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={item.title}
        backLabel={t("common.back")}
        onBack={() => router.back()}
        right={
          <IconButton
            label={t("legal.openInBrowser")}
            kind="ghost"
            onPress={() => void WebBrowser.openBrowserAsync(item.url)}
            icon={<ArrowSquareOutIcon size={18} color={colors.ink} />}
          />
        }
      />
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 28 }]}>
        <AppText variant="muted">
          {t("legal.updated", { date, version: item.version })}
        </AppText>
        <LegalReader blocks={item.blocks} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, gap: 12, paddingTop: 4 },
});
