/**
 * Önden yenileme (M-10). `exp` yaklaşırken istek ATILMADAN ÖNCE yenilenir; 401'i bekleyip
 * tekrar oynamak da çalışırdı ama her 15 dakikada bir gereksiz tur atardı.
 *
 * `atob` YASAK (Hermes'te garanti değil, `tsc` onu yalnız DOM lib'inden tanır: derleme geçer,
 * cihaz patlar) — çözücü `tokenStore.ts` içindeki saf base64url kodudur.
 */
import { createRefreshGate } from "@bumpinto/shared";

import { expiringSoon } from "../tokenStore";

const jwt = (payload: object) => {
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "HS256" })}.${b64(payload)}.imza`;
};

/**
 * Rotasyon sunucuda tek kullanımlık: paralel iki yenileme, ikincisini "yeniden kullanım"
 * saydırıp AİLEYİ iptal ettirirdi. Mobilde iki tetikleyici var (önden yenileme + 401 kesicisi)
 * ve ikisi de AYNI kapıdan geçmek zorunda.
 */
test("kapı paralel çağrıları TEK yenilemeye indirger", async () => {
  const refresh = jest.fn(async () => true);
  const gate = createRefreshGate(refresh);

  await Promise.all([gate.run(), gate.run(), gate.run()]);

  expect(refresh).toHaveBeenCalledTimes(1);
});

test("uçuş bittikten SONRA yeni bir yenileme atılabilir", async () => {
  const refresh = jest.fn(async () => true);
  const gate = createRefreshGate(refresh);

  await gate.run();
  await gate.run();

  expect(refresh).toHaveBeenCalledTimes(2);
});

/** Yenileme patlarsa kapı ASILI KALMAZ: sonraki istek yeniden deneyebilmeli. */
test("yenileme hata fırlatırsa kapı false döner ve açılır", async () => {
  const refresh = jest.fn(async () => {
    throw new Error("ağ yok");
  });
  const gate = createRefreshGate(refresh);

  await expect(gate.run()).resolves.toBe(false);
  await expect(gate.run()).resolves.toBe(false);
  expect(refresh).toHaveBeenCalledTimes(2);
});

test("bitmek üzere olan jeton önden yenilemeyi tetikler", () => {
  const soon = jwt({ exp: Math.floor(Date.now() / 1000) + 30 });
  const fresh = jwt({ exp: Math.floor(Date.now() / 1000) + 3600 });

  expect(expiringSoon(soon, 60_000)).toBe(true);
  expect(expiringSoon(fresh, 60_000)).toBe(false);
});
