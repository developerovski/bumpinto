import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSessionStore } from "../store/sessionStore";
import LobbyPage from "./LobbyPage";

const base = { slug: "x7k2m", name: "Cuma kahvesi", activityType: "COFFEE", sessionType: "GROUP", status: "COLLECTING", venues: [], midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 4.4, viewer: { participantId: "h", host: true } } as const;
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
    expect(screen.getByText("Orta nokta · ≤ 4 km")).toBeInTheDocument();
  });
  it("2 konum: CTA açık", () => {
    const view = { ...base, participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeEnabled();
  });
});
