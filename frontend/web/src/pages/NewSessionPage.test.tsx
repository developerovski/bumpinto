import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
});
