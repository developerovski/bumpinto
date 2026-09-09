import { useEffect } from "react";
import { AppState } from "react-native";

import { API_BASE_URL, participantToken } from "../lib/api";
import { liveChannel, sessionTopic } from "./liveChannel";
import { useNetStore } from "./netStore";
import { useSessionStore } from "./sessionStore";
import { useVoiceStore, type EndReason } from "./voiceStore";

/**
 * Oturum görünümünü CANLI tutar. Birincil yol **STOMP** (M-6); poll yalnız emniyet ağı.
 *
 * M-7'de bu kanca 3 sn'lik poll'du — açık ekran başına 20 GET/dk. Olaylar artık kanaldan
 * geliyor; 30 sn'lik tur yalnız iki boşluğu kapatır: WS kopukluğu ve yayınlanmayan `EXPIRED`
 * geçişi. Yükü 10 kat düşürür.
 *
 * Poll kapıları M-7'den KORUNDU (web'de karşılığı yok, mobilde şart): uygulama arka plandayken
 * ya da çevrimdışıyken istek atılmaz, öne dönüşte hemen bir tik atılır. Kanal kendi yeniden
 * bağlanmasını `reconnectDelay` ile yönetir.
 *
 * Ses bağlantıları da buradan geçer: `voice_ended` sebebi dock'a taşınır, WS yeniden
 * bağlanınca roster mesh'e tekrar itilir (kopukluk sırasında failed'e düşen peer'ler canlanır)
 * ve ekran bırakılırken mikrofon SERBEST kalır.
 */
const POLL_MS = 30000;

/** Olaylar "tazele" zilidir; tek istisna `voice_ended`: sebebi dock'a taşır (spec §6). */
export function endedReasonOf(body: string): EndReason | null {
  try {
    const event = JSON.parse(body) as { type?: string; payload?: { reason?: string } };
    if (event.type !== "voice_ended") return null;
    const reason = event.payload?.reason;
    return reason === "HOST" || reason === "TIME_LIMIT" || reason === "EMPTY" ? reason : null;
  } catch {
    return null;
  }
}

export function useSessionLive(slug: string | undefined) {
  const loadView = useSessionStore((s) => s.loadView);

  useEffect(() => {
    if (!slug) return;
    let alive = true;

    const tick = () => {
      if (!alive || AppState.currentState !== "active" || !useNetStore.getState().online) return;
      void loadView(slug);
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    const appState = AppState.addEventListener("change", (state) => state === "active" && tick());

    // Abonelik açılıştan ÖNCE kaydedilir: `liveChannel` bağlanınca kurar, kaçan olay olmaz.
    const unsubscribe = liveChannel.subscribe(sessionTopic(slug), (body) => {
      void loadView(slug);
      const reason = endedReasonOf(body);
      if (reason) useVoiceStore.getState().ended(reason);
    });
    const close = liveChannel.open(
      slug,
      API_BASE_URL,
      () => participantToken(slug),
      () => {
        // Bağlı OLUNMAYAN pencerede kaçan olayları kapatır (abonelik zaten kaydedilmişti).
        void loadView(slug);
        useVoiceStore.getState().resetRoster();
      },
    );

    return () => {
      alive = false;
      clearInterval(timer);
      appState.remove();
      // Mikrofon abonelik hâlâ CANLIYKEN bırakılır: `leave()` önce, ki ses kutusunun
      // UNSUBSCRIBE çerçevesi soket kapanmadan gitsin.
      useVoiceStore.getState().leave();
      unsubscribe();
      close();
    };
  }, [slug, loadView]);
}
