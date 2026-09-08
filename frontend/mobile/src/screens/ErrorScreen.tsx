import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { AppText, Button, Wordmark } from "../components/atoms";
import { MapMark } from "../components/molecules";
import { colors, space } from "../theme";

/**
 * Hata / çıkmaz ekranı (P23 · İLK SÜRÜM).
 *
 * M-7 T4'ün durum yönlendiricisi `EXPIRED` dalında bunu çizer, Katıl ekranı da bulunamayan
 * ya da kapanmış oturumda buraya düşer — bu yüzden M-8 iskeletlerinden farklı olarak burada
 * GERÇEK bir gövdeyle doğar. **M-8 T4 aynı dosyayı P23'ün tüm dallarıyla tamamlar.**
 *
 * Her dal ÇIKIŞ verir: kullanıcı hiçbir durumda ekranda kilitli kalmaz (mağaza reddi sebebi).
 */
export type ErrorKind = "notFound" | "expired" | "decided" | "lost";

const TITLE: Record<ErrorKind, string> = {
  notFound: "session.notFound",
  expired: "session.expired",
  decided: "session.decidedTitle",
  lost: "error.lostTitle",
};

const HINT: Record<ErrorKind, string> = {
  notFound: "error.notFoundHint",
  expired: "error.expiredHint",
  decided: "session.decidedHint",
  lost: "error.lostCopy",
};

export default function ErrorScreen({ kind = "notFound" }: { kind?: ErrorKind }) {
  const { t } = useTranslation();

  return (
    <View style={s.screen}>
      <View style={s.bar}>
        <Wordmark />
      </View>

      <View style={s.body}>
        <MapMark size={88} muted />
        {/* "Hmm." — suçlayıcı olmayan başlık (ürün dil kuralı); ne olduğunu ALT satır söyler. */}
        <AppText variant="display" style={s.center}>
          {t("error.hmm")}
        </AppText>
        <AppText variant="h2" style={s.center}>
          {t(TITLE[kind])}
        </AppText>
        <AppText variant="muted" style={s.center}>
          {t(HINT[kind])}
        </AppText>

        <Button title={t("error.home")} onPress={() => router.replace("/sessions")} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  bar: { paddingHorizontal: space.screenX, paddingTop: 12, paddingBottom: 8 },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: space.screenX,
  },
  center: { textAlign: "center" },
});
