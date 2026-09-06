import type { SessionView } from "@bumpinto/shared";
import { AxiosError } from "axios";
import { create } from "zustand";
import { api } from "../lib/api";
import { createLevelSampler, sharedAudioContext } from "../lib/audioLevels";
import { VoiceMesh, type IncomingSignal, type PeerSnapshot } from "../lib/voiceMesh";
import { liveChannel, voiceInbox, voiceSignal } from "./liveChannel";
import { useSessionStore, viewerId } from "./sessionStore";

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
  /** Kimlik isteği 409 DIŞINDA bir hatayla düştü (oda kapanmadı — ağ/sunucu sorunu). */
  connectFailed: boolean;
  start: () => Promise<void>;
  end: () => Promise<void>;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  ended: (reason: EndReason) => void;
  resetRoster: () => void;
};

const ENDED_VISIBLE_MS = 10_000;
/** Sunucu bütçesi: SUBSCRIBE/UNSUBSCRIBE soket başına 20/dk (VoiceInboundGuard). Hızlı ayrıl→katıl
    döngüsü (çift tıklama, sekme odak sıçraması) bu bütçeyi hızla tüketmesin diye join() bir süre bekler. */
const REJOIN_COOLDOWN_MS = 1000;

// Mesh React dışında, modül düzeyinde yaşar: sayfa geçişleri (Lobi → Mekanlar → Deste) onu
// unmount ETMEZ (spec §7).
let mesh: VoiceMesh | null = null;
let unsubscribeInbox: (() => void) | null = null;
let pendingSignals: IncomingSignal[] = [];
let endedTimer: ReturnType<typeof setTimeout> | null = null;
/** Son mesh'e iletilen roster (virgüllü id listesi) — aynıysa setRoster'ı tekrar tetikleme. */
let lastRoster: string | null = null;
// Her join() denemesi kendi jetonunu alır: leave() jetonu ilerletip in-flight denemeyi geçersiz
// kılar. Bir denemenin await'ten döndüğü an jeton değişmişse modül alanlarına (mesh/abonelik)
// DOKUNMAZ — daha yeni bir deneme onları çoktan sahiplenmiş olabilir; yalnız kendi mikrofonunu bırakır.
let joinToken = 0;
/** leave() bunu yazar; join() bu süre dolmadan sunucuya SUBSCRIBE/UNSUBSCRIBE göndermez. */
let lastLeaveAt = -Infinity;
/** Üyelik sağlaması: kendi id'miz üst üste kaç görünümde roster'da YOK — bkz. subscribe altta. */
let missingCount = 0;

const stopTracks = (s: MediaStream) => s.getTracks().forEach((t) => t.stop());

/** Görünümdeki ses üyeleri (kendimiz dahil; mesh kendini eler). */
export function rosterOf(view: SessionView | null): string[] {
  return (view?.participants ?? []).filter((p) => p.inVoice && p.id).map((p) => p.id as string);
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
  if (endedTimer) {
    clearTimeout(endedTimer);
    endedTimer = null;
  }
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  phase: "idle",
  muted: false,
  peers: {},
  selfSpeaking: false,
  endedReason: null,
  micDenied: false,
  connectFailed: false,

  start: async () => {
    const { slug, refresh } = useSessionStore.getState();
    if (!slug) return;
    set({ endedReason: null }); // 10 sn'lik "Süre doldu" penceresinde yeniden başlatma eski sebebi silmeli
    await api.voiceStart(slug);
    // Bayat oda: sunucu voice_started'dan ÖNCE voice_ended{TIME_LIMIT} yayınlayabilir — o olay
    // await sırasında ended()'i tetikleyip sebebi geri yazmış olabilir. POST döner dönmez tekrar sil.
    set({ endedReason: null });
    await refresh();
  },

  end: async () => {
    const { slug, refresh } = useSessionStore.getState();
    if (!slug) return;
    await api.voiceEnd(slug);
    await refresh();
  },

  join: async () => {
    // Tıklama görevinin İLK satırı, ilk await'ten ÖNCE — Safari bunu jestin bir parçası sayar.
    const audioCtx = sharedAudioContext();
    const { slug, view } = useSessionStore.getState();
    const me = viewerId(view);
    const phase = get().phase;
    if (!slug || !me || phase === "joining" || phase === "in") return;
    if (Date.now() - lastLeaveAt < REJOIN_COOLDOWN_MS) return; // sunucu SUBSCRIBE/UNSUBSCRIBE bütçesi
    const token = ++joinToken;
    set({ phase: "joining", micDenied: false, connectFailed: false, endedReason: null });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      if (token === joinToken) set({ phase: "error", micDenied: true });
      return;
    }
    if (token !== joinToken) {
      stopTracks(stream); // leave() bu denemeyi zaten iptal etti — mikrofonu bırak, başka dokunma
      return;
    }
    // Sıra bilinçli (spec §7): abonelik = üyelik; kimlik almadan bağlantı açılmaz. Mesh kurulana
    // kadar gelen sinyal kuyruklanır — karşı tarafın ilk offer'ı kimlik isteği sırasında gelebilir.
    unsubscribeInbox = liveChannel.subscribe(voiceInbox(slug, me), (body) => {
      let signal: IncomingSignal;
      try {
        signal = JSON.parse(body) as IncomingSignal;
      } catch {
        return; // bozuk gövde: yoksay
      }
      if (mesh) void mesh.handleSignal(signal);
      else pendingSignals.push(signal);
    });
    let credentials: Awaited<ReturnType<typeof api.voiceCredentials>>;
    try {
      credentials = await api.voiceCredentials(slug);
    } catch (e) {
      if (token !== joinToken) {
        stopTracks(stream); // daha yeni deneme abonelik/mesh alanlarını çoktan sahiplendi
        return;
      }
      const status = e instanceof AxiosError ? e.response?.status : undefined;
      stopTracks(stream);
      teardown();
      // 409: oda gerçekten kapandı (host bitirdi/süre doldu) — sessizce idle. Diğer hatalar
      // (ağ, 5xx) geçici olabilir: kullanıcıya göster, "connectFailed" ile ayırt et.
      if (status === 409) set({ phase: "idle" });
      else set({ phase: "error", connectFailed: true });
      return;
    }
    if (token !== joinToken) {
      stopTracks(stream);
      return;
    }
    try {
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
          if (!ok && import.meta.env.DEV) console.warn("voice signal publish failed (not connected)", signal);
        },
        onChange: (peers, selfSpeaking) => set({ peers, selfSpeaking }),
        createLevels: (cb) => createLevelSampler(cb, { context: audioCtx }),
      });
      mesh.setMuted(get().muted);
      const roster = rosterOf(useSessionStore.getState().view);
      mesh.setRoster(roster);
      lastRoster = roster.join(",");
      for (const signal of pendingSignals.splice(0)) void mesh.handleSignal(signal);
      set({ phase: "in" });
    } catch {
      // AudioContext / RTCPeerConnection kurulumu fırlattı — "joining"de asılı kalma.
      stopTracks(stream);
      if (token !== joinToken) return;
      teardown();
      set({ phase: "error", connectFailed: true });
    }
  },

  leave: () => {
    lastLeaveAt = Date.now();
    teardown();
    set({ phase: "idle", peers: {}, selfSpeaking: false, micDenied: false, connectFailed: false });
  },

  toggleMute: () => {
    const muted = !get().muted;
    mesh?.setMuted(muted);
    set({ muted });
  },

  /** WS yeniden bağlanınca çağrılır: bir sonraki görünüm güncellemesinde setRoster'ı DEĞİŞMEMİŞ
      olsa bile tekrar çalıştırır — kopukluk sırasında failed'e düşmüş peer'leri canlandırır. */
  resetRoster: () => {
    lastRoster = null;
  },

  ended: (reason) => {
    // Olay koşulsuz "oda gitti" demek: refresh() geçici olarak başarısız olsa bile mikrofon kapanır.
    get().leave();
    set({ endedReason: reason });
    if (endedTimer) clearTimeout(endedTimer);
    endedTimer = setTimeout(() => set({ endedReason: null }), ENDED_VISIBLE_MS);
  },
}));

// Görünüm değişince: oda kapandıysa (voice null; bind() sıfırlaması ve 401 dahil) çık — bu,
// "joining" sırasında da geçerli (kimlik beklerken oda kapanabilir). Roster'ı yalnız "in"
// fazındayken ve gerçekten değiştiyse mesh'e ilet (30 sn'lik poll her turda tetiklemesin).
useSessionStore.subscribe((state) => {
  const voice = useVoiceStore.getState();
  if (voice.phase !== "in" && voice.phase !== "joining") return;
  if (!state.view?.voice) {
    voice.leave();
    return;
  }
  if (voice.phase !== "in") return;
  const rosterIds = rosterOf(state.view);
  // Üyelik sağlaması: sunucu bizi roster'dan düşürdüyse (ör. bir tutarsızlık) ÜST ÜSTE iki
  // görünümde de görünmediğimiz doğrulanmadan çıkılmaz — tek kaçırılmış görünüm ekranı boşuna kesmesin.
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
