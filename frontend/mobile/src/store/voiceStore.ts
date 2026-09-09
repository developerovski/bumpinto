import type { IncomingSignal, MeshStream, PeerSnapshot, SessionView } from "@bumpinto/shared";
import { VoiceMesh } from "@bumpinto/shared";
import { create } from "zustand";

import { api } from "../lib/api";
import { requestBluetoothConnect } from "../lib/permissions";
import { createAudioSession } from "../voice/audioSession";
import { acquireMic } from "../voice/micPermission";
import { createRnPeer, createSilentSink } from "../voice/rnAdapters";
import { createStatsLevelSampler } from "../voice/statsLevels";
import { liveChannel, voiceInbox, voiceSignal } from "./liveChannel";
import { useSessionStore, viewerId } from "./sessionStore";

/**
 * Sesli sohbet durumu — W-11'in web store'unun RN portu.
 *
 * Davranış sözleşmesi AYNEN korundu: `joinToken` (yarıda kesilen katılım mikrofonu bırakır),
 * yeniden katılma soğuması, `lastRoster`/`resetRoster`, üst üste iki görünümde kaybolunca
 * üyelik sağlaması, 10 sn'lik `endedReason` penceresi, `teardown()`.
 *
 * Mobile özgü olanlar: izin+akış tek adımda `acquireMic()` (M-5'in O7 ön-ekranı üzerinden),
 * `audioSession` (yankı iptali + kulaklık/hoparlör yönlendirmesi) ve arka planda susma kancası.
 */
const warn = __DEV__ ? (m: string, ...rest: unknown[]) => console.warn(m, ...rest) : undefined;

const audioSession = createAudioSession();

export type VoicePhase = "idle" | "joining" | "in" | "error";
export type EndReason = "HOST" | "TIME_LIMIT" | "EMPTY";

type VoiceState = {
  phase: VoicePhase;
  muted: boolean;
  peers: Record<string, PeerSnapshot>;
  selfSpeaking: boolean;
  /** Son kapanışın sebebi; dock 10 sn gösterir. */
  endedReason: EndReason | null;
  micDenied: boolean;
  /** Sistem bir daha SORMAZ — tek yol Ayarlar (O6 kurtarması). */
  micBlocked: boolean;
  /** Kimlik isteği 409 DIŞINDA bir hatayla düştü (oda kapanmadı — ağ/sunucu sorunu). */
  connectFailed: boolean;
  speakerOn: boolean;
  start: () => Promise<void>;
  end: () => Promise<void>;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  /** T7 arka plan bekçisi: uygulama öne/arkaya geçerken mikrofonu susturur/açar. */
  setBackgroundMuted: (on: boolean) => void;
  ended: (reason: EndReason) => void;
  resetRoster: () => void;
};

const ENDED_VISIBLE_MS = 10_000;
/** Sunucu bütçesi: SUBSCRIBE/UNSUBSCRIBE soket başına 20/dk (VoiceInboundGuard). Hızlı
    ayrıl→katıl döngüsü bu bütçeyi tüketmesin diye join() bir süre bekler. */
const REJOIN_COOLDOWN_MS = 1000;

// Mesh React dışında, modül düzeyinde yaşar: ekran geçişleri (Lobi → Mekanlar → Deste) onu
// unmount ETMEZ (spec §7).
let mesh: VoiceMesh | null = null;
let unsubscribeInbox: (() => void) | null = null;
let pendingSignals: IncomingSignal[] = [];
let endedTimer: ReturnType<typeof setTimeout> | null = null;
let lastRoster: string | null = null;
let joinToken = 0;
let lastLeaveAt = -Infinity;
let missingCount = 0;
/** Arka planda susturma, kullanıcının KENDİ sustur tercihini EZMEZ — dönüşte geri verilir. */
let backgroundMuted = false;

const stopTracks = (s: MeshStream) => s.getTracks().forEach((t) => t.stop());

const slugOf = () => useSessionStore.getState().view?.slug ?? null;
const refresh = async () => {
  const slug = slugOf();
  if (slug) await useSessionStore.getState().loadView(slug);
};

/** Görünümdeki ses üyeleri (kendimiz dahil; mesh kendini eler). Engelli çifti sunucu zaten
    aynı odaya almaz (§2) — istemci süzmesi savunma katmanı, roster yarışında bile ses açılmaz. */
export function rosterOf(view: SessionView | null): string[] {
  return (view?.participants ?? [])
    .filter((p) => p.inVoice && p.id && !p.blocked)
    .map((p) => p.id as string);
}

export function blockedIdsOf(view: SessionView | null): Set<string> {
  return new Set(
    (view?.participants ?? []).filter((p) => p.blocked && p.id).map((p) => p.id as string),
  );
}

function teardown() {
  joinToken += 1;
  mesh?.close();
  mesh = null;
  unsubscribeInbox?.();
  unsubscribeInbox = null;
  pendingSignals = [];
  lastRoster = null;
  missingCount = 0;
  backgroundMuted = false;
  if (endedTimer) {
    clearTimeout(endedTimer);
    endedTimer = null;
  }
  audioSession.stop();
}

/** Sunucunun HTTP durumu — mobilde `AxiosError` sınıfını içe aktarmadan (yapısal okuma). */
const statusOf = (e: unknown) => (e as { response?: { status?: number } }).response?.status;

export const useVoiceStore = create<VoiceState>((set, get) => ({
  phase: "idle",
  muted: false,
  peers: {},
  selfSpeaking: false,
  endedReason: null,
  micDenied: false,
  micBlocked: false,
  connectFailed: false,
  speakerOn: false,

  start: async () => {
    const slug = slugOf();
    if (!slug) return;
    // 10 sn'lik "Süre doldu" penceresinde yeniden başlatma eski sebebi silmeli.
    set({ endedReason: null });
    await api.voiceStart(slug);
    // Bayat oda: sunucu voice_started'dan ÖNCE voice_ended{TIME_LIMIT} yayınlayabilir.
    set({ endedReason: null });
    await refresh();
  },

  end: async () => {
    const slug = slugOf();
    if (!slug) return;
    await api.voiceEnd(slug);
    await refresh();
  },

  join: async () => {
    const view = useSessionStore.getState().view;
    const slug = view?.slug ?? null;
    const me = viewerId(view);
    const phase = get().phase;
    if (!slug || !me || phase === "joining" || phase === "in") return;
    if (Date.now() - lastLeaveAt < REJOIN_COOLDOWN_MS) return;

    const token = ++joinToken;
    set({ phase: "joining", micDenied: false, micBlocked: false, connectFailed: false, endedReason: null });

    // İzin + akış TEK adımda: O7 ön-ekranı, sistem diyaloğu ve red ayrımı M-5'te (§4.4 —
    // reddedilirse SUNUCUYA HİÇ gidilmez, oylama akışı bundan etkilenmez).
    const mic = await acquireMic();
    if (mic.status !== "granted") {
      if (token === joinToken) {
        // "dismissed" kullanıcının kendi kararı: hata gösterme, sessizce başa dön.
        if (mic.status === "dismissed") set({ phase: "idle" });
        else
          set({
            phase: "error",
            micDenied: mic.status === "denied",
            micBlocked: mic.status === "blocked",
            connectFailed: mic.status === "failed",
          });
      }
      return;
    }
    const stream = mic.stream;

    if (token !== joinToken) {
      stopTracks(stream); // leave() bu denemeyi iptal etti — mikrofonu bırak, başka dokunma
      return;
    }

    // Sıra bilinçli (spec §7): abonelik = üyelik; kimlik almadan bağlantı açılmaz. Mesh
    // kurulana kadar gelen sinyal kuyruklanır — karşı tarafın ilk offer'ı kimlik isteği
    // sırasında gelebilir.
    unsubscribeInbox = liveChannel.subscribe(voiceInbox(slug, me), (body) => {
      let signal: IncomingSignal;
      try {
        signal = JSON.parse(body) as IncomingSignal;
      } catch {
        return; // bozuk gövde: yoksay
      }
      // İkinci kapı: engellenen çift arasında sinyal taşınmaz (R-M7).
      if (blockedIdsOf(useSessionStore.getState().view).has(signal.from)) return;
      if (mesh) void mesh.handleSignal(signal);
      else pendingSignals.push(signal);
    });

    let credentials: Awaited<ReturnType<typeof api.voiceCredentials>>;
    try {
      credentials = await api.voiceCredentials(slug);
    } catch (e) {
      if (token !== joinToken) {
        stopTracks(stream);
        return;
      }
      const status = statusOf(e);
      stopTracks(stream);
      teardown();
      // 409: oda gerçekten kapandı (host bitirdi/süre doldu) — sessizce idle. Diğer hatalar
      // geçici olabilir: kullanıcıya göster.
      if (status === 409) set({ phase: "idle" });
      else set({ phase: "error", connectFailed: true });
      return;
    }
    if (token !== joinToken) {
      stopTracks(stream);
      return;
    }

    try {
      // Bluetooth yönlendirmesi EN İYİ ÇABA: reddedilse de sesli sohbet sürer (ses telefondan
      // çıkar). Bu yüzden sonucu beklenir ama KONTROL EDİLMEZ — akışı kesmez.
      await requestBluetoothConnect().catch(() => undefined);
      // Ses oturumu mesh'ten ÖNCE: ilk uzak track geldiğinde yönlendirme hazır olmalı.
      audioSession.start();
      mesh = new VoiceMesh({
        myId: me,
        iceServers: (credentials.iceServers ?? [])
          .filter((s) => s.urls && s.urls.length > 0)
          .map((s) => ({
            urls: s.urls ?? [],
            username: s.username ?? undefined,
            credential: s.credential ?? undefined,
          })),
        stream,
        send: (signal) => {
          const ok = liveChannel.publish(voiceSignal(slug), signal);
          if (!ok) warn?.("voice signal publish failed (not connected)", signal);
        },
        onChange: (peers, selfSpeaking) => set({ peers, selfSpeaking }),
        createPeer: createRnPeer,
        createAudio: createSilentSink,
        createLevels: (cb) => createStatsLevelSampler(cb, { selfId: me, intervalMs: 200 }),
        onWarn: warn,
      });
      mesh.setMuted(get().muted);
      const roster = rosterOf(useSessionStore.getState().view);
      mesh.setRoster(roster);
      lastRoster = roster.join(",");
      for (const signal of pendingSignals.splice(0)) void mesh.handleSignal(signal);
      set({ phase: "in" });
    } catch {
      // Kurulum fırlattı — "joining"de asılı kalma.
      stopTracks(stream);
      if (token !== joinToken) return;
      teardown();
      set({ phase: "error", connectFailed: true });
    }
  },

  leave: () => {
    lastLeaveAt = Date.now();
    teardown();
    set({
      phase: "idle",
      peers: {},
      selfSpeaking: false,
      micDenied: false,
      micBlocked: false,
      connectFailed: false,
      speakerOn: false,
    });
  },

  toggleMute: () => {
    const muted = !get().muted;
    mesh?.setMuted(muted || backgroundMuted);
    set({ muted });
  },

  toggleSpeaker: () => {
    const speakerOn = !get().speakerOn;
    audioSession.setSpeaker(speakerOn);
    set({ speakerOn });
  },

  /** Arka planda mikrofon susar (O7'de verilen söz). Kullanıcının kendi tercihi KORUNUR:
      dönüşte yalnız arka plan susturması kalkar, `muted` olduğu gibi kalır. */
  setBackgroundMuted: (on) => {
    backgroundMuted = on;
    mesh?.setMuted(on || get().muted);
  },

  resetRoster: () => {
    lastRoster = null;
  },

  ended: (reason) => {
    // Olay koşulsuz "oda gitti" demek: tazeleme başarısız olsa bile mikrofon kapanır.
    get().leave();
    set({ endedReason: reason });
    if (endedTimer) clearTimeout(endedTimer);
    endedTimer = setTimeout(() => set({ endedReason: null }), ENDED_VISIBLE_MS);
  },
}));

// Görünüm değişince: oda kapandıysa çık (bu "joining" sırasında da geçerli — kimlik beklerken
// oda kapanabilir). Roster'ı yalnız "in" fazındayken ve gerçekten değiştiyse mesh'e ilet.
useSessionStore.subscribe((state) => {
  const voice = useVoiceStore.getState();
  if (voice.phase !== "in" && voice.phase !== "joining") return;
  if (!state.view?.voice) {
    voice.leave();
    return;
  }
  if (voice.phase !== "in") return;

  const rosterIds = rosterOf(state.view);
  // Üyelik sağlaması: sunucu bizi roster'dan düşürdüyse ÜST ÜSTE iki görünümde de
  // görünmediğimiz doğrulanmadan çıkılmaz — tek kaçırılmış görünüm ekranı boşuna kesmesin.
  if (!rosterIds.includes(viewerId(state.view) ?? "")) {
    missingCount += 1;
    if (missingCount >= 2) {
      voice.leave();
      useVoiceStore.setState({ phase: "error", connectFailed: true });
      return;
    }
  } else {
    missingCount = 0;
  }

  const roster = rosterIds.join(",");
  if (roster === lastRoster) return;
  lastRoster = roster;
  mesh?.setRoster(rosterIds);
});
