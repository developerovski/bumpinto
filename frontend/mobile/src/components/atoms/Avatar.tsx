import { personTint } from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, fonts, radius, size } from "../../theme";
import AppText from "./AppText";

/**
 * Baş harf avatarı. Renk KANONİK katılımcı dizininden gelir (`@bumpinto/shared` `personTint`) —
 * bir kişi her ekranda aynı rengi taşır; web `Avatar` ile aynı palet.
 */
type Size = "s" | "m" | "xl";

const PX: Record<Size, number> = { s: 28, m: size.avatar, xl: 84 };
const FONT: Record<Size, number> = { s: 12, m: 15, xl: 34 };

export default function Avatar(p: {
  name: string;
  /** Kanonik katılımcı dizini (0 tabanlı); paletin uzunluğuna modulo düşer. */
  tint?: number;
  size?: Size;
  ring?: boolean;
  /** Henüz katılmamış kişi: kesikli kenar + nabız. Dizin VERİLMEZSE nötr (aşağıda). */
  waiting?: boolean;
  online?: boolean;
  /** Sesli sohbette konuşuyor: çevrimiçi noktasının çevresinde halka (M-6 kullanır). */
  speaking?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const dim = PX[p.size ?? "m"];
  const initial = p.name.trim()[0]?.toUpperCase() ?? "?";
  const pulse = usePulse(!!p.waiting);
  /* Kimliği henüz olmayan bekleyen (boş koltuk, onay bekleyen istek) NÖTR: dizinsiz avatar ilk
     rengi — host'unkini — ödünç alırdı (bir kişi = bir renk; artboard `.av-wt`). Dizini olan
     bekleyen (konumu gelmemiş katılımcı) kendi rengini korur. */
  const neutral = !!p.waiting && p.tint == null;

  return (
    <View accessibilityLabel={p.name} style={[{ width: dim, height: dim }, p.style]}>
      <Animated.View
        style={[
          s.disc,
          { borderRadius: dim / 2, opacity: pulse },
          p.ring ? { borderWidth: 3, borderColor: colors.card } : null,
          p.waiting
            ? { borderWidth: 1.5, borderColor: neutral ? colors.lineIn : colors.line2, borderStyle: "dashed" }
            : null,
          neutral ? { backgroundColor: colors.sand } : null,
        ]}
      >
        {neutral ? null : (
          <LinearGradient
            testID="avatar-tint"
            colors={[...personTint(p.tint)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: dim / 2 }]}
          />
        )}
        <AppText
          style={{
            fontFamily: fonts.headBold,
            fontSize: FONT[p.size ?? "m"],
            color: neutral ? colors.ink3 : "#fff",
          }}
        >
          {initial}
        </AppText>
      </Animated.View>

      {p.online ? (
        <View
          accessibilityLabel="online"
          style={[
            s.dot,
            p.speaking ? { borderColor: colors.grass, borderWidth: 3 } : null,
          ]}
        />
      ) : null}
    </View>
  );
}

/** Bekleyen avatarın 1.6 sn opaklık nabzı; kapalıyken sabit 1 döner. */
function usePulse(on: boolean) {
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!on) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.45, duration: 800, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, v]);
  return on ? v : 1;
}

const s = StyleSheet.create({
  disc: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.line,
  },
  dot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: "#18B26B",
    borderWidth: 2,
    borderColor: colors.card,
  },
});
