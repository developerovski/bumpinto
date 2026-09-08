import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { me: vi.fn(), putConsents: vi.fn() } }));

import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import ConsentPage from "./ConsentPage";

const me = (over: Record<string, unknown> = {}) => ({
  id: "u1", email: "m@x.test",
  consents: { location: true, microphone: true, analytics: false, updatedAt: "2026-09-06T09:41:00Z", version: "1.0", ...over },
});

function at(over: Record<string, unknown> = {}) {
  useAuthStore.setState({ status: "signed", me: me(over) as never });
  return render(<MemoryRouter><ConsentPage /></MemoryRouter>);
}

describe("ConsentPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("üç anahtar sunucudaki değerlerle, verildi satırı tarih ve sürümle", () => {
    at();
    expect(screen.getByRole("switch", { name: "Konum verimin işlenmesi" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Mikrofon / sesli sohbet" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Kullanım verisi" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/Verildi: .*sürüm 1\.0/)).toBeInTheDocument();
  });

  it("hiç kaydedilmemişse 'henüz kaydedilmedi'", () => {
    at({ updatedAt: undefined, version: undefined });
    expect(screen.getByText("Henüz kaydedilmedi.")).toBeInTheDocument();
  });

  it("Kaydet üç anahtarı birlikte yazar", async () => {
    vi.mocked(api.putConsents).mockResolvedValue(undefined);
    vi.mocked(api.me).mockResolvedValue(me({ analytics: true }) as never);
    at();
    fireEvent.click(screen.getByRole("switch", { name: "Kullanım verisi" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() =>
      expect(api.putConsents).toHaveBeenCalledWith({ location: true, microphone: true, analytics: true }));
  });

  it("yazma düşerse hata basılır ve anahtarlar sunucu değerine döner", async () => {
    vi.mocked(api.putConsents).mockRejectedValue(new Error("net"));
    at();
    fireEvent.click(screen.getByRole("switch", { name: "Kullanım verisi" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByText("Kaydedilemedi — tekrar dene.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Kullanım verisi" })).toHaveAttribute("aria-checked", "false");
  });

  /* Artboard 4906/5090: not KALICI bilgidir — kapatmanın sonucu KAPATMADAN ÖNCE de okunmalı,
     yoksa rıza "bilgilendirilmiş" olmaz. */
  it("konum uyarısı anahtar açıkken de kapalıyken de görünür", () => {
    at();
    expect(screen.getByText(/adres yazarak katılırsın/)).toBeInTheDocument();
    cleanup();
    at({ location: false });
    expect(screen.getByText(/adres yazarak katılırsın/)).toBeInTheDocument();
  });

  it("aydınlatma bağlantısı /data-rights'e gider (KVKK/GDPR rejim ayrımı orada)", () => {
    at();
    expect(screen.getByRole("link", { name: /Aydınlatma metnini oku/ })).toHaveAttribute("href", "/data-rights");
  });
});
