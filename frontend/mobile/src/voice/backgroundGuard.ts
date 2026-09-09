import { AppState } from "react-native";

import { useVoiceStore } from "../store/voiceStore";

/**
 * Uygulama arka plandayken mikrofon SUSAR — O7'de kullanıcıya verilen sözün karşılığı
 * ("Ekrandan çıkınca mikrofon kapanır"). Bağlantı KAPANMAZ: geri dönüldüğünde konuşma
 * kaldığı yerden sürer; oturumu kesmek grubun sohbetini bozardı.
 *
 * Kullanıcının KENDİ sustur tercihi ezilmez (`setBackgroundMuted` ayrı bayrak tutar): arka
 * planda susup dönen biri, dışarı çıkmadan önce mikrofonu kapalıysa kapalı bulur.
 *
 * Kökte BİR KEZ bağlanır (`app/_layout.tsx`); abonelik kaldırıcıyı döndürür.
 */
export function watchAppBackground(): () => void {
  const subscription = AppState.addEventListener("change", (state) => {
    const voice = useVoiceStore.getState();
    // Sesli sohbette değilken dokunma: boş yere mesh'e yazmak ve durum değiştirmek yok.
    if (voice.phase !== "in") return;
    voice.setBackgroundMuted(state !== "active");
  });
  return () => subscription.remove();
}
