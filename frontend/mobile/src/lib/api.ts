import { createBumpintoApi, createHttp } from "@bumpinto/shared";
import Constants from "expo-constants";

import { getAccessToken } from "./tokenStore";

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

export const webBase = extra.webBase;

/** STOMP kanalının el sıkışma adresi buradan türetilir (M-6 T3) — ikinci bir taban URL yok. */
export const API_BASE_URL = extra.apiUrl;

/** Katılımcı jetonu; `createHttp`in okuduğu AYNI bellek haritası. Canlı kanal el sıkışmada
    başlığa bunu koyar (mobilde çerez yok). */
export const participantToken = (slug: string): string | null =>
  participantTokens.get(slug) ?? null;

export const api = createBumpintoApi(
  createHttp(
    extra.apiUrl,
    {
      getIdToken: () => getAccessToken(),
      getParticipantToken: (slug) => participantTokens.get(slug),
    },
    { client: "mobile" },
  ),
);
