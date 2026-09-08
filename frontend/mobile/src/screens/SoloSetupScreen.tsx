import { activityListLabel, sessionActivities, type SessionView, type TravelMode } from "@bumpinto/shared";
import { DEFAULT_TRAVEL_MODE } from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { PlusIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Badge, Button, Card, HandNote, Input } from "../components/atoms";
import {
  MidpointCard,
  ParticipantRow,
  ScreenHeader,
  TravelModeField,
} from "../components/molecules";
import { ACTIVITY_ICON } from "../icons";
import { api } from "../lib/api";
import { useSessionStore } from "../store/sessionStore";
import { colors, space } from "../theme";

/**
 * Artboard P5 · Bireysel kurulum — host konumları ELLE girer, deste ve davet linki yoktur.
 *
 * Çerçeve K-M26: `.top` / `.scroll` / `.cta` KARDEŞ; "Mekanları bul" sabit alt çubukta.
 *
 * Roster ve ekleme kartı sunucu durumundan çizilir (`view.participants`) — istemcide ayrı bir
 * nokta listesi tutulmaz, yoksa iki kaynak ayrışır.
 */
export default function SoloSetupScreen({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const loadView = useSessionStore((s) => s.loadView);

  const [query, setQuery] = useState("");
  const [travelMode, setTravelMode] = useState<TravelMode>(DEFAULT_TRAVEL_MODE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = view.slug ?? "";
  const participants = view.participants ?? [];
  const activities = sessionActivities(view);
  // "En az 2" kapısı KONUMU OLAN noktaları sayar: adı girilmiş ama çözülememiş bir satır yok
  // (sunucu koordinatsız nokta kabul etmiyor), yine de kapı sunucununkiyle aynı olmalı.
  const located = participants.filter((p) => p.hasLocation).length;
  const anchored = view.anchored === true;
  const canFind = anchored || located >= 2;

  async function addPoint() {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      // Artboard alanı TEK satır: "Ad · şehir ya da adres". Ad ile yer nokta ayracıyla
      // ayrılır; ayraç yoksa metnin tamamı hem ad hem adres olur.
      const [rawName, ...rest] = q.split("·");
      const place = (rest.join("·") || rawName).trim();
      const displayName = rest.length > 0 ? rawName.trim() : place;
      const found = await api.geocode({ query: place });
      await api.addPoint(slug, {
        displayName,
        lat: found.lat,
        lng: found.lng,
        locationLabel: found.label,
        travelMode,
      });
      setQuery("");
      await loadView(slug);
    } catch {
      setError("lobby.errPoint");
    } finally {
      setBusy(false);
    }
  }

  async function remove(participantId: string) {
    setError(null);
    try {
      await api.removePoint(slug, participantId);
      await loadView(slug);
    } catch {
      setError("lobby.errPoint");
    }
  }

  async function findVenues() {
    setBusy(true);
    setError(null);
    try {
      await api.findVenues(slug);
      await loadView(slug);
    } catch {
      setError("lobby.errFind");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={view.name || activityListLabel(activities, t, i18n.resolvedLanguage ?? "tr")}
        backLabel={t("common.back")}
        onBack={() => router.replace("/sessions")}
      />

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <View style={s.badges}>
          <Badge>{t("newSession.solo")}</Badge>
          {activities.map((a) => {
            const Icon = ACTIVITY_ICON[a as keyof typeof ACTIVITY_ICON];
            return (
              <Badge
                key={a}
                tone="flame"
                icon={Icon ? <Icon size={13} color={colors.flameDeep} /> : undefined}
              >
                {t(`activity.${a}`)}
              </Badge>
            );
          })}
        </View>

        <View style={s.sectionHead}>
          <AppText variant="over">{t("newSession.points")}</AppText>
          <AppText variant="num" style={s.counter}>
            {t("newSession.pointsCount", { count: located })}
          </AppText>
        </View>

        <Card padded={false} style={s.roster}>
          {participants.map((p, i) => (
            <View key={p.id ?? i}>
              {i > 0 ? <View style={s.divider} /> : null}
              <ParticipantRow
                participant={p}
                slug={slug}
                index={i}
                self={p.host === true}
                anchored={anchored}
                onRemove={p.manual && p.id ? () => void remove(p.id!) : undefined}
              />
            </View>
          ))}
        </Card>

        <Card style={s.adder}>
          <Input
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={t("newSession.pointPlaceholder")}
            placeholder={t("newSession.pointPlaceholder")}
            autoCorrect={false}
          />
          {/* Kart içindeki ray kendi başlığını taşımaz (artboard P5): üstündeki alan zaten
              "bu kişi nasıl geliyor" bağlamını kuruyor. */}
          <TravelModeField value={travelMode} onChange={setTravelMode} label={null} />
          <Button
            small
            kind="white"
            title={t("newSession.add")}
            icon={<PlusIcon size={16} color={colors.ink} />}
            disabled={busy || !query.trim()}
            onPress={() => void addPoint()}
          />
        </Card>

        <MidpointCard view={view} />

        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}

        <HandNote>{t("newSession.soloHand")}</HandNote>
      </ScrollView>

      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + 84 }]}
        pointerEvents="none"
      />

      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          title={t("newSession.findVenues")}
          disabled={busy || !canFind}
          onPress={() => void findVenues()}
        />
        {/* Not düğmeyle AYNI kapıya bağlı: açık bir düğmenin altında "En az 2 konum gerekir."
            yalan olurdu. Çapalıda kapı zaten yok — not da yazılmaz. */}
        {anchored ? null : (
          <AppText variant="muted" style={s.ctaNote}>
            {canFind ? t("newSession.findHint", { count: located }) : t("newSession.needTwo")}
          </AppText>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 110, gap: space.gap },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, gap: 6, backgroundColor: colors.paper },
  ctaNote: { textAlign: "center" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  counter: { color: colors.ink2 },
  roster: { paddingVertical: 2 },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: space.cardX },
  adder: { gap: 10, padding: 12 },
  error: { color: colors.flameDeep, fontWeight: "600" },
});
