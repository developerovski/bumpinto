import {
  createSpeechGate,
  type LevelSampler,
  type MeshPeerConnection,
  type SpeechGateOptions,
} from "@bumpinto/shared";

export type StatsLevelSampler = LevelSampler & { tick(): Promise<void> };

/**
 * K12'nin RN eşleniği. `react-native-webrtc`de Web Audio YOKTUR; seviye WebRTC'nin kendi
 * istatistiklerinden okunur: uzak ses `inbound-rtp.audioLevel`, kendi sesimiz herhangi bir
 * bağlantının `media-source.audioLevel` alanı.
 *
 * Sunucuya hiçbir şey gitmez (K12 korunur) ve EŞİK/TUTMA kararı burada değil ortak kapıda
 * (`createSpeechGate`) — web ile aynı anda "konuşuyor" yanar.
 */
export function createStatsLevelSampler(
  onSpeaking: (id: string, speaking: boolean) => void,
  options: SpeechGateOptions & { selfId: string; intervalMs?: number },
): StatsLevelSampler {
  const gate = createSpeechGate(onSpeaking, options);
  const peers = new Map<string, MeshPeerConnection>();

  async function tick() {
    let selfSeen = false;
    for (const [id, pc] of peers) {
      try {
        const report = await pc.getStats();
        let remote = 0;
        report.forEach((entry) => {
          if (entry.kind !== "audio") return;
          if (entry.type === "inbound-rtp") remote = Math.max(remote, entry.audioLevel ?? 0);
          if (entry.type === "media-source" && !selfSeen) {
            selfSeen = true;
            gate.push(options.selfId, entry.audioLevel ?? 0);
          }
        });
        gate.push(id, remote);
      } catch {
        // Kapanmakta olan PC: bu turu atla, örnekleyici ayakta kalsın.
      }
    }
    // Hiç bağlantı yoksa kendi halkamız sönük kalmalı — aksi hâlde son "konuşuyor" asılı kalır.
    if (!selfSeen) gate.push(options.selfId, 0);
  }

  const timer = options.intervalMs ? setInterval(() => void tick(), options.intervalMs) : undefined;

  return {
    tick,
    // Akış nesnesi RN'de seviye TAŞIMAZ; kaynak `attachPeer`daki bağlantıdır.
    attach() {},
    attachPeer(id, pc) {
      peers.set(id, pc);
    },
    detach(id) {
      peers.delete(id);
      gate.remove(id);
    },
    close() {
      if (timer) clearInterval(timer);
      peers.clear();
      gate.clear();
    },
  };
}
