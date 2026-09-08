import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ParticipantDto as Participant, VenueDto as Venue } from "@bumpinto/shared";
import WinnerCard from "./WinnerCard";

const venue: Venue = {
  id: "v1",
  name: "Café Berlage",
  provider: "GOOGLE",
  rating: 4.6,
  priceLevel: 2,
  address: "Kleine Berg 16, Eindhoven merkez",
  lat: 51.4416,
  lng: 5.4697,
  travel: [
    { participantId: "me", minutes: 30 },
    { participantId: "a", minutes: 25 },
    { participantId: "k", minutes: 35 },
  ],
};

const participants: Participant[] = [
  { id: "me", displayName: "Mehmet", travelMode: "CAR" },
  { id: "a", displayName: "Ayşe", travelMode: "EBIKE" },
  { id: "k", displayName: "Kerem" },
];

const travel = { labels: { me: "Sen", a: "Ayşe", k: "Kerem" }, selfId: "me" };

function renderCard(extra: Partial<Parameters<typeof WinnerCard>[0]> = {}) {
  return render(<WinnerCard venue={venue} travel={travel} participants={participants} {...extra} />);
}

describe("WinnerCard — imza sonuç kartı (.rc)", () => {
  it("kişi satırlarını (.rc-ppl) kendin en üstte, dakikalarla basar", () => {
    renderCard();
    // Satırlar dakika hücrelerinden okunur. Sıra `TravelBars` ile AYNI kural: önce sen, sonra
    // `fairnessOf` sırası (en uzun yol önce) — iki yüzey aynı listeyi aynı sırada gösterir.
    const minutes = screen.getAllByText(/^~\d+ dk$/).map((n) => n.textContent);
    expect(minutes).toEqual(["~30 dk", "~35 dk", "~25 dk"]);
    expect(screen.getByText("Sen").className).toContain("font-bold");
    expect(screen.getByText("Ayşe")).toBeInTheDocument();
    expect(screen.getByText("Kerem")).toBeInTheDocument();
  });

  it("ulaşım türü ikonu yalnız türü BİLİNEN kişide çizilir (varsayılan uydurulmaz)", () => {
    renderCard();
    expect(screen.getByText("Arabayla")).toBeInTheDocument();
    expect(screen.getByText("E-bisikletle")).toBeInTheDocument();
    // Kerem'in `travelMode`u yok — üç kişiden yalnız ikisi etiketli.
    expect(screen.getAllByText(/^(Arabayla|E-bisikletle|Bisikletle|Yürüyerek|Toplu taşımayla)$/)).toHaveLength(2);
  });

  it("altbilgi (.rc-ft) wordmark + adalet cümlesini taşır", () => {
    renderCard();
    expect(screen.getByText("BumpInto")).toBeInTheDocument();
    expect(screen.getByText("herkes ~25–35 dk · fark 10 dk")).toBeInTheDocument();
  });

  it("adalet verisi yoksa altbilgi hiç basılmaz (0 dk uydurulmaz)", () => {
    render(<WinnerCard venue={{ id: "v1", name: "Café Berlage" }} />);
    expect(screen.queryByText("BumpInto")).not.toBeInTheDocument();
    expect(screen.queryByText(/fark/)).not.toBeInTheDocument();
  });

  it("kart meta satırı sağda adalet rozetini taşır", () => {
    renderCard();
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
  });

  it("iki çıkartma: solda durum, sağda karar saati", () => {
    const { container } = renderCard({
      decisionKind: "UNANIMOUS",
      likeCount: 3,
      voterCount: 3,
      decidedAt: "2026-09-02T13:32:00.000Z",
    });
    const card = container.querySelector(".shadow-sh2") as HTMLElement;
    expect(within(card).getByText("3/3 beğendi!").parentElement?.className).toContain("left-2.5");
    expect(within(card).getByText(/^Karar verildi ·/).parentElement?.className).toContain("right-2.5");
  });

  it("oylama sonucunda sol çıkartma skoru yazar, üstlük 'Ortak nokta · ' önekini taşır", () => {
    renderCard({ decisionKind: "RUNOFF", tally: { top: 2, second: 1 } });
    expect(screen.getByText("Oylamayla 2–1")).toBeInTheDocument();
    expect(screen.getByText("Ortak nokta · oylamayla 2–1")).toBeInTheDocument();
  });

  it("durum bilinmiyorsa sol çıkartma hiç basılmaz (sağdaki karar çıkartması kalır)", () => {
    renderCard();
    expect(screen.getByText("Karar verildi!")).toBeInTheDocument();
    expect(screen.queryByText(/beğendi!|Oylamayla|olmadan/)).not.toBeInTheDocument();
  });

  it("başlığın altında ★/€ satırı, meta satırında mesafe + adres var", () => {
    renderCard({ midpoint: { lat: 51.4467, lng: 5.4697 } });
    expect(screen.getByText("★ 4,6 · €€")).toBeInTheDocument();
    expect(
      screen.getByText("Herkesin ortasına ~550 m · Kleine Berg 16, Eindhoven merkez"),
    ).toBeInTheDocument();
  });
});
