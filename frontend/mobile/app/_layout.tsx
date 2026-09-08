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

export const ANONYMOUS_ROUTES = [
  "/", // giriş ekranının KENDİSİ — ön ek olarak yazılamaz, her yola uyardı
  "/account/legal/",
  "/account/deleted",
  "/j/",
  "/s/",
  // İzin ön-ekranları hesap yüzeyi DEĞİL, yetenek sorusudur: davet linkiyle gelen misafir
  // (M-7) hesapsız katılır ama konumunu vermesi, sesli sohbete girmesi gerekir.
  "/location-consent",
  "/mic-consent",
  "/location-mode",
] as const;

export const isAnonymousRoute = (path: string): boolean =>
  ANONYMOUS_ROUTES.some((route) => (route === "/" ? path === "/" : path.startsWith(route)));

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
          {/* Alt sayfalar AŞAĞIDAN YUKARI açılır. Android'de `presentation: "modal"` tek
              başına yatay/soluklaşan varsayılan geçişi bırakıyor — "alt sayfa" hissi ancak
              hareket yönüyle kuruluyor, bu yüzden animasyon AÇIKÇA verilir. */}
          <Stack.Screen
            name="(sheets)"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
