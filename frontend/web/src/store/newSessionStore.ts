import type { ParticipantDto, Schemas } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";
import { approx } from "../lib/geo";
import { DEFAULT_TRAVEL_MODE, type TravelMode } from "../lib/travelMode";

export type SessionType = "GROUP" | "SOLO";
export type Loc = { lat: number; lng: number; label: string | null };
export type LocalPoint = {
  displayName: string;
  locationLabel: string | null;
  lat: number;
  lng: number;
  travelMode: TravelMode;
};
type Activity = Schemas["CreateSessionRequest"]["activityType"];

type State = {
  type: SessionType; activity: Activity; name: string; points: LocalPoint[]; travelMode: TravelMode;
  busy: boolean; error: string | null;
  setType: (t: SessionType) => void; setActivity: (a: Activity) => void; setName: (n: string) => void;
  setTravelMode: (m: TravelMode) => void;
  addLocalPoint: (p: LocalPoint) => void; removeLocalPoint: (index: number) => void;
  setLocalPointTravelMode: (index: number, mode: TravelMode) => void;
  /** Kur (+ SOLO: noktaları ekle, mekanları bul). Oturum slug'ını döner. */
  submit: (displayName: string, own: Loc) => Promise<string>;
  reset: () => void;
};

const initial = (): Pick<State, "type" | "activity" | "name" | "points" | "travelMode" | "busy" | "error"> => ({
  type: "GROUP",
  activity: "COFFEE",
  name: "",
  points: [],
  travelMode: DEFAULT_TRAVEL_MODE,
  busy: false,
  error: null,
});

export const useNewSessionStore = create<State>((set, get) => ({
  ...initial(),
  setType: (t) => set({ type: t }),
  setActivity: (a) => set({ activity: a }),
  setName: (n) => set({ name: n }),
  setTravelMode: (m) => set({ travelMode: m }),
  addLocalPoint: (p) => set((s) => ({ points: [...s.points, p] })),
  removeLocalPoint: (index) => set((s) => ({ points: s.points.filter((_, i) => i !== index) })),
  setLocalPointTravelMode: (index, mode) =>
    set((s) => ({ points: s.points.map((p, i) => (i === index ? { ...p, travelMode: mode } : p)) })),
  submit: async (displayName, own) => {
    const { type, activity, name, points, travelMode } = get();
    set({ busy: true, error: null });
    try {
      let slug: string;
      try {
        const r = await api.createSession({
          activityType: activity,
          sessionType: type,
          name: name.trim() || undefined,
          lat: own.lat,
          lng: own.lng,
          displayName,
          locationLabel: own.label ?? undefined,
          travelMode,
        });
        if (!r.slug) throw new Error("slug missing");
        slug = r.slug;
      } catch (e) {
        set({ error: "newSession.errCreate" });
        throw e;
      }
      if (type === "SOLO") {
        try {
          for (const p of points) {
            await api.addPoint(slug, {
              displayName: p.displayName,
              locationLabel: p.locationLabel ?? undefined,
              lat: p.lat,
              lng: p.lng,
              travelMode: p.travelMode,
            });
          }
          await api.findVenues(slug);
        } catch {
          // oturum kuruldu; eksikler SoloSetup ekranında sunucu durumundan görülür
        }
      }
      return slug;
    } finally {
      set({ busy: false });
    }
  },
  reset: () => set({ ...initial() }),
}));

/** Kendi konum (varsa) + eklenen nokta sayısı. */
export function pointCount<T>(own: { label?: string | null } | null, points: T[]) {
  return (own ? 1 : 0) + points.length;
}

/** SOLO harita önizlemesi — kendi konum + elle eklenen noktalar (henüz sunucuda değil). */
export function previewParticipants(own: Loc | null, points: LocalPoint[], selfName: string): ParticipantDto[] {
  const list: ParticipantDto[] = [];
  if (own) {
    list.push({
      id: "own",
      displayName: selfName,
      host: true,
      hasLocation: true,
      deckDone: false,
      manual: false,
      locationLabel: own.label ?? undefined,
      approxLocation: approx(own),
    });
  }
  points.forEach((p, i) => {
    list.push({
      id: `p${i}`,
      displayName: p.displayName,
      host: false,
      hasLocation: true,
      deckDone: false,
      manual: true,
      locationLabel: p.locationLabel ?? undefined,
      approxLocation: approx(p),
    });
  });
  return list;
}
