import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { useConfigStore } from "../../store/configStore";
import { colors } from "../../theme";
import { AppText } from "../atoms";

/**
 * Artboard `.f-attrs` — mekan verisi olan HER ekranda ZORUNLU (GUIDE kural 8): Foursquare
 * "Powered by", OSM/Overture ODbL 1.0 ve Google Ek Hizmet Şartları atıf yükümlülüğü taşır;
 * kaldırmak lisans ihlali VE mağaza reddi sebebidir.
 *
 * VERİ-GÜDÜMLÜ (spec §11): ekrandaki sağlayıcı kimlikleri `/api/config.sources[]` ile eşleşir,
 * metin i18n anahtarından gelir. Sağlayıcı başına kod dalı YOK — yeni bir kaynak eklendiğinde
 * istemci değişmez.
 *
 * Config gelmeden HİÇ basılmaz: yanlış atıf basmaktansa hiç basmamak doğru.
 */
export default function Attribution({ providers }: { providers: string[] }) {
  const { t } = useTranslation();
  const config = useConfigStore((s) => s.config);
  if (!config) return null;

  const ids = new Set(providers.filter(Boolean).map((p) => p.toLowerCase()));
  const lines = config.sources.filter((s) => ids.has(s.id.toLowerCase()));
  if (lines.length === 0) return null;

  return (
    <View style={s.row}>
      {lines.map((source) => (
        <AppText key={source.id} variant="muted" style={s.text}>
          {t(source.attributionKey)}
        </AppText>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16, paddingTop: 6 },
  text: { fontSize: 11, color: colors.ink2, letterSpacing: 0.02 },
});
