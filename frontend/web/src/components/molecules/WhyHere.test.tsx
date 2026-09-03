import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WhyHere from "./WhyHere";

const labels = { p1: "Sen", p2: "Ayşe", p3: "Kerem" };

const view = { activityType: "COFFEE", midpoint: { lat: 51.4416, lng: 5.4697 } } as never;

describe("WhyHere", () => {
  it("üç ekseni de gösterir (adalet/uyum/yer) veri varken", () => {
    render(
      <WhyHere
        view={view}
        venue={{
          travelMinutes: { p1: 25, p2: 30, p3: 35 },
          category: "espresso bar",
          address: "Kleine Berg 16, Eindhoven merkez",
          lat: 51.4416,
          lng: 5.4697,
        }}
        labels={labels}
      />,
    );
    expect(screen.getByText("Adalet")).toBeInTheDocument();
    expect(screen.getByText("Herkes ~25–35 dk · en uzun yol Kerem")).toBeInTheDocument();
    expect(screen.getByText("Uyum")).toBeInTheDocument();
    expect(screen.getByText("Kahve için: espresso bar")).toBeInTheDocument();
    expect(screen.getByText("Yer")).toBeInTheDocument();
    expect(screen.getByText("Kleine Berg 16, Eindhoven merkez")).toBeInTheDocument();
    // Mesafe artık WinnerCard'ın meta satırında — adres varken YER ekseni tekrar etmez.
    expect(screen.queryByText("Tam ortada")).not.toBeInTheDocument();
  });

  it("category yoksa Uyum ekseni hiç çizilmez (yer tutucu yazılmaz)", () => {
    render(<WhyHere view={view} venue={{ travelMinutes: { p1: 25 } }} labels={labels} />);
    expect(screen.queryByText("Uyum")).not.toBeInTheDocument();
  });

  it("travelMinutes boşken sunucu fairness alanına düşer (frontend/shared değişmez)", () => {
    render(
      <WhyHere
        view={view}
        venue={{ fairness: { maxMinutes: 35, spreadMinutes: 10, longestParticipantId: "p3" } }}
        labels={labels}
      />,
    );
    expect(screen.getByText("Herkes ~25–35 dk · en uzun yol Kerem")).toBeInTheDocument();
  });

  it("orta noktaya ≥100 m ise 50 m'ye yuvarlanmış mesafe yazılır", () => {
    render(
      <WhyHere
        view={view}
        venue={{ lat: 51.4467, lng: 5.4697 }}
        labels={labels}
      />,
    );
    expect(screen.getByText("Herkesin ortasına ~550 m")).toBeInTheDocument();
  });

  it("fark ≥10 dk iken HandNote çıkar, altında çıkmaz", () => {
    const { rerender } = render(
      <WhyHere view={view} venue={{ travelMinutes: { p1: 25, p3: 35 } }} labels={labels} />,
    );
    expect(screen.getByText("Kerem en uzaktan geliyor — ~10 dk önce çıkarsa herkes aynı anda varır")).toBeInTheDocument();

    rerender(<WhyHere view={view} venue={{ travelMinutes: { p1: 25, p3: 30 } }} labels={labels} />);
    expect(screen.queryByText(/önce çıkarsa herkes aynı anda varır/)).not.toBeInTheDocument();
  });

  it("en uzun yol sahibinin adı yoksa (labels'ta eksik) isimsiz satıra düşer, HandNote basılmaz", () => {
    render(
      <WhyHere
        view={view}
        venue={{ travelMinutes: { unknown1: 25, unknown2: 35 } }}
        labels={labels}
      />,
    );
    expect(screen.getByText("Herkes ~25–35 dk")).toBeInTheDocument();
    expect(screen.queryByText(/en uzun yol/)).not.toBeInTheDocument();
    expect(screen.queryByText(/önce çıkarsa herkes aynı anda varır/)).not.toBeInTheDocument();
  });
});
