import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSessionStore } from "../store/sessionStore";
import SoloSetupPage from "./SoloSetupPage";

const view = {
  slug: "s9k2m",
  name: "Cumartesi kahvesi",
  activityTypes: ["COFFEE"],
  sessionType: "SOLO",
  status: "COLLECTING",
  participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } },
  ],
  viewer: { participantId: "h", host: true },
} as const;

describe("SoloSetupPage", () => {
  it("host konumlu, manuel nokta yok: Konumlar görünür, 1 / en az 2, CTA kapalı", () => {
    useSessionStore.setState({ slug: "s9k2m", view: view as never });
    render(<SoloSetupPage view={view as never} />);
    expect(screen.getByText("Konumlar")).toBeInTheDocument();
    expect(screen.getByText("1 / en az 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeDisabled();
  });

  it("390'da harita hiç mount edilmez (§4.7)", () => {
    useSessionStore.setState({ slug: "s9k2m", view: view as never });
    render(<SoloSetupPage view={view as never} />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
  });

  it("gerçek lg genişlikte (matchMedia eşleşirse) harita mount olur (§4.7)", async () => {
    useSessionStore.setState({ slug: "s9k2m", view: view as never });
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    render(<SoloSetupPage view={view as never} />);
    expect(await screen.findByTestId("mapview")).toBeInTheDocument();
    window.matchMedia = original;
  });
});
