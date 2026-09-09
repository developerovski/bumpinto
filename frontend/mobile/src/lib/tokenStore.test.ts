import * as SecureStore from "expo-secure-store";

import {
  clearAccessToken, clearRefreshToken, expiringSoon, getAccessToken, getRefreshToken,
  setAccessToken, setRefreshToken,
} from "./tokenStore";

/**
 * Hesap jetonu — SÜRESİ DOLMUŞ jeton hiç kullanılmaz (K-M38).
 *
 * NEDEN: `createHttp` elindeki jetonu her isteğe `Authorization` olarak koyar. Sunucu
 * geçersiz bir bearer görünce 401 döner ve `X-Participant-Token`a HİÇ BAKMAZ — yani ölü bir
 * hesap jetonu, MİSAFİR akışını da (derin linkle katılan kişinin oturum görünümünü) kırar.
 * 2026-09-09'da emülatörde görüldü: Katıl'dan sonra "Bu oturum bulunamadı".
 * Hesap jetonu 12 saat, oturum 24 saat yaşıyor — bu pencere gerçek kullanıcıda açılıyor.
 */
const jwt = (payload: object) => {
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "HS256" })}.${b64(payload)}.imza`;
};

const future = () => Math.floor(Date.now() / 1000) + 3600;
const past = () => Math.floor(Date.now() / 1000) - 3600;

beforeEach(async () => {
  jest.clearAllMocks();
  await clearAccessToken();
  await clearRefreshToken();
});

test("geçerli jeton olduğu gibi döner", async () => {
  await setAccessToken(jwt({ sub: "u1", exp: future() }));

  await expect(getAccessToken()).resolves.toContain(".");
});

test("süresi dolmuş jeton null döner VE depodan silinir", async () => {
  await setAccessToken(jwt({ sub: "u1", exp: past() }));

  await expect(getAccessToken()).resolves.toBeNull();
  // Silinmezse her açılışta yeniden okunur ve aynı 401'i üretir.
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});

test("çözülemeyen jeton KULLANILMAZ — bozuk bearer da 401 üretir", async () => {
  await setAccessToken("bu.bir.jwt.degil");

  await expect(getAccessToken()).resolves.toBeNull();
});

test("`exp` taşımayan jeton kabul edilir — süreyi biz uydurmayız", async () => {
  // Sunucu ileride süresiz bir jeton verirse istemci onu kendi kararıyla atmamalı.
  await setAccessToken(jwt({ sub: "u1" }));

  await expect(getAccessToken()).resolves.not.toBeNull();
});

test("çok baytlı gövde bozmaz — `exp` yine okunur", async () => {
  // E-posta alanı JWT'de var; ASCII olmayan bir değer latin1 çözümünde bozulsa da JSON'un
  // yapısı ASCII olduğu için ayrıştırma sürer ve süre kararı doğru kalır.
  await setAccessToken(jwt({ sub: "u1", email: "çğüşi@örnek.tr", exp: past() }));

  await expect(getAccessToken()).resolves.toBeNull();
});

test("jeton yoksa null", async () => {
  await expect(getAccessToken()).resolves.toBeNull();
});

test("`exp`e 60 sn'den az kalan jeton 'bitmek üzere' sayılır", () => {
  const soon = Math.floor(Date.now() / 1000) + 30;

  expect(expiringSoon(jwt({ exp: soon }), 60_000)).toBe(true);
  expect(expiringSoon(jwt({ exp: future() }), 60_000)).toBe(false);
});

/** `exp` taşımayan jeton kabul edilir — istemci kendi kafasından süre uydurmaz (K-M38). */
test("`exp` taşımayan jeton bitmek üzere SAYILMAZ", () => {
  expect(expiringSoon(jwt({ sub: "u1" }), 60_000)).toBe(false);
});

test("süresi GEÇMİŞ jeton da bitmek üzere sayılır — önden yenileme onu da kurtarır", () => {
  expect(expiringSoon(jwt({ exp: past() }), 60_000)).toBe(true);
});

test("yenileme jetonu AYRI anahtarda yaşar ve silinebilir", async () => {
  await setRefreshToken("rt-1");
  await expect(getRefreshToken()).resolves.toBe("rt-1");

  await clearRefreshToken();
  await expect(getRefreshToken()).resolves.toBeNull();
});

/** Erişim jetonunu silmek yenilemeyi ÖLDÜRMEMELİ: sessiz yenilemenin tüm dayanağı odur. */
test("erişim jetonu silinince yenileme jetonu durur", async () => {
  await setAccessToken(jwt({ sub: "u1", exp: future() }));
  await setRefreshToken("rt-1");

  await clearAccessToken();

  await expect(getRefreshToken()).resolves.toBe("rt-1");
});
