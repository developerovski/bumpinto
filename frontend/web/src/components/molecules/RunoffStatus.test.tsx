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

  /**
   * Artboard 3694-3730: kilitlenince kilit kartı roster'ın ÜSTÜNE gelir, roster KALMAYA devam
   * eder (sayaç + ilerleme + satırlar + kart içi hatırlatma). Eski kod bu dalda erken return
   * edip roster'ı tümüyle atıyordu — 1280'de kimin kilitlediği görünmez oluyordu.
   */
  it("kilitliyken roster kartı kaybolmaz; kilit kartı üstüne gelir, CTA hatırlatmaya döner", () => {
    render(<RunoffStatus participants={people} votedIds={["p2"]} choice="v" sent
      sending={false} onLock={vi.fn()} shareText="x" shareUrl="y" />);
    expect(screen.getByText("Seçimin kilitli")).toBeInTheDocument();
    // Overline kilitten sonra "Kim seçti"ye döner (artboard 3705 vs 2414).
    expect(screen.getByText("Kim seçti")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Hatırlatma gönder/ })).toBeInTheDocument();
  });

  it("seçim sürerken overline 'Kim kilitledi'dir (artboard 2414)", () => {
    render(<RunoffStatus participants={people} votedIds={["p2"]} choice={null} sent={false}
      sending={false} onLock={vi.fn()} shareText="x" shareUrl="y" />);
    expect(screen.getByText("Kim kilitledi")).toBeInTheDocument();
    expect(screen.queryByText("Kim seçti")).not.toBeInTheDocument();
  });

  /**
   * Artboard 3711-3723 `.avw > .od` + 4476 `.off`: presence sunucudan gelir (ParticipantDto.online),
   * istemci canlılık türetmez. Roster satırı bunu artık basıyor — üç P1 bulgusu buradan çıkmıştı.
   */
  it("çevrimiçi noktası basılır, çevrimdışı satır solar ve 'çevrimdışı' yazar", () => {
    const mixed = [
      { id: "p1", displayName: "Mehmet", host: true, hasLocation: true, online: true },
      { id: "p2", displayName: "Ayşe", host: false, hasLocation: true, online: false },
    ];
    render(<RunoffStatus participants={mixed} votedIds={["p1"]} choice={null} sent={false}
      sending={false} onLock={vi.fn()} shareText="x" shareUrl="y" />);
    expect(screen.getAllByTestId("online-dot")).toHaveLength(1);
    expect(screen.getByText(/çevrimdışı/)).toBeInTheDocument();
  });

  /**
   * Beraberlikte kart W7b'nin "Oylar" kartına döner: kilit/hatırlatma aksiyonu YOK (karar sol
   * bölgede) ve oy vermeyen satır "Seçiyor…" DEĞİL "seçmedi" der — oylama bitmiştir.
   * Kimin NEYİ seçtiği (artboard 4468-4473) SessionView'da yok, uydurulmaz.
   */
  it("beraberlikte 'Oylar' kartına döner; aksiyon taşımaz, seçmeyen 'seçmedi' der", () => {
    render(<RunoffStatus participants={trio} votedIds={["p1", "p2"]} choice={null} sent
      sending={false} onLock={vi.fn()} shareText="x" shareUrl="y" tie />);
    expect(screen.getByText("Oylar")).toBeInTheDocument();
    expect(screen.getByText("seçmedi")).toBeInTheDocument();
    expect(screen.queryByText("Seçiyor…")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
