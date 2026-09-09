import type { Schemas } from "@bumpinto/shared";
import * as Haptics from "expo-haptics";
import { create } from "zustand";

import { api } from "../lib/api";
import { onSessionEvent, type SessionEventLike } from "./liveEvents";
import { useToastStore } from "./toastStore";

export type ReportReason = Schemas["ReportRequest"]["reason"];

/** Sunucu da 60 sn uygular (§2) — istemci kopyası yalnız gereksiz 429'u önler. */
export const NUDGE_COOLDOWN_MS = 60_000;

const toast = (
  key: string,
  params?: Record<string, string | number>,
  tone?: "grass" | "flame" | "neutral",
) => useToastStore.getState().push(key, params, tone);

/**
 * Bildir / engelle + DÜRT durumu (R-M7, R-M9) — web `socialStore` ile AYNI davranış.
 *
 * Bildirme ARDINDAN engelleme otomatik gelir (Apple 1.2): bildiren kişi, bildirdiği kişiyi
 * oturumda görmeye devam etmemeli. İki çağrı da başarılıysa satır yerel olarak engellenir;
 * sunucu tazelemesi M-7 oturum ekranında olur.
 *
 * DÜRTMENİN TEK SAHİBİ burasıdır (M-9): soğuma sayacı, iyimser damga ve bildirimler yalnız
 * bu depodan çıkar — hiçbir ekran ya da molekül `api.nudge`ı doğrudan çağırmaz. Aksi hâlde
 * iki ekran (P10 ve P17) aynı kişi için ayrı sayaç tutardı.
 */
type SocialState = {
  blocked: Record<string, true>;
  /** Katılımcı başına son dürtme anı (ms). */
  nudgedAt: Record<string, number>;
  busy: boolean;
  /** i18n ANAHTARI (metin değil). */
  notice: { key: string; name: string } | null;
  error: string | null;
  report: (slug: string, participantId: string, reason: ReportReason, note?: string) => Promise<void>;
  block: (participantId: string) => Promise<void>;
  clearNotice: () => void;
  canNudge: (participantId: string) => boolean;
  nudge: (slug: string, participantId: string, name: string) => Promise<void>;
  /** Kendi katılımcı kimliğiyle `nudged` olayına abone olur; dönen fonksiyon bırakır. */
  listen: (selfParticipantId: string | null | undefined) => () => void;
};

export const useSocialStore = create<SocialState>((set, get) => ({
  blocked: {},
  nudgedAt: {},
  busy: false,
  notice: null,
  error: null,

  async report(slug, participantId, reason, note) {
    set({ busy: true, error: null });
    try {
      await api.report({ sessionSlug: slug, targetParticipantId: participantId, reason, note });
      await api.blockParticipant({ participantId });
      set({ blocked: { ...get().blocked, [participantId]: true } });
    } catch {
      set({ error: "social.error" });
    } finally {
      set({ busy: false });
    }
  },

  async block(participantId) {
    set({ busy: true, error: null });
    try {
      await api.blockParticipant({ participantId });
      set({ blocked: { ...get().blocked, [participantId]: true } });
    } catch {
      set({ error: "social.error" });
    } finally {
      set({ busy: false });
    }
  },

  clearNotice: () => set({ notice: null }),

  canNudge: (id) => Date.now() - (get().nudgedAt[id] ?? -Infinity) >= NUDGE_COOLDOWN_MS,

  async nudge(slug, participantId, name) {
    if (!get().canNudge(participantId)) {
      toast("presence.nudgeCooling", undefined, "flame");
      return;
    }
    // Soğuma İSTEKTEN ÖNCE yazılır (çift dokunuş ikinci isteği doğurmasın), hatada geri alınır.
    set({ nudgedAt: { ...get().nudgedAt, [participantId]: Date.now() } });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.nudge(slug, participantId);
      toast("presence.nudgeSent", { name }, "grass");
    } catch {
      const { [participantId]: _dropped, ...rest } = get().nudgedAt;
      set({ nudgedAt: rest });
      toast("presence.nudgeError", undefined, "flame");
    }
  },

  listen: (selfParticipantId) => {
    if (!selfParticipantId) return () => undefined;
    return onSessionEvent((event: SessionEventLike) => {
      if (event.type !== "nudged") return;
      // Olay TOPIC'e yayınlanır, yani herkese ulaşır — bildirim yalnız HEDEFTE çıkar.
      if (event.payload?.toParticipantId !== selfParticipantId) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast("presence.nudged", undefined, "flame");
    });
  },
}));
