import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../store/authStore";
import { useSessionStore } from "../store/sessionStore";
import JoinForm from "./JoinForm";

/** Katıl formunun ulaşım türü alanı: profil varsayılanından ön-dolar, yoksa CAR'a düşer,
    kullanıcı değiştirirse gönderilen `travelMode` değişir. Konum/geocode akışına GİRMEZ —
    `JoinRequest.lat/lng` opsiyonel, boş adresle gönderim engellenmez (JoinForm.tsx submit()). */
describe("JoinForm — travelMode", () => {
  beforeEach(() => {
    useSessionStore.setState({ slug: "x7k2m", preview: null, join: vi.fn().mockResolvedValue(undefined) });
  });

  function submitAs(name: string) {
    fireEvent.change(screen.getByRole("textbox", { name: "Adın" }), { target: { value: name } });
    fireEvent.click(screen.getByRole("button", { name: "Katıl" }));
  }

  it("profilde defaultTravelMode BIKE → form BIKE ile ön-dolu, öyle gönderir", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet", defaultTravelMode: "BIKE" } as never });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    expect(screen.getByRole("radio", { name: "Bisikletle" })).toHaveAttribute("aria-checked", "true");
    submitAs("Ayşe");
    await vi.waitFor(() =>
      expect(useSessionStore.getState().join).toHaveBeenCalledWith(expect.objectContaining({ travelMode: "BIKE" })),
    );
  });

  it("profilde varsayılan yoksa CAR ile gönderir", async () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    expect(screen.getByRole("radio", { name: "Arabayla" })).toHaveAttribute("aria-checked", "true");
    submitAs("Ayşe");
    await vi.waitFor(() =>
      expect(useSessionStore.getState().join).toHaveBeenCalledWith(expect.objectContaining({ travelMode: "CAR" })),
    );
  });

  it("kullanıcı modu değiştirirse gönderilen travelMode değişir", async () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Yürüyerek" }));
    submitAs("Ayşe");
    await vi.waitFor(() =>
      expect(useSessionStore.getState().join).toHaveBeenCalledWith(expect.objectContaining({ travelMode: "WALK" })),
    );
  });
});
