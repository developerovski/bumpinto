import "../src/i18n";

import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { Caveat_600SemiBold } from "@expo-google-fonts/caveat";
import { Figtree_400Regular, Figtree_600SemiBold, useFonts } from "@expo-google-fonts/figtree";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "../src/theme";

/**
 * ANONİM rotalar — oturum muhafızı (M-7 ekleyecek) bunları ASLA yönlendirmemelidir.
 *
 * `/account/legal/*`: giriş ekranındaki (O2) "Kullanım şartları" / "Gizlilik politikası"
 * bağlantıları buraya gider; mağaza incelemesi bunları hesapsız açabilmeli (Apple 5.1.1).
 * `/account/deleted`: buraya gelindiğinde token ZATEN silinmiştir; muhafız çalışsaydı
 * kullanıcı onayı görmeden giriş ekranına düşerdi (O17).
 * `/j/*`: davet linkiyle gelen misafir (M-7) — hesapsız katılır.
 *
 * Muhafız yazılırken bu liste TEK kaynaktır; `src/__tests__/anonymousRoutes.test.ts` korur.
 */
export const ANONYMOUS_ROUTES = [
  "/account/legal/",
  "/account/deleted",
  "/j/",
] as const;

export const isAnonymousRoute = (path: string): boolean =>
  ANONYMOUS_ROUTES.some((prefix) => path.startsWith(prefix));

/**
 * Kök yerleşim — tek stack (alt sekme yok).
 * Alt sayfalar `app/(sheets)` grubunda modal olarak sunulur (M-7'den itibaren doldurulur).
 * i18n fontlardan ÖNCE içe aktarılır: ilk kare çizilirken çeviriler hazır olsun.
 */
export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_600SemiBold,
    Caveat_600SemiBold,
  });
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
        >
          <Stack.Screen name="(sheets)" options={{ presentation: "modal" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
