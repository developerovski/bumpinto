import "./stompPolyfill";

import { Client, type StompSubscription } from "@stomp/stompjs";

type Handler = (body: string) => void;
type Registration = { slug: string; destination: string; handler: Handler; sub: StompSubscription | null };

let client: Client | null = null;
const registrations = new Set<Registration>();

/** Hedef adresleri: string'ler her yerde AYNI kalmalı (sunucu bu kalıpları bekler). */
export function sessionTopic(slug: string): string {
  return `/topic/session/${slug}`;
}
export function voiceInbox(slug: string, participantId: string): string {
  return `/topic/session/${slug}/voice/${participantId}`;
}
export function voiceSignal(slug: string): string {
  return `/app/sessions/${slug}/voice/signal`;
}

/** "/topic/session/{slug}/..." kalıbından slug'ı çıkarır — oturum değişince eşleşmeyen
    kayıtları taşımamak için (bkz. `open`). */
function slugOf(destination: string): string {
  const parts = destination.split("/");
  const i = parts.indexOf("session");
  return i >= 0 ? parts[i + 1] : "";
}

function attach(c: Client, reg: Registration) {
  if (c.connected && !reg.sub) {
    reg.sub = c.subscribe(reg.destination, (message) => reg.handler(message.body));
  }
}

/** Oturum başına tek STOMP istemcisi. Abonelikler kayıt defterinde durur: bağlantı (yeniden)
    kurulunca hepsi yeniden açılır — ses katmanı bağlı olmadan da abone olabilir. Geri çağrılar
    kendi istemcisine (`c`) bağlanır: eski istemciden geç gelen bir olay, arada açılan YENİ
    istemcinin durumunu bozamaz.

    Web sürümünün portu (W-11); tek fark el sıkışmadır — orada çerez, burada başlık. */
export const liveChannel = {
  open(
    slug: string,
    apiBaseUrl: string,
    getToken: () => string | null | undefined,
    onConnect: () => void,
  ): () => void {
    // Önceki istemci hâlâ açıksa önce kapat: kaçırılan bir close en kötü ihtimalle sızan bir
    // soket bırakır, asla canlı istemciyi bozmaz.
    if (client) void client.deactivate();

    // Başka oturumdan kalan abonelik yeni soketle asla eşleşmez (sunucu hedefi sessizce
    // düşürür, ör. eski ses kutusu) — burada temizlenir.
    registrations.forEach((reg) => {
      if (reg.slug !== slug) registrations.delete(reg);
    });

    const url = `${apiBaseUrl.replace(/^http/, "ws")}/api/sessions/${slug}/ws`;
    const c = new Client({
      // `brokerURL` DEĞİL: el sıkışmaya başlık koymanın tek yolu fabrikadır. Mobilde çerez
      // yoktur — katılımcı kimliği `X-Participant-Token` ile girer (`ParticipantTokenFilter`).
      webSocketFactory: () => {
        const token = getToken();
        const options = token ? { headers: { "X-Participant-Token": token } } : undefined;
        // RN'in `WebSocket`i ÜÇÜNCÜ argümanda seçenek alır (başlıklar dahil); TS'in DOM
        // bildirimi yalnız iki argüman tanır, o yüzden kurucu cast'lenir.
        const Ctor = WebSocket as unknown as new (
          url: string,
          protocols?: string | string[],
          options?: { headers?: Record<string, string> },
        ) => WebSocket;
        return new Ctor(url, undefined, options);
      },
      reconnectDelay: 5000,
      onConnect: () => {
        if (client !== c) return;
        registrations.forEach((reg) => {
          reg.sub = null;
          attach(c, reg);
        });
        onConnect();
      },
      onWebSocketClose: () => {
        if (client !== c) return;
        registrations.forEach((reg) => {
          reg.sub = null;
        });
      },
    });
    client = c;
    c.activate();
    return () => {
      if (client !== c) {
        void c.deactivate();
        return;
      }
      registrations.forEach((reg) => {
        reg.sub = null;
      });
      client = null;
      void c.deactivate();
    };
  },

  subscribe(destination: string, handler: Handler): () => void {
    const reg: Registration = { slug: slugOf(destination), destination, handler, sub: null };
    registrations.add(reg);
    if (client) attach(client, reg);
    return () => {
      registrations.delete(reg);
      if (client?.connected) reg.sub?.unsubscribe();
      reg.sub = null;
    };
  },

  /** Sunucu yalnız kendi slug'ının sinyal adresini kabul eder (WebSocketConfig). */
  publish(destination: string, body: unknown): boolean {
    if (!client?.connected) return false;
    client.publish({
      destination,
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    return true;
  },
};
