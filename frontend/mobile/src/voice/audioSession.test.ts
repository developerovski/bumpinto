import { createAudioSession } from "./audioSession";

/**
 * Ses oturumu — yerel `InCallManager` sarmalayıcısı.
 *
 * Bu YÜZEY testidir: gerçek yönlendirme (kulaklık/hoparlör/bluetooth) yalnız cihazda
 * doğrulanır (T8 + elle kontrol listesi). Burada sözleşme sınanır — ne çağrıldığı, kaç kez.
 */
const manager = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  setForceSpeakerphoneOn: jest.fn(),
});

test("başlatma sesli görüşme kipini açar, hoparlörü KAPALI bırakır", () => {
  const m = manager();

  createAudioSession(m).start();

  expect(m.start).toHaveBeenCalledWith({ media: "audio", auto: true, ringback: "" });
  expect(m.setForceSpeakerphoneOn).toHaveBeenCalledWith(false);
});

test("stop iki kez gelse de oturum BİR kez kapanır", () => {
  const m = manager();
  const session = createAudioSession(m);

  session.start();
  session.stop();
  // Ayrılma ve "oda kapandı" olayı aynı anda gelebilir; ikinci kapanış yerel modülü tekrar
  // dürtmemeli (InCallManager çift stop'ta ses kipini bozuk bırakabiliyor).
  session.stop();

  expect(m.stop).toHaveBeenCalledTimes(1);
});

test("setSpeaker yerel modüle birebir geçer ve son değer okunur", () => {
  const m = manager();
  const session = createAudioSession(m);
  session.start();

  session.setSpeaker(true);
  expect(m.setForceSpeakerphoneOn).toHaveBeenLastCalledWith(true);
  expect(session.isSpeakerOn()).toBe(true);

  session.setSpeaker(false);
  expect(m.setForceSpeakerphoneOn).toHaveBeenLastCalledWith(false);
  expect(session.isSpeakerOn()).toBe(false);
});
