import axios, { type AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";

import { createBumpintoApi } from "./api";

/**
 * Mağaza uyumluluk uçlarının SÖZLEŞME testi (M-5:T1).
 *
 * Yeni bağımlılık (axios-mock-adapter) eklemek yerine axios'un kendi `adapter` kancası
 * kullanılır: istek gerçek axios boru hattından (interceptor + serileştirme) geçer, yalnız
 * ağ katmanı kesilir. Böylece yol/metot/gövde hataları burada yakalanır.
 */
type Recorded = { method: string; url: string; data?: unknown };

const recorded: Recorded[] = [];
let nextStatus = 200;
let nextBody: unknown = {};

const http = axios.create({ baseURL: "http://x" });
http.defaults.adapter = async (config: AxiosRequestConfig) => {
  recorded.push({
    method: String(config.method).toLowerCase(),
    url: String(config.url),
    data: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
  });
  return {
    data: nextBody,
    status: nextStatus,
    statusText: "OK",
    headers: {},
    config: config as never,
  };
};

const api = createBumpintoApi(http);
const callsTo = (method: string) => recorded.filter((r) => r.method === method);

beforeEach(() => {
  recorded.length = 0;
  nextStatus = 200;
  nextBody = {};
});

describe("mağaza uyumluluk uçları", () => {
  it("Apple girişini ham nonce ile gönderir", async () => {
    nextBody = { accessToken: "t" };
    await api.loginApple({ identityToken: "id", nonce: "raw", fullName: "Ayşe" });
    expect(callsTo("post")[0]).toEqual({
      method: "post",
      url: "/api/auth/apple",
      data: { identityToken: "id", nonce: "raw", fullName: "Ayşe" },
    });
  });

  it("rızayı /api/me/consents'e PUT eder (PUT /api/me DEĞİL)", async () => {
    await api.putConsents({ location: true, microphone: false, analytics: false });
    expect(callsTo("put")).toEqual([
      {
        method: "put",
        url: "/api/me/consents",
        data: { location: true, microphone: false, analytics: false },
      },
    ]);
  });

  it("rapor, silme ve engel uçlarını doğru yollara bağlar", async () => {
    await api.report({ sessionSlug: "x7k2m", targetParticipantId: "p2", reason: "SPAM" });
    await api.deleteMe();
    nextBody = [];
    await api.listBlocks();
    nextBody = { id: "b1" };
    await api.blockParticipant({ participantId: "p2" });
    await api.removeBlock("b1");

    expect(callsTo("post")[0]?.data).toMatchObject({ sessionSlug: "x7k2m" });
    expect(callsTo("get").map((r) => r.url)).toEqual(["/api/me/blocks"]);
    expect(callsTo("delete").map((r) => r.url)).toEqual(["/api/me", "/api/me/blocks/b1"]);
  });

  it("engel listesi dizi döner (sunucu zarf kullanmaz)", async () => {
    nextBody = [{ id: "b1", participantId: "p2" }];
    await expect(api.listBlocks()).resolves.toEqual([{ id: "b1", participantId: "p2" }]);
  });
});
