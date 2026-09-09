import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

export type AuthProviders = {
  /** Host JWT (mobil). Web'de tanımsız bırakılır. */
  getIdToken?: () => Promise<string | null> | string | null;
  /** Oturuma özel katılımcı token'ı. */
  getParticipantToken?: (slug: string) => string | null | undefined;
  /**
   * Yeni erişim jetonu al. `true` = alındı, özgün istek TEKRAR OYNANIR.
   * Platform sağlar: web çerezle, mobil gövdeyle çağırır — kesicinin ikisinden de haberi yok.
   */
  refresh?: () => Promise<boolean>;
  /** Yenileme başarısız: oturum gerçekten bitti. Platform yerel durumu temizler. */
  onSignedOut?: () => void | Promise<void>;
};

const SLUG_RE = /\/api\/sessions\/([^/]+)/;
/**
 * Kimlik uçlarında 401 "jetonum bayat" demek DEĞİLDİR (giriş reddi, yenileme reddi...).
 * Yenileme ucunun kendi 401'i tekrar yenileme tetikleseydi sonsuz döngü olurdu.
 */
const AUTH_RE = /\/api\/auth\//;

type Retriable = InternalAxiosRequestConfig & { _refreshed?: boolean };

/**
 * TEK UÇUŞLU yenileme kapısı: aynı anda 5 istek 401 alırsa 5 yenileme atılmaz — ilki sözü
 * kurar, kalanlar ona kuyruklanır.
 *
 * Bu bir optimizasyon DEĞİL, doğruluk şartı: sunucuda rotasyon tek kullanımlıktır, paralel
 * ikinci yenileme "yeniden kullanım" sayılır ve AİLENİN TAMAMI iptal edilir (B-16).
 *
 * Dışa açıktır çünkü mobil, `exp` yaklaşırken önden yenilerken AYNI uçuşa katılmak zorundadır
 * (M-10): iki ayrı kapı olsaydı önden yenileme ile 401 yenilemesi çakışırdı.
 */
export type RefreshGate = { run: () => Promise<boolean> };

export function createRefreshGate(refresh: () => Promise<boolean>): RefreshGate {
  let inFlight: Promise<boolean> | null = null;
  return {
    run: () => {
      inFlight ??= refresh()
        // Ağ hatası da "yenilenemedi"dir; kapı asla asılı kalmaz.
        .catch(() => false)
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
  };
}

export type HttpOptions = {
  /** Web: true — HttpOnly cookie'ler otomatik taşınır. Mobil: false. */
  withCredentials?: boolean;
  /** Backend'in cookie mi body mi döneceğini seçer. */
  client?: "web" | "mobile";
  /** Mobilin önden yenilemesiyle PAYLAŞILAN kapı. Verilmezse `providers.refresh`ten kurulur. */
  gate?: RefreshGate;
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
    // `delete` ŞART: tekrar oynamada `config` ESKİ başlığı taşır. Jeton artık yoksa ölü bearer
    // yeniden gönderilir, aynı 401 döner ve kullanıcı boşuna çıkışa düşerdi.
    else config.headers.delete("Authorization");
    const match = (config.url ?? "").match(SLUG_RE);
    const participantToken = match ? providers.getParticipantToken?.(match[1]) : undefined;
    if (participantToken) config.headers.set("X-Participant-Token", participantToken);
    return config;
  });

  const gate = options.gate
    ?? (providers.refresh ? createRefreshGate(providers.refresh) : null);
  if (!gate) return http;

  http.interceptors.response.use(undefined, async (error: unknown) => {
    const failure = error as { response?: { status?: number }; config?: Retriable };
    const config = failure.config;
    if (failure.response?.status !== 401 || !config) throw error;
    if (config._refreshed || AUTH_RE.test(config.url ?? "")) throw error;
    // İşaret ÖNCE konur: tekrar oynanan istek yine 401 alırsa ikinci yenileme atılmaz.
    config._refreshed = true;
    if (await gate.run()) return http.request(config);
    await providers.onSignedOut?.();
    throw error;
  });

  return http;
}
