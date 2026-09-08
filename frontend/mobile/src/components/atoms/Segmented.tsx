import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useReduceMotion } from "../../lib/useReduceMotion";
import { colors, radius, shadow, size } from "../../theme";
import AppText from "./AppText";

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: ReactNode };

/** Kabarcığın bir yuvadan diğerine kayma süresi. */
const SLIDE_MS = 200;

/** `.seg` / `.f-seg.icn` — seçilide beyaz kabarcık.
 *
 * Kabarcık her yuvanın KENDİ zemini değil, rayda KAYAN TEK bir parçadır: seçim değişince
 * yeni yuvaya kayar. Yuva başına zemin basıldığında geçiş bir kare içinde ışınlanıyordu ve
 * hangi yuvadan hangisine gidildiği okunmuyordu (özellikle beş yuvalı ulaşım rayında).
 *
 * "Hareketi azalt" AÇIKSA kabarcık ANINDA yerine oturur (artboard
 * `@media (prefers-reduced-motion:reduce)` kuralının karşılığı) — hareket bir bilgi taşımıyor,
 * yalnız yönü okutuyor, o yüzden kapatmak bir şey kaybettirmez.
 */
export default function Segmented<T extends string>(p: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `.f-seg.icn` — yalnız glif çizilir (artboard P3 ulaşım rayı). `label` erişilebilirlik
      adı olarak KALIR: beş ikonu yan yana yazıyla basmak 390'da satırı taşırıyor, ama
      ekran okuyucu için adsız bırakılamaz. */
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const pad = p.iconOnly ? 3 : 4;
  const index = Math.max(0, p.options.findIndex((o) => o.value === p.value));
  // Rayın genişliği ölçülene kadar kabarcık ÇİZİLMEZ: 0 genişlikle basıp sonra yerine
  // kaydırmak, ilk karede soldan fırlayan bir kabarcık gösterirdi.
  const [trackWidth, setTrackWidth] = useState(0);
  const slotWidth = trackWidth > 0 ? (trackWidth - pad * 2) / p.options.length : 0;

  // `useState` ile tembel kurulum (`Skeleton`/`Avatar` ile aynı desen): `useRef(...).current`
  // çizim sırasında ref okumak olur ve React Compiler bunu hata sayar.
  const [slide] = useState(() => new Animated.Value(index));
  const reduceMotion = useReduceMotion();
  // İlk yerleşimde animasyon YOK: kabarcık doğduğu yerde durur, kaymayla gelmez.
  const settled = useRef(false);

  useEffect(() => {
    if (!settled.current || reduceMotion) {
      settled.current = true;
      slide.setValue(index);
      return;
    }
    const animation = Animated.timing(slide, {
      toValue: index,
      duration: SLIDE_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, reduceMotion, slide]);

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      /* `testID`ler testin kabarcığı ve rayı stil tahmini yapmadan bulabilmesi için
         (`RangeBar`ın `range-dot-*` deseniyle aynı). */
      testID="segmented-track"
      accessibilityRole="tablist"
      onLayout={onLayout}
      style={[s.track, p.iconOnly ? s.trackIcon : null, p.style]}
    >
      {slotWidth > 0 ? (
        <Animated.View
          testID="segmented-thumb"
          // Salt dekoratif: seçim bilgisi her yuvanın `accessibilityState`inde zaten var.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            s.thumb,
            p.iconOnly ? s.thumbIcon : null,
            {
              width: slotWidth,
              top: pad,
              bottom: pad,
              left: pad,
              transform: [
                {
                  translateX: slide.interpolate({
                    inputRange: [0, Math.max(1, p.options.length - 1)],
                    outputRange: [0, slotWidth * Math.max(1, p.options.length - 1)],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      {p.options.map((o) => {
        const on = o.value === p.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => p.onChange(o.value)}
            style={[s.item, p.iconOnly ? s.itemIcon : null]}
          >
            {o.icon ? <View style={p.iconOnly ? null : { marginRight: 6 }}>{o.icon}</View> : null}
            {p.iconOnly ? null : (
              <AppText variant="label" style={on ? { color: colors.ink } : { color: colors.ink2 }}>
                {o.label}
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    padding: 4,
    // Kabarcık mutlak konumlanıyor; ray onun için referans olmalı.
    position: "relative",
  },
  // `.f-seg` — ikon rayı hap DEĞİL, 16px yumuşak köşe (artboard 296).
  trackIcon: { borderRadius: radius.input, padding: 3 },
  thumb: {
    position: "absolute",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    ...shadow.s1,
  },
  // `.f-seg.icn span` — 13px köşe.
  thumbIcon: { borderRadius: 13 },
  item: {
    flex: 1,
    minHeight: size.buttonSm - 8,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  // `.f-seg.icn span` — 44px dokunma hedefi (GUIDE kural 4).
  itemIcon: { minHeight: size.buttonSm, borderRadius: 13, paddingHorizontal: 0 },
});
