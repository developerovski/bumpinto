import { Camera, Map, Marker } from "@maplibre/maplibre-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { useConfigStore } from "../../store/configStore";
import { colors, radius } from "../../theme";
import { AppText } from "../atoms";

/**
 * Artboard P4 alt sayfasının haritası — MapLibre (K-M2). Google Maps DEĞİL: anahtar
 * tanımlamak SDK'yı pakete sokar ve `PrivacyInfo.xcprivacy` / Play Data safety beyanlarını
 * yalanlar. Döşeme stili çalışma anında `/api/config`ten gelir ve ANAHTAR İSTEMEZ.
 *
 * Bu dosya `React.lazy` ile yüklenir (`MapPickerSheet`) ve organizma barrel'ına KONMAZ:
 * yerel harita motoru yalnız kullanıcı "Haritadan seç"e bastığında kurulur.
 *
 * Koordinat sırası MapLibre'de [lng, lat] — ürünün her yerinde `{lat, lng}` kullanıldığı için
 * dönüşüm YALNIZ bu dosyada yapılır.
 */
export type PickedPoint = { lat: number; lng: number };

export default function MapPicker(p: {
  center: PickedPoint;
  value: PickedPoint | null;
  onPick: (point: PickedPoint) => void;
}) {
  const { t } = useTranslation();
  const styleUrl = useConfigStore((s) => s.effective().tiles.styleUrl);
  const load = useConfigStore((s) => s.load);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const pin = p.value ?? p.center;

  return (
    <View style={s.frame}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={styleUrl}
        logo={false}
        // Atıf alt sayfanın kendi satırında basılır (`attribution.open`) — lisans
        // yükümlülüğü ORADAN karşılanır, haritanın yerel rozeti 300px'lik çerçevede
        // pini örtüyor.
        attribution={false}
        compass={false}
        onDidFinishLoadingMap={() => setReady(true)}
        onPress={(e) => {
          const [lng, lat] = e.nativeEvent.lngLat;
          p.onPick({ lat, lng });
        }}
      >
        <Camera initialViewState={{ center: [p.center.lng, p.center.lat], zoom: 13 }} />
        {/* `anchor` ucu koordinatta dursun: iğnenin sivri ucu seçilen noktayı gösterir.
            İğne BURADA çizilir, `MapMark`la DEĞİL: o bileşen kesikli halka + katılımcı
            noktalarını da taşıyor ve yerel işaretçi görünümü içinde kendi kutusunun dışına
            taşıyordu (2026-09-08 emülatörde: haritanın üstünde uçuşan daireler). İşaretçi
            çocuğu ölçüsü BELLİ ve taşmayan bir kutu olmalı. */}
        <Marker lngLat={[pin.lng, pin.lat]} anchor="bottom">
          <View style={s.pinBox}>
            <LinearGradient
              colors={[colors.flame, colors.flameDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.pin}
            />
          </View>
        </Marker>
      </Map>

      {ready ? null : (
        <View style={s.loading} pointerEvents="none">
          <AppText variant="muted">{t("map.loading")}</AppText>
        </View>
      )}
    </View>
  );
}

const PIN = 26;

const s = StyleSheet.create({
  // İşaretçi çocuğu: taşma YOK, ölçü sabit — yerel görünüm bunu birebir alır.
  pinBox: { width: PIN, height: PIN, alignItems: "center", justifyContent: "center" },
  // 45° döndürülmüş kare, üç köşesi yuvarlak biri sivri → harita iğnesi silueti (`.mpin`).
  pin: {
    width: PIN - 4,
    height: PIN - 4,
    transform: [{ rotate: "45deg" }],
    borderTopLeftRadius: (PIN - 4) / 2,
    borderTopRightRadius: (PIN - 4) / 2,
    borderBottomRightRadius: (PIN - 4) / 2,
    borderBottomLeftRadius: 3,
    borderWidth: 2.5,
    borderColor: colors.card,
  },
  frame: {
    height: 300,
    borderRadius: radius.card - 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.track,
  },
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.track,
  },
});
