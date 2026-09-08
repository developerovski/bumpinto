import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RunoffTie from "./RunoffTie";

describe("RunoffTie", () => {
  /**
   * Artboard 4400-4401: BİRİNCİL (flame) buton "Adil olana bırak", ikincil (beyaz) "Kararı
   * ben vereyim". Sıra ters çevrilirse ekran ürünün adalet varsayılanını tersine çevirir —
   * bu bir stil değil ANLAM testidir, o yüzden `kind` sınıfına da bakılır.
   */
  it("host: birincil aksiyon 'Adil olana bırak', ikincil 'Kararı ben vereyim'", () => {
    render(
      <RunoffTie host choice="v1" sending={false} onDecide={vi.fn()} onFair={vi.fn()} />,
    );
    const fair = screen.getByRole("button", { name: /Adil olana bırak/ });
    const decide = screen.getByRole("button", { name: "Kararı ben vereyim" });
    expect(fair.className).toContain("bg-flame-deep");
    expect(decide.className).toContain("bg-card");
    // Adil seçenek HER ZAMAN tıklanabilir; kendi kararı bir finalist seçmeyi şart koşar.
    expect(fair).toBeEnabled();
  });

  it("seçim yokken yalnız 'Kararı ben vereyim' devre dışıdır", () => {
    render(
      <RunoffTie host choice={null} sending={false} onDecide={vi.fn()} onFair={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Kararı ben vereyim" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Adil olana bırak/ })).toBeEnabled();
  });

  it("host olmayan: karar butonlarından hiçbiri görünmez ('Adil olana bırak' dahil)", () => {
    render(
      <RunoffTie host={false} choice={null} sending={false} onDecide={vi.fn()} onFair={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Kararı ben vereyim" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Adil olana bırak/ })).not.toBeInTheDocument();
  });

  // 1280'de iki buton yan yana ve içerik genişliğinde (`.fit` + 0 32px); 390'da tam genişlik.
  it("layout='row' butonları içerik genişliğine indirir", () => {
    render(
      <RunoffTie host choice="v1" sending={false} onDecide={vi.fn()} onFair={vi.fn()} layout="row" />,
    );
    const fair = screen.getByRole("button", { name: /Adil olana bırak/ });
    expect(fair.className).toContain("w-auto");
    expect(fair.className).toContain("px-8");
  });
});
