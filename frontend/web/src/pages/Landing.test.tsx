import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthStore } from "../store/authStore";
import Landing from "./Landing";

/** `useMediaQuery` jsdom'da varsayılan olarak HİÇBİR sorguyu eşleştirmez (test-setup.ts);
    masaüstünü test eden yer `matchMedia`'yı geçici olarak değiştirir. */
const realMatchMedia = window.matchMedia;
function matchDesktop() {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

function at() {
  useAuthStore.setState({ status: "anon" });
  return render(<MemoryRouter><Landing /></MemoryRouter>);
}

describe("Landing", () => {
  afterEach(() => { window.matchMedia = realMatchMedia; });

  /** Artboard 390 (659-673): giriş bloğu `.scroll`un DIŞINDA, ekranın dibindeki `.cta`da. */
  it("390'da giriş bloğu iki bölgenin dışında, sayfanın sonunda durur", () => {
    const { container } = at();
    const terms = screen.getByText(/Koşulları/).closest("p")!;
    expect(container.querySelector('[data-testid="zone-left"]')!.contains(terms)).toBe(false);
    // Sayfa akışında iki bölgeden SONRA gelir — `.cta` gibi dibe iner.
    const zone = container.querySelector('[data-testid="zone-left"]')!;
    expect(zone.compareDocumentPosition(terms) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  /** Artboard 1280 (620-623): aynı blok sol bölgenin son çocuğudur. */
  it("1280'de giriş bloğu sol bölgenin içindedir", () => {
    matchDesktop();
    const { container } = at();
    const terms = screen.getByText(/Koşulları/).closest("p")!;
    expect(container.querySelector('[data-testid="zone-left"]')!.contains(terms)).toBe(true);
  });

  /** Giriş bloğu TEK örnek: GIS her örnekte yeniden `initialize` ederdi. */
  it("giriş bloğu yalnız bir kez basılır", () => {
    at();
    expect(screen.getAllByText(/Koşulları/)).toHaveLength(1);
  });
});
