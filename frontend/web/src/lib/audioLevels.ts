/** K12: konuşan kişi tespiti tamamen istemcide — her peer akışının RMS'i, sunucuya hiç gitmez. */
export type LevelSampler = {
  attach(id: string, stream: MediaStream): void;
  detach(id: string): void;
  close(): void;
};

export type LevelSamplerOptions = {
  intervalMs?: number;
  /** Normalize RMS (0..1) eşiği. */
  threshold?: number;
  /** Eşiğin altına düşünce "konuşuyor" bu kadar süre daha tutulur — titreme önleme. */
  holdMs?: number;
  context?: AudioContext;
  now?: () => number;
};

type Probe = {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  buffer: Uint8Array<ArrayBuffer>;
  lastLoudAt: number;
  speaking: boolean;
};

let shared: AudioContext | null = null;

/** Katıl tıklamasının sticky activation'ı: AudioContext bu jestle askıda değil çalışır durumda
    açılmalı. WebKit'te aynı anda açık bağlam sayısı sınırlı — bu yüzden tek bir bağlam modül
    düzeyinde ömür boyu yaşar ve hiçbir yerde kapatılmaz (bkz. createLevelSampler().close()). */
export function sharedAudioContext(): AudioContext {
  shared ??= new AudioContext();
  if (shared.state === "suspended") void shared.resume().catch(() => undefined);
  return shared;
}

export function createLevelSampler(
  onSpeaking: (id: string, speaking: boolean) => void,
  options: LevelSamplerOptions = {},
): LevelSampler {
  const intervalMs = options.intervalMs ?? 200;
  const threshold = options.threshold ?? 0.02;
  const holdMs = options.holdMs ?? 300;
  const now = options.now ?? (() => Date.now());
  const context = options.context ?? sharedAudioContext();
  const probes = new Map<string, Probe>();

  function sample() {
    const t = now();
    probes.forEach((probe, id) => {
      probe.analyser.getByteTimeDomainData(probe.buffer);
      let sum = 0;
      for (let i = 0; i < probe.buffer.length; i++) {
        const v = (probe.buffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / probe.buffer.length);
      if (rms > threshold) probe.lastLoudAt = t;
      const speaking = t - probe.lastLoudAt < holdMs;
      if (speaking !== probe.speaking) {
        probe.speaking = speaking;
        onSpeaking(id, speaking);
      }
    });
  }

  const timer = setInterval(sample, intervalMs);

  function detach(id: string) {
    const probe = probes.get(id);
    if (!probe) return;
    probe.source.disconnect();
    probes.delete(id);
    if (probe.speaking) onSpeaking(id, false);
  }

  return {
    attach(id, stream) {
      detach(id);
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      probes.set(id, {
        source, analyser, buffer: new Uint8Array(analyser.fftSize), lastLoudAt: Number.NEGATIVE_INFINITY, speaking: false,
      });
    },
    detach,
    close() {
      clearInterval(timer);
      probes.forEach((probe) => probe.source.disconnect());
      probes.clear();
      // Bağlamı ASLA kapatmaz: paylaşılan (ya da enjekte edilmiş) AudioContext başka ses
      // akışlarınca da kullanılıyor olabilir — tek paylaşılan bağlam ömür boyu açık kalır.
    },
  };
}
