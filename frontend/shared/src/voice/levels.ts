/** K12: konuşan kişi tespiti tamamen istemcide. Ölçüm platformda (web AnalyserNode RMS,
    RN `getStats().audioLevel`), KARAR burada: eşik + titreme önleyen tutma. İki istemcide
    "konuşuyor" aynı anda yanmalı; eşik iki kopyada yaşarsa zamanla ayrışır. */
export type SpeechGateOptions = { threshold?: number; holdMs?: number; now?: () => number };
export type SpeechGate = {
  /** Bir örnek besler; durum değiştiyse geri çağırır. */
  push(id: string, level: number): void;
  remove(id: string): void;
  clear(): void;
};

export function createSpeechGate(
  onSpeaking: (id: string, speaking: boolean) => void,
  options: SpeechGateOptions = {},
): SpeechGate {
  const threshold = options.threshold ?? 0.02;
  const holdMs = options.holdMs ?? 300;
  const now = options.now ?? (() => Date.now());
  const state = new Map<string, { lastLoudAt: number; speaking: boolean }>();

  return {
    push(id, level) {
      const entry = state.get(id) ?? { lastLoudAt: Number.NEGATIVE_INFINITY, speaking: false };
      const t = now();
      if (level > threshold) entry.lastLoudAt = t;
      const speaking = t - entry.lastLoudAt < holdMs;
      state.set(id, { lastLoudAt: entry.lastLoudAt, speaking });
      if (speaking !== entry.speaking) onSpeaking(id, speaking);
    },
    remove(id) {
      const entry = state.get(id);
      if (!entry) return;
      state.delete(id);
      if (entry.speaking) onSpeaking(id, false);
    },
    // close() yolunda bildirim yok: dinleyici zaten kapanıyor, sahte "sustu" olayı yayılmaz.
    clear() {
      state.clear();
    },
  };
}
