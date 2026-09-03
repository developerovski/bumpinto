import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RunoffStatus from "./RunoffStatus";

const people = [
  { id: "p1", displayName: "Mehmet", host: true, hasLocation: true, deckDone: true },
  { id: "p2", displayName: "Ayşe", host: false, hasLocation: true, deckDone: true },
];

// Kilitli kart notu: kalan tam 1 kişiyse ADLI, birden çoksa GENEL kopya (§4.8 tek/adlı/pozitif).
const trio = [
  { id: "p1", displayName: "Mehmet", host: true, hasLocation: true, deckDone: true },
  { id: "p2", displayName: "Ayşe", host: false, hasLocation: true, deckDone: true },
  { id: "p3", displayName: "Kerem", host: false, hasLocation: true, deckDone: true },
];

describe("RunoffStatus", () => {
  it("kilitleyenleri rozetler, sayacı gösterir, kilit butonu seçime bağlı", () => {
    render(<RunoffStatus participants={people} votedIds={["p2"]} choice={null} sent={false}
      sending={false} onLock={vi.fn()} shareText="x" shareUrl="y" />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("Kilitledi")).toBeInTheDocument();
    expect(screen.getByText("Seçiyor…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seçimimi kilitle" })).toBeDisabled();
  });

  // "Herkes seçti" durumu RunoffScreen yönlendirmesinde HER ZAMAN RunoffTie dalına düşer
  // (`tie` aynı oy kümesini kullanır) — bu bileşene bu veriyle hiç ulaşılamaz, dolayısıyla
  // eski "herkes seçti — sonuç açıklanıyor" dalı KALDIRILDI (code-review bulgusu). Kilitli
  // kartın ulaşılabilir tek hâli — kendi seçimin kilitli, en az bir kişi hâlâ seçiyor.
  it("gönderildiyse kilitli kartı gösterir; kalan tam 1 kişiyse ADLI ve olumlu not yazar (§4.8)", () => {
    render(<RunoffStatus participants={people} votedIds={["p2"]} choice="v" sent
      sending={false} onLock={vi.fn()} shareText="x" shareUrl="y" />);
    expect(screen.getByText("Seçimin kilitli")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seçimimi kilitle" })).not.toBeInTheDocument();
    expect(screen.getByText("Mehmet seçiyor — herkes kilitleyince sonuç açıklanır")).toBeInTheDocument();
    expect(screen.queryByText(/diğerlerini bekliyoruz/)).not.toBeInTheDocument();
  });

  it("kalan birden çok kişiyse genel 'bekliyoruz' kopyası yazar — isim isim sayılmaz", () => {
    render(<RunoffStatus participants={trio} votedIds={["p1"]} choice="v" sent
      sending={false} onLock={vi.fn()} shareText="x" shareUrl="y" />);
    expect(screen.getByText(/diğerlerini bekliyoruz/)).toBeInTheDocument();
    expect(screen.queryByText(/seçiyor — herkes kilitleyince/)).not.toBeInTheDocument();
  });
});

// voteTally kapsamı RunoffTie.test.tsx'e taşındı — bkz. yukarıdaki not.
