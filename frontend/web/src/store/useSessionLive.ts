import { Client } from "@stomp/stompjs";
import { useEffect } from "react";
import { useSessionStore } from "./sessionStore";

const POLL_MS = 3000;

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
      onConnect: () => client.subscribe(`/topic/session/${slug}`, () => void refresh()),
    });
    client.activate();

    return () => {
      clearInterval(timer);
      void client.deactivate();
    };
  }, [slug, bind, refresh]);
}
