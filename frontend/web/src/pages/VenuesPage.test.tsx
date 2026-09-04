import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSessionStore } from "../store/sessionStore";
import VenuesPage from "./VenuesPage";

const venue = {
  id: "v1", name: "Koffie Keuten", lat: 51.5, lng: 5.5, rating: 4.5, deckOrder: 0,
  travelMinutes: { h: 40, a: 45 },
};
const base = {
  slug: "snu7zra8", name: "Cuma kahvesi", activityType: "COFFEE", status: "BROWSING",
  venues: [venue], midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 9,
};
const host = { id: "h", displayName: "Mehmet", host: true, hasLocation: true, manual: false, online: true, approxLocation: { lat: 51.7, lng: 5.3 } };
const guest = { id: "a", displayName: "Ayşe", host: false, hasLocation: true, manual: false, online: false, approxLocation: { lat: 51.39, lng: 5.71 } };

function show(view: unknown) {
  useSessionStore.setState({ slug: "snu7zra8", view: view as never });
  render(<VenuesPage view={view as never} />);
}

describe("VenuesPage — davet ve deste kapısı", () => {
  it("GROUP host: katılım hâlâ açık olduğu için davet linki burada", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "h", host: true }, participants: [host, guest] });
    expect(screen.getByRole("button", { name: /Davet linki/ })).toBeInTheDocument();
  });

  /** SOLO'nun davet linki YOKTUR (sunucu 409 "solo session has no invite link"). */
  it("SOLO: davet linki gösterilmez", () => {
    show({ ...base, sessionType: "SOLO", viewer: { participantId: "h", host: true }, participants: [host] });
    expect(screen.queryByRole("button", { name: /Davet linki/ })).not.toBeInTheDocument();
  });

  it("davetli: davet linki de Karıştır da yok", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "a", host: false }, participants: [host, guest] });
    expect(screen.queryByRole("button", { name: /Davet linki/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Karıştır ve kaydır" })).not.toBeInTheDocument();
  });

  it("odada iki kişi yoksa Karıştır kapalı ve sebebi yazılı", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "h", host: true }, participants: [host, guest] });
    expect(screen.getByRole("button", { name: "Karıştır ve kaydır" })).toBeDisabled();
    expect(screen.getByText(/en az iki kişi olmalı/)).toBeInTheDocument();
  });

  it("iki kişi de odadaysa Karıştır açık", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "h", host: true }, participants: [host, { ...guest, online: true }] });
    expect(screen.getByRole("button", { name: "Karıştır ve kaydır" })).toBeEnabled();
  });
});
