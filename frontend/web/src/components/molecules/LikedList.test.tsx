import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LikedList from "./LikedList";

describe("LikedList", () => {
  it("yalnız beğenilen mekanları listeler ve sayar", () => {
    render(
      <LikedList
        venues={[
          { id: "a", name: "Café Berlage", rating: 4.6, travel: [] },
          { id: "b", name: "Koffie Top", rating: 4.4, travel: [] },
        ]}
        liked={{ a: true, b: false }}
      />,
    );
    expect(screen.getByText("1 mekan")).toBeInTheDocument();
    expect(screen.getByText("Café Berlage")).toBeInTheDocument();
    expect(screen.queryByText("Koffie Top")).not.toBeInTheDocument();
  });

  // Eskiden VenueCard photoOnly kullanılıyordu: yüksekliği %100 olduğu için satırda
  // 0px'e çöküyor, beğenilen mekanın görseli hiç görünmüyordu.
  it("beğenilen mekanın görselini gösterir", () => {
    render(
      <LikedList
        venues={[{ id: "a", name: "Café Berlage", photoUrl: "https://lh3/x" }]}
        liked={{ a: true }}
      />,
    );
    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute(
      "src",
      "https://lh3/x",
    );
  });

  it("fotoğrafsız mekanda monogram gösterir", () => {
    render(
      <LikedList venues={[{ id: "a", name: "Café Berlage" }]} liked={{ a: true }} />,
    );
    expect(screen.getByText("cb")).toBeInTheDocument();
  });

  // Regresyon: DeckScreen deste modunda `travel` geçmeyi unutmuştu — viewer kendi yol çubuğunda
  // "Arkadaşın" düşüyordu, "Sen" değil (bkz. DeckScreen.tsx satır 112).
  it("travel geçildiğinde viewer'ın kendi yol çubuğu 'Sen' der, 'Arkadaşın' düşmez", () => {
    render(
      <LikedList
        venues={[
          {
            id: "a",
            name: "Café Berlage",
            travel: [
              { participantId: "p1", minutes: 10 },
              { participantId: "p2", minutes: 20 },
            ],
          },
        ]}
        liked={{ a: true }}
        travel={{ labels: { p1: "Sen", p2: "Ayşe" }, selfId: "p1" }}
      />,
    );
    // RangeBar etiketi görünür noktada baş harfe (S) indirger; tam ad yalnız sr-only
    // kişi başı listede geçer — regex ile aranır (R-W1 sunum değişikliği).
    expect(screen.getByText(/^Sen /)).toBeInTheDocument();
    expect(screen.queryByText(/Arkadaşın/)).not.toBeInTheDocument();
  });

  // Artboard 2053: satır meta'sı "★ 4.4 · €" — fiyat eskiden hiç basılmıyordu.
  it("puanın yanında fiyat seviyesini de yazar", () => {
    render(
      <LikedList
        venues={[{ id: "a", name: "Café Berlage", rating: 4.4, priceLevel: 1 }]}
        liked={{ a: true }}
      />,
    );
    expect(screen.getByText("★ 4,4 · €")).toBeInTheDocument();
  });

  // Artboard 2065: uyum satırı beğeni listesinde de var — destede ≥2 kategori varsa.
  it("categories geçilince uyum satırını basar", () => {
    render(
      <LikedList
        venues={[{ id: "a", name: "Bakkerij Bart", category: "Fırın", activityType: "COFFEE" }]}
        liked={{ a: true }}
        categories={["Espresso bar", "Fırın"]}
      />,
    );
    expect(screen.getByText("Kahve değil: fırın")).toBeInTheDocument();
  });

  // Artboard 2054: `.rg` bandının üstünde adalet rozeti.
  it("adalet rozetini satırda gösterir", () => {
    render(
      <LikedList
        venues={[
          {
            id: "a",
            name: "Café Berlage",
            travel: [
              { participantId: "p1", minutes: 25 },
              { participantId: "p2", minutes: 30 },
            ],
          },
        ]}
        liked={{ a: true }}
        travel={{ labels: { p1: "Sen", p2: "Ayşe" }, selfId: "p1" }}
      />,
    );
    expect(screen.getAllByText("Herkese ~aynı").length).toBeGreaterThan(0);
  });

  // Artboard 390 (3413) kartı son satırda kapatır; not YALNIZ 1280'de var.
  it("alt not yalnız ≥1024'te görünür (lg kapısı sınıfta)", () => {
    render(<LikedList venues={[{ id: "a", name: "Café Berlage" }]} liked={{ a: true }} />);
    const note = screen.getByText(/Beğeni seni bağlamaz/);
    expect(note.className).toContain("hidden");
    expect(note.className).toContain("lg:block");
  });
});
