import "../src/i18n";

import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { Caveat_600SemiBold } from "@expo-google-fonts/caveat";
import { Figtree_400Regular, Figtree_600SemiBold, useFonts } from "@expo-google-fonts/figtree";
import { Stack, router, usePathname } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthStore } from "../src/store/authStore";
import { colors } from "../src/theme";

/**
 * ANONİM rotalar — oturum muhafızı bunları ASLA yönlendirmez.
 *
 * `/account/legal/*`: giriş ekranındaki (O2) "Kullanım şartları" / "Gizlilik politikası"
 * bağlantıları buraya gider; mağaza incelemesi bunları hesapsız açabilmeli (Apple 5.1.1).
 * `/account/deleted`: buraya gelindiğinde token ZATEN silinmiştir; muhafız çalışsaydı
 * kullanıcı onayı görmeden giriş ekranına düşerdi (O17).
 * `/j/*`: davet linkiyle gelen misafir (M-7) — hesapsız katılır.
 * `/`: giriş ekranı. TAM eşleşmedir; ön ek olarak değerlendirilseydi her yol anonim olurdu.
 *
 * Bu liste muhafızın TEK kaynağıdır; `src/__tests__/anonymousRoutes.test.ts` korur.
 */
export const ANONYMOUS_ROUTES = [
  "/", // giriş ekranının KENDİSİ — ön ek olarak yazılamaz, her yola uyardı
  "/account/legal/",
  "/account/deleted",
  "/j/",
] as const;

export const isAnonymousRoute = (path: string): boolean =>
  ANONYMOUS_ROUTES.some((route) => (route === "/" ? path === "/" : path.startsWith(route)));

/**
 * Kök yerleşim — tek stack (alt sekme yok).
 * Alt sayfalar `app/(sheets)` grubunda modal olarak sunulur (M-7'den itibaren doldurulur).
 * i18n fontlardan ÖNCE içe aktarılır: ilk kare çizilirken çeviriler hazır olsun.
 */
/**
 * Oturum muhafızı. Hesap ekranları (Hesap ve veriler, açık rıza, hesabı sil) oturum İSTER:
 * derin linkle ya da geri yığınından anonim erişilebiliyorlardı ve "Hesabı sil" satırı
 * girişsiz görünüyordu (2026-09-08 emülatörde görüldü).
 *
 * `restore()` KÖKTE çağrılır, giriş ekranında değil: derin linkle doğrudan `/account`'a
 * gelindiğinde giriş ekranı hiç kurulmaz, oturum durumu `unknown`ta kalır ve muhafız
 * hiç çalışmazdı.
 */
function AuthGuard() {
  const status = useAuthStore((s) => s.status);
  const restore = useAuthStore((s) => s.restore);
  const pathname = usePathname();

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    // `unknown`/`busy` sırasında YÖNLENDİRME YOK: token okunmadan atmak, açılışta
    // oturumu olan kullanıcıyı da giriş ekranına düşürürdü.
    if (status === "out" && !isAnonymousRoute(pathname)) router.replace("/");
  }, [status, pathname]);

  return null;
}

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
        <AuthGuard />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
        >
          <Stack.Screen name="(sheets)" options={{ presentation: "modal" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
