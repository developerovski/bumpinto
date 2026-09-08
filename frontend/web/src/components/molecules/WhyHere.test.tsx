import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WhyHere from "./WhyHere";

const labels = { p1: "Sen", p2: "Ayşe", p3: "Kerem" };

const view = { activityTypes: ["COFFEE"], midpoint: { lat: 51.4416, lng: 5.4697 } } as never;

describe("WhyHere", () => {
  it("üç ekseni de gösterir (adalet/uyum/yer) veri varken", () => {
    render(
      <WhyHere
        view={view}
        venue={{
          travel: [
            { participantId: "p1", minutes: 25 },
            { participantId: "p2", minutes: 30 },
            { participantId: "p3", minutes: 35 },
          ],
          category: "espresso bar",
          activityType: "COFFEE",
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
    // Artboard 2562 (1280) adres, 2640 (390) mesafe yazar — iki sürüm de DOM'da, görünürlüğü
    // ölçü seçer (rapor I · P2-B3).
    expect(screen.getByText("Kleine Berg 16, Eindhoven merkez").className).toContain("hidden lg:inline");
    expect(screen.getByText("Tam ortada").className).toContain("lg:hidden");
  });

  it("YER ekseni bugünün saatlerini de taşır (artboard 2562)", () => {
    render(
      <WhyHere
        view={view}
        venue={{
          hoursToday: "08:00–18:00",
          address: "Kleine Berg 16, Eindhoven merkez",
          lat: 51.4416,
          lng: 5.4697,
        }}
        labels={labels}
      />,
    );
    expect(
      screen.getByText("Bugün 08:00–18:00 · Kleine Berg 16, Eindhoven merkez"),
    ).toBeInTheDocument();
  });

  it("390'da kart kabuğu ve 'Neden burası?' başlığı yalnız ≥1024'te açılır", () => {
    const { container } = render(
      <WhyHere view={view} venue={{ travel: [{ participantId: "p1", minutes: 25 }] }} labels={labels} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("lg:rounded-card");
    expect(root.className).not.toContain(" bg-card");
    expect(screen.getByText("Neden burası?").parentElement?.className).toContain("hidden lg:block");
  });

  it("category yoksa Uyum ekseni hiç çizilmez (yer tutucu yazılmaz)", () => {
    render(<WhyHere view={view} venue={{ travel: [{ participantId: "p1", minutes: 25 }] }} labels={labels} />);
    expect(screen.queryByText("Uyum")).not.toBeInTheDocument();
  });

  it("travel[] boşken sunucu fairness alanına düşer (frontend/shared değişmez)", () => {
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

  /* El yazısı not artık `WhyHere` içinde DEĞİL — artboard 2586'da `.tb` kartının altında, sağ
     bölgede duruyor (rapor I · P2-9). Kuralın kendisi `ResultScreen.test.tsx`te doğrulanıyor. */
  it("el yazısı notu artık burada basılmaz", () => {
    render(
      <WhyHere
        view={view}
        venue={{
          travel: [
            { participantId: "p1", minutes: 25 },
            { participantId: "p3", minutes: 35 },
          ],
        }}
        labels={labels}
      />,
    );
    expect(screen.queryByText(/önce çıkarsa herkes aynı anda varır/)).not.toBeInTheDocument();
  });

  it("en uzun yol sahibinin adı yoksa (labels'ta eksik) isimsiz satıra düşer, HandNote basılmaz", () => {
    render(
      <WhyHere
        view={view}
        venue={{
          travel: [
            { participantId: "unknown1", minutes: 25 },
            { participantId: "unknown2", minutes: 35 },
          ],
        }}
        labels={labels}
      />,
    );
    expect(screen.getByText("Herkes ~25–35 dk")).toBeInTheDocument();
    expect(screen.queryByText(/en uzun yol/)).not.toBeInTheDocument();
  });

  /**
   * Foursquare coklu secimde HER ZAMAN atifsiz doner. Kapi yalniz `category`'ye baksaydi
   * baslik cizilir, altindaki `FitLine` null donerdi — bomboş bir "Uyum" ekseni.
   */
  it("kategori var ama atıf yoksa Uyum ekseni hiç çizilmez", () => {
    render(
      <WhyHere
        view={view}
        venue={{
          travel: [
            { participantId: "p1", minutes: 25 },
            { participantId: "p2", minutes: 30 },
            { participantId: "p3", minutes: 35 },
          ],
          category: "espresso bar",
          address: "Kleine Berg 16, Eindhoven merkez",
          lat: 51.4416,
          lng: 5.4697,
        }}
        labels={labels}
      />,
    );
    expect(screen.queryByText("Uyum")).not.toBeInTheDocument();
    expect(screen.getByText("Adalet")).toBeInTheDocument();
  });
});
