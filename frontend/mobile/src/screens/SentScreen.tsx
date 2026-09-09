import { attributionProviders, votersOf, type SessionView } from "@bumpinto/shared";
import { LockSimpleIcon } from "phosphor-react-native";
import { Trans, useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Badge, Card, Progress } from "../components/atoms";
import Attribution from "../components/molecules/Attribution";
import ParticipantRow from "../components/molecules/ParticipantRow";
import StepBar from "../components/molecules/StepBar";
import VenueRow from "../components/molecules/VenueRow";
import VoiceDockSlot from "../components/organisms/VoiceDockSlot";
import { useDeckStore } from "../store/deckStore";
import { useSocialStore } from "../store/socialStore";
import { useTravelLabels } from "../store/useTravelLabels";
import { colors, space } from "../theme";

/**
 * Artboard P17 — beğeniler gönderildi, diğerleri bekleniyor.
 *
 * "Dürt" burada DESTEYİ BİTİRMEYENE aittir (M-9): bu ekranda beklenen tek şey diğerlerinin
 * kaydırmayı bitirmesi. Lobideki dürtme konum bekleyene gider — aynı uç, farklı kapı.
 * Düğme YALNIZ kurana çizilir (W-15 host kilidi).
 *
 * Kişi başı kaydırma İLERLEMESİ gösterilmez: sözleşmede `deckDone` var, "kaç kart kaldı"
 * YOK. Uydurma bir yüzde çizmektense grubun toplam ilerlemesi gösterilir (alan icat edilmez).
 */
export default function SentScreen({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const travel = useTravelLabels(view);

  const liked = useDeckStore((s) => s.liked);
  const venues = useDeckStore((s) => s.venues);
  const nudge = useSocialStore((s) => s.nudge);
  const nudgedAt = useSocialStore((s) => s.nudgedAt);
  const canNudge = useSocialStore((s) => s.canNudge);
  const isHost = view.viewer?.host === true;

  const participants = view.participants ?? [];
  const voters = votersOf(participants);
  const done = voters.filter((p) => p.deckDone).length;
  const allDone = voters.length > 0 && done === voters.length;
  // Başlıkta TEK isim: "Ayşe, Kerem ve Mehmet kaydırıyor" satırı 390'da taşıyor.
  const waiting = voters.find((p) => !p.deckDone);
  const likedVenues = venues.filter((v) => v.id && liked.includes(v.id));

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.badgeRow}>
          <Badge tone="grass" icon={<LockSimpleIcon size={13} color={colors.grass} weight="fill" />}>
            {t("deck.sentBadge")}
          </Badge>
        </View>

        <AppText variant="h1">
          {allDone ? (
            t("deck.sentTitleAllDone")
          ) : (
            <Trans
              i18nKey="deck.sentTitleWaiting"
              values={{ name: waiting?.displayName ?? t("travel.friend") }}
              components={[<AppText key="0" variant="h1" style={s.emph} />]}
            />
          )}
        </AppText>
        <AppText variant="muted">{t("deck.sentCopy")}</AppText>

        <Card style={s.progress}>
          <AppText variant="over">{t("deck.whoWhere")}</AppText>
          <Progress
            value={voters.length ? done / voters.length : 0}
            label={t("deck.doneCount", { done, total: voters.length })}
          />
          <AppText variant="num" style={s.count}>
            {t("deck.doneCount", { done, total: voters.length })}
          </AppText>
          <StepBar current="vote" />
          {participants.map((person, index) => (
            <View key={person.id} style={s.personRow}>
              <View style={s.person}>
                <ParticipantRow
                  participant={person}
                  slug={view.slug}
                  index={index}
                  self={person.id === view.viewer?.participantId}
                  anchored={view.anchored}
                  onNudge={
                    isHost && !person.deckDone
                      ? (id, name) => void nudge(view.slug ?? "", id, name)
                      : undefined
                  }
                  nudgeDisabled={!!nudgedAt && !canNudge(person.id ?? "")}
                />
              </View>
              <Badge tone={person.deckDone ? "grass" : "neutral"}>
                {t(person.deckDone ? "deck.rowDone" : "deck.rowSwiping")}
              </Badge>
            </View>
          ))}
        </Card>

        {likedVenues.length > 0 ? (
          <Card padded={false}>
            <AppText variant="over" style={s.listHead}>
              {t("deck.liked")}
            </AppText>
            {likedVenues.map((venue) => (
              <VenueRow
                key={venue.id}
                venue={venue}
                travel={travel}
                midpointLabel={view.midpointLabel}
                categories={venues.map((v) => v.category ?? "")}
                checked
              />
            ))}
            <View style={s.attr}>
              <Attribution providers={attributionProviders(likedVenues)} />
            </View>
          </Card>
        ) : null}

        <VoiceDockSlot slug={view.slug} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, gap: space.gap },
  badgeRow: { flexDirection: "row" },
  emph: { color: colors.flameDeep },
  progress: { gap: 8 },
  count: { color: colors.ink2 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  person: { flex: 1, minWidth: 0 },
  listHead: { paddingHorizontal: 14, paddingTop: 12 },
  attr: { paddingHorizontal: 14, paddingBottom: 12 },
});
