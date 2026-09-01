import axios, { type AxiosInstance } from "axios";

export type AuthProviders = {
  /** Host JWT (mobil). Web'de tanımsız bırakılır. */
  getIdToken?: () => Promise<string | null> | string | null;
  /** Oturuma özel katılımcı token'ı. */
  getParticipantToken?: (slug: string) => string | null | undefined;
};

const SLUG_RE = /\/api\/sessions\/([^/]+)/;

export type HttpOptions = {
  /** Web: true — HttpOnly cookie'ler otomatik taşınır. Mobil: false. */
  withCredentials?: boolean;
  /** Backend'in cookie mi body mi döneceğini seçer. */
  client?: "web" | "mobile";
};

export function createHttp(baseUrl: string, providers: AuthProviders,
    options: HttpOptions = {}): AxiosInstance {
  const http = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    withCredentials: options.withCredentials ?? false,
    headers: options.client ? { "X-Client": options.client } : undefined,
  });
  http.interceptors.request.use(async (config) => {
    const idToken = await providers.getIdToken?.();
    if (idToken) config.headers.set("Authorization", `Bearer ${idToken}`);
    const match = (config.url ?? "").match(SLUG_RE);
    const participantToken = match ? providers.getParticipantToken?.(match[1]) : undefined;
    if (participantToken) config.headers.set("X-Participant-Token", participantToken);
    return config;
  });
  return http;
}
