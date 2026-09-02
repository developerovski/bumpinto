import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { me: vi.fn(), loginGoogle: vi.fn(), logout: vi.fn() } }));

import { api } from "../lib/api";
import i18n from "../i18n";
import { useAuthStore } from "./authStore";

const me = { id: "u1", email: "m@x.test", displayName: "Mehmet", language: "nl",
  defaultLocation: undefined, defaultActivity: undefined, stats: { sessionsHosted: 1, friendsMet: 2 } };

describe("authStore", () => {
  beforeEach(() => useAuthStore.setState({ status: "unknown", me: null }));
  afterEach(async () => {
    await i18n.changeLanguage("tr");
  });

  it("load: 401 → anon", async () => {
    vi.mocked(api.me).mockRejectedValueOnce(
      new AxiosError("x", "401", undefined, undefined, { status: 401, data: {}, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } }));
    await useAuthStore.getState().load();
    expect(useAuthStore.getState().status).toBe("anon");
  });

  it("load: 200 → signed ve sunucu dili uygulanır", async () => {
    vi.mocked(api.me).mockResolvedValueOnce(me);
    await useAuthStore.getState().load();
    expect(useAuthStore.getState().status).toBe("signed");
    expect(document.documentElement.lang).toBe("nl");
  });

  it("logout → anon", async () => {
    vi.mocked(api.logout).mockResolvedValueOnce(undefined);
    useAuthStore.setState({ status: "signed", me });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe("anon");
  });

  it("load: URL'deki ?lng= sunucu tercihini ezer", async () => {
    window.history.replaceState({}, "", "/?lng=tr");
    vi.mocked(api.me).mockResolvedValueOnce({ ...me, language: "nl" });
    await useAuthStore.getState().load();
    expect(document.documentElement.lang).toBe("tr");
    window.history.replaceState({}, "", "/");
  });
});
