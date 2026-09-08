import { Stack } from "expo-router";

import { colors } from "../../src/theme";

export default function SheetsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_bottom",
        contentStyle: { backgroundColor: colors.paper },
      }}
    />
  );
}
