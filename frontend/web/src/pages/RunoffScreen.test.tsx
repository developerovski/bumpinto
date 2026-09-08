import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@bumpinto/shared";
import { resetConfig, useConfigStore } from "../store/configStore";
import { useSessionStore } from "../store/sessionStore";
import RunoffScreen from "./RunoffScreen";

// Spec §11 — atıf config'ten gelir (sağlayıcı başına kod dalı yok).
const CONFIG: AppConfig = {
  mapEngine: "google",
  tiles: { styleUrl: "https://example/style" },
  sources: [
    { id: "foursquare", attributionKey: "attribution.foursquare", attributionUrl: null, ratingScale: 10 },
  ],
};

const venues = [
  { id: "v1", name: "Sofra Cuisine", lat: 51.7, lng: 5.3, rating: 5, travel: [] },
  { id: "v2", name: "Abed food", lat: 51.7, lng: 5.31, rating: 4.9, travel: [] },
];
const mehmet = { id: "h", displayName: "Mehmet", host: true, hasLocation: true, manual: false };
const yildiz = { id: "y", displayName: "Yildiz", host: false, hasLocation: true, manual: false };
const kerem = { id: "k", displayName: "Kerem", host: false, hasLocation: true, manual: false };

/** `viewer` sunucunun "sen kimsin" yanıtı; host bayrağı beraberlikte kararı kimin vereceğini belirler. */
function view(
  viewer: { participantId: string; host: boolean; runoffVoteVenueId?: string },
  votedIds: string[],
  extra: Record<string, unknown> = {},
) {
  return {
    slug: "q4754zo7", activityTypes: ["FOOD"], sessionType: "GROUP", status: "RUNOFF",
    participants: [mehmet, yildiz], venues, runoffVenueIds: ["v1", "v2"],
    runoffVotedParticipantIds: votedIds, viewer, ...extra,
  } as never;
}

// v1: toplam 55 dk, fark 5 dk — v2'ye göre 10 dk daha az (>=5 dk kuralı) → v1 "karar verici" hücre.
const fairVenues = [
  {
    id: "v1", name: "Café Berlage", lat: 51.7, lng: 5.3, rating: 4.6,
    travel: [{ participantId: "h", minutes: 30 }, { participantId: "y", minutes: 25 }],
  },
  {
    id: "v2", name: "Koffie Top Hundred", lat: 51.7, lng: 5.31, rating: 4.4,
    travel: [{ participantId: "h", minutes: 40 }, { participantId: "y", minutes: 25 }],
  },
];

describe("RunoffScreen", () => {
  afterEach(() => resetConfig());

  it("herkes oy vermediyse normal bekleme durumu", () => {
    const v = view({ participantId: "h", host: true }, ["y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByRole("button", { name: "Seçimimi kilitle" })).toBeInTheDocument();
    expect(screen.queryByText("Berabere")).not.toBeInTheDocument();
  });

  /**
   * Beraberlik = "herkes oy verdi ama oturum hâlâ RUNOFF". Tek kazanan çıksaydı sunucu
   * DECIDED'a geçerdi, dolayısıyla bu koşul tam olarak beraberliktir. Host'a çıkış yolu
   * verilmezse oturum burada sonsuza kadar kilitli kalır.
   */
  it("beraberlikte host kararı verir", async () => {
    const pick = vi.fn().mockResolvedValue(undefined);
    const v = view({ participantId: "h", host: true }, ["h", "y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v, pick });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText("Berabere")).toBeInTheDocument();
    expect(screen.queryByText("Seçimin kilitli")).not.toBeInTheDocument();

    // Aksiyonlar 390 (yapışkan CTA) ve 1280 (sol bölge) için AYRI basılır — aynı anda yalnız
    // biri görünür (lg kapısı), jsdom ikisini de sayar.
    const decide = screen.getAllByRole("button", { name: "Kararı ben vereyim" });
    decide.forEach((b) => expect(b).toBeDisabled());

    fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Kararı ben vereyim" })[0]);
    await waitFor(() => expect(pick).toHaveBeenCalledWith("v1"));
  });

  /**
   * Seçim yalnız useState'te yaşarsa sayfa yenilenince kaybolur: kişi "kilitli" yazısını
   * görür ama neyi kilitlediğini göremez. Sunucu kendi oyunu viewer'da geri döner.
   */
  it("yenileme sonrası kendi seçimi sunucudan geri gelir", () => {
    const v = view({ participantId: "y", host: false, runoffVoteVenueId: "v2" }, ["y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    const pressed = screen.getAllByRole("button", { pressed: true });
    expect(pressed.length).toBeGreaterThan(0);
    pressed.forEach((b) => expect(b).toHaveTextContent("Abed food"));
  });

  /* Artboard 4351-4353 — beraberlik 390'ında ilk satır oturum adı; seçim sürerken (2453) yok. */
  it("oturum adı satırı YALNIZ beraberlikte basılır", () => {
    const tied = view({ participantId: "h", host: true }, ["h", "y"], { name: "Cuma kahvesi" });
    useSessionStore.setState({ slug: "q4754zo7", view: tied });
    const { unmount } = render(<RunoffScreen slug="q4754zo7" view={tied} />);
    expect(screen.getByText("Cuma kahvesi")).toBeInTheDocument();
    unmount();

    const choosing = view({ participantId: "h", host: true }, ["y"], { name: "Cuma kahvesi" });
    useSessionStore.setState({ slug: "q4754zo7", view: choosing });
    render(<RunoffScreen slug="q4754zo7" view={choosing} />);
    expect(screen.queryByText("Cuma kahvesi")).not.toBeInTheDocument();
  });

  it("beraberlikte host olmayan bekler, karar butonu görmez", () => {
    const v = view({ participantId: "y", host: false }, ["h", "y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText("Berabere")).toBeInTheDocument();
    expect(screen.getByText(/Mehmet son kararı veriyor/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kararı ben vereyim" })).not.toBeInTheDocument();
  });

  it("her finalistin altında toplam ve fark treyleri var; karar verici hücre amber-wash", () => {
    const v = view({ participantId: "h", host: true }, ["y"], { venues: fairVenues });
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getAllByTestId("trailer-v1")[0]).toHaveTextContent("toplam ~55 dk · fark ~5 dk");
    expect(screen.getAllByTestId("trailer-v2")[0]).toHaveTextContent("toplam ~65 dk · fark ~15 dk");
    // Artboard `.f-win`: amber zemin satırın TAMAMINI değil, yalnız fark değerini sarar.
    expect(screen.getAllByTestId("trailer-v1")[0].className).not.toContain("bg-amber-wash");
    expect(screen.getAllByTestId("trailer-gap-v1")[0].className).toContain("bg-amber-wash");
    expect(screen.getAllByTestId("trailer-gap-v2")[0].className).not.toContain("bg-amber-wash");
  });

  it("başlık 2 finalistte ikili dal kullanır; 'Son düzlük' çıkartması yok", () => {
    const v = view({ participantId: "h", host: true }, ["y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText("İkisi de güzel, biri seçilecek")).toBeInTheDocument();
    expect(screen.queryByText("Son düzlük")).not.toBeInTheDocument();
  });

  it("başlık ≥3 finalistte çoklu dal kullanır", () => {
    const threeVenues = [
      ...venues,
      { id: "v3", name: "Third Place", lat: 51.7, lng: 5.32, rating: 4.2, travel: [] },
    ];
    const v = view({ participantId: "h", host: true }, ["y"], {
      venues: threeVenues, runoffVenueIds: ["v1", "v2", "v3"],
    });
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText("Hepsi güzel, biri seçilecek")).toBeInTheDocument();
  });

  it("runoffReason yokken (INTERSECTION varsayılan) genel kopya render edilir", () => {
    const v = view({ participantId: "h", host: true }, ["y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(
      screen.getByText("Herkes ikisini de beğendi. Tek seçim hakkın var — sonuç herkes seçince açıklanır."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Henüz ortak nokta yok/)).not.toBeInTheDocument();
  });

  it("FALLBACK runoff'ta kopya nedene göre değişir (B-7:T2)", () => {
    const v = view({ participantId: "h", host: true }, ["y"], { runoffReason: "FALLBACK" });
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText(/Henüz ortak nokta yok/)).toBeInTheDocument();
  });

  it("beraberlikte host'a ikinci buton: 'Adil olana bırak' en adil finalisti seçer", async () => {
    const pick = vi.fn().mockResolvedValue(undefined);
    const v = view({ participantId: "h", host: true }, ["h", "y"], { venues: fairVenues });
    useSessionStore.setState({ slug: "q4754zo7", view: v, pick });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Adil olana bırak" })[0]);
    await waitFor(() => expect(pick).toHaveBeenCalledWith("v1")); // min fark (5dk < 15dk)
  });

  /**
   * Sunucu-kapılı sayım (voteTally) yalnız herkes kilitleyince dolu gelir — yani pratikte
   * yalnız beraberlikte. Artboard 4368/4383'te sayı AYRI bir liste değil, finalist kartının
   * başlık satırındaki "N oy" rozetidir; ayrı `VoteTally` bileşeni bu yüzden kaldırıldı.
   */
  it("beraberlikte sayım finalist kartlarının 'N oy' rozetine döner", () => {
    const v = view({ participantId: "h", host: true }, ["h", "y"], { voteTally: { v1: 2, v2: 0 } });
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    // Kartlar 390 + 1280 için iki kez basılır (lg kapısı) — sayı ikisinde de aynı.
    expect(screen.getAllByText("2 oy").length).toBe(2);
    expect(screen.getAllByText("0 oy").length).toBe(2);
    // Roster kartı beraberlikte "Oylar" başlığına döner (artboard 4460).
    expect(screen.getByText("Oylar")).toBeInTheDocument();
    // Seçim dairesi oylama bittikten sonra basılmaz — yerini rozet aldı.
    expect(screen.queryByText("Kararı ver")).not.toBeInTheDocument();
  });

  it("kendi seçimini kilitleyince başlık 'Seçimini yaptın, biri seçilecek' olur", () => {
    const v = view({ participantId: "h", host: true }, ["h"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText("Seçimini yaptın, biri seçilecek")).toBeInTheDocument();
    expect(screen.queryByText("İkisi de güzel, biri seçilecek")).not.toBeInTheDocument();
  });

  it("kilitli kartta kalan tam 1 kişiyse ADLI not yazar (§4.8)", () => {
    const v = view({ participantId: "h", host: true }, ["h", "y"], {
      participants: [mehmet, yildiz, kerem],
    });
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    // Kilit kartı 1280'de sağ kolonda, 390'da yapışkan CTA'da — DOM'da iki kopya.
    expect(screen.getAllByText("Kerem seçiyor — herkes kilitleyince sonuç açıklanır").length).toBe(2);
    expect(screen.queryByText(/diğerlerini bekliyoruz/)).not.toBeInTheDocument();
  });

  /**
   * Artboard 2494-2497 / 3688-3691: atıf kartın İÇİNDE değil, listenin/ızgaranın ALTINDA tek
   * `.f-attrs` şerididir ve 390'da da basılır. Mobilde hiç basılmıyordu — bu bir LİSANS
   * yükümlülüğü, kozmetik değil.
   */
  it("finalistlerin altında tek atıf şeridi basılır — mobil dahil, kart başına değil", () => {
    useConfigStore.setState({ config: CONFIG });
    const withProvider = venues.map((x) => ({ ...x, provider: "FOURSQUARE" }));
    const v = view({ participantId: "h", host: true }, ["y"], { venues: withProvider });
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    // 390 listesi + 1280 ızgarası için BİRER kez (iki finalist × 2 kart değil).
    expect(screen.getAllByText("Powered by Foursquare")).toHaveLength(2);
  });

  /**
   * Artboard 2473 (390, opacity .75) ve 3671 (1280, `.f-dim` = opacity .48 + saturate .55):
   * kendi seçimini kilitleyende seçilmeyen finalist geri çekilir. İki kırılma noktası AYRI
   * değer kullanır, o yüzden ikisi de ayrı ayrı doğrulanır.
   */
  it("kilitten sonra seçilmeyen finalist geri çekilir (390 .75 · 1280 .f-dim)", () => {
    const v = view({ participantId: "h", host: true, runoffVoteVenueId: "v1" }, ["h"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    const { container } = render(<RunoffScreen slug="q4754zo7" view={v} />);

    const cls = [...container.querySelectorAll("div")].map((d) => d.className);
    expect(cls.filter((c) => c.includes("opacity-75"))).toHaveLength(1);
    expect(cls.filter((c) => c.includes("opacity-[0.48]") && c.includes("saturate-[0.55]"))).toHaveLength(1);
  });

  /**
   * Artboard 4356-4358: beraberlik sayfanın MANŞETİDİR — overline "Oylama bitti", h1 "Berabere",
   * kopya kararın kimde olduğunu söyler. Eskiden "Berabere" sağ kolondaki amber kartın 14px'lik
   * etiketiydi; kullanıcı oylamanın bittiğini başlıktan okuyamıyordu.
   */
  it("beraberlikte manşet 'Berabere' olur, el yazısı dürtü host'a görünür", () => {
    const v = view({ participantId: "h", host: true }, ["h", "y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Berabere");
    expect(screen.getByText("Oylama bitti")).toBeInTheDocument();
    expect(screen.getByText(/Herkes seçti ve berabere kaldı\. Buluşmayı sen kurdun/)).toBeInTheDocument();
    expect(screen.getByText("adil olana bırak, kimse üzülmez →")).toBeInTheDocument();
  });

  it("beraberlikte host olmayana el yazısı dürtü gösterilmez", () => {
    const v = view({ participantId: "y", host: false }, ["h", "y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.queryByText("adil olana bırak, kimse üzülmez →")).not.toBeInTheDocument();
  });
});
