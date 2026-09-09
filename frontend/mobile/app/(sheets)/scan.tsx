import { parseInvite } from "@bumpinto/shared";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, View } from "react-native";

import { AppText, Button } from "../../src/components/atoms";
import { ScreenHeader } from "../../src/components/molecules";
import { goBackOr } from "../../src/lib/nav";
import { colors, space } from "../../src/theme";

/**
 * Davet QR tarayıcısı (M-9).
 *
 * İzin diyaloğundan ÖNCE ne için açıldığı YAZILIR (Play "prominent disclosure"). Ayrı bir
 * izin ön-ekranı gerekmez — kamera için sistem diyaloğu yeterli; burada yalnız tek satır
 * açıklama vardır. Reddedilirse O6 kurtarma deseni: Ayarlar yolu + elle yazma önerisi.
 *
 * BumpInto linki OLMAYAN bir QR sessizce yok sayılır ve tarama sürer: her rastgele kareye
 * hata basmak tarayıcıyı kullanılamaz hâle getirirdi.
 */
export default function ScanSheet() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);

  function onScan({ data }: { data: string }) {
    if (handled) return;
    const invite = parseInvite(data);
    if (!invite) return;
    setHandled(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Kod yazılı üçüncü taraf QR'ı: `/j/<kod>` yolu slug beklediği için oturum bulunamaz
    // (K-M8 — kayıtlı, bilinçli). Kendi QR'ımız her zaman link taşır.
    router.replace(invite.kind === "slug" ? `/j/${invite.slug}` : `/j/${invite.code}`);
  }

  const granted = permission?.granted === true;
  const denied = permission != null && !permission.granted && !permission.canAskAgain;

  return (
    <View style={s.sheet}>
      <ScreenHeader
        title={t("code.scanTitle")}
        backLabel={t("common.close")}
        onBack={() => goBackOr("/sessions")}
      />

      {granted ? (
        <View style={s.cameraWrap}>
          <CameraView
            style={s.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onScan}
          />
          <View style={s.overlay} pointerEvents="none">
            <AppText variant="muted" style={s.overlayText}>
              {t("code.scanDisclosure")}
            </AppText>
          </View>
        </View>
      ) : (
        <View style={s.body}>
          <AppText variant="muted">{t("code.scanDisclosure")}</AppText>
          {denied ? (
            <>
              <AppText variant="h3">{t("code.scanDenied")}</AppText>
              <AppText variant="muted">{t("code.scanDeniedCopy")}</AppText>
              <Button
                title={t("code.scanSettings")}
                onPress={() => void Linking.openSettings()}
              />
            </>
          ) : (
            <Button title={t("code.scanAllow")} onPress={() => void requestPermission()} />
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.paper },
  body: { paddingHorizontal: space.screenX, paddingTop: 12, gap: 14 },
  cameraWrap: { flex: 1, margin: space.screenX, borderRadius: 24, overflow: "hidden" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    backgroundColor: "rgba(39,32,59,0.72)",
  },
  overlayText: { color: "#fff", textAlign: "center" },
});
