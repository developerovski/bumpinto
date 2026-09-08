import { Suspense, lazy, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { api } from "../../lib/api";
import { colors, space } from "../../theme";
import { AppText, Button, Skeleton } from "../atoms";
import BottomSheet from "./BottomSheet";
import type { PickedPoint } from "./MapPicker";

/**
 * Artboard P4 `.scrim` + `.sheet` — "Haritadan seç".
 *
 * AYRI BİR ROTA DEĞİL, formun ÜSTÜNDE açılan yerinde bir alt sayfa: artboard scrim'in
 * arkasında doldurulmakta olan formu gösteriyor ve kullanıcı çapayı seçerken neyi kurduğunu
 * görmeye devam ediyor. Rota olarak açıldığında form ekrandan tamamen kalkıyor, geri dönüşte
 * kaydırma konumu sıfırlanıyor ve "bir yere gittim" hissi doğuyordu.
 *
 * Hareket `BottomSheet`ten: yaprak aşağıdan kayar, karartma yerinde açılır — uygulamadaki
 * tüm alt sayfalarla AYNI davranış (tek uygulama).
 *
 * Harita motoru TEMBEL: `MapPicker` yalnız sayfa görünürken `import` edilir — yerel MapLibre
 * modülü uygulama açılışında hiç kurulmaz.
 */
const MapPicker = lazy(() => import("./MapPicker"));

/** Harita bir yere ortalanmak zorunda — çapa/kendi konum yoksa Eindhoven merkez. */
const DEFAULT_CENTER: PickedPoint = { lat: 51.4416, lng: 5.4697 };

export default function MapPickerSheet(p: {
  visible: boolean;
  /** Açılış merkezi — varsa mevcut çapa, yoksa kullanıcının konumu. */
  center?: PickedPoint | null;
  onCancel: () => void;
  onPick: (point: PickedPoint & { label?: string }) => void;
}) {
  const { t } = useTranslation();
  const center = p.center ?? DEFAULT_CENTER;

  const [picked, setPicked] = useState<PickedPoint | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  // Sayfa her AÇILIŞTA temiz başlar: önceki açılışın seçimi "Burayı seç"i sessizce etkin
  // bırakırdı ve kullanıcı hiç dokunmadan eski noktayı onaylayabilirdi.
  //
  // Kapanışta DEĞİL açılışta sıfırlanır — kapanış animasyonu sürerken yaprak hâlâ ekranda ve
  // içeriğinin altından kayması gerekiyor. `useEffect` DEĞİL çizim sırasında düzeltme
  // (React'in "prop değişince state'i ayarla" deseni): efekt bir kare gecikme yaratırdı.
  const [wasVisible, setWasVisible] = useState(p.visible);
  if (p.visible !== wasVisible) {
    setWasVisible(p.visible);
    if (p.visible) {
      setPicked(null);
      setLabel(null);
    }
  }

  // Pin taşındığında etiket BACKEND ters geocode'undan gelir (OSMF mobil trafik politikası).
  // Gelmezse satır boş kalır — uydurma adres yazılmaz.
  useEffect(() => {
    if (!picked) return;
    let alive = true;
    void api
      .reverseGeocode({ lat: picked.lat, lng: picked.lng })
      .then((r) => alive && setLabel(r.label))
      .catch(() => alive && setLabel(null));
    return () => {
      alive = false;
    };
  }, [picked]);

  return (
    <BottomSheet visible={p.visible} onClose={p.onCancel} closeLabel={t("map.pickCancel")}>
      <AppText variant="h3">{t("map.pickOnMap")}</AppText>
      <AppText variant="muted">{t("map.pickHint")}</AppText>

      {/* Motor yalnız sayfa AÇIKKEN kurulur; kapanınca ağaçtan düşer. */}
      {p.visible ? (
        <Suspense fallback={<Skeleton height={300} radius={20} />}>
          <MapPicker center={center} value={picked} onPick={setPicked} />
        </Suspense>
      ) : null}

      <View style={s.meta}>
        <AppText variant="muted" style={s.address} numberOfLines={2}>
          {label ?? ""}
        </AppText>
        {/* Atıf ZORUNLU ve motora göre değişmez: döşemeler OpenStreetMap/Overture (K-M2). */}
        <AppText variant="muted" style={s.attribution}>
          {t("attribution.open")}
        </AppText>
      </View>

      <View style={s.actions}>
        <Button title={t("map.pickCancel")} kind="ghost" onPress={p.onCancel} style={s.half} />
        <Button
          title={t("map.pickConfirm")}
          disabled={!picked}
          onPress={() => picked && p.onPick({ ...picked, label: label ?? undefined })}
          style={s.half}
        />
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  meta: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  address: { flex: 1, color: colors.ink },
  attribution: { flexShrink: 0, fontSize: 11 },
  actions: { flexDirection: "row", gap: 8, paddingTop: space.rowY - 3 },
  half: { flex: 1, width: undefined },
});
