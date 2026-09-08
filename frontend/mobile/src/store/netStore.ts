import NetInfo from "@react-native-community/netinfo";
import { create } from "zustand";

/**
 * Ağ durumu. `lastSyncAt`'in TEK sahibi burasıdır — `sessionStore` her başarılı yüklemede
 * buraya yazar, çevrimdışı şeridi ve ekranlar AYNI zamanı okur.
 */
export const useNetStore = create<{ online: boolean; lastSyncAt: number | null }>(() => ({
  online: true,
  lastSyncAt: null,
}));

/**
 * Kökte BİR KEZ bağlanır; abonelik kaldırıcıyı döndürür.
 *
 * `isInternetReachable` üç durumludur: `true` (erişim doğrulandı), `false` (doğrulandı,
 * erişim YOK) ve `null` (henüz bilinmiyor — açılışın ilk saniyesi ya da probe kapalı).
 * `null` ÇEVRİMİÇİ sayılır: aksi hâlde uygulama her açılışta bir an "Bağlantı yok" şeridi
 * gösterip kaybolurdu.
 *
 * Bu bir framework yapıştırıcısıdır: buradaki dinleyici Jest'te DOĞRULANMAZ (ikizi
 * `jest.setup.ts`te), gerçek uçuş modu geçişi Maestro/el testinde koşar.
 */
export function watchNetwork() {
  return NetInfo.addEventListener((state) =>
    useNetStore.setState({
      online: !!state.isConnected && state.isInternetReachable !== false,
    }),
  );
}
