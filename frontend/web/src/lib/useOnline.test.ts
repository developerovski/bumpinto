import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOnline, useRetryOnline } from "./useOnline";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}
afterEach(() => setOnline(true));
// Üstündeki bir assert patlarsa sahte saat sonraki teste sızmasın (kod incelemesi #5).
afterEach(() => vi.useRealTimers());

describe("useOnline", () => {
  it("başlangıç değeri navigator.onLine", () => {
    setOnline(false);
    expect(renderHook(() => useOnline()).result.current.online).toBe(false);
  });

  it("olayları izler ve düşüş anını damgalar", () => {
    vi.setSystemTime(new Date("2026-09-06T12:38:00Z"));
    const { result } = renderHook(() => useOnline());
    expect(result.current.online).toBe(true);
    act(() => setOnline(false));
    expect(result.current.online).toBe(false);
    expect(result.current.lastOnlineAt).toBe(Date.parse("2026-09-06T12:38:00Z"));
    act(() => setOnline(true));
    expect(result.current.online).toBe(true);
  });

  it("dinleyiciler unmount'ta sökülür", () => {
    const off = vi.spyOn(window, "removeEventListener");
    renderHook(() => useOnline()).unmount();
    expect(off).toHaveBeenCalledWith("offline", expect.any(Function));
    off.mockRestore();
  });
});

describe("useRetryOnline", () => {
  // jsdom `location.reload` yeniden tanımlanamıyor (non-configurable) — tüm `location`'ı
  // sahte bir kopyayla değiştirip testten sonra geri koy.
  const originalLocation = window.location;
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    vi.unstubAllGlobals();
  });

  function stubReload() {
    const reload = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload } });
    return reload;
  }

  it("yoklama başarısızsa reload çağrılmaz, checking geri düşer", async () => {
    const reload = stubReload();
    const fetchMock = vi.fn().mockRejectedValue(new Error("ağ yok"));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useRetryOnline());
    act(() => result.current.retry());
    expect(result.current.checking).toBe(true);
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith("/api/config", { cache: "no-store" });
    expect(reload).not.toHaveBeenCalled();
  });

  it("yoklama başarılıysa reload çağrılır", async () => {
    const reload = stubReload();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const { result } = renderHook(() => useRetryOnline());
    act(() => result.current.retry());
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it("yanıt ok:false ise ağ var ama reload YOK", async () => {
    const reload = stubReload();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const { result } = renderHook(() => useRetryOnline());
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(reload).not.toHaveBeenCalled();
  });
});
