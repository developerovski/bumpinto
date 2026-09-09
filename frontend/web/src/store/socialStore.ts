import type { Schemas } from "@bumpinto/shared";
import { reportThenBlock } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";
import { useSessionStore } from "./sessionStore";
import { useToastStore } from "./toastStore";

export type ReportReason = Schemas["ReportRequest"]["reason"];

/** Sunucu da 60 sn uygular (§2) — istemci kopyası yalnız gereksiz 429'u önler. */
export const NUDGE_COOLDOWN_MS = 60_000;

type SocialState = {
  nudgedAt: Record<string, number>;
  blocked: Record<string, true>;
  busy: boolean;
  canNudge: (participantId: string) => boolean;
  nudge: (slug: string, participantId: string, name: string) => Promise<void>;
  report: (slug: string, participantId: string, name: string, reason: ReportReason, note?: string) => Promise<void>;
  block: (participantId: string, name: string) => Promise<void>;
};

const toast = (key: string, params?: Record<string, string | number>, tone?: "grass" | "flame") =>
  useToastStore.getState().push(key, params, tone);

export const useSocialStore = create<SocialState>((set, get) => ({
  nudgedAt: {},
  blocked: {},
  busy: false,
  canNudge: (id) => Date.now() - (get().nudgedAt[id] ?? -Infinity) >= NUDGE_COOLDOWN_MS,
  nudge: async (slug, participantId, name) => {
    if (!get().canNudge(participantId)) {
      toast("presence.nudgeCooling", undefined, "flame");
      return;
    }
    set({ nudgedAt: { ...get().nudgedAt, [participantId]: Date.now() } });
    try {
      await api.nudge(slug, participantId);
      toast("presence.nudgeSent", { name });
    } catch {
      const { [participantId]: _dropped, ...rest } = get().nudgedAt;
      set({ nudgedAt: rest });
      toast("presence.nudgeError", undefined, "flame");
    }
  },
  /* "Bildir" tek düğme ama İKİ yazma. Engel düşerse rapor ZATEN gitmiştir: jenerik
     "gönderilemedi" kullanıcıyı tekrar denemeye iter ve mükerrer rapor açar (K-W33).
     Hangi adımın düştüğü paylaşılan `reportThenBlock`tan gelir. */
  report: async (slug, participantId, name, reason, note) => {
    set({ busy: true });
    const outcome = await reportThenBlock(
      () => api.report({ sessionSlug: slug, targetParticipantId: participantId, reason, note }),
      () => api.blockParticipant({ participantId }),
    );
    // `blocked` YALNIZ gerçekten engellendiyse işaretlenir: engel düşmüşken kişiyi yerel
    // olarak gizlemek, sunucu onu hâlâ içeri alırken sahte bir güvenlik duygusu verirdi.
    if (outcome === "done") {
      set({ blocked: { ...get().blocked, [participantId]: true } });
      await useSessionStore.getState().refresh();
    }
    set({ busy: false });
    if (outcome === "done") toast("social.reported", { name });
    else if (outcome === "reportFailed") toast("social.error", undefined, "flame");
    else toast("social.reportedNotBlocked", { name }, "flame");
  },
  block: async (participantId, name) => {
    set({ busy: true });
    try {
      await api.blockParticipant({ participantId });
      set({ blocked: { ...get().blocked, [participantId]: true } });
      await useSessionStore.getState().refresh();
      toast("social.blocked", { name });
    } catch {
      toast("social.error", undefined, "flame");
    } finally {
      set({ busy: false });
    }
  },
}));
