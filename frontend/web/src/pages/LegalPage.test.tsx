import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "../i18n";
import type { LegalSlug } from "@bumpinto/shared";
import LegalPage from "./LegalPage";

function at(slug: LegalSlug) {
  return render(<MemoryRouter><LegalPage slug={slug} /></MemoryRouter>);
}

/** Dil değişiminde ayakta kalan render'lar da yeniden basılır — önce sök, sonra değiştir. */
async function inLanguage(lang: string, slug: LegalSlug) {
  cleanup();
  await i18n.changeLanguage(lang);
  at(slug);
}

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("tr");
});

describe("LegalPage", () => {
  it("gizlilik: başlık, sürüm satırı, tablo ve hak bağlantısı", () => {
    at("privacy");
    expect(screen.getByRole("heading", { level: 1, name: "Gizlilik politikası" })).toBeInTheDocument();
    expect(screen.getByText(/Sürüm 1\.0/)).toBeInTheDocument();
    expect(screen.getByText("Ses")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "bumpinto.app/account/delete" })).toHaveAttribute("href", "/account/delete");
  });

  it("şartlar: sıfır tolerans cümlesi aynen basılır", () => {
    at("terms");
    expect(screen.getByText(/sıfır toleransımız var/)).toBeInTheDocument();
  });

  it("veri hakları TR'de KVKK rejimini anlatır", () => {
    at("data-rights");
    expect(screen.getByText(/Bu metin aydınlatma amaçlıdır/)).toBeInTheDocument();
    expect(screen.getByText("Silinmesini veya yok edilmesini isteme")).toBeInTheDocument();
    expect(screen.getByText(/Kişisel Verileri Koruma Kurulu/)).toBeInTheDocument();
  });

  /* Kullanıcı kararı 2026-09-07: rejim DİLE bağlı — TR KVKK, EN/NL GDPR. */
  it("veri hakları EN'de GDPR rejimini anlatır, KVKK'dan söz etmez", async () => {
    await inLanguage("en", "data-rights");
    expect(screen.getByRole("heading", { level: 1, name: "Your data rights" })).toBeInTheDocument();
    expect(screen.getByText(/Portability/)).toBeInTheDocument();
    expect(screen.getByText(/Autoriteit Persoonsgegevens/)).toBeInTheDocument();
    expect(screen.queryByText(/Kişisel Verileri Koruma Kurulu/)).not.toBeInTheDocument();
  });

  it("veri hakları NL'de GDPR rejimini Hollandaca anlatır", async () => {
    await inLanguage("nl", "data-rights");
    expect(screen.getByRole("heading", { level: 1, name: "Jouw gegevensrechten" })).toBeInTheDocument();
    expect(screen.getByText(/Overdraagbaarheid/)).toBeInTheDocument();
  });

  /** Her sürüm diğer rejime işaret eder: dil ≠ yargı yetkisi. */
  it("her iki rejim de diğerine köprü kurar", async () => {
    at("data-rights");
    expect(screen.getByText(/Avrupa Ekonomik Alanı'ndaysan GDPR geçerlidir/)).toBeInTheDocument();
    await inLanguage("en", "data-rights");
    expect(screen.getByText(/If you are in Türkiye, KVKK/)).toBeInTheDocument();
  });

  it("gövde çeviri şeridi DEĞİL gerçek çeviridir: EN gizlilik Türkçe cümle taşımaz", async () => {
    await inLanguage("en", "privacy");
    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeInTheDocument();
    expect(screen.getByText(/streams directly between devices \(P2P\)/)).toBeInTheDocument();
    expect(screen.queryByText(/cihazlar arası doğrudan/)).not.toBeInTheDocument();
  });
});
