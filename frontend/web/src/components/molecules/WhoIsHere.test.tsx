import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WhoIsHere from "./WhoIsHere";

describe("WhoIsHere", () => {
  it("hazır sayısını ve hazır olanların adlarını gösterir", () => {
    render(<WhoIsHere participants={[
      { displayName: "Mehmet", host: true, hasLocation: true },
      { displayName: "Ayşe", host: false, hasLocation: true },
      { displayName: "Kerem", host: false, hasLocation: false },
    ]} />);
    expect(screen.getByText("2 / 3 hazır")).toBeInTheDocument();
    expect(screen.getByText(/Mehmet ve Ayşe hazır\./)).toBeInTheDocument();
  });

  /** Artboard W4b 1280 (4229–4250) — `rows` kişi başına satır çizer. */
  it("rows ile her kişi için ad, alt satır ve durum rozeti basar", () => {
    render(<WhoIsHere rows hostOnline={false} participants={[
      { displayName: "Mehmet", host: true, hasLocation: true },
      { displayName: "Kerem", host: false, hasLocation: false },
    ]} />);
    expect(screen.getByText("Mehmet")).toBeInTheDocument();
    expect(screen.getByText("Kuran · çevrimdışı")).toBeInTheDocument();
    expect(screen.getByText("Hazır")).toBeInTheDocument();
    expect(screen.getByText("Kerem")).toBeInTheDocument();
    expect(screen.getByText("Konum bekleniyor…")).toBeInTheDocument();
    expect(screen.getByText("Bekliyor")).toBeInTheDocument();
    // Özet cümle satır düzeninde basılmaz.
    expect(screen.queryByText(/hazır\./)).not.toBeInTheDocument();
  });

  /** Önizleme DTO'su kişi başına varlık alanı taşımaz — host DIŞINDA çevrimdışı yazılmaz. */
  it("host çevrimiçiyken hiçbir satırda çevrimdışı yazmaz", () => {
    render(<WhoIsHere rows hostOnline participants={[
      { displayName: "Mehmet", host: true, hasLocation: true },
      { displayName: "Kerem", host: false, hasLocation: false },
    ]} />);
    expect(screen.getByText("Kuran")).toBeInTheDocument();
    expect(screen.queryByText(/çevrimdışı/)).not.toBeInTheDocument();
  });
});
