import { MODE_LABEL_KEY, TRAVEL_MODES, type TravelMode } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { MODE_ICON } from "../../icons";
import { colors } from "../../theme";
import { AppText, Segmented, type SegmentedOption } from "../atoms";

/**
 * Artboard P3/P5/P8 `.seg.f-seg.icn` — beş ulaşım türü, YALNIZ ikon; seçilinin adı altta
 * yazıyla söylenir (`travelMode.selected`). İkonun tek başına anlam taşıması yeterli değil,
 * ama beş etiketi yan yana basmak 390'da satırı taşırıyor.
 *
 * EBIKE iki glif basar (bisiklet + 9px şimşek) — `MODE_ICON` bu yüzden DİZİ döner.
 */
export default function TravelModeField(p: {
  value: TravelMode;
  onChange: (m: TravelMode) => void;
  /** Başlık gizlenebilir: P5'te alan bir kartın içinde, kendi başlığı yok. */
  label?: string | null;
}) {
  const { t } = useTranslation();

  const options: SegmentedOption<TravelMode>[] = TRAVEL_MODES.map((mode) => ({
    value: mode,
    label: t(MODE_LABEL_KEY[mode].name),
    icon: (
      <View style={s.icons}>
        {MODE_ICON[mode].map((Icon, i) => (
          <Icon
            key={i}
            size={MODE_ICON[mode].length > 1 && i > 0 ? 9 : 18}
            color={mode === p.value ? colors.ink : colors.ink2}
          />
        ))}
      </View>
    ),
  }));

  return (
    <View style={s.field}>
      {p.label === null ? null : (
        <AppText variant="label" style={s.label}>
          {p.label ?? t("travelMode.question")}
        </AppText>
      )}
      {/* `iconOnly`: etiket erişilebilirlik adı olarak KALIR, ekranda çizilmez. */}
      <Segmented options={options} value={p.value} onChange={p.onChange} iconOnly />
      <AppText variant="muted">
        {t("travelMode.selected", { mode: t(MODE_LABEL_KEY[p.value].name) })}
      </AppText>
    </View>
  );
}

const s = StyleSheet.create({
  field: { gap: 8 },
  label: { fontWeight: "600" },
  icons: { flexDirection: "row", alignItems: "center", gap: 1 },
});
