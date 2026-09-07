import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SupportPage from "./SupportPage";

function at() {
  return render(<MemoryRouter><SupportPage /></MemoryRouter>);
}

describe("SupportPage", () => {
  /* Adres TEK yerde ve tıklanabilir: ayrı bir "E-posta gönder" butonu aynı adresi
     ikinci kez gösteriyordu (2026-09-07). */
  it("e-posta adresi tek kez ve mailto bağlantısı olarak görünür", () => {
    at();
    const links = screen.getAllByRole("link", { name: "hello@bumpinto.app" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "mailto:hello@bumpinto.app");
  });

  it("dört SSS sorusu ve cevabı basılır", () => {
    at();
    expect(screen.getAllByRole("group")).toHaveLength(4);
    expect(screen.getByText(/Ses cihazlar arasında doğrudan/)).toBeInTheDocument();
  });

  /* Kullanıcı kararı 2026-09-07: iletişim ad + e-posta ile SINIRLI; telefon/adres ve
     DSA m.30 atıfı yayımlanmaz (o madde pazaryerleri içindir, bize uygulanmaz). */
  it("iletişim YALNIZ e-posta taşır: ad, telefon, adres ve DSA yok", () => {
    at();
    expect(screen.getByText("hello@bumpinto.app")).toBeInTheDocument();
    expect(screen.queryByText(/Şerefoğlu/)).not.toBeInTheDocument();
    expect(screen.queryByText(/DSA/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Telefon/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adres/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /account\/delete/ })).toHaveAttribute("href", "/account/delete");
  });
});
