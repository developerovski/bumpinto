import { ACTIVITY_GROUPS, type ActivityType, type PlanCardDto, type PlanRange } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";
import type { TravelMode } from "../lib/travelMode";

/** Keşfet'in dakika hesabı için gönderilen konum — çağıran YUVARLAR (spec: dakika yuvarlanmış konumdan). */
export type DiscoverOrigin = { lat: number; lng: number; travelMode?: TravelMode };

/** Kanonik tür sırası (Yeme-içme · Hareket · Kültür · Eğlence) — çip şeridi ve "Diğer türlere bak". */
export const ALL_ACTIVITIES = Object.values(ACTIVITY_GROUPS).flat() as ActivityType[];

type State = {
  plans: PlanCardDto[];
  /** Sunucunun uyguladığı süzgeç (yanıttaki `filter`) — boş istek profil ilgi alanlarına düşer. */
  filter: ActivityType[];
  range: PlanRange;
  origin: DiscoverOrigin | null;
  loaded: boolean;
  error: boolean;
  /** `origin` verilirse saklanır; sonraki çağrılar (çip değişimi) aynı konumla sorar. */
  load: (origin?: DiscoverOrigin | null) => Promise<void>;
  toggle: (a: ActivityType) => void;
  selectAll: () => void;
  setRange: (r: PlanRange) => void;
  reset: () => void;
};

/** Hızlı çip değişiminde geç dönen eski yanıt yeni süzgecin sonucunu ezmesin. */
let requestSeq = 0;

const initial = () => ({
  plans: [] as PlanCardDto[],
  filter: [] as ActivityType[],
  range: "week" as PlanRange,
  origin: null as DiscoverOrigin | null,
  loaded: false,
  error: false,
});

export const useDiscoverStore = create<State>((set, get) => ({
  ...initial(),
  load: async (origin) => {
    if (origin !== undefined) set({ origin });
    const seq = ++requestSeq;
    set({ error: false });
    try {
      const { filter, origin: at } = get();
      const r = await api.discover({ activity: filter.length ? filter : undefined, ...(at ?? {}) });
      if (seq !== requestSeq) return;
      set({ plans: r.plans ?? [], filter: r.filter ?? [], loaded: true });
    } catch {
      if (seq === requestSeq) set({ error: true, loaded: true });
    }
  },
  /* Son seçili tür KALDIRILAMAZ: sunucu boş süzgeci ilgi alanlarına çevirir ve yanıttaki
     `filter` çipleri geri zıplatırdı — kullanıcının yaptığı şey sessizce geri alınmış olurdu. */
  toggle: (a) => {
    const f = get().filter;
    if (f.includes(a) && f.length === 1) return;
    set({ filter: f.includes(a) ? f.filter((x) => x !== a) : [...f, a] });
    void get().load();
  },
  selectAll: () => {
    set({ filter: [...ALL_ACTIVITIES] });
    void get().load();
  },
  setRange: (range) => set({ range }),
  reset: () => {
    requestSeq++;
    set(initial());
  },
}));
