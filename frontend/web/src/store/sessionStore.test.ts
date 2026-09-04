import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  api: { getSession: vi.fn(), preview: vi.fn(), join: vi.fn() },
}));

import { api } from "../lib/api";
import { useSessionStore } from "./sessionStore";

const view = {
  slug: "x",
  name: "Cuma kahvesi",
  activityType: "COFFEE",
  sessionType: "GROUP",
  status: "COLLECTING",
  expiresAt: "",
  participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false },
  ],
  venues: [],
  runoffVenueIds: [],
  voteTally: {},
};

function httpError(status: number) {
  return new AxiosError("x", String(status), undefined, undefined, {
    status, data: {}, statusText: "", headers: {}, config: { headers: new AxiosHeaders() },
  });
}

describe("sessionStore.refresh — üyelik", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // çağrı geçmişi testler arasında taşınmasın
    vi.mocked(api.preview).mockResolvedValue({ name: "Cuma kahvesi" } as never);
    useSessionStore.getState().bind("x");
  });

  it("üye → görünüm gelir, katılım formu yok", async () => {
    vi.mocked(api.getSession).mockResolvedValueOnce(
      { ...view, viewer: { participantId: "h", host: true } } as never);
    await useSessionStore.getState().refresh();
    expect(useSessionStore.getState().view).not.toBeNull();
  });

  it("giriş yapmış ama üye değil (403) → katılım formu", async () => {
    vi.mocked(api.getSession).mockRejectedValueOnce(httpError(403));
    await useSessionStore.getState().refresh();
    expect(useSessionStore.getState().view).toBeNull(); // SessionPage: view yok -> Katıl formu
    expect(api.preview).toHaveBeenCalled();
  });

  it("anonim (401) → katılım formu", async () => {
    vi.mocked(api.getSession).mockRejectedValueOnce(httpError(401));
    await useSessionStore.getState().refresh();
    expect(useSessionStore.getState().view).toBeNull();
  });

  it("404 → bulunamadı; katılım formu açılmaz", async () => {
    vi.mocked(api.getSession).mockRejectedValueOnce(httpError(404));
    await useSessionStore.getState().refresh();
    expect(useSessionStore.getState().error).toBe("session.notFound");
    expect(api.preview).not.toHaveBeenCalled(); // 404 katilim daveti degil
  });

  /* Canlı olaylar aynı anda birden çok refresh tetikleyebilir (her olay + emniyet poll'ü).
     Yanıt sırası garanti değil: geç dönen ESKİ yanıt yeniyi ezerse ekran geriye gider ve
     bir sonraki olaya kadar öyle kalır. */
  it("geç dönen eski yanıt yeni görünümü ezmez", async () => {
    const viewer = { participantId: "h", host: true };
    let releaseStale: () => void = () => undefined;
    vi.mocked(api.getSession)
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          releaseStale = () => resolve({ ...view, status: "COLLECTING", viewer } as never);
        }))
      .mockResolvedValueOnce({ ...view, status: "BROWSING", viewer } as never);

    const stale = useSessionStore.getState().refresh();
    const fresh = useSessionStore.getState().refresh();
    await fresh;
    expect(useSessionStore.getState().view?.status).toBe("BROWSING");

    releaseStale();
    await stale;
    expect(useSessionStore.getState().view?.status).toBe("BROWSING");
  });
});
