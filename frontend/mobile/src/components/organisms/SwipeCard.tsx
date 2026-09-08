/* eslint-disable react-hooks/immutability --
   Reanimated'in `SharedValue`'su TASARIMI GEREĞİ mutasyonla yazılır (`sv.value = x`); başka
   bir yazma yolu yoktur. React Compiler kuralı hook dönüşlerini değişmez sayar ve bu
   sözleşmeyi modelleyemiyor. Kaçış bu dosyayla SINIRLI: burada mutasyona uğrayan her şey bir
   `useSharedValue`dur, başka tür bir "değişmez" değer yazılmaz. */
import {
  DRAG_START_PX,
  VERTICAL_DAMP,
  dragProgress,
  dragRotation,
  releaseDecision,
  swipeThreshold,
  type SwipeDir,
} from "@bumpinto/shared";
import { useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotion } from "../../lib/useReduceMotion";
import { colors, fonts } from "../../theme";
import { AppText } from "../atoms";

/**
 * P14 — sürüklenebilir kart: sağ = beğen, sol = geç; eşik altında yerine döner.
 *
 * Geometri (`swipeThreshold`/`dragRotation`/`dragProgress`/`releaseDecision`) ve eşikler
 * `@bumpinto/shared`'tan gelir — bu dosyada İKİNCİ bir eşik ya da hesap YOK (plan42 bağlayıcı
 * kuralı). Web'in `SwipeCard`'ı aynı fonksiyonları çağırır; iki istemcide kart aynı yerde
 * "karar verilmiş" sayılır.
 *
 * **`runOnJS(true)` — bilinçli:** shared'ın saf fonksiyonları worklet DEĞİL, dolayısıyla
 * UI ipliğinden çağrılamaz. İki seçenek vardı: (a) geometriyi burada worklet olarak yeniden
 * yazmak — ikinci hesap yasağını çiğner ve iki istemci ayrışır; (b) jesti JS ipliğinde
 * koşturmak. (b) seçildi: kaydırma tek parmaklı ve kısa, JS ipliği bu iş için yeterli
 * (web sürümü de aynı işi ana iplikte yapıyor). Cihazda takılma görülürse doğru düzeltme
 * `shared/swipeMath.ts`e `"worklet"` yönergesi eklemektir — burada kopya çıkarmak DEĞİL.
 *
 * Damga dili artboard `.stamp`: renk KENARLIK + METİN'dir, dolgu değil — gradyan dolgulu
 * damga karttaki fotoğrafı yutuyordu.
 */
const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };

export default function SwipeCard(p: {
  onSwipe: (dir: SwipeDir) => void;
  /** 0..1 — arkadaki kartın öne gelmesi için. */
  onProgress?: (progress: number) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const like = useSharedValue(0);
  const pass = useSharedValue(0);
  // Ölçülene kadar 0: `swipeThreshold` 0 genişlikte sabit eşiğe düşer (shared'ın kuralı).
  // Ref DEĞİL paylaşılan değer: jest geri çağrıları çizimden sonra koşuyor ve React
  // Compiler bir ref'in orada okunmasını çizim-sırası erişimi sayıyor.
  const width = useSharedValue(0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      width.value = e.nativeEvent.layout.width;
    },
    [width],
  );

  const paint = useCallback(
    (dx: number, dy: number) => {
      tx.value = dx;
      ty.value = dy;
      const progress = dragProgress(dx, swipeThreshold(width.value));
      like.value = dx > 0 ? progress : 0;
      pass.value = dx < 0 ? progress : 0;
      p.onProgress?.(progress);
    },
    [like, p, pass, tx, ty, width],
  );

  const settle = useCallback(() => {
    const spring = (value: number) => (reduceMotion ? value : withSpring(value, SPRING));
    tx.value = spring(0);
    ty.value = spring(0);
    like.value = withTiming(0, { duration: reduceMotion ? 0 : 120 });
    pass.value = withTiming(0, { duration: reduceMotion ? 0 : 120 });
    p.onProgress?.(0);
  }, [like, p, pass, reduceMotion, tx, ty]);

  const release = useCallback(
    (dx: number, velocityX: number) => {
      // gesture-handler hızı px/sn verir; shared'ın `FLING_VELOCITY` eşiği px/ms.
      const dir = releaseDecision(dx, velocityX / 1000, swipeThreshold(width.value));
      if (dir) p.onSwipe(dir);
      else settle();
    },
    [p, settle, width],
  );

  const pan = Gesture.Pan()
    // Dikey kaydırmayı GASBETME: kart yalnız yatay niyet netleşince yakalar.
    .activeOffsetX([-DRAG_START_PX, DRAG_START_PX])
    .failOffsetY([-24, 24])
    .runOnJS(true)
    .onUpdate((e) => paint(e.translationX, e.translationY * VERTICAL_DAMP))
    .onEnd((e) => release(e.translationX, e.velocityX))
    .onFinalize((e, success) => {
      // İptal (telefon çağrısı, sistem jesti): kart YERİNE döner, karar üretilmez.
      // Jest `runOnJS(true)` olduğu için geri çağrı ZATEN JS ipliğinde — sarmalayıcı gerekmez.
      if (!success) settle();
    });

  const card = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${dragRotation(tx.value)}deg` },
    ],
  }));
  const likeStamp = useAnimatedStyle(() => ({ opacity: like.value }));
  const passStamp = useAnimatedStyle(() => ({ opacity: pass.value }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View onLayout={onLayout} style={[s.root, card]}>
        {p.children}
        <Animated.View pointerEvents="none" style={[s.stamp, s.like, likeStamp]}>
          <AppText style={[s.stampText, { color: colors.grass }]}>{t("deck.like")}</AppText>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[s.stamp, s.pass, passStamp]}>
          <AppText style={[s.stampText, { color: colors.flameDeep }]}>{t("deck.pass")}</AppText>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  root: { width: "100%" },
  stamp: {
    position: "absolute",
    top: 22,
    borderWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  like: { left: 18, borderColor: colors.grass, transform: [{ rotate: "-14deg" }] },
  pass: { right: 18, borderColor: colors.flameDeep, transform: [{ rotate: "12deg" }] },
  stampText: {
    fontFamily: fonts.head,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
