import type { ParticipantDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { useSocialStore } from "../../store/socialStore";
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
 * "Dürt" YALNIZ KURANA çizilir (M-9). Artboard P10 davetliye de gösteriyordu; W-15 ucu host'a
 * kilitledi ve sözleşme tek uygulamadır — davetli düğme yerine `presence.hostOnly` satırını
 * görür, yoksa sunucunun 403'üne koşan bir düğmeye dokunurdu.
 *
 * Satır ucu BİLMEZ: `socialStore` dürtmenin tek sahibi, buradan yalnız geri çağrı iner.
 */
export default function ParticipantList(p: {
  participants: ParticipantDto[];
  slug: string;
  viewerId?: string;
  anchored?: boolean;
  step: Step;
  /** `SessionView.viewer.host` — dürtme düğmesinin kapısı. */
  host?: boolean;
}) {
  const { t } = useTranslation();
  const nudge = useSocialStore((s) => s.nudge);
  const nudgedAt = useSocialStore((s) => s.nudgedAt);
  const canNudge = useSocialStore((s) => s.canNudge);
  const total = p.participants.length;
  const ready = p.anchored ? total : p.participants.filter((x) => x.hasLocation).length;
  // Çapalı oturumda kimsenin konumu beklenmiyor: dürtecek bir şey de yok.
  const canShowNudge = p.host === true && !p.anchored;
  const waitingCount = p.participants.filter((x) => !x.hasLocation && !x.manual).length;

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
              /* Lobide dürtme KONUMU BEKLENENE aittir: konumunu vermiş kişiye "hadi"
                 demek anlamsız, ekranın beklediği tek şey o konum. */
              onNudge={
                canShowNudge && !person.hasLocation && !person.manual
                  ? (id, name) => void nudge(p.slug, id, name)
                  : undefined
              }
              /* `nudgedAt` okunuyor ki soğuma yazıldığında satır YENİDEN çizilsin —
                 `canNudge` bir seçici değil, saf bir okuma. */
              nudgeDisabled={!!nudgedAt && !canNudge(person.id ?? "")}
            />
          </View>
        ))}
      </Card>

      {/* Davetli görünümü: düğme yerine tek satır açıklama — "neden bende yok" sorusunu
          ekranda yanıtlar (W-15 host kilidi). */}
      {p.host === false && !p.anchored && waitingCount > 0 ? (
        <AppText variant="muted" style={s.hostOnly}>
          {t("presence.hostOnly")}
        </AppText>
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  head: { gap: 8 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  count: { color: colors.ink2 },
  card: { paddingVertical: 2 },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: space.cardX },
  hostOnly: { fontSize: 12 },
});
