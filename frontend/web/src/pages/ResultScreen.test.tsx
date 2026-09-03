import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ParticipantDto as Participant, SessionView as View } from "@bumpinto/shared";
import ResultScreen from "./ResultScreen";

const mehmet: Participant = {
  id: "me", displayName: "Mehmet", host: true, hasLocation: true, manual: false, deckDone: true,
};
const ayse: Participant = {
  id: "a", displayName: "Ayşe", host: false, hasLocation: true, manual: false, deckDone: true,
};
const kerem: Participant = {
  id: "k", displayName: "Kerem", host: false, hasLocation: true, manual: false, deckDone: true,
};

function buildView(overrides: Partial<View> = {}): View {
  return {
    slug: "x7k2m",
    activityType: "COFFEE",
    sessionType: "GROUP",
    status: "DECIDED",
    name: "Kahve buluşması",
    participants: [mehmet, ayse, kerem],
    venues: [
      {
        id: "v1",
        name: "Café Berlage",
        lat: 51.4416,
        lng: 5.4697,
        travelMinutes: { me: 30, a: 25, k: 35 },
        address: "Kleine Berg 16, Eindhoven merkez",
        category: "espresso bar",
        placeLink: "https://www.google.com/maps/place/?q=place_id:xyz",
        provider: "GOOGLE",
      },
    ],
    decidedVenueId: "v1",
    midpoint: { lat: 51.4416, lng: 5.4697 },
    decisionKind: "UNANIMOUS",
    viewer: { participantId: "me", host: true },
    ...overrides,
  };
}

function renderResult(view: View, viewer?: { participantId: string; host: boolean }) {
  return render(<ResultScreen view={viewer ? { ...view, viewer } : view} />);
}

/** Paylaşım metni Web Share API üzerinden gönderilir — DOM'a basılmaz; `navigator.share`
    çağrısını yakalayıp gerçek metni buradan okuruz. */
function captureShareText(view: View, viewer: { participantId: string; host: boolean }): string | undefined {
  const shareSpy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", { value: shareSpy, configurable: true, writable: true });
  const utils = renderResult(view, viewer);
  fireEvent.click(within(utils.container).getByRole("button", { name: "Gruba paylaş" }));
  const text = shareSpy.mock.calls[0]?.[0]?.text as string | undefined;
  utils.unmount();
  return text;
}

describe("ResultScreen — Karar v2", () => {
  it("harita YOK; adres TEK yerde (WhyHere'in YER ekseni) ve 'Google Maps'te aç' var", () => {
    renderResult(buildView());
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    // Adres WinnerCard'ın meta satırında tekrar edilmez — yalnız WhyHere'in YER ekseninde.
    expect(screen.getAllByText(/Kleine Berg/)).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Google Maps'te aç" })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
  });

  it("TravelList herkesi gösterir (davetli dahil), ~dk, km yok", () => {
    renderResult(buildView(), { participantId: "guest", host: false });
    const list = within(screen.getByTestId("travel-list"));
    expect(list.getByText("~35 dk")).toBeInTheDocument();
    expect(list.getByText("~30 dk")).toBeInTheDocument();
    expect(list.getByText("~25 dk")).toBeInTheDocument();
    expect(list.queryByText(/km/)).not.toBeInTheDocument();
  });

  it("paylaşım metni viewer'dan bağımsız", () => {
    const decided = buildView();
    const a = captureShareText(decided, { participantId: "me", host: true });
    const b = captureShareText(decided, { participantId: "a", host: false });
    expect(a).toBe(b);
    expect(a).toBe("Kahve buluşması: Café Berlage — BumpInto ile ortada buluştuk.");
  });

  it("eyebrow decisionKind'a göre: UNANIMOUS / RUNOFF / PARTIAL", () => {
    const u1 = renderResult(buildView({ decisionKind: "UNANIMOUS" }));
    expect(screen.getByText("HEPİNİZ AYNI YERİ BEĞENDİ")).toBeInTheDocument();
    u1.unmount();

    const u2 = renderResult(buildView({ decisionKind: "RUNOFF", voteTally: { v1: 2, v2: 1 } }));
    expect(screen.getByText("Oylamayla 2–1")).toBeInTheDocument();
    u2.unmount();

    const u3 = renderResult(
      buildView({
        decisionKind: "PARTIAL",
        participants: [mehmet, ayse, { ...kerem, deckDone: false }],
      }),
    );
    expect(screen.getByText("Kerem olmadan")).toBeInTheDocument();
    u3.unmount();
  });

  it("decisionKind yoksa (varsayılan dal) eyebrow 'Ortak nokta'", () => {
    renderResult(buildView({ decisionKind: undefined }));
    expect(screen.getByText("Ortak nokta")).toBeInTheDocument();
  });

  it("PARTIAL ama geçerli isim yoksa (herkes deckDone ya da isimsiz) 'Ortak nokta'ya düşer", () => {
    renderResult(
      buildView({
        decisionKind: "PARTIAL",
        participants: [mehmet, ayse, kerem], // hepsi deckDone:true → waiting boş
      }),
    );
    expect(screen.getByText("Ortak nokta")).toBeInTheDocument();
    expect(screen.queryByText(/olmadan/)).not.toBeInTheDocument();
  });

  it("UNANIMOUS + likeCounts iken çıkartma 'N/M beğendi!' (artboard 3/3), saat meta satırına taşınır", () => {
    renderResult(
      buildView({ decisionKind: "UNANIMOUS", likeCounts: { v1: 3 }, decidedAt: "2026-09-02T13:32:00.000Z" }),
    );
    expect(screen.getByText("3/3 beğendi!")).toBeInTheDocument();
    expect(screen.getByText(/Karar verildi ·/)).toBeInTheDocument();
  });

  it("PARTIAL eyebrow'u: 2 kişi Intl.ListFormat ile birleşir, 3+'te tek ad + 've diğerleri'", () => {
    const u1 = renderResult(
      buildView({
        decisionKind: "PARTIAL",
        participants: [{ ...mehmet, deckDone: true }, { ...ayse, deckDone: false }, { ...kerem, deckDone: false }],
      }),
    );
    expect(screen.getByText("Ayşe ve Kerem olmadan")).toBeInTheDocument();
    u1.unmount();

    renderResult(
      buildView({
        decisionKind: "PARTIAL",
        participants: [{ ...mehmet, deckDone: false }, { ...ayse, deckDone: false }, { ...kerem, deckDone: false }],
      }),
    );
    expect(screen.getByText("Mehmet ve diğerleri olmadan")).toBeInTheDocument();
  });

  it("ortalama uzaklık 50 m'ye yuvarlanır; <100 m 'tam ortada' (WinnerCard meta satırı)", () => {
    const u1 = renderResult(buildView());
    expect(screen.getByText(/Tam ortada/)).toBeInTheDocument();
    u1.unmount();

    renderResult(buildView({ midpoint: { lat: 51.4467, lng: 5.4697 } }));
    expect(screen.getByText(/Herkesin ortasına ~550 m/)).toBeInTheDocument();
  });

  it("en uzak ≥10 dk fark varsa HandNote çıkar, altında çıkmaz", () => {
    const u1 = renderResult(buildView());
    expect(
      screen.getByText("Kerem en uzaktan geliyor — ~10 dk önce çıkarsa herkes aynı anda varır"),
    ).toBeInTheDocument();
    u1.unmount();

    renderResult(
      buildView({
        venues: [
          {
            id: "v1",
            name: "Café Berlage",
            lat: 51.4416,
            lng: 5.4697,
            travelMinutes: { me: 30, a: 28, k: 32 },
          },
        ],
      }),
    );
    expect(screen.queryByText(/önce çıkarsa herkes aynı anda varır/)).not.toBeInTheDocument();
  });

  it("açılış efekti sessionStorage ile bir kez; ikinci render'da yok", () => {
    const v = buildView({ slug: "reveal-once" });
    const first = renderResult(v);
    const firstCount = first.container.querySelectorAll("[aria-hidden]").length;
    first.unmount();

    const second = renderResult(v);
    const secondCount = second.container.querySelectorAll("[aria-hidden]").length;

    // Confetti tam 3 `aria-hidden` nokta ekler; ikinci mount'ta reveal.ts sessionStorage'dan
    // tekrar oynamayı engeller.
    expect(firstCount - secondCount).toBe(3);
  });
});
