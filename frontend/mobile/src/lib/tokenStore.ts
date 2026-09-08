import * as SecureStore from "expo-secure-store";

/**
 * Google `id_token` cihazda SAKLANMAZ — yalnız `/api/auth/google` takasında bir kez kullanılır.
 * Cihazda duran tek sır backend'in ürettiği erişim jetonudur.
 *
 * Jeton TTL'i dolunca istekler 401 döner; ekranlar `status: "out"` yapıp köke döner
 * (sessiz yenileme v1.1'e ertelendi — belgeli taviz).
 */
const KEY = "bumpinto.accessToken";

export const getAccessToken = () => SecureStore.getItemAsync(KEY);
export const setAccessToken = (token: string) => SecureStore.setItemAsync(KEY, token);
export const clearAccessToken = () => SecureStore.deleteItemAsync(KEY);
