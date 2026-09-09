import InCallManager from "react-native-incall-manager";

/** Test için enjekte edilebilen yüzey; üretimde `InCallManager`. */
export type AudioSessionManager = {
  start(options: { media: "audio"; auto: boolean; ringback: string }): void;
  stop(): void;
  setForceSpeakerphoneOn(on: boolean): void;
};

export type AudioSession = {
  start(): void;
  stop(): void;
  setSpeaker(on: boolean): void;
  isSpeakerOn(): boolean;
};

/**
 * iOS'ta AVAudioSession kategorisini `playAndRecord`a, Android'de akışı `VOICE_CALL`a çeker:
 * yankı iptali, sesin kulaklık/hoparlöre doğru yönlenmesi ve zil sesiyle karışmama bunun işi.
 *
 * Varsayılan hoparlör KAPALI — telefon kulağa götürüldüğünde beklenen davranış.
 *
 * `active` bayrağı çift çağrıyı yutar: ayrılma ile "oda kapandı" olayı aynı anda gelebiliyor
 * ve `InCallManager` çift `stop()`ta ses kipini bozuk bırakabiliyor.
 */
export function createAudioSession(manager: AudioSessionManager = InCallManager): AudioSession {
  let active = false;
  let speaker = false;

  return {
    start() {
      if (active) return;
      active = true;
      manager.start({ media: "audio", auto: true, ringback: "" });
      manager.setForceSpeakerphoneOn(false);
    },
    stop() {
      if (!active) return;
      active = false;
      speaker = false;
      manager.stop();
    },
    setSpeaker(on) {
      speaker = on;
      manager.setForceSpeakerphoneOn(on);
    },
    isSpeakerOn: () => speaker,
  };
}
