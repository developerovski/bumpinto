/* R-W10b — ağ durumunu SAYFALARA taşıyan ince kap. `useOnline()` bir dinleyici + kendi
   `lastOnlineAt` ölçümü kurar; ikinci bir çağrı ikinci bir kaynak demektir (şerit ile sayfanın
   "ne zamandan beri çevrimdışı" cevabı ayrışır). Bu yüzden kanca YALNIZ AppShell'de çağrılır,
   sayfalar sonucu buradan okur.

   Artboard W10b: çevrimdışıyken içerik silinmez — son görülen hali SOLUK gösterilir ve eylemler
   kilitlenir (1280: `.wrap` opacity .6 + "Yeni buluşma kur" disabled; 390: kart opacity .6). */
import { createContext, useContext, type ReactNode } from "react";
import type { OnlineState } from "./useOnline";

/** Sağlayıcısız ağaç (izole bileşen testi, Storybook) ÇEVRİMİÇİ sayılır — yanlış yere soluk
    içerik basmak, hiç basmamaktan kötüdür (useOnline.ts ile aynı kural). */
const OnlineContext = createContext<OnlineState>({ online: true, lastOnlineAt: null });

export function OnlineProvider(props: { value: OnlineState; children: ReactNode }) {
  return <OnlineContext.Provider value={props.value}>{props.children}</OnlineContext.Provider>;
}

export function useOnlineState(): OnlineState {
  return useContext(OnlineContext);
}
