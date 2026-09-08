import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppShell from "./AppShell";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}
afterEach(() => setOnline(true));

// jsdom `location.reload` yeniden tanımlanamıyor (non-configurable) — tüm `location`'ı sahte
// bir kopyayla değiştirip testten sonra geri koy.
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

const shell = () =>
  render(
    <MemoryRouter initialEntries={["/sessions"]}>
      <Routes>
        <Route element={<AppShell />}><Route path="/sessions" element={<p>liste</p>} /></Route>
      </Routes>
    </MemoryRouter>,
  );

describe("AppShell — çevrimdışı şeridi", () => {
  it("şerit yalnız çevrimdışında çıkar; sayfa içeriği kalır", () => {
    shell();
    expect(screen.queryByText("Bağlantı yok")).not.toBeInTheDocument();
    act(() => setOnline(false));
    expect(screen.getByText("Bağlantı yok")).toBeInTheDocument();
    expect(screen.getByText("liste")).toBeInTheDocument();
  });

  it("başarısız ağ yoklamasında reload çağrılmaz, şerit kalır", async () => {
    const reload = stubReload();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ağ yok")));
    shell();
    act(() => setOnline(false));
    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Tekrar dene" })).not.toBeDisabled());
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText("Bağlantı yok")).toBeInTheDocument();
  });

  it("başarılı ağ yoklamasında reload çağrılır", async () => {
    const reload = stubReload();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    shell();
    act(() => setOnline(false));
    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });
});
