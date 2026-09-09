import * as SecureStore from "expo-secure-store";

/**
 * Google `id_token` cihazda SAKLANMAZ — yalnız `/api/auth/google` takasında bir kez kullanılır.
 * Cihazda duran tek sır backend'in ürettiği erişim jetonudur.
 *
 * **Süresi dolmuş jeton HİÇ kullanılmaz (K-M38).** `createHttp` elindeki jetonu her isteğe
 * `Authorization` başlığı olarak koyuyor; sunucu geçersiz bir bearer görünce 401 döner ve
 * `X-Participant-Token`a BAKMAZ. Yani ölü bir hesap jetonu yalnız hesap ekranlarını değil,
 * derin linkle katılan MİSAFİRİN oturum görünümünü de kırar (2026-09-09 emülatörde: Katıl'dan
 * sonra "Bu oturum bulunamadı"). Hesap jetonu 12 saat, oturum 24 saat yaşadığı için bu pencere
 * gerçek kullanıcıda açılıyor.
 *
 * Sessiz yenileme hâlâ v1.1'de (belgeli taviz): burada yalnız ÖLÜ jeton düşürülür, ekranlar
 * `status: "out"` görüp köke döner.
 */
const KEY = "bumpinto.accessToken";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * base64url → dize. `atob` KULLANILMAZ: Hermes'te varlığı garanti değil ve `tsc` onu yalnız
 * DOM tip kütüphanesinden tanıyor — yani derleme geçse de cihazda patlayabilirdi (bu dosyanın
 * varlık sebebi tam olarak "cihazda patlayan şey").
 *
 * Baytlar latin1 olarak diziye çevrilir. Bizim okuduğumuz tek alan `exp` (sayı) ve JSON'un
 * yapısal karakterleri ASCII olduğu için bu yeterli: çok baytlı bir e-posta içeriği bozulsa
 * bile `JSON.parse` çalışır ve `exp` doğru okunur.
 */
function decodeBase64Url(input: string): string | null {
  const clean = input.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  let bits = 0;
  let acc = 0;
  let out = "";
  for (const ch of clean) {
    const value = B64.indexOf(ch);
    if (value < 0) return null;
    acc = (acc << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((acc >> bits) & 0xff);
    }
  }
  return out;
}

/** JWT gövdesi — imza DOĞRULANMAZ; bu yalnız "artık geçerli mi" kapısıdır, yetki kararı
    sunucunundur. */
function payloadOf(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  const json = decodeBase64Url(part);
  if (!json) return null;
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Çözülemeyen jeton da KULLANILMAZ: sunucuya gönderilse zaten 401 üretirdi. */
function unusable(token: string): boolean {
  const payload = payloadOf(token);
  if (!payload) return true;
  const exp = payload.exp;
  // `exp` yoksa jeton kabul edilir — istemci kendi kafasından süre uydurmaz.
  return typeof exp === "number" && exp * 1000 <= Date.now();
}

export const getAccessToken = async (): Promise<string | null> => {
  const token = await SecureStore.getItemAsync(KEY);
  if (!token) return null;
  if (unusable(token)) {
    // Silinmezse her açılışta yeniden okunur ve aynı 401'i üretir.
    await SecureStore.deleteItemAsync(KEY);
    return null;
  }
  return token;
};

export const setAccessToken = (token: string) => SecureStore.setItemAsync(KEY, token);
export const clearAccessToken = () => SecureStore.deleteItemAsync(KEY);
