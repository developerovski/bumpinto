import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "../../store/authStore";
import TopBar from "./TopBar";

function renderBar() {
  return render(
    <MemoryRouter>
      <TopBar />
    </MemoryRouter>,
  );
}

describe("TopBar", () => {
  it("anonim: yalnız wordmark ve dil menüsü", () => {
    useAuthStore.setState({ status: "anon", me: null });
    renderBar();
    expect(screen.getByText("BumpInto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dil seç/i })).toBeInTheDocument();
    expect(screen.queryByText("Oturumlar")).not.toBeInTheDocument();
  });

  it("giriş yapmış: Oturumlar bağlantısı ve avatar menüsü", () => {
    useAuthStore.setState({
      status: "signed",
      me: { id: "u1", email: "m@x.test", displayName: "Mehmet", language: undefined,
        stats: { sessionsHosted: 0, friendsMet: 0 } },
    });
    renderBar();
    expect(screen.getByRole("link", { name: "Oturumlar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hesap menüsü/i })).toBeInTheDocument();
  });

  /* Keşfet mobilde de üst çubukta: plan teziyle Oturumlar kadar birincil giriş. */
  it("giriş yapmış: Keşfet bağlantısı her genişlikte görünür ve avatar menüsünde de var", () => {
    useAuthStore.setState({ status: "signed", me: { id: "u1", displayName: "Mehmet" } });
    renderBar();
    const k = screen.getByRole("link", { name: "Keşfet" });
    expect(k).toHaveAttribute("href", "/kesfet");
    expect(k.className).not.toMatch(/(^| )hidden( |$)/);
    expect(screen.getByRole("link", { name: "Oturumlar" }).className).toMatch(/(^| )hidden( |$)/);
    fireEvent.click(screen.getByRole("button", { name: /hesap menüsü/i }));
    expect(screen.getByRole("menuitem", { name: "Keşfet" })).toHaveAttribute("href", "/kesfet");
  });
});
