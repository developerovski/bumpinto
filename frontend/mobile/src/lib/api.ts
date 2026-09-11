import {
  createBumpintoApi, createHttp, createRefreshGate, type Schemas,
} from "@bumpinto/shared";
import { create as createAxios } from "axios";
import Constants from "expo-constants";

import { useNetStore } from "../store/netStore";
import {
  clearAccessToken, clearRefreshToken, expiringSoon, getAccessToken, getRefreshToken,
  setAccessToken, setRefreshToken,
} from "./tokenStore";

/**
 * Tek HTTP istemcisi. `client: "mobile"` başlığı backend'e cookie DEĞİL gövde döndürmesini
 * söyler (web cookie tabanlı; sözleşme §2).
 *
 * Katılımcı jetonları bellekte tutulur: oturuma özel, kısa ömürlü ve SecureStore'a yazılması
 * gereken bir sır değil. Derin linkle gelen misafir (M-7) buraya yazar.
 */
const extra = Constants.expoConfig?.extra as { apiUrl: string; webBase: string };

const participantTokens = new Map<string, string>();

export const rememberParticipantToken = (slug: string, token: string) =>
  void participantTokens.set(slug, token);

export const hasParticipantToken = (slug: string) => participantTokens.has(slug);

/** Çıkışta HEPSİ düşer: jetonlar hesabın koltuklarıdır — paylaşılan cihazda sonraki kullanıcı (ya
    da anonim ziyaretçi) öncekinin koltuğuyla odaya girmesin (sunucu katılımcı jetonunu tek başına
    kabul eder). Sonraki girişte onarım (K-M39) hesap koltuğundan yeniden alır. */
export const clearParticipantTokens = () => participantTokens.clear();

/** Tek oturumun jetonunu düşürür: sunucu süresi geçmiş/geçersiz jetonu SESSİZCE yok sayar ve 403
    döner — bellekteki bayat jeton durdukça onarım (`hasParticipantToken` kapısı) hiç tetiklenmez. */
export const forgetParticipantToken = (slug: string) => void participantTokens.delete(slug);

export const webBase = extra.webBase;

/** STOMP kanalının el sıkışma adresi buradan türetilir (M-6 T3) — ikinci bir taban URL yok. */
export const API_BASE_URL = extra.apiUrl;

/** Katılımcı jetonu; `createHttp`in okuduğu AYNI bellek haritası. Canlı kanal el sıkışmada
    başlığa bunu koyar (mobilde çerez yok). */
export const participantToken = (slug: string): string | null =>
  participantTokens.get(slug) ?? null;

/** `exp`e bu kadar kala önden yenilenir: 15 dakikalık jetonda 60 sn bir ağ turuna rahat yeter. */
const REFRESH_MARGIN_MS = 60_000;

/** KESİCİSİZ örnek: yenilemenin kendi 401'i kesiciye geri düşemez (yapısal güvence). */
const bare = createAxios({
  baseURL: extra.apiUrl,
  timeout: 10000,
  headers: { "X-Client": "mobile" },
});

/**
 * TEK kapı: hem 401 kesicisi hem önden yenileme buradan geçer. İki ayrı kapı olsaydı ikisi
 * çakışır, sunucu ikincisini "yeniden kullanım" sayıp AİLEYİ iptal ederdi (B-16).
 */
const gate = createRefreshGate(async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const { data } = await bare.post<Schemas["LoginResponse"]>(
      "/api/auth/refresh", { refreshToken });
    if (!data.accessToken || !data.refreshToken) return false;
    await setAccessToken(data.accessToken);
    // Rotasyon TEK KULLANIMLIK: eskisi bu yanıtla birlikte ÖLDÜ, üzerine yazmak şart.
    await setRefreshToken(data.refreshToken);
    return true;
  } catch (error) {
    // YALNIZ 401'de silinir: ağ hatasında jetonu atmak, uçak modundan dönen kullanıcıyı
    // sebepsiz çıkışa düşürürdü.
    if ((error as { response?: { status?: number } }).response?.status === 401) {
      await clearAccessToken();
      await clearRefreshToken();
    }
    return false;
  }
});

let signedOutHandler: () => void = () => {};

/**
 * Kök (`app/_layout.tsx`) kaydeder. `authStore` buradan İTHAL EDİLMEZ: authStore zaten `api`yi
 * ithal ediyor, ters yön döngü olurdu ve testlerin `jest.mock("../lib/api")` ikizlerini bozardı.
 */
export const setSignedOutHandler = (fn: () => void) => {
  signedOutHandler = fn;
};

export const api = createBumpintoApi(
  createHttp(
    extra.apiUrl,
    {
      getIdToken: async () => {
        const token = await getAccessToken();
        // Çevrimdışıyken yenileme DENENMEZ: kesin başarısız olur ve elde jeton varken
        // kullanıcıyı boşuna çıkışa düşürürdü. Ne varsa o gönderilir.
        if (!useNetStore.getState().online) return token;
        if (token && !expiringSoon(token, REFRESH_MARGIN_MS)) return token;
        // Jeton yok ya da bitmek üzere: AYNI uçuşa katıl, sonra tazesini oku.
        await gate.run();
        return getAccessToken();
      },
      getParticipantToken: (slug) => participantTokens.get(slug),
      onSignedOut: () => signedOutHandler(),
    },
    { client: "mobile", gate },
  ),
);
