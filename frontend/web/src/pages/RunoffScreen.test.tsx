import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSessionStore } from "../store/sessionStore";
import RunoffScreen from "./RunoffScreen";

const venues = [
  { id: "v1", name: "Sofra Cuisine", lat: 51.7, lng: 5.3, rating: 5, travelMinutes: {} },
  { id: "v2", name: "Abed food", lat: 51.7, lng: 5.31, rating: 4.9, travelMinutes: {} },
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
    slug: "q4754zo7", activityType: "FOOD", sessionType: "GROUP", status: "RUNOFF",
    participants: [mehmet, yildiz], venues, runoffVenueIds: ["v1", "v2"],
    runoffVotedParticipantIds: votedIds, viewer, ...extra,
  } as never;
}

// v1: toplam 55 dk, fark 5 dk — v2'ye göre 10 dk daha az (>=5 dk kuralı) → v1 "karar verici" hücre.
const fairVenues = [
  { id: "v1", name: "Café Berlage", lat: 51.7, lng: 5.3, rating: 4.6, travelMinutes: { h: 30, y: 25 } },
  { id: "v2", name: "Koffie Top Hundred", lat: 51.7, lng: 5.31, rating: 4.4, travelMinutes: { h: 40, y: 25 } },
];

describe("RunoffScreen", () => {
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

    const decide = screen.getByRole("button", { name: "Kararı ver" });
    expect(decide).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]);
    fireEvent.click(decide);
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

  it("beraberlikte host olmayan bekler, karar butonu görmez", () => {
    const v = view({ participantId: "y", host: false }, ["h", "y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText("Berabere")).toBeInTheDocument();
    expect(screen.getByText(/Mehmet son kararı veriyor/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kararı ver" })).not.toBeInTheDocument();
  });

  it("her finalistin altında toplam ve fark treyleri var; karar verici hücre amber-wash", () => {
    const v = view({ participantId: "h", host: true }, ["y"], { venues: fairVenues });
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getAllByText("toplam ~55 dk · fark ~5 dk")[0]).toBeInTheDocument();
    expect(screen.getAllByText("toplam ~65 dk · fark ~15 dk")[0]).toBeInTheDocument();
    expect(screen.getAllByTestId("trailer-v1")[0].className).toContain("bg-amber-wash");
    expect(screen.getAllByTestId("trailer-v2")[0].className).not.toContain("bg-amber-wash");
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
      { id: "v3", name: "Third Place", lat: 51.7, lng: 5.32, rating: 4.2, travelMinutes: {} },
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

    fireEvent.click(screen.getByRole("button", { name: "Adil olana bırak" }));
    await waitFor(() => expect(pick).toHaveBeenCalledWith("v1")); // min fark (5dk < 15dk)
  });

  /**
   * `RunoffStatus.everyone` ve buradaki `tie` AYNI oy kümesini kullanır: herkes kilitleyince
   * sayfa her zaman RunoffTie dalına düşer, RunoffStatus'un "sent" dalı hiç görünmez. Sunucu-kapılı
   * sayım (voteTally) bu yüzden RunoffTie'de render edilir — tek erişilebilir yer burasıdır.
   */
  it("herkes kilitleyince sayım RunoffTie üstünde görünür", () => {
    // jsdom requestAnimationFrame sağlamıyor — count-up'ı reduced-motion zorlayarak
    // deterministik yapıyoruz (useCountUp.test.ts'teki aynı desen).
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;

    const v = view({ participantId: "h", host: true }, ["h", "y"], { voteTally: { v1: 2, v2: 0 } });
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText("Oylar")).toBeInTheDocument();
    expect(screen.getAllByText("Sofra Cuisine").length).toBeGreaterThan(0);
    expect(screen.getByText("2")).toBeInTheDocument();

    window.matchMedia = original;
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

    expect(screen.getByText("Kerem seçiyor — herkes kilitleyince sonuç açıklanır")).toBeInTheDocument();
    expect(screen.queryByText(/diğerlerini bekliyoruz/)).not.toBeInTheDocument();
  });
});
