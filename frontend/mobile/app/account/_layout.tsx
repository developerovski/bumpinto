import { Stack } from "expo-router";

import { colors } from "../../src/theme";

export default function AccountLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
  );
}
