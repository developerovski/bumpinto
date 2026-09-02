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
});
