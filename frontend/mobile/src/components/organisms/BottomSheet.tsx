import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReduceMotion } from "../../lib/useReduceMotion";
import { colors, radius } from "../../theme";

/**
 * Artboard `.scrim` + `.sheet` — alt sayfaların TEK uygulaması.
 *
 * İki hareket AYRI: yaprak aşağıdan yukarı KAYAR, karartma yerinde AÇILIR (fade). Tek parça
 * gibi kaydırılırsa karartma da aşağıdan gelir ve "perde" hissi kaybolur; karartmanın işi
 * arkadaki sayfayı geri plana itmek, o yüzden yer değiştirmez.
 *
 * Yerel `Modal` KULLANILMAZ: ayrı bir kök ağaca çizilir ve karartmanın altındaki ekran
 * görünmez kalır — tasarımdaki katman etkisi (kullanıcı ne yaptığını görmeye devam eder)
 * kaybolurdu. Bu karar M-5'te O16 için verildi, burada tüm alt sayfalara genelleniyor.
 *
 * "Hareketi azalt" açıkken ikisi de ANINDA yerine oturur.
 *
 * Kapanış YOLLARI: karartmaya dokunma, Android donanım/hareket geri tuşu ve çağıranın kendi
 * düğmesi. Çıkışsız alt sayfa bırakılmaz (K-M33 ile aynı kural).
 */
const SLIDE_MS = 260;

export default function BottomSheet({
  visible,
  onClose,
  closeLabel,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  /** Karartmanın erişilebilirlik adı — genelde "Vazgeç" ya da "Kapat". */
  closeLabel: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  // Kapanış animasyonu SÜRERKEN ağaçta kalmalı: `visible` false olur olmaz sökülürse
  // yaprak kaybolur ve aşağı kayması hiç görünmez.
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  // Yaprağın kendi yüksekliği: tam olarak kendi boyu kadar aşağıdan gelir. Ölçülene kadar
  // ekran yüksekliği kullanılır — her hâlükârda görüş alanının dışında başlar.
  const [sheetHeight, setSheetHeight] = useState(Dimensions.get("window").height);

  // Açılışta ağaca ÇİZİM SIRASINDA girer (efektle değil): bir kare gecikirse yaprak
  // yerinden değil bir adım ilerisinden kaymaya başlardı.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : SLIDE_MS,
      useNativeDriver: true,
    });
    // Sökme yalnız kapanış BİTİNCE: animasyon sürerken yaprak ağaçta kalmalı.
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, reduceMotion, progress]);

  // Android geri tuşu da kapatmalı: yalnız düğme bırakmak alt sayfayı çıkmaz yapardı.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted) return null;

  const onLayout = (e: LayoutChangeEvent) => setSheetHeight(e.nativeEvent.layout.height);

  return (
    <View style={s.overlay} pointerEvents="box-none">
      <Animated.View style={[s.scrimBox, { opacity: progress }]} pointerEvents="box-none">
        <Pressable
          style={s.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
      </Animated.View>

      <Animated.View
        testID="bottom-sheet"
        onLayout={onLayout}
        style={[
          s.sheet,
          { paddingBottom: insets.bottom + 26 },
          {
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sheetHeight, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={s.grab} />
        {children}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end" },
  scrimBox: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { flex: 1, backgroundColor: "rgba(39,32,59,0.42)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    gap: 12,
  },
  grab: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line2,
    alignSelf: "center",
  },
});
