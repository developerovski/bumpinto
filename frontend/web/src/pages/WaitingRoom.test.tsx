import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { updateLocation: vi.fn() } }));
vi.mock("../lib/geocode", () => ({ geocode: vi.fn(), reverseGeocode: vi.fn() }));

import { api } from "../lib/api";
import { geocode } from "../lib/geocode";
import { resetConfig, useConfigStore } from "../store/configStore";
import { useSocialStore } from "../store/socialStore";
import WaitingRoom from "./WaitingRoom";

const view = {
  slug: "x7k2m",
  name: "Cuma kahvesi",
  activityTypes: ["COFFEE"],
  sessionType: "GROUP",
  status: "COLLECTING",
  midpoint: { lat: 51.5, lng: 5.5 },
  radiusKm: 4.4,
  viewer: { participantId: "a", host: false },
  participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, manual: false, locationLabel: "Den Bosch" },
    { id: "a", displayName: "Ayşe", host: false, hasLocation: true, manual: false, locationLabel: "Someren" },
  ],
} as const;

describe("WaitingRoom", () => {
  /* §4.7'nin "Bekle'de harita yok" maddesi 2026-09-04 presence kararı §7 ile değişti:
     lg'de varsayılan açık, 390'da ghost arkasında. */
  /* §4.7'nin "Bekle'de harita yok" maddesi 2026-09-04 presence kararı §7 ile lg'de varsayılan
     açık olmuştu; W5 artboard'ının sağ bölgesinde harita HİÇ yok (orta nokta + "Mekanlar geliyor"
     + adım şeridi) — harita artık iki kırılımda da ghost'un arkasında. */
  it("lg: harita KENDİLİĞİNDEN açılmaz, ghost'un arkasında kalır", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      render(<WaitingRoom view={view as never} />);
      expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Haritayı aç" })).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it("harita açıldığında sabit lg yüksekliği taşımaz, kalanı doldurur", async () => {
    // MapView artik motoru config'ten okuyor — bu testte "api" mock'u yalniz updateLocation
    // taniyor, config seed edilmezse load() cokuyordu. Motor secimi burada onemsiz.
    useConfigStore.setState({ config: { mapEngine: "google", tiles: { styleUrl: "https://x" }, sources: [] } });
    try {
      render(<WaitingRoom view={view as never} />);
      fireEvent.click(screen.getByRole("button", { name: "Haritayı aç" }));
      const map = await screen.findByTestId("mapview");
      // LobbyPage ile AYNI sözleşme: harita sabit lg yüksekliği taşımaz, kalanı doldurur.
      expect(map.className).toContain("fit:h-full");
      expect(map.className).not.toMatch(/lg:h-\[/);
      expect(screen.getByRole("main")).toHaveAttribute("data-fit");
    } finally {
      resetConfig();
    }
  });

  it("390: harita mount edilmez, ghost görünür", () => {
    render(<WaitingRoom view={view as never} />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Haritayı aç" })).toBeInTheDocument();
  });

  /* Artboard 390 `.cta` notu; konum gizliliği cümlesi (`join.privacy`) katılma anına ait,
     bu ekranda tekrarlanmaz. */
  it("kapatma notu basılır, gizlilik satırı bu ekranda YOK", () => {
    render(<WaitingRoom view={view as never} />);
    expect(
      screen.getByText("Sayfayı kapatsan da olur; hazır olunca kilit ekranından görürsün."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Konumun bu buluşma için kullanılır ve gruba haritada yaklaşık gösterilir."),
    ).not.toBeInTheDocument();
  });

  /* Artboard 390 sırası "Katıldın → … → roster"; TwoZone iki bölgeyi geçişmeli basamadığı için
     sol bölge (Katıldın + roster) 390'da ÖNCE akar — `order-*` ezmesi kalktı. */
  it("390 sırası: sol bölge (Katıldın + roster) önce, order ezmesi yok", () => {
    const { getByTestId } = render(<WaitingRoom view={view as never} />);
    const left = getByTestId("zone-left");
    const right = getByTestId("zone-right");
    expect(left.className).not.toContain("order-2");
    expect(right.className).not.toContain("order-1");
    expect(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(left).toHaveTextContent("Katıldın!");
  });

  it("Konum ve ulaşım: panel açılır, mod seçilir, kaydet konumu+modu birlikte gönderir", async () => {
    vi.mocked(geocode).mockResolvedValueOnce({ lat: 51.42, lng: 5.47, label: "Eindhoven" });
    vi.mocked(api.updateLocation).mockResolvedValueOnce(undefined);
    render(<WaitingRoom view={view as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Konum ve ulaşım" }));
    expect(screen.getAllByRole("radio", { name: /Arabayla|Bisikletle|Yürüyerek|Toplu taşımayla|E-bisikletle/ }).length).toBe(5);
    fireEvent.click(screen.getByRole("radio", { name: "Bisikletle" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Şehir ya da adres" }), { target: { value: "Eindhoven" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await vi.waitFor(() =>
      expect(api.updateLocation).toHaveBeenCalledWith(
        "",
        expect.objectContaining({ lat: 51.42, lng: 5.47, label: "Eindhoven", travelMode: "BIKE" }),
      ),
    );
  });

  /** Konum GUNCELLEMEDE de ayni 409 gelebilir: tasindigi yer grubu 100 km'nin disina
      cikariyorsa. Genel "guncellenemedi" mesaji kullanicinin ne yapabilecegini soylemezdi. */
  it("participants_too_far_apart özel mesajı basar", async () => {
    vi.mocked(geocode).mockResolvedValueOnce({ lat: 41.0082, lng: 28.9784, label: "İstanbul" });
    vi.mocked(api.updateLocation).mockRejectedValueOnce({
      response: { data: { error: "participants_too_far_apart" } },
    });
    render(<WaitingRoom view={view as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Konum ve ulaşım" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Şehir ya da adres" }),
      { target: { value: "İstanbul" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    expect(await screen.findByText(
      "Bu buluşma katılımcıların orta noktasında yapılıyor ve sen gruptan çok uzaktasın. Host'tan sabit bir buluşma yeri seçmesini iste.",
    )).toBeInTheDocument();
  });

  /* Artboard (1880 / 1960-1963) dürtme butonunu DAVETLİ görünümünde gösteriyor: kurana özel
     değil. Buton paylaş-linki kopyalamaz, gerçek uç noktayı çağırır (60 sn soğuma sunucuda). */
  it("davetli de bekleyeni dürtebilir, gerçek dürtme çağrılır", () => {
    const nudge = vi.fn();
    useSocialStore.setState({ nudge, nudgedAt: {} });
    const withWaiting = {
      ...view,
      participants: [
        ...view.participants,
        { id: "k", displayName: "Kerem", host: false, hasLocation: false, manual: false },
      ],
    };
    render(<WaitingRoom view={withWaiting as never} />);
    fireEvent.click(screen.getByRole("button", { name: "Kerem'i dürt" }));
    expect(nudge).toHaveBeenCalledWith("x7k2m", "k", "Kerem");
  });

  it("çevrimdışı katılımcı roster'da işaretlenir, çevrimiçi olan işaretlenmez", () => {
    const withPresence = {
      ...view,
      participants: [
        { ...view.participants[0], online: true },
        { ...view.participants[1], online: false },
      ],
    };
    render(<WaitingRoom view={withPresence as never} />);
    expect(screen.getAllByText("çevrimdışı")).toHaveLength(1);
  });
});
