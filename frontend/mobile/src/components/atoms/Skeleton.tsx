import { useEffect, useState } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "../../theme";

/** Yükleniyor yer tutucusu — 1.4 sn opaklık nabzı; ekran okuyucudan gizlidir. */
export default function Skeleton(p: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [v] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: p.width ?? "100%",
          height: p.height ?? 14,
          borderRadius: p.radius ?? radius.thumb,
          backgroundColor: colors.track,
          opacity: v,
        },
        p.style,
      ]}
    />
  );
}
