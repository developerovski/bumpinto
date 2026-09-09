export type SessionEventLike = { type?: string; payload?: Record<string, string> };
type Handler = (event: SessionEventLike) => void;

const handlers = new Set<Handler>();

/** Dinleyici kaydeder; dönen fonksiyon aboneliği bırakır. */
export function onSessionEvent(handler: Handler): () => void {
  handlers.add(handler);
  return () => void handlers.delete(handler);
}

/**
 * Canlı olayların TEK giriş kapısı.
 *
 * `useSessionLive` STOMP gövdesini çözüp burayı çağırır (M-6 kanalı); depolar `onSessionEvent`
 * ile abone olur ve `liveChannel`ı hiç görmez. Ayrı bir seam olmasının sebebi: `socialStore`
 * bir soket istemcisine bağımlı olmadan test edilebilsin, ve ileride ikinci bir üretici
 * (push bildirimi, B-16) aynı kapıdan girsin.
 *
 * Tanınmayan olay tipi sessizce düşer — sözleşmeye yeni bir olay eklendiğinde istemci çökmez.
 */
export function emitSessionEvent(event: SessionEventLike): void {
  handlers.forEach((handler) => handler(event));
}

/** Ham STOMP gövdesini olaya çevirir; JSON değilse null (kanal her mesajı "tazele" zili sayar). */
export function parseSessionEvent(body: string): SessionEventLike | null {
  try {
    const parsed = JSON.parse(body) as SessionEventLike;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
