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
    activityTypes: ["COFFEE"],
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
        travel: [
          { participantId: "me", minutes: 30 },
          { participantId: "a", minutes: 25 },
          { participantId: "k", minutes: 35 },
        ],
        address: "Kleine Berg 16, Eindhoven merkez",
        category: "espresso bar",
        mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=51.4416,5.4697",
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
  it("harita YOK; adres artboard'daki İKİ yerde (başlık meta satırı + YER ekseni)", () => {
    renderResult(buildView());
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    // Artboard 2538 (başlığın altındaki `.mi`) + 2562 (`.f-why` YER ekseni) — `.rc` kartının
    // kendi meta satırı adresi TEKRAR ETMEZ (üçüncü kopya yok).
    expect(screen.getAllByText(/Kleine Berg/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Google Maps'te aç" })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
  });

  it("artboard bölge dağılımı: sol = kart + neden burası + aksiyonlar + yedek plan, sağ = çubuklar + el yazısı + viral", () => {
    renderResult(
      buildView({
        likeCounts: { v1: 3, v2: 2 },
        venues: [
          ...(buildView().venues ?? []),
          { id: "v2", name: "Koffie Top Hundred" },
        ],
      }),
    );
    const left = within(screen.getByTestId("zone-left"));
    const right = within(screen.getByTestId("zone-right"));
    expect(left.getByText("Neden burası?")).toBeInTheDocument();
    expect(left.getByText("Koffie Top Hundred")).toBeInTheDocument();
    expect(left.getByRole("button", { name: "Takvime ekle" })).toBeInTheDocument();
    expect(right.getByText("Herkesin yolu")).toBeInTheDocument();
    /* Artboard 2586 (uzun) ve 2642 (kısa) AYNI olguyu iki uzunlukta yazar — ikisi de DOM'da
       durur, kırılım hangisinin görüneceğine karar verir. */
    const hand = right.getAllByText(/önce çıkarsa herkes aynı anda varır/);
    expect(hand).toHaveLength(2);
    expect(hand.some((n) => n.textContent?.startsWith("Kerem en uzaktan geliyor"))).toBe(true);
  });

  it("390: dibe yapışan 'Yol tarifi al' + oturum adı/paylaş başlığı, yedek plan ve çubuk kartı gizli", () => {
    renderResult(
      buildView({
        likeCounts: { v1: 3, v2: 2 },
        venues: [
          ...(buildView().venues ?? []),
          { id: "v2", name: "Koffie Top Hundred" },
        ],
      }),
    );
    // Aynı hedefe iki düğme: 1280 aksiyon şeridi (`DesktopOnly`) + 390 `.cta` (`MobileCta`).
    const directions = screen.getAllByRole("link", { name: "Yol tarifi al" });
    expect(directions).toHaveLength(2);
    for (const link of directions) {
      expect(link).toHaveAttribute("href", expect.stringContaining("google.com/maps"));
    }
    expect(screen.getByText("Kahve buluşması")).toBeInTheDocument();
    // `.tb` kartı ve `.f-back` yalnız ≥1024'te (390'da `.rc-ppl` aynı dakikaları taşıyor).
    expect(screen.getByText("Herkesin yolu").closest("div.hidden")).not.toBeNull();
    expect(screen.getByText("Koffie Top Hundred").closest("div.hidden")).not.toBeNull();
  });

  it("karar ekranı herkesin yolunu TEK çubuk kartında basar (davetli dahil), ~dk, km yok", () => {
    // Davetli/host olmayan izleyici de herkesi görür — eski TravelList davranışı.
    renderResult(buildView(), { participantId: "guest", host: false });
    expect(screen.getByText("Herkesin yolu")).toBeInTheDocument();
    // WinnerCard artık kendi TravelBars'ını basmıyor (travelBars=false) — sağdaki "Herkesin yolu"
    // kartı TEK yüzey: çift basım olursa getByTestId (tekil) patlar.
    expect(screen.getByTestId("travel-fill-me")).toBeInTheDocument();
    expect(screen.getByTestId("travel-fill-a")).toBeInTheDocument();
    // "k" (Kerem) fixture'ın en uzun bacağı — TravelBars'ın bg-flame dalını tetikleyen tek id.
    expect(screen.getByTestId("travel-fill-k")).toBeInTheDocument();
    // Dakika artboard'da İKİ yerde: `.rc-ppl` kişi satırı (2547–2551) + `.tb` çubuk kartı (2581).
    expect(screen.getAllByText("~35 dk")).toHaveLength(2);
    expect(screen.getAllByText("~30 dk")).toHaveLength(2);
    expect(screen.getAllByText("~25 dk")).toHaveLength(2);
    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("travel-list")).not.toBeInTheDocument();
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
    expect(screen.getByText("Ortak nokta · hepiniz aynı yeri beğendi")).toBeInTheDocument();
    u1.unmount();

    const u2 = renderResult(buildView({ decisionKind: "RUNOFF", voteTally: { v1: 2, v2: 1 } }));
    expect(screen.getByText("Ortak nokta · oylamayla 2–1")).toBeInTheDocument();
    // Artboard 3761: aynı skor kartın sol çıkartmasında da var — önek TAŞIMAZ.
    expect(screen.getByText("Oylamayla 2–1")).toBeInTheDocument();
    u2.unmount();

    const u3 = renderResult(
      buildView({
        decisionKind: "PARTIAL",
        participants: [mehmet, ayse, { ...kerem, deckDone: false }],
      }),
    );
    expect(screen.getByText("Ortak nokta · Kerem olmadan")).toBeInTheDocument();
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
    expect(screen.getByText("Ortak nokta · Ayşe ve Kerem olmadan")).toBeInTheDocument();
    u1.unmount();

    renderResult(
      buildView({
        decisionKind: "PARTIAL",
        participants: [{ ...mehmet, deckDone: false }, { ...ayse, deckDone: false }, { ...kerem, deckDone: false }],
      }),
    );
    expect(screen.getByText("Ortak nokta · Mehmet ve diğerleri olmadan")).toBeInTheDocument();
  });

  it("ortalama uzaklık 50 m'ye yuvarlanır; <100 m 'tam ortada' (WinnerCard meta satırı)", () => {
    // İki kopya: WinnerCard'ın meta satırı + WhyHere'in 390 sürümü (aynı `geo` kaynağı).
    const u1 = renderResult(buildView());
    expect(screen.getAllByText(/Tam ortada/)).toHaveLength(2);
    u1.unmount();

    renderResult(buildView({ midpoint: { lat: 51.4467, lng: 5.4697 } }));
    expect(screen.getAllByText(/Herkesin ortasına ~550 m/)).toHaveLength(2);
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
            travel: [
              { participantId: "me", minutes: 30 },
              { participantId: "a", minutes: 28 },
              { participantId: "k", minutes: 32 },
            ],
          },
        ],
      }),
    );
    expect(screen.queryByText(/önce çıkarsa herkes aynı anda varır/)).not.toBeInTheDocument();
  });

  it("en uzun yolun sahibi adlandırılamıyorsa el yazısı not hiç basılmaz", () => {
    renderResult(
      buildView({
        participants: [],
        venues: [
          {
            id: "v1",
            name: "Café Berlage",
            travel: [
              { participantId: "x1", minutes: 25 },
              { participantId: "x2", minutes: 35 },
            ],
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

    // Confetti tam 5 `aria-hidden` nokta ekler (artboard 2518-2522; ikisi yalnız ≥1024'te
    // GÖRÜNÜR ama DOM'da hep var); ikinci mount'ta reveal.ts sessionStorage'dan tekrar
    // oynamayı engeller.
    expect(firstCount - secondCount).toBe(5);
  });
});
