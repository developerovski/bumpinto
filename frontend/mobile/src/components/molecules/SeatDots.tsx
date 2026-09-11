import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { colors, radius } from "../../theme";
import { AppText } from "../atoms";

/**
 * Keşfet POC `.seat` — dolu yeşil nokta = onaylı koltuk, kesikli boş = boş koltuk.
 * Yazı BOŞ koltuk sayısıdır ("2 yer"); `count={false}` yalnız noktalar (P4 özet kartı).
 */
export default function SeatDots(p: { approved: number; capacity: number; count?: boolean }) {
  const { t } = useTranslation();
  const taken = Math.min(p.approved, p.capacity);
  const free = Math.max(0, p.capacity - p.approved);
  return (
    <View style={s.row}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t("discover.seatsAria", { approved: p.approved, capacity: p.capacity })}
        style={s.dots}
      >
        {Array.from({ length: taken }, (_, i) => (
          <View key={`a${i}`} style={[s.dot, s.taken]} />
        ))}
        {Array.from({ length: free }, (_, i) => (
          <View key={`f${i}`} style={[s.dot, s.free]} />
        ))}
      </View>
      {p.count === false ? null : (
        <AppText variant="num" style={s.count}>
          {t("discover.seats", { count: free })}
        </AppText>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 0 },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  taken: { backgroundColor: colors.grass },
  free: { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.lineIn },
  count: { fontWeight: "700" },
});
