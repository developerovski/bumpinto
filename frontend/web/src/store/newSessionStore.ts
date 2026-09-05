import type { ParticipantDto, Schemas } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";
import { MAX_ACTIVITIES } from "../lib/activity";
import { approx } from "../lib/geo";
import { DEFAULT_TRAVEL_MODE, type TravelMode } from "../lib/travelMode";

export type SessionType = "GROUP" | "SOLO";
export type AnchorMode = "MIDPOINT" | "ANCHOR";
export type Loc = { lat: number; lng: number; label: string | null };
export type LocalPoint = {
  displayName: string;
  locationLabel: string | null;
  lat: number;
  lng: number;
  travelMode: TravelMode;
};
type Activity = Schemas["CreateSessionRequest"]["activityTypes"][number];

type State = {
  type: SessionType; activities: Activity[]; name: string; points: LocalPoint[]; travelMode: TravelMode;
  busy: boolean; error: string | null;
  setType: (t: SessionType) => void; toggleActivity: (a: Activity) => void; setName: (n: string) => void;
  setTravelMode: (m: TravelMode) => void;
  anchorMode: AnchorMode; anchor: Loc | null;
  setAnchorMode: (m: AnchorMode) => void; setAnchor: (a: Loc | null) => void;
  addLocalPoint: (p: LocalPoint) => void; removeLocalPoint: (index: number) => void;
  setLocalPointTravelMode: (index: number, mode: TravelMode) => void;
  /** Kur (+ SOLO: noktaları ekle, mekanları bul). Oturum slug'ını döner. */
  submit: (displayName: string, own: Loc | null) => Promise<string>;
  reset: (defaultActivity?: Activity) => void;
};

const initial = (): Pick<
  State,
  "type" | "activities" | "name" | "points" | "travelMode" | "busy" | "error" | "anchorMode" | "anchor"
> => ({
  type: "GROUP",
  activities: ["COFFEE"],
  name: "",
  points: [],
  travelMode: DEFAULT_TRAVEL_MODE,
  busy: false,
  error: null,
  anchorMode: "MIDPOINT",
  anchor: null,
});

export const useNewSessionStore = create<State>((set, get) => ({
  ...initial(),
  setType: (t) => set({ type: t }),
  /** Sınırlar TEK yerde: picker chip'i devre dışı bıraksa bile store son sözü söyler.
      Son alan kaldırılmaz — backend boş listeyi 400'le reddediyor. */
  toggleActivity: (a) =>
    set((s) => {
      if (s.activities.includes(a)) {
        return s.activities.length === 1 ? s : { activities: s.activities.filter((x) => x !== a) };
      }
      return s.activities.length >= MAX_ACTIVITIES ? s : { activities: [...s.activities, a] };
    }),
  setName: (n) => set({ name: n }),
  setTravelMode: (m) => set({ travelMode: m }),
  /** Moddan çıkınca çapa DA temizlenir: ekranda görünmeyen bir çapanın istekte kalması
      "orta nokta seçtim ama Amsterdam geldi" demek olurdu. */
  setAnchorMode: (m) => set(m === "MIDPOINT" ? { anchorMode: m, anchor: null } : { anchorMode: m }),
  setAnchor: (a) => set({ anchor: a }),
  addLocalPoint: (p) => set((s) => ({ points: [...s.points, p] })),
  removeLocalPoint: (index) => set((s) => ({ points: s.points.filter((_, i) => i !== index) })),
  setLocalPointTravelMode: (index, mode) =>
    set((s) => ({ points: s.points.map((p, i) => (i === index ? { ...p, travelMode: mode } : p)) })),
  submit: async (displayName, own) => {
    const { type, activities, name, points, travelMode, anchorMode, anchor } = get();
    const anchored = anchorMode === "ANCHOR" && anchor != null;
    set({ busy: true, error: null });
    try {
      let slug: string;
      try {
        const r = await api.createSession({
          activityTypes: activities,
          sessionType: type,
          name: name.trim() || undefined,
          lat: own?.lat,
          lng: own?.lng,
          displayName,
          locationLabel: own?.label ?? undefined,
          travelMode,
          anchor: anchored ? { lat: anchor.lat, lng: anchor.lng, label: anchor.label ?? undefined } : undefined,
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
  /** Varsayılan geçilirse başlangıç seçimi ODUR; yoksa COFFEE. Profil varsayılanını
      toggle ile eklemek yanlış olurdu: reset zaten tek elemanlı bir seçim bırakıyor. */
  reset: (defaultActivity?: Activity) =>
    set({ ...initial(), activities: [defaultActivity ?? "COFFEE"] }),
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
