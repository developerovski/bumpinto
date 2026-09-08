import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "../../theme";
import { AppText } from "../atoms";

/**
 * İzin ön-bilgilendirmelerindeki (O3/O7) gerekçe satırı — `native.css` `.why`.
 *
 * İkon ÇAĞIRAN tarafından verilir (ada göre dinamik çözüm yapılmaz): `phosphor-react-native`
 * ağaç sarsmayı ad üzerinden çözülen erişimde kaybeder, bundle'a tüm ikon seti girer.
 */
export default function Reason(p: { icon: ReactNode; title: string; note?: string }) {
  return (
    <View style={s.row}>
      <View style={s.icon}>{p.icon}</View>
      <View style={s.text}>
        <AppText variant="h3">{p.title}</AppText>
        {p.note ? <AppText variant="muted">{p.note}</AppText> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  icon: { width: 24, alignItems: "center", paddingTop: 1 },
  text: { flex: 1, gap: 2 },
});

export const REASON_ICON_COLOR = colors.flameDeep;
