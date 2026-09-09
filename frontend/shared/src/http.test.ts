import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHttp } from "./http";

/**
 * 401 kesicisi WEB ve MOBİLİN AYNI gövdesidir (W-16 + M-10): platformlar yalnızca `refresh()`
 * ve `onSignedOut()` sağlar. Bu yüzden kurallar burada, tek yerde sınanır.
 *
 * Yeni bağımlılık (axios-mock-adapter) yerine axios'un kendi `adapter` kancası kullanılır:
 * istek gerçek boru hattından (istek kesicisi + serileştirme) geçer, yalnız ağ katmanı kesilir.
 *
 * ÖZEL adapter `validateStatus`ı KENDİ uygulamak zorundadır: axios onu yalnız yerleşik
 * adapterlerin içinde çağırır, yani sahte bir 401'i reddetmek bu dosyanın işi.
 */
function reply(config: InternalAxiosRequestConfig, status: number): Promise<AxiosResponse> {
  const response = {
    data: {}, status, statusText: "", headers: {}, config,
  } as AxiosResponse;
  if (status >= 200 && status < 300) return Promise.resolve(response);
  return Promise.reject(
    new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config,
      null, response),
  );
}
type Call = { url: string; auth: string | null };

function harness(options: { refreshWorks: boolean; alwaysFails?: boolean }) {
  const calls: Call[] = [];
  let token = "eski";
  let unauthorized = true;

  const refresh = vi.fn(async () => {
    if (!options.refreshWorks) return false;
    token = "yeni";
    unauthorized = false;
    return true;
  });
  const onSignedOut = vi.fn();

  const http = createHttp("http://x", { getIdToken: () => token, refresh, onSignedOut });
  http.defaults.adapter = async (config) => {
    const headers = config.headers as unknown as { get: (k: string) => unknown };
    calls.push({
      url: String(config.url),
      auth: (headers.get("Authorization") as string | undefined) ?? null,
    });
    return reply(config as InternalAxiosRequestConfig,
      options.alwaysFails || unauthorized ? 401 : 200);
  };
  return { http, calls, refresh, onSignedOut };
}

beforeEach(() => vi.clearAllMocks());

describe("401 kesicisi", () => {
  /**
   * Rotasyon sunucuda TEK KULLANIMLIK: paralel iki yenileme, ikincisini "yeniden kullanım"
   * saydırıp AİLENİN TAMAMINI iptal ettirirdi. Bu bir optimizasyon değil, doğruluk şartı.
   */
  it("N paralel 401 için TEK yenileme atar", async () => {
    const { http, refresh } = harness({ refreshWorks: true });

    await Promise.all([http.get("/api/me"), http.get("/api/sessions"), http.get("/api/config")]);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("özgün isteği YENİ jetonla tekrar oynar", async () => {
    const { http, calls } = harness({ refreshWorks: true });

    await http.get("/api/me");

    expect(calls.map((c) => c.auth)).toEqual(["Bearer eski", "Bearer yeni"]);
    expect(calls.every((c) => c.url === "/api/me")).toBe(true);
  });

  /** Yenileme ucunun KENDİSİ 401 verirse tekrar denenmez — sonsuz döngü. */
  it("kimlik uçlarında tekrar YOK", async () => {
    const { http, refresh } = harness({ refreshWorks: true });

    await expect(http.post("/api/auth/refresh")).rejects.toBeDefined();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("yenileme başarısızsa onSignedOut çağrılır ve hata yükselir", async () => {
    const { http, onSignedOut } = harness({ refreshWorks: false });

    await expect(http.get("/api/me")).rejects.toBeDefined();
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  /** Tekrar oynanan istek YİNE 401 alırsa ikinci yenileme atılmaz. */
  it("bir kez yenilenmiş istek ikinci yenilemeyi tetiklemez", async () => {
    const { http, refresh, calls } = harness({ refreshWorks: true, alwaysFails: true });

    await expect(http.get("/api/me")).rejects.toBeDefined();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  /**
   * Uçuş bittikten SONRA yeni bir yenileme atılabilmeli: kapı asılı kalsaydı ilk yenilemeden
   * sonraki her 401 sessizce çıkışa düşerdi.
   */
  it("uçuş bittikten sonra kapı yeniden açılır", async () => {
    const { http, refresh } = harness({ refreshWorks: true });

    await http.get("/api/me");
    // Sunucu yeniden 401'e döner (jeton yine bayatladı).
    http.defaults.adapter = (config) => reply(config as InternalAxiosRequestConfig, 401);
    await expect(http.get("/api/me")).rejects.toBeDefined();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  /** 401 DIŞINDAKİ hatalar dokunulmadan geçer: 500 yenileme tetiklemez. */
  it("401 olmayan hata yenileme tetiklemez", async () => {
    const { http, refresh, onSignedOut } = harness({ refreshWorks: true });
    http.defaults.adapter = (config) => reply(config as InternalAxiosRequestConfig, 500);

    await expect(http.get("/api/me")).rejects.toBeDefined();
    expect(refresh).not.toHaveBeenCalled();
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  /**
   * Jeton artık yoksa tekrar oynamada ESKİ `Authorization` başlığı yeniden gönderilmemeli:
   * `config` onu taşır ve `set` yapılmadığında olduğu gibi kalırdı.
   */
  it("jeton kaybolduysa Authorization başlığı düşer", async () => {
    const calls: (string | null)[] = [];
    let token: string | null = "eski";
    const http = createHttp("http://x", {
      getIdToken: () => token,
      refresh: async () => {
        token = null;
        return true;
      },
    });
    http.defaults.adapter = async (config) => {
      const headers = config.headers as unknown as { get: (k: string) => unknown };
      calls.push((headers.get("Authorization") as string | undefined) ?? null);
      return reply(config as InternalAxiosRequestConfig, calls.length === 1 ? 401 : 200);
    };

    await http.get("/api/me");

    expect(calls).toEqual(["Bearer eski", null]);
  });
});
