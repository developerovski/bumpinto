import { fireEvent, render, screen } from "@testing-library/react";
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

  // Foto CSS arka planıyla çizilseydi ölü bağlantı bomboş beyaz kutu bırakırdı; <img>
  // olduğu için onError gradyan + monograma düşebiliyor.
  it("fotoğraf yüklenemezse monograma düşer", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg" }} />);
    const img = screen.getByRole("presentation", { hidden: true });
    expect(screen.queryByText("cb")).not.toBeInTheDocument();

    fireEvent.error(img);

    expect(screen.getByText("cb")).toBeInTheDocument();
    expect(screen.queryByText("foto · Places")).not.toBeInTheDocument();
  });

  // Yerel resim sürüklemesi SwipeCard'ın pointer olaylarını iptal ediyordu; kart kaydırılamıyordu.
  it("fotoğraf sürüklenemez ve pointer olaylarını karta bırakır", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg" }} />);
    const img = screen.getByRole("presentation", { hidden: true });
    expect(img).toHaveAttribute("draggable", "false");
    expect(img.className).toContain("pointer-events-none");
  });

  // Artboard d2/d3: yığındaki arka kartlar çıplak gradyan — içinde hiçbir şey yok.
  it("photoOnly kartın fotoğraf alanında içerik yok", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg" }} photoOnly />);
    expect(screen.queryByText("foto · Places")).not.toBeInTheDocument();
    expect(screen.queryByText("cb")).not.toBeInTheDocument();
    expect(screen.queryByText("Café Berlage")).not.toBeInTheDocument();
  });
});
