import { WifiSlashIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { useNetStore } from "../../store/netStore";
import { colors, radius, space } from "../../theme";
import { AppText, Button } from "../atoms";

/**
 * Artboard P24 — çevrimdışı şeridi. Üst çubuğun ALTINDA, kaydırma alanının DIŞINDA sabit
 * durur: kullanıcı listeyi kaydırırken "bu veri bayat" uyarısı ekrandan kaçmamalı.
 *
 * Ekranı KAPATMAZ. Çevrimdışıyken son görülen hâl okunabilir kalır (P24: liste soluk ama
 * orada); tam ekran bir "bağlantı yok" duvarı elindeki bilgiyi de elinden alırdı.
 *
 * Saat `netStore.lastSyncAt`ten — `sessionStore` her başarılı yüklemede oraya yazar.
 * Şerit kendi zamanını TUTMAZ; iki kaynak ayrışırsa aynı ekranda iki farklı "en son ne zaman"
 * görünürdü.
 */
export default function OfflineBanner({ onRetry }: { onRetry: () => void }) {
  const { t, i18n } = useTranslation();
  const online = useNetStore((s) => s.online);
  const lastSyncAt = useNetStore((s) => s.lastSyncAt);

  if (online) return null;

  const time = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString(i18n.resolvedLanguage ?? "tr", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <View accessibilityRole="alert" style={s.bar}>
      <WifiSlashIcon size={20} color={colors.amberInk} weight="bold" />
      <View style={s.text}>
        <AppText variant="h3" style={s.title}>
          {t("offline.title")}
        </AppText>
        {/* Saat yoksa satır HİÇ çizilmez: "son görülen: —" bilgi değil, gürültü. */}
        {time ? (
          <AppText variant="muted" style={s.hint}>
            {t("offline.hint", { time })}
          </AppText>
        ) : null}
      </View>
      <Button small kind="white" title={t("offline.retry")} onPress={onRetry} style={s.retry} />
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: space.screenX,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.input,
    backgroundColor: colors.amberWash,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  text: { flex: 1, minWidth: 0, gap: 1 },
  title: { color: colors.amberInk },
  hint: { color: colors.amberInk, fontSize: 12 },
  retry: { width: "auto", flexShrink: 0, paddingHorizontal: 12 },
});
