import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { colors, fonts } from "../../theme";
import AppText from "./AppText";

/**
 * Artboard `.wm` — gradyan iğne + "BumpInto". Kök ekranın ilk öğesi; web `Wordmark`
 * atomunun birebir karşılığı (aynı ölçü, aynı gradyan, aynı sivri köşe).
 *
 * İğne: 14px kare, 45° döndürülmüş, üç köşesi yuvarlak biri sivri — döndürülünce
 * sivri uç aşağı bakar ve harita iğnesi silüeti çıkar.
 */
export default function Wordmark() {
  const { t } = useTranslation();
  return (
    <View style={s.row}>
      <LinearGradient
        colors={[colors.flame, colors.flame2]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={s.pin}
      />
      <AppText style={s.text}>{t("common.wordmark")}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  pin: {
    width: 14,
    height: 14,
    transform: [{ rotate: "45deg" }],
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    borderBottomLeftRadius: 2,
  },
  text: { fontFamily: fonts.head, fontSize: 19, letterSpacing: -0.19, color: colors.ink },
});
