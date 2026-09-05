import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TravelInfo } from "../../lib/useTravelLabels";
import FairnessBadge from "./FairnessBadge";
import VenueCard from "./VenueCard";
import VenueMeta from "./VenueMeta";

const labels = { p1: "Sen", p2: "Ayşe", p3: "Kerem" };

describe("FairnessBadge", () => {
  it("fark ≤ 10 dk → 'Herkese ~aynı'", () => {
    render(<FairnessBadge venue={{ travelMinutes: { p1: 30, p2: 25, p3: 35 } }} travel={{ labels, selfId: "p1" }} />);
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
  });

  it("medyanı ≥10 aşan başkası → '{{ad}} için uzak' (ad ek almaz)", () => {
    render(<FairnessBadge venue={{ travelMinutes: { p1: 10, p2: 15, p3: 50 } }} travel={{ labels, selfId: "p1" }} />);
    expect(screen.getByText("Kerem için uzak")).toBeInTheDocument();
  });

  it("aykırı viewer ise 'Senin için uzak'", () => {
    render(<FairnessBadge venue={{ travelMinutes: { p1: 50, p2: 15, p3: 10 } }} travel={{ labels, selfId: "p1" }} />);
    expect(screen.getByText("Senin için uzak")).toBeInTheDocument();
  });

  it("tek katılımcıda rozet yok", () => {
    const { container } = render(
      <FairnessBadge venue={{ travelMinutes: { p1: 30 } }} travel={{ labels, selfId: "p1" }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

/* W-9 çapalı oturum: rozet çizilmez. Gerekçe ve render yerlerinin sayımı TEK yerde —
   `TravelInfo.anchored` JSDoc'u (sözleşmenin yaşadığı yer). Kapı da TEK yerde, rozetin
   kendi içinde; aşağıdaki testler o yolları doğrudan gezer, LikedList aynı kapıdan geçer. */
const fair = {
  id: "v1",
  name: "Café",
  travelMinutes: { a: 20, b: 25 },
  fairness: { maxMinutes: 25, spreadMinutes: 5, longestParticipantId: "b" },
};

const plainTravel: TravelInfo = { labels: { a: "Ali", b: "Ayşe" }, selfId: "a" };
// Tür ek yeri: `TravelInfo` olarak yazıldığı için alan gerçekten sözleşmede olmadan derlenmez
// (yazımsız bir const'ta fazla alan denetimi çalışmaz, bayrak sessizce yok sayılırdı).
const anchoredTravel: TravelInfo = { ...plainTravel, anchored: true };

describe("FairnessBadge çapalı oturumda", () => {
  it("çapasızken rozet basılır", () => {
    render(<FairnessBadge venue={fair} travel={plainTravel} />);
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
  });

  it("çapalıyken rozet HİÇ basılmaz — 20 kartın hepsinde aynı şeyi yazardı", () => {
    render(<FairnessBadge venue={fair} travel={anchoredTravel} />);
    expect(screen.queryByText("Herkese ~aynı")).not.toBeInTheDocument();
  });

  // Her negatifin yanında bir pozitif: rozet etiketi o yoldan kaldırılırsa negatif tek
  // başına yeşil kalıp "yol kapalı" diye yanlış güvence verirdi.
  it("VenueMeta yolu çapasızken rozeti basar", () => {
    render(<VenueMeta venue={fair} travel={plainTravel} />);
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
  });

  it("VenueMeta yolu da kapanır (VenueRow ve VenuePopCard buradan geçer)", () => {
    render(<VenueMeta venue={fair} travel={anchoredTravel} />);
    expect(screen.queryByText("Herkese ~aynı")).not.toBeInTheDocument();
  });

  it("VenueCard polaroid dalı çapasızken rozeti basar", () => {
    render(<VenueCard venue={fair} travel={plainTravel} />);
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
  });

  it("VenueCard polaroid dalı da kapanır", () => {
    render(<VenueCard venue={fair} travel={anchoredTravel} />);
    expect(screen.queryByText("Herkese ~aynı")).not.toBeInTheDocument();
  });

  it("VenueCard row dalı da kapanır", () => {
    render(<VenueCard venue={fair} variant="row" travel={anchoredTravel} />);
    expect(screen.queryByText("Herkese ~aynı")).not.toBeInTheDocument();
  });

  it("çapalıyken yol süreleri KALIR — kişi başı dakika gerçek bilgi", () => {
    render(<VenueCard venue={fair} travel={anchoredTravel} />);
    expect(screen.getByText("~20 dk")).toBeInTheDocument();
  });
});
