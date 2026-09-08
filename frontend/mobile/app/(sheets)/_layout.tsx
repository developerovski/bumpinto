import { Stack } from "expo-router";

import { colors } from "../../src/theme";

/**
 * Alt sayfa grubu — kök stack bu grubu `presentation: "modal"` ile sunar.
 * M-7 harita seçicisini, M-8 karar alt sayfalarını buraya ekler.
 */
export default function SheetsLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
    />
  );
}
