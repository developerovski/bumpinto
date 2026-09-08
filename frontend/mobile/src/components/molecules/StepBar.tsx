import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { colors } from "../../theme";
import { AppText } from "../atoms";

/**
 * Artboard `.f-steps` — dört adımlı ilerleme şeridi (Lobi/Bekle). Numara YOK: "Kimler var"
 * bloğunun içinde, ilerleme çubuğunun ALTINDA duran düz bir metin dizisi.
 *
 * Geçilmiş adımlar da koyu; "nerede olduğumuz" yalnız KALINLIKLA ayrılır.
 */
const STEPS = ["locations", "venues", "vote", "decide"] as const;
export type Step = (typeof STEPS)[number];

export default function StepBar({ current }: { current: Step }) {
  const { t } = useTranslation();
  const at = STEPS.indexOf(current);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t("steps.aria")}
      accessibilityValue={{ min: 1, max: STEPS.length, now: at + 1, text: t(`steps.${current}`) }}
      style={s.row}
    >
      {STEPS.map((step, i) => (
        <View key={step} style={s.item}>
          <AppText
            variant="muted"
            style={[s.label, i === at ? s.now : i < at ? s.done : null]}
          >
            {t(`steps.${step}`)}
          </AppText>
          {i < STEPS.length - 1 ? <View style={s.tick} /> : null}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 12 },
  done: { color: colors.ink },
  now: { color: colors.ink, fontWeight: "700" },
  tick: { width: 12, height: 1, backgroundColor: colors.line2 },
});
