import { Stack } from "expo-router";

import { colors } from "../../src/theme";

/**
 * Hesap ve yasal ekranları — tek stack. Üst çubuk her ekranın kendi `ScreenHeader`'ıdır
 * (GUIDE md.12), bu yüzden yerleşim başlığı kapatır.
 *
 * Bu grup oturum MUHAFIZININ DIŞINDADIR: yasal okuyucular giriş ekranından (O2) anonim
 * açılır, `/account/deleted` ise oturum kapandıktan SONRA gösterilir.
 */
export default function AccountLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
  );
}
