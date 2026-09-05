import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSessionStore } from "../store/sessionStore";
import LobbyPage from "./LobbyPage";

const base = { slug: "x7k2m", name: "Cuma kahvesi", activityTypes: ["COFFEE"], sessionType: "GROUP", status: "COLLECTING", venues: [], midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 4.4, viewer: { participantId: "h", host: true } } as const;
const host = { id: "h", displayName: "Mehmet", host: true, hasLocation: true, manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } };
const kerem = { id: "k", displayName: "Kerem", host: false, hasLocation: false, manual: false };
const ayse = { id: "a", displayName: "Ayşe", host: false, hasLocation: true, manual: false, locationLabel: "Someren", approxLocation: { lat: 51.39, lng: 5.71 } };

describe("LobbyPage", () => {
  it("1 konum: CTA kapalı, davet linki ve geç kalan notu", () => {
    const view = { ...base, participants: [host, kerem] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeDisabled();
    expect(screen.getByText(/\/j\/x7k2m/)).toBeInTheDocument();
    expect(screen.getByText(/Kerem yetişemezse/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Orta nokta" })).toBeInTheDocument();
    expect(screen.getByText("≤ 4 km")).toBeInTheDocument();
  });
  it("2 konum: CTA açık", () => {
    const view = { ...base, participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeEnabled();
  });
  /** Lobi seçili alanların HEPSİNİ gösterir ve vaat cümlesini çoğullar. */
  it("üç ilgi alanını rozet ve cümle olarak basar", () => {
    const view = { ...base, activityTypes: ["COFFEE", "HIKE", "BAR"], participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByText("Kahve")).toBeInTheDocument();
    expect(screen.getByText("Doğa yürüyüşü")).toBeInTheDocument();
    expect(screen.getByText("Bar")).toBeInTheDocument();
    expect(screen.getByText(/Kahve, Doğa yürüyüşü ve Bar için buluşuyoruz/)).toBeInTheDocument();
  });

  it("lg: harita ghost'a basmadan mount edilir ve kalan yüksekliği doldurur", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      const view = { ...base, participants: [host, ayse] };
      useSessionStore.setState({ slug: "x7k2m", view: view as never });
      render(<LobbyPage view={view as never} />);
      const map = await screen.findByTestId("mapview");
      expect(screen.queryByRole("button", { name: "Haritayı aç" })).not.toBeInTheDocument();
      /* Sabit `lg:h-[calc(100dvh-14rem)]` masaüstünde ~290px taşma bırakıyordu: kabuk 224px
         değil ~511px. Ölçü artık kabuktan gelir — haritada sabit lg yüksekliği YASAK. */
      expect(map.className).toContain("fit:h-full");
      expect(map.className).not.toMatch(/lg:h-\[/);
      expect(screen.getByRole("main")).toHaveAttribute("data-fit");
      expect(screen.getByTestId("zone-left").className).toContain("fit:overflow-y-auto");
      expect(screen.getByTestId("zone-right").className).toContain("fit:overflow-y-auto");
    } finally {
      window.matchMedia = original;
    }
  });

  it("390: harita mount edilmez, ghost görünür", () => {
    const view = { ...base, participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Haritayı aç" })).toBeInTheDocument();
  });
});
