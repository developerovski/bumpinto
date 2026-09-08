import { CaretLeftIcon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, space } from "../../theme";
import { AppText, IconButton } from "../atoms";

/** Alt ekranların üst çubuğu: geri düğmesi + başlık + isteğe bağlı sağ eylem. */
export default function ScreenHeader(p: {
  title: string;
  backLabel: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingTop: insets.top + 8 }]}>
      <IconButton
        label={p.backLabel}
        onPress={p.onBack}
        kind="ghost"
        icon={<CaretLeftIcon size={20} color={colors.ink} weight="bold" />}
      />
      <AppText variant="h2" style={s.title}>
        {p.title}
      </AppText>
      <View style={s.right}>{p.right}</View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.screenX,
    paddingBottom: 10,
    gap: 8,
  },
  title: { flex: 1, textAlign: "center" },
  right: { width: 40, alignItems: "flex-end" },
});
