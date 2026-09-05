import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { createSession: vi.fn(), addPoint: vi.fn(), findVenues: vi.fn() } }));
vi.mock("../lib/geocode", () => ({ geocode: vi.fn(), reverseGeocode: vi.fn() }));

import { api } from "../lib/api";
import { geocode } from "../lib/geocode";
import { useAuthStore } from "../store/authStore";
import NewSessionPage from "./NewSessionPage";

describe("NewSessionPage", () => {
  it("Grup varsayılan; Bireysel'e geçince Konumlar ve kapalı 'Mekanları bul'", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Buluşmayı kur" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    expect(screen.getByText("Konumlar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeDisabled();
  });

  it("Bireysel'de 390'da harita hiç mount edilmez (§4.7)", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
  });

  it("Bireysel'de gerçek lg genişlikte (matchMedia eşleşirse) harita mount olur (§4.7)", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
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
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    expect(await screen.findByTestId("mapview")).toBeInTheDocument();
    window.matchMedia = original;
  });

  it("varsayılan orta nokta modu — çapa alanı görünmez", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    expect(screen.queryByLabelText("Buluşma yeri")).not.toBeInTheDocument();
  });

  it("'belli bir yerde' seçilince çapa alanı çıkar", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    expect(screen.getByLabelText("Buluşma yeri")).toBeInTheDocument();
  });

  // Kapı SOLO düğmesinde: çapasız Bireysel'de iki nokta ŞART (1. test), çapalıda değil.
  it("çapa modunda host konumu olmadan da kurulabilir — düğme kilitli değil", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeEnabled();
    // Düğmeyle notun kapısı AYNI: açık düğmenin altında "En az 2 konum gerekir." yazamaz.
    expect(screen.queryByText("En az 2 konum gerekir.")).not.toBeInTheDocument();
  });

  // Klavye yolu çapayı GERÇEKTEN kuruyor mu: not, store'daki çapanın etiketini basar —
  // `setAnchor` düşerse metin "Mekanlar bu noktanın 2 km çevresinde aranır."ta kalır.
  it("çapa alanına yazılan adres çözülünce not yeri söyler", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(geocode).mockResolvedValue({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    const field = screen.getByLabelText("Buluşma yeri");
    fireEvent.change(field, { target: { value: "Amsterdam" } });
    fireEvent.blur(field);
    expect(await screen.findByText("Amsterdam çevresinde aranacak")).toBeInTheDocument();
  });

  // create()'in gevşetilmiş konum kapısı: host konum vermeden kurabilmeli ve istek çapayı taşımalı.
  it("çapalı oturum host konumu olmadan kurulur — istek çapayı taşır", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(geocode).mockResolvedValue({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });
    vi.mocked(api.createSession).mockResolvedValue({ slug: "x7k2m" } as never);
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    const field = screen.getByLabelText("Buluşma yeri");
    fireEvent.change(field, { target: { value: "Amsterdam" } });
    fireEvent.blur(field);
    await screen.findByText("Amsterdam çevresinde aranacak");
    fireEvent.click(screen.getByRole("button", { name: "Buluşmayı kur" }));
    await waitFor(() =>
      expect(api.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ anchor: { lat: 52.3676, lng: 4.9041, label: "Amsterdam" }, lat: undefined }),
      ),
    );
  });
});
