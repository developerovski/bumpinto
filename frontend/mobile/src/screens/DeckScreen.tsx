import { sessionActivities, activityListLabel, type SessionView } from "@bumpinto/shared";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText, Button, HandNote, Progress } from "../components/atoms";
import ScreenHeader from "../components/molecules/ScreenHeader";
import SwipeDeck from "../components/organisms/SwipeDeck";
import { useDeckStore } from "../store/deckStore";
import { useTravelLabels } from "../store/useTravelLabels";
import { colors, space } from "../theme";
import DeckDoneScreen from "./DeckDoneScreen";
import ListScreen from "./ListScreen";

/**
 * Artboard P14 — deste. Kaydır, damgala, geri al.
 *
 * Üç dal TEK ekranda yaşar çünkü üçü de AYNI deste durumunu paylaşır: kaydırma yüzeyi,
 * liste kipi (P16) ve deste bitti (P15). Ayrı rotalara bölünseydi her geçişte `deckStore`
 * yeniden kurulur ve ilerleme kaybolurdu.
 *
 * `start` yalnız slug ya da mekan KİMLİKLERİ değişince koşar: `useSessionLive` 3 saniyede bir
 * aynı desteyi getiriyor ve her turda sıfırlansaydı kullanıcı ilk karta geri düşerdi.
 */
export default function DeckScreen({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const travel = useTravelLabels(view);

  const slug = view.slug ?? "";
  const venues = view.venues ?? [];
  const signature = venues.map((v) => v.id ?? "").join("|");

  const start = useDeckStore((s) => s.start);
  const index = useDeckStore((s) => s.index);
  const liked = useDeckStore((s) => s.liked);
  const listMode = useDeckStore((s) => s.listMode);
  const history = useDeckStore((s) => s.history);
  const decide = useDeckStore((s) => s.decide);
  const undo = useDeckStore((s) => s.undo);
  const setListMode = useDeckStore((s) => s.setListMode);

  // Efekt yalnız İMZAYA bağlı; `venues` referansı her çizimde yenilenir (canlı sorgu her
  // turda yeni bir dizi getiriyor) ve doğrudan bağımlılığa konsaydı deste sürekli sıfırlanır,
  // kullanıcı ilk karta geri düşerdi. Güncel dizi bir ref'te taşınır — ref ÇİZİM SIRASINDA
  // değil ayrı bir efektte yazılır (React Compiler kuralı: `react-hooks/refs`).
  const venuesRef = useRef(venues);
  useEffect(() => {
    venuesRef.current = venues;
  });
  useEffect(() => {
    if (slug) start(slug, venuesRef.current);
  }, [slug, signature, start]);

  const title = view.name || activityListLabel(sessionActivities(view), t, i18n.resolvedLanguage ?? "tr");

  if (listMode) return <ListScreen view={view} />;
  if (venues.length > 0 && index >= venues.length) return <DeckDoneScreen view={view} />;

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={title}
        backLabel={t("shell.sessions")}
        onBack={() => router.replace("/sessions")}
      />

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <View style={s.meta}>
          <AppText variant="num" style={s.count}>
            {`${t("deck.cardsOf", { current: Math.min(index + 1, venues.length), total: venues.length })} · ${t("deck.likesN", { count: liked.length })}`}
          </AppText>
          <Button
            small
            kind="ghost"
            title={t("deck.seeAll")}
            onPress={() => setListMode(true)}
            style={s.seeAll}
          />
        </View>

        <Progress value={venues.length ? index / venues.length : 0} label={title} />

        <SwipeDeck
          venues={venues}
          index={index}
          travel={travel}
          categories={venues.map((v) => v.category ?? "")}
          canUndo={history.length > 0}
          onDecide={(dir) => void decide(dir)}
          onUndo={() => void undo()}
        />

        <HandNote style={s.hand}>{t("deck.swipeHand")}</HandNote>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 40, gap: space.gap },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  count: { flex: 1, color: colors.ink2 },
  seeAll: { width: "auto", flexShrink: 0, paddingHorizontal: 12 },
  hand: { alignSelf: "center" },
});
