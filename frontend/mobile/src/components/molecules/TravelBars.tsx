import { fairnessLine, fairnessOf, type FairnessVenue, type TravelInfo } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { colors, radius } from "../../theme";
import { AppText } from "../atoms";
import { FairnessNote } from "./RangeBar";

/**
 * Artboard `.tb` (P14 deste kartı, P20 karar kartı) — kişi başı yol çubuğu.
 *
 * Dar liste satırında DEĞİL (orada `RangeBar`): kart yüzeyinde yatay yer var, herkes ayrı
 * satır alır. Web `TravelBars` ile AYNI gövde — satır sırası, çubuk oranı ve alt cümle
 * birebir; iki istemci aynı mekanı aynı biçimde anlatmak zorunda.
 *
 * **Rozet çorbası yasak:** kişi başı "▲" rozeti yok; en uzun yol yalnız çubuğun RENGİYLE ve
 * alt satırdaki cümleyle söylenir.
 */
export default function TravelBars(p: {
  venue: FairnessVenue;
  travel: TravelInfo;
  /** Kart içinde üstlük (ör. "Herkesin yolu"); deste kartında verilmez. */
  title?: string;
  /** Adalet baş cümlesi başlık satırında rozet olarak basıldıysa alt satır onu TEKRAR ETMEZ —
      yalnız olgu kalır ("fark 10 dk · en uzun yol Kerem"). Aynı hesabın iki sunumu. */
  hideLead?: boolean;
  /** Adalet satırının tamamı. Karar ekranının `.tb` kartı YALNIZ çubukları taşır — cümle orada
      imza kartının altbilgisinde yaşar, iki yüzey birden basınca ekranda iki kez görünürdü. */
  note?: boolean;
}) {
  const { t } = useTranslation();
  const f = fairnessOf(p.venue);
  if (!f || f.entries.length === 0) return null;

  // Kendi satırın en üstte; kalanlar `fairnessOf` sırasında (en uzun yol önce) — kararlı.
  const rows = [...f.entries].sort(
    (a, b) => Number(b.id === p.travel.selfId) - Number(a.id === p.travel.selfId),
  );
  const full = fairnessLine(f, p.travel, t);
  const line = p.hideLead ? { ...full, lead: null, leadTone: null } : full;

  return (
    <View style={s.wrap}>
      {p.title ? <AppText variant="over">{p.title}</AppText> : null}
      {rows.map((e) => (
        <View key={e.id} style={s.row}>
          <AppText variant="num" numberOfLines={1} style={s.name}>
            {p.travel.labels[e.id] ?? t("travel.friend")}
          </AppText>
          <View style={s.track}>
            <View
              testID={`travel-fill-${e.id}`}
              style={[
                s.fill,
                {
                  // Sıfıra yakın dakikalarda bile çubuk GÖRÜNÜR kalsın diye %8 taban.
                  width: `${Math.max(8, Math.round((e.minutes / (f.max || e.minutes)) * 88))}%`,
                  backgroundColor: e.id === f.longestId ? colors.flame : colors.grass,
                },
              ]}
            />
          </View>
          <AppText variant="num" style={s.minutes}>
            {t("travel.min", { min: e.minutes })}
          </AppText>
        </View>
      ))}
      {p.note !== false ? <FairnessNote line={line} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 5 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { width: 56, color: colors.ink, fontWeight: "700" },
  track: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: "hidden" },
  fill: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: radius.pill },
  minutes: { width: 48, textAlign: "right", color: colors.ink, fontWeight: "700" },
});
