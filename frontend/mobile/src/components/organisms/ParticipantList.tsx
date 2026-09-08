import type { ParticipantDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { colors, space } from "../../theme";
import { AppText, Card, Progress } from "../atoms";
import ParticipantRow from "../molecules/ParticipantRow";
import StepBar, { type Step } from "../molecules/StepBar";

/**
 * Artboard P6/P7/P10 "Kimler var" bloğu: üstlük + hazır sayacı + ilerleme çubuğu + adım
 * şeridi, altında satır kartı. Lobi ve Bekle AYNI bloğu basar.
 *
 * ÇAPALI oturumda konum beklenmiyor: herkes hazır sayılır ve çubuk %100 olur
 * (artboard P7 "1 / 1").
 *
 * "Dürt" düğmesi ÇİZİLMEZ (K-M4): uç var ama presence 2.0 (soğuma, `nudged` olayı, haptik)
 * M-9'un işi; yarım bir dürtme yüzeyi kullanıcıya sessizce başarısız olan bir düğme verir.
 */
export default function ParticipantList(p: {
  participants: ParticipantDto[];
  slug: string;
  viewerId?: string;
  anchored?: boolean;
  step: Step;
}) {
  const { t } = useTranslation();
  const total = p.participants.length;
  const ready = p.anchored ? total : p.participants.filter((x) => x.hasLocation).length;

  return (
    <>
      <View style={s.head}>
        <View style={s.headRow}>
          <AppText variant="over">{t("waiting.who")}</AppText>
          <AppText variant="num" style={s.count}>
            {t("waiting.readyCount", { ready, total })}
          </AppText>
        </View>
        <Progress value={ready / Math.max(total, 1)} label={t("waiting.who")} />
        <StepBar current={p.step} />
      </View>

      <Card padded={false} style={s.card}>
        {p.participants.map((person, i) => (
          <View key={person.id ?? i}>
            {i > 0 ? <View style={s.divider} /> : null}
            {/* Kimlik SUNUCUNUN viewer alanından — ad eşlemesi yapılmaz. */}
            <ParticipantRow
              participant={person}
              slug={p.slug}
              index={i}
              self={!!p.viewerId && p.viewerId === person.id}
              anchored={p.anchored}
            />
          </View>
        ))}
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  head: { gap: 8 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  count: { color: colors.ink2 },
  card: { paddingVertical: 2 },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: space.cardX },
});
