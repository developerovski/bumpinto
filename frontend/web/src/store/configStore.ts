import type { AppConfig } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";

/** Uç ulaşılamazsa ürün ÇALIŞIR: açık motor + açık stil, sağlayıcı atfı yok (spec §7). */
export const FALLBACK_CONFIG: AppConfig = {
  mapEngine: "maplibre",
  tiles: { styleUrl: "https://tiles.openfreemap.org/styles/positron" },
  sources: [],
};

type ConfigState = {
  config: AppConfig | null;
  failed: boolean;
  load: () => Promise<void>;
};

/** Uçuştaki istek — açılış (main.tsx) ve MapView aynı anda çağırabilir, uç bir kez vurulur. */
let inflight: Promise<void> | null = null;

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  failed: false,
  load: () => {
    if (get().config) return Promise.resolve();
    if (!inflight) {
      inflight = api
        .getConfig()
        .then((config) => set({ config, failed: false }))
        .catch(() => {
          console.warn("[config] /api/config alinamadi, acik motor yedegi kullaniliyor");
          set({ config: null, failed: true });
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  },
}));

/** `config` sunucudan gelmediyse (yükleniyor VEYA başarısız) yedeği döndürür.
    Motor/atıf gibi ŞİMDİ bir değer isteyen tüketiciler bunu kullanır; "yükleniyor mu" ayrımı
    gerekiyorsa (MapView gibi) doğrudan `config` alanına bakılır: null + !failed → yükleniyor. */
export function effectiveConfig(state: { config: AppConfig | null }): AppConfig {
  return state.config ?? FALLBACK_CONFIG;
}

/** Testler için — modül durumunu sıfırlar. */
export function resetConfig(): void {
  inflight = null;
  useConfigStore.setState({ config: null, failed: false });
}
