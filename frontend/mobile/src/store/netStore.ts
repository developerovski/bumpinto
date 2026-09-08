import { create } from "zustand";

/**
 * Ağ durumu. Burada YALNIZ durum tutulur; `NetInfo` aboneliği ve çevrimdışı şeridi M-8 T4'te
 * eklenir. `lastSyncAt`'in TEK sahibi baştan bu store olsun diye şimdiden doğar — iki ayrı
 * "son eşitleme" zamanı kaynağı oluşmasın.
 */
export const useNetStore = create<{ online: boolean; lastSyncAt: number | null }>(() => ({
  online: true,
  lastSyncAt: null,
}));
