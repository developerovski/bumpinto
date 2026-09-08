import { monogram, type VenueDto } from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, fonts, photoTints, radius } from "../../theme";
import { AppText } from "../atoms";

/**
 * Mekan görseli — fotoğraf varsa o, yoksa gradyan + monogram (artboard `.pho` / `.pho-mono`).
 *
 * Gradyan `photoTints`ten gelir ve `deckOrder`la döner: aynı listedeki kartlar ayrı renkler
 * alır. `personTint` DEĞİL — o kişi kimliğine ayrılmış palet (K-M6).
 *
 * Ölü bağlantıda monograma dönülür: kırık resim ikonu bir mekan kartını çöp gibi gösteriyor.
 */
export default function VenueThumb(p: {
  venue: VenueDto;
  /** Oturumun ilgi alanından gelen taban ton — `deckOrder` bunun üstüne eklenir. */
  tint?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [broken, setBroken] = useState(false);
  const width = p.width ?? 56;
  const height = p.height ?? 64;
  const showPhoto = !!p.venue.photoUrl && !broken;
  const tint = photoTints[((p.tint ?? 0) + (p.venue.deckOrder ?? 0)) % photoTints.length];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[s.box, { width, height }, p.style]}
    >
      {showPhoto ? (
        <Image
          source={{ uri: p.venue.photoUrl }}
          contentFit="cover"
          style={s.fill}
          onError={() => setBroken(true)}
        />
      ) : (
        <>
          <LinearGradient
            colors={[...tint]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={s.fill}
          />
          <AppText style={[s.mono, { fontSize: Math.round(width / 3.5) }]}>
            {monogram(p.venue.name)}
          </AppText>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    borderRadius: radius.thumb,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.track,
  },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  mono: { fontFamily: fonts.head, color: "rgba(255,255,255,0.5)", transform: [{ rotate: "-4deg" }] },
});
