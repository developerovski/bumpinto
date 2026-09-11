import { useEffect } from "react";
import { useAuthStore } from "./authStore";
import { liveChannel, sessionTopic } from "./liveChannel";
import { useSeatRequestsStore } from "./seatRequestsStore";
import { isHost, useSessionStore } from "./sessionStore";
import { useToastStore } from "./toastStore";
import { useVoiceStore, type EndReason } from "./voiceStore";

/** Emniyet ağı — canlı kanalın YEDEĞİ, birincil yol değil. Olaylar STOMP'tan geliyor; 3 sn'lik
    tur açık sekme başına 20 GET/dk demekti ve tek taşıdığı şey WS kopukluğu + yayınlanmayan
    EXPIRED geçişi. 30 sn ikisini de karşılar, yükü 10 kat düşürür. */
const POLL_MS = 30000;

/** Olaylar "tazele" zilidir; tek istisna `voice_ended`: sebebi dock'a taşır (spec §6). */
function endedReasonOf(body: string): EndReason | null {
  try {
    const event = JSON.parse(body) as { type?: string; payload?: { reason?: string } };
    if (event.type !== "voice_ended") return null;
    const reason = event.payload?.reason;
    return reason === "HOST" || reason === "TIME_LIMIT" || reason === "EMPTY" ? reason : null;
  } catch {
    return null;
  }
}

/** WS `nudged{fromParticipantId,toParticipantId}` (§2) — yalnız HEDEF kişide bildirim. */
function nudgedMe(body: string, selfId: string | null): boolean {
  if (!selfId) return false;
  try {
    const event = JSON.parse(body) as { type?: string; payload?: { toParticipantId?: string } };
    return event.type === "nudged" && event.payload?.toParticipantId === selfId;
  } catch {
    return false;
  }
}

/** WS `seat_requests_changed {}` (B-17) — gövdesiz zil; kimlik sızmaz, liste uçtan tazelenir. */
function seatRequestsChanged(body: string): boolean {
  try {
    return (JSON.parse(body) as { type?: string }).type === "seat_requests_changed";
  } catch {
    return false;
  }
}

export function useSessionLive(slug: string) {
  const bind = useSessionStore((s) => s.bind);
  const refresh = useSessionStore((s) => s.refresh);

  useEffect(() => {
    bind(slug);
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    // Abonelik açılıştan ÖNCE kaydedilir: liveChannel bağlanınca kurar, kaçan olay olmaz.
    const unsubscribe = liveChannel.subscribe(sessionTopic(slug), (body) => {
      void refresh();
      const reason = endedReasonOf(body);
      if (reason) useVoiceStore.getState().ended(reason);
      const selfId = useSessionStore.getState().view?.viewer?.participantId ?? null;
      if (nudgedMe(body, selfId)) useToastStore.getState().push("presence.nudged", undefined, "flame");
      // Zil oturumun TÜM koltuklu abonelerine gider; liste ucu host'a özel (üye 403 alırdı).
      // Hesapsız host (çıkış yapmış, çerezle lobide) hesap ucuna gitmez: 401 çıkış kesicisini tetiklerdi.
      if (seatRequestsChanged(body) && isHost(useSessionStore.getState().view) && useAuthStore.getState().status === "signed") {
        void useSeatRequestsStore.getState().load(slug);
      }
    });
    // Abonelik zaten bağlanmadan ÖNCE kaydedildi ve kuruluş sırası "onConnect'te attach, sonra
    // onConnect callback'i" olduğu için buradaki tazeleme "abone olana kadarki boşluğu" değil,
    // yalnız BAĞLI OLUNMAYAN pencerede kaçan olayları kapatır. resetRoster(): WS yeniden
    // bağlanınca roster'ı tekrar mesh'e it — arıza sırasında failed'e düşmüş peer'leri canlandırır (I3).
    const close = liveChannel.open(slug, () => {
      void refresh();
      useVoiceStore.getState().resetRoster();
    });

    return () => {
      clearInterval(timer);
      // Mikrofon abonelik hâlâ CANLIYKEN bırakılır: leave() önce, ki ses kutusunun UNSUBSCRIBE
      // çerçevesi soket kapanmadan gitsin (sonra unsubscribe/close sıralaması önemsizleşir).
      useVoiceStore.getState().leave();
      unsubscribe();
      close();
    };
  }, [slug, bind, refresh]);
}
