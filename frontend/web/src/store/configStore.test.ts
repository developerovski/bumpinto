import type { AppConfig } from "@bumpinto/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { FALLBACK_CONFIG, effectiveConfig, resetConfig, useConfigStore } from "./configStore";

vi.mock("../lib/api", () => ({ api: { getConfig: vi.fn() } }));

const served: AppConfig = {
  mapEngine: "google",
  tiles: { styleUrl: "https://maps.example/style" },
  sources: [{ id: "google", attributionKey: "google", attributionUrl: null, ratingScale: 5 }],
};

describe("configStore", () => {
  beforeEach(() => {
    resetConfig();
    vi.mocked(api.getConfig).mockReset();
  });

  it("sunucudan geleni saklar ve ikinci load ağa gitmez", async () => {
    vi.mocked(api.getConfig).mockResolvedValue(served);

    // İki eşzamanlı çağrı — ikincisi `inflight`i bulup aynı sözü paylaşmalı.
    await Promise.all([useConfigStore.getState().load(), useConfigStore.getState().load()]);
    expect(useConfigStore.getState().config).toEqual(served);

    // Üçüncü çağrı: config zaten var, ağa hiç gitmemeli.
    await useConfigStore.getState().load();
    expect(api.getConfig).toHaveBeenCalledTimes(1);
  });

  it("uç ulaşılamazsa config null kalır, failed true olur, effectiveConfig yedeği döner; sonraki load tekrar ağa gider", async () => {
    vi.mocked(api.getConfig).mockRejectedValue(new Error("network"));

    await useConfigStore.getState().load();

    expect(useConfigStore.getState().config).toBeNull();
    expect(useConfigStore.getState().failed).toBe(true);
    expect(effectiveConfig(useConfigStore.getState())).toEqual(FALLBACK_CONFIG);

    // config hâlâ null olduğu için ikinci load yeniden ağa gitmeli.
    vi.mocked(api.getConfig).mockResolvedValue(served);
    await useConfigStore.getState().load();
    expect(api.getConfig).toHaveBeenCalledTimes(2);
    expect(useConfigStore.getState().config).toEqual(served);
    expect(useConfigStore.getState().failed).toBe(false);
  });
});
