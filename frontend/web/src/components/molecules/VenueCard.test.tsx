import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VenueCard from "./VenueCard";

// Tasarım denetimi bulgusu (2026-09-01): "foto · Places" rozeti koşullu olmalı.
describe("VenueCard", () => {
  it("fotoğrafsız kartta rozet yok, ambient gradyan + monogram var", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage" }} />);
    expect(screen.queryByText("foto · Places")).not.toBeInTheDocument();
    expect(screen.getByText("cb")).toBeInTheDocument();
  });

  it("gerçek foto varken rozeti gösterir", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg" }} />);
    expect(screen.getByText("foto · Places")).toBeInTheDocument();
  });

  it("boş photoUrl fotoğrafsız sayılır — rozet yok, monogram var", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "" }} />);
    expect(screen.queryByText("foto · Places")).not.toBeInTheDocument();
    expect(screen.getByText("cb")).toBeInTheDocument();
  });

  // Artboard d2/d3: yığındaki arka kartlar çıplak gradyan — içinde hiçbir şey yok.
  it("photoOnly kartın fotoğraf alanında içerik yok", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg" }} photoOnly />);
    expect(screen.queryByText("foto · Places")).not.toBeInTheDocument();
    expect(screen.queryByText("cb")).not.toBeInTheDocument();
    expect(screen.queryByText("Café Berlage")).not.toBeInTheDocument();
  });
});
