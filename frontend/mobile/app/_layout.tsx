import { Stack } from "expo-router";

/**
 * Kök yerleşim — T1 iskeleti.
 * Gerçek gövde (SafeAreaProvider, GestureHandlerRootView, font yüklemesi, i18n) M-4:T3/T7'de gelir.
 */
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
