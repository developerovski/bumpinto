import type { SessionView } from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Card } from "../components/atoms";
import Attribution from "../components/molecules/Attribution";
import ScreenHeader from "../components/molecules/ScreenHeader";
import VenueRow from "../components/molecules/VenueRow";
import { useDeckStore } from "../store/deckStore";
import { useSessionStore } from "../store/sessionStore";
import { useTravelLabels } from "../store/useTravelLabels";
import { colors, space } from "../theme";

/**
 * Artboard P16 — liste kipi. Kaydırmanın ALTERNATİFİ, devamı değil: aynı kararlar burada
 * işaretlenerek verilir ve `deckStore` aynı `liked` dizisini tutar.
 *
 * Az sonuçta (6'nın altında) deste yerine BURASI açılır — dört kartlık bir yığını kaydırmak
 * gösterişten ibaret. Ayrıca kaydırma ince motor beceri isteyen bir jest; listeyi her zaman
 * ulaşılabilir tutmak erişilebilirlik gereği.
 */
export default function ListScreen({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const travel = useTravelLabels(view);
  const loadView = useSessionStore((s) => s.loadView);

  const venues = useDeckStore((s) => s.venues);
  const liked = useDeckStore((s) => s.liked);
  const sending = useDeckStore((s) => s.sending);
  const setLike = useDeckStore((s) => s.setLike);
  const setListMode = useDeckStore((s) => s.setListMode);
  const send = useDeckStore((s) => s.send);

  const [error, setError] = useState<string | null>(null);
  const slug = view.slug ?? "";
  const categories = venues.map((v) => v.category ?? "");

  async function submit() {
    setError(null);
    try {
      await send();
      await loadView(slug);
    } catch {
      setError("deck.errSend");
    }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={t("deck.listTitle")}
        backLabel={t("deck.backToDeck")}
        onBack={() => setListMode(false)}
      />

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <AppText variant="num" style={s.meta}>
          {`${t("deck.likedN", { count: venues.length })} · ${t("deck.likesN", { count: liked.length })}`}
        </AppText>

        <Card padded={false}>
          {venues.map((venue) => (
            <VenueRow
              key={venue.id}
              venue={venue}
              travel={travel}
              midpointLabel={view.midpointLabel}
              categories={categories}
              checked={!!venue.id && liked.includes(venue.id)}
              onToggle={
                venue.id
                  ? () => void setLike(venue.id!, !liked.includes(venue.id!))
                  : undefined
              }
            />
          ))}
          <View style={s.attr}>
            <Attribution providers={venues.map((v) => v.provider ?? "")} />
          </View>
        </Card>
      </ScrollView>

      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + 84 }]}
        pointerEvents="none"
      />

      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        <Button title={t("deck.send")} disabled={sending} onPress={() => void submit()} />
        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 110, gap: space.gap },
  meta: { color: colors.ink2 },
  attr: { paddingHorizontal: 14, paddingBottom: 12 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, gap: 6, backgroundColor: colors.paper },
  error: { textAlign: "center", color: colors.flameDeep, fontWeight: "600" },
});
