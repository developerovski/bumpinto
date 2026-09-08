import type { AppConfig } from "@bumpinto/shared";
import { create } from "zustand";

import { api } from "../lib/api";

/**
 * `/api/config` (spec §7) — harita motoru, döşeme stili ve ATIF kaynakları.
 *
 * Uç ulaşılamazsa ürün ÇALIŞIR: açık motor + açık stil, sağlayıcı atfı yok. Yanlış atıf
 * basmaktansa hiç basmamak doğru: atıf yükümlülüğü lisansa bağlı, uydurulamaz.
 *
 * Web `configStore` ile AYNI sözleşme; taşınmadı çünkü ikisi de kendi `api` singleton'ını
 * tüketiyor (K-M8).
 */
export const FALLBACK_CONFIG: AppConfig = {
  mapEngine: "maplibre",
  tiles: { styleUrl: "https://tiles.openfreemap.org/styles/positron" },
  sources: [],
};

/** Uçuştaki istek — birden çok ekran aynı anda çağırabilir, uç bir kez vurulur. */
let inflight: Promise<void> | null = null;

export const useConfigStore = create<{
  config: AppConfig | null;
  failed: boolean;
  load: () => Promise<void>;
  /** Şimdi bir değer isteyen tüketiciler için: gelmemişse yedek. */
  effective: () => AppConfig;
}>((set, get) => ({
  config: null,
  failed: false,

  load: () => {
    if (get().config) return Promise.resolve();
    if (!inflight) {
      inflight = api
        .getConfig()
        .then((config) => set({ config, failed: false }))
        .catch(() => set({ config: null, failed: true }))
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  },

  effective: () => get().config ?? FALLBACK_CONFIG,
}));

/** Testler için — modül durumunu sıfırlar. */
export function resetConfig(): void {
  inflight = null;
  useConfigStore.setState({ config: null, failed: false });
}
