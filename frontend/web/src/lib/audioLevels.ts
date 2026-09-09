import { createSpeechGate, type LevelSampler, type MeshStream } from "@bumpinto/shared";

/** K12: konuşan kişi tespiti tamamen istemcide — her peer akışının RMS'i, sunucuya hiç gitmez.
    ÖLÇÜM burada (AnalyserNode RMS), KARAR ortak kapıda (`createSpeechGate`) — eşik ve tutma
    web ile mobilde tek uygulama. */
export type { LevelSampler };

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
  const context = options.context ?? sharedAudioContext();
  const probes = new Map<string, Probe>();
  const gate = createSpeechGate(onSpeaking, {
    threshold: options.threshold,
    holdMs: options.holdMs,
    now: options.now,
  });

  function sample() {
    probes.forEach((probe, id) => {
      probe.analyser.getByteTimeDomainData(probe.buffer);
      let sum = 0;
      for (let i = 0; i < probe.buffer.length; i++) {
        const v = (probe.buffer[i] - 128) / 128;
        sum += v * v;
      }
      gate.push(id, Math.sqrt(sum / probe.buffer.length));
    });
  }

  const timer = setInterval(sample, intervalMs);

  function detach(id: string) {
    const probe = probes.get(id);
    if (!probe) return;
    probe.source.disconnect();
    probes.delete(id);
    gate.remove(id);
  }

  return {
    attach(id, stream: MeshStream) {
      detach(id);
      const source = context.createMediaStreamSource(stream as unknown as MediaStream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      probes.set(id, { source, analyser, buffer: new Uint8Array(analyser.fftSize) });
    },
    detach,
    close() {
      clearInterval(timer);
      probes.forEach((probe) => probe.source.disconnect());
      probes.clear();
      gate.clear();
      // Bağlamı ASLA kapatmaz: paylaşılan (ya da enjekte edilmiş) AudioContext başka ses
      // akışlarınca da kullanılıyor olabilir — tek paylaşılan bağlam ömür boyu açık kalır.
    },
  };
}
