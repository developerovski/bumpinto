import type { ParticipantDto, Schemas, SessionPreview, SessionView } from "@bumpinto/shared";
import { AxiosError } from "axios";
import { create } from "zustand";
import { api } from "../lib/api";

// refresh(): mutasyondan önce başlayan GET yanıtı bayat sayılır
let mutations = 0;

// Mutasyon öncesi ve sonrası sayaç artar: arada başlayan GET yanıtı bayat sayılır.
async function mutate<T>(fn: () => Promise<T>): Promise<T> {
  mutations += 1;
  try {
    return await fn();
  } finally {
    mutations += 1;
  }
}

/** Sunucunun "sen kimsin" yanıtı — SessionView.viewer.participantId ile eşleşen katılımcı. */
export function viewerOf(view: SessionView | null): ParticipantDto | null {
  const id = view?.viewer?.participantId;
  if (!id) return null;
  return view?.participants?.find((p) => p.id === id) ?? null;
}

/** Görüntüleyenin katılımcı id'si — SessionView.viewer.participantId. */
export function viewerId(view: SessionView | null) {
  return view?.viewer?.participantId ?? null;
}

/** Görüntüleyen bu oturumun kurucusu mu. */
export function isHost(view: SessionView | null) {
  return !!view?.viewer?.host;
}

/** MapView'e geçilecek harita alanları — katılımcılar, orta nokta, yarıçap, pin etiketleri. */
export function mapProps(view: SessionView | null, youLabel: string, manualLabel?: string) {
  const participants = view?.participants ?? [];
  const mid = view?.midpoint;
  const midpoint = mid?.lat != null && mid?.lng != null ? { lat: mid.lat, lng: mid.lng } : null;
  const radiusKm = view?.radiusKm ?? null;
  const id = viewerId(view);
  const pinLabels: Record<string, string> = {};
  participants.forEach((p) => {
    if (!p.id) return;
    if (id && p.id === id) pinLabels[p.id] = youLabel;
    else if (manualLabel && p.manual) pinLabels[p.id] = `${p.displayName ?? ""} · ${manualLabel}`;
  });
  return { participants, midpoint, radiusKm, pinLabels };
}

type SessionState = {
  slug: string;
  view: SessionView | null;
  needsJoin: boolean;
  /** i18n anahtarı (ör. "session.notFound") — metne SessionPage'de çevrilir. */
  error: string | null;
  /** Katılmadan önce herkese açık özet (id/koordinat yok) — Katıl ekranının sağ kartı. */
  preview: SessionPreview | null;
  bind: (slug: string) => void;
  refresh: () => Promise<void>;
  loadPreview: () => Promise<void>;
  join: (body: Schemas["JoinRequest"]) => Promise<void>;
  updateLocation: (body: Schemas["LocationRequest"]) => Promise<void>;
  findVenues: () => Promise<void>;
  shuffle: () => Promise<void>;
  pick: (venueId: string) => Promise<void>;
  addPoint: (body: Schemas["PointRequest"]) => Promise<void>;
  removePoint: (participantId: string) => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  slug: "",
  view: null,
  needsJoin: false,
  error: null,
  preview: null,

  bind: (slug) => {
    mutations += 1;
    set({ slug, view: null, needsJoin: false, error: null, preview: null });
  },

  loadPreview: async () => {
    const { slug } = get();
    if (!slug) return;
    try {
      const preview = await api.preview(slug);
      set({ preview });
    } catch {
      // önizleme olmadan da katılım formu çalışır — sessiz düş
    }
  },

  refresh: async () => {
    const { slug } = get();
    if (!slug) return;
    const at = mutations;
    try {
      const view = await api.getSession(slug);
      if (at !== mutations) return;
      set({ view, needsJoin: false, error: null });
    } catch (e) {
      if (at !== mutations) return;
      const status = e instanceof AxiosError ? e.response?.status : undefined;
      if (status === 401) {
        set({ needsJoin: true, view: null });
        if (!get().preview) void get().loadPreview();
      } else if (status === 404) set({ error: "session.notFound" });
      // diğer hatalar: mevcut görünümü koru, polling tekrar dener
    }
  },

  join: async (body) => {
    const { slug } = get();
    await mutate(async () => {
      await api.join(slug, body);
      await get().refresh();
    });
  },

  updateLocation: async (body) => {
    const { slug } = get();
    await mutate(async () => {
      await api.updateLocation(slug, body);
      await get().refresh();
    });
  },

  findVenues: async () => {
    await mutate(async () => {
      set({ view: await api.findVenues(get().slug) });
    });
  },
  shuffle: async () => {
    await mutate(async () => {
      set({ view: await api.shuffle(get().slug) });
    });
  },
  pick: async (venueId) => {
    await mutate(async () => {
      set({ view: await api.forceDecision(get().slug, { venueId }) });
    });
  },
  addPoint: async (body) => {
    await mutate(async () => {
      await api.addPoint(get().slug, body);
      await get().refresh();
    });
  },
  removePoint: async (participantId) => {
    if (!participantId) return;
    await mutate(async () => {
      await api.removePoint(get().slug, participantId);
      await get().refresh();
    });
  },
}));
