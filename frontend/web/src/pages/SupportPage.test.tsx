import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SupportPage from "./SupportPage";

function at() {
  return render(<MemoryRouter><SupportPage /></MemoryRouter>);
}

describe("SupportPage", () => {
  it("e-posta bağlantısı mailto ile açılır", () => {
    at();
    expect(screen.getByRole("link", { name: /E-posta gönder/ })).toHaveAttribute("href", "mailto:hello@bumpinto.app");
  });

  it("dört SSS sorusu ve cevabı basılır", () => {
    at();
    expect(screen.getAllByRole("group")).toHaveLength(4);
    expect(screen.getByText(/Ses cihazlar arasında doğrudan/)).toBeInTheDocument();
  });

  /* Kullanıcı kararı 2026-09-07: iletişim ad + e-posta ile SINIRLI; telefon/adres ve
     DSA m.30 atıfı yayımlanmaz (o madde pazaryerleri içindir, bize uygulanmaz). */
  it("iletişim yalnız ad ve e-posta taşır, telefon/adres/DSA yok", () => {
    at();
    expect(screen.getByText("BumpInto (Mehmet Şerefoğlu)")).toBeInTheDocument();
    expect(screen.getByText("hello@bumpinto.app")).toBeInTheDocument();
    expect(screen.queryByText(/DSA/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Telefon/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adres/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /account\/delete/ })).toHaveAttribute("href", "/account/delete");
  });
});
