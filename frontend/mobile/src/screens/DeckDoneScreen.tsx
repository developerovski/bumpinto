import type { SessionView } from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Card, Sticker } from "../components/atoms";
import Attribution from "../components/molecules/Attribution";
import VenueRow from "../components/molecules/VenueRow";
import { useDeckStore } from "../store/deckStore";
import { useSessionStore } from "../store/sessionStore";
import { useTravelLabels } from "../store/useTravelLabels";
import { colors, space } from "../theme";

/**
 * Artboard P15 — deste bitti. "Beğenilerin BAĞLAYICI DEĞİL" sözü burada verilir: kullanıcı
 * listeye dönüp düzeltebilir, gönderene kadar hiçbir şey karşı tarafa geçmez.
 *
 * Hiç beğeni yoksa akış TIKANMAZ: amber uyarı + "Yine de gönder". Kullanıcıyı kendi
 * kararını değiştirmeye zorlamak (CTA'yı kapatmak) ürünün dil kurallarına aykırı — ama
 * sonucun boş kalabileceği AÇIKÇA söylenir.
 */
export default function DeckDoneScreen({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const travel = useTravelLabels(view);
  const loadView = useSessionStore((s) => s.loadView);

  const liked = useDeckStore((s) => s.liked);
  const venues = useDeckStore((s) => s.venues);
  const sending = useDeckStore((s) => s.sending);
  const send = useDeckStore((s) => s.send);
  const setListMode = useDeckStore((s) => s.setListMode);

  const [error, setError] = useState<string | null>(null);

  const slug = view.slug ?? "";
  const likedVenues = venues.filter((v) => v.id && liked.includes(v.id));
  const empty = liked.length === 0;

  async function submit() {
    setError(null);
    try {
      await send();
      // Gönderim sonrası ekranı DEĞİŞTİREN şey `viewer.deckDone`; onu sunucu söyler.
      // Beklemeden yerel bir "gönderildi" bayrağı çizmek yalancı bir ekran olurdu.
      await loadView(slug);
    } catch {
      setError("deck.errSend");
    }
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 18 }]} showsVerticalScrollIndicator={false}>
        <Card style={s.hero}>
          <Sticker style={s.sticker}>{t("deck.finishedSticker")}</Sticker>
          <AppText variant="h1" style={s.heroTitle}>
            <Trans
              i18nKey="deck.likedTitle"
              count={liked.length}
              components={[<AppText key="0" variant="h1" style={s.emph} />]}
            />
          </AppText>
          <AppText variant="muted">{t("deck.likedNote")}</AppText>
        </Card>

        {empty ? (
          <Card tone="amber" style={s.warn}>
            <AppText variant="body" style={s.warnText}>
              {t("deck.emptyWarn")}
            </AppText>
          </Card>
        ) : (
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
              <Attribution providers={likedVenues.map((v) => v.provider ?? "")} />
            </View>
          </Card>
        )}
      </ScrollView>

      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + 106 }]}
        pointerEvents="none"
      />

      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          title={t(empty ? "deck.sendAnyway" : "deck.send")}
          disabled={sending}
          onPress={() => void submit()}
        />
        <Button kind="ghost" small title={t("deck.backToList")} onPress={() => setListMode(true)} />
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
  page: { paddingHorizontal: space.screenX, paddingBottom: 140, gap: space.gap },
  hero: { gap: 8, paddingTop: 26 },
  sticker: { position: "absolute", top: -12, right: 14 },
  heroTitle: { paddingRight: 40 },
  emph: { color: colors.flameDeep },
  warn: { gap: 6 },
  warnText: { color: colors.amberInk },
  listHead: { paddingHorizontal: 14, paddingTop: 12 },
  attr: { paddingHorizontal: 14, paddingBottom: 12 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, gap: 4, backgroundColor: colors.paper },
  error: { textAlign: "center", color: colors.flameDeep, fontWeight: "600" },
});
