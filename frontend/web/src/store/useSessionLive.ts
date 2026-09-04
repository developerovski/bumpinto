import { Client } from "@stomp/stompjs";
import { useEffect } from "react";
import { useSessionStore } from "./sessionStore";

/** Emniyet ağı — canlı kanalın YEDEĞİ, birincil yol değil. Olaylar STOMP'tan geliyor; 3 sn'lik
    tur açık sekme başına 20 GET/dk demekti ve tek taşıdığı şey WS kopukluğu + yayınlanmayan
    EXPIRED geçişi. 30 sn ikisini de karşılar, yükü 10 kat düşürür. */
const POLL_MS = 30000;

export function useSessionLive(slug: string) {
  const bind = useSessionStore((s) => s.bind);
  const refresh = useSessionStore((s) => s.refresh);

  useEffect(() => {
    bind(slug);
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);

    // Boş VITE_WS_URL (local profil) location türevine düşmeli — ?? boş stringde düşmez.
    const wsUrl =
      (import.meta.env.VITE_WS_URL as string | undefined) ||
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      // Bağlantı kurulunca BİR KEZ tazele: abone olana kadar kaçan olaylar burada kapanır,
      // yoksa açılıştaki boşluk artık 30 sn sürerdi.
      onConnect: () => {
        void refresh();
        client.subscribe(`/topic/session/${slug}`, () => void refresh());
      },
    });
    client.activate();

    return () => {
      clearInterval(timer);
      void client.deactivate();
    };
  }, [slug, bind, refresh]);
}
