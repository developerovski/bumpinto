import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { getConfig: vi.fn() } }));

import { resetConfig, useConfigStore } from "../store/configStore";
import AttributionsPage from "./AttributionsPage";

const source = (id: string, key: string, url: string | null) => ({
  id, attributionKey: key, attributionUrl: url, ratingScale: null,
});

function at(sources: ReturnType<typeof source>[] | null) {
  if (sources) {
    useConfigStore.setState({
      config: { mapEngine: "maplibre", tiles: { styleUrl: "x" }, sources } as never,
      failed: false,
    });
  }
  return render(<MemoryRouter><AttributionsPage /></MemoryRouter>);
}

afterEach(() => resetConfig());

describe("AttributionsPage", () => {
  it("mekan/harita satırları config.sources'tan gelir: ad, açıklama, atıf ve kaynak bağlantısı", () => {
    at([
      source("google", "attribution.google", "https://www.google.com/maps"),
      source("foursquare", "attribution.foursquare", "https://foursquare.com"),
      source("open", "attribution.open", "https://www.openstreetmap.org/copyright"),
    ]);
    expect(screen.getByRole("heading", { level: 1, name: "Atıflar ve lisanslar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google Maps Platform" }))
      .toHaveAttribute("href", "https://www.google.com/maps");
    expect(screen.getByText(/Google Haritalar Ek Hizmet Şartları/)).toBeInTheDocument();
    // Atıf METNİ sunucudaki `attributionKey`ten gelir — sayfa kendi metnini uydurmaz.
    expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
    expect(screen.getByText(/© OpenStreetMap katkıcıları/)).toBeInTheDocument();
  });

  /* Sözleşme: sağlayıcı başına kod dalı yok. Bilinmeyen bir id gelirse satır yine basılır,
     ama açıklama UYDURULMAZ. */
  it("bilinmeyen kaynak: ad olarak id basılır, açıklama basılmaz", () => {
    at([source("tripadvisor", "attribution.tripadvisor", null)]);
    expect(screen.getByText("tripadvisor")).toBeInTheDocument();
    expect(screen.getByText("Veriler Tripadvisor'dan")).toBeInTheDocument();
    expect(screen.queryByText(/attribution\.desc/)).not.toBeInTheDocument();
    // `attributionUrl` yoksa ad bağlantı DEĞİLDİR.
    expect(screen.queryByRole("link", { name: "tripadvisor" })).not.toBeInTheDocument();
  });

  it("config gelmediyse mekan bölümü hiç basılmaz, açık kaynak listesi kalır", () => {
    at(null);
    expect(screen.queryByText("Mekan ve harita verisi")).not.toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("açık kaynak kartı kütüphane ve lisanslarını taşır", () => {
    at([]);
    ["React", "Vite", "Phosphor Icons", "Bricolage Grotesque", "Figtree", "Caveat"]
      .forEach((lib) => expect(screen.getByText(lib)).toBeInTheDocument());
    expect(screen.getAllByText("MIT")).toHaveLength(3);
    expect(screen.getAllByText("OFL 1.1")).toHaveLength(3);
  });
});
