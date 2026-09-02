import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";
import { useAuthStore } from "./store/authStore";

describe("App", () => {
  it("anonim kök: landing", () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByText(/buluşalım\./)).toBeInTheDocument();
  });
  it("bilinmeyen yol: 404", () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<MemoryRouter initialEntries={["/nereye"]}><App /></MemoryRouter>);
    expect(screen.getByText("Burada bir şey yok.")).toBeInTheDocument();
  });
  it("anonim /sessions → landing'e yönlenir", () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<MemoryRouter initialEntries={["/sessions"]}><App /></MemoryRouter>);
    expect(screen.getByText(/buluşalım\./)).toBeInTheDocument();
  });
});
