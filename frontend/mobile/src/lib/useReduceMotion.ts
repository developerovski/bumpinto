import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Sistemdeki "hareketi azalt" ayarı — artboard'ın `@media (prefers-reduced-motion:reduce)`
 * kuralının karşılığı.
 *
 * Açılışta okunur ve DEĞİŞİMİ dinlenir: kullanıcı ayarı uygulama açıkken değiştirebilir.
 * Bu kancayı kullanan her hareket, ayar açıkken ANINDA bitmiş sayılmalı — hareketlerimiz
 * bilgi taşımıyor, yalnız yönü okutuyor.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => alive && setReduce(on));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
