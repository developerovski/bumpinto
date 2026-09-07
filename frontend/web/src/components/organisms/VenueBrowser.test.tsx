import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@bumpinto/shared";
import { resetConfig, useConfigStore } from "../../store/configStore";
import VenueBrowser from "./VenueBrowser";

// Spec §11 — atıf config'ten gelir.
const CONFIG: AppConfig = {
  mapEngine: "google",
  tiles: { styleUrl: "https://example/style" },
  sources: [
    { id: "google", attributionKey: "attribution.google", attributionUrl: null, ratingScale: 5 },
    { id: "foursquare", attributionKey: "attribution.foursquare", attributionUrl: null, ratingScale: 10 },
  ],
};

const venues = [
  {
    id: "v1", name: "Adil Kahve", rating: 4.0, priceLevel: 2, lat: 51.44, lng: 5.47, deckOrder: 0,
    travel: [{ participantId: "h", minutes: 30 }, { participantId: "a", minutes: 28 }],
  },
  {
    id: "v2", name: "Puanlı Kahve", rating: 4.8, priceLevel: 1, lat: 51.5, lng: 5.4, deckOrder: 1,
    travel: [{ participantId: "h", minutes: 45 }, { participantId: "a", minutes: 40 }],
  },
];
const people = [
  { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, approxLocation: { lat: 51.7, lng: 5.3 } },
  { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false, approxLocation: { lat: 51.39, lng: 5.71 } },
];
const travel = { labels: { h: "Sen", a: "Ayşe" }, selfId: "h" };

const base = {
  venues,
  participants: people,
  midpoint: { lat: 51.5, lng: 5.5 },
  radiusKm: 4,
  travel,
  onPick: vi.fn(),
};

describe("VenueBrowser", () => {
  afterEach(() => resetConfig());

  it("390: harita SEKME AÇILANA KADAR mount edilmez; ghost 'Haritada gör' açar", async () => {
    render(<VenueBrowser {...base} mode="host" />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Haritada gör" }));
    expect(await screen.findByTestId("mapview")).toBeInTheDocument();
  });

  it("grup modunda seçim aksiyonu yok; SOLO'da seçili satırın altında onay kartı var", () => {
    const { rerender } = render(<VenueBrowser {...base} mode="host" />);
    expect(screen.queryByText("Seçimin")).not.toBeInTheDocument();
    rerender(<VenueBrowser {...base} mode="solo" />);
    fireEvent.click(screen.getByText("Adil Kahve"));
    expect(screen.getByText("Seçimin")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kilitle" }));
    expect(base.onPick).toHaveBeenCalledWith("v1");
  });

  it("onay kartı 'Vazgeç' ile kapanır; odak satıra döner", () => {
    render(<VenueBrowser {...base} mode="solo" />);
    const row = screen.getByText("Adil Kahve").closest('[role="button"]') as HTMLElement;
    fireEvent.click(row);
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(screen.queryByText("Seçimin")).not.toBeInTheDocument();
    expect(row).toHaveFocus();
  });

  it("satıra hover/focus SOLO onay kartını AÇMAZ; yalnız tık/Enter açar", () => {
    render(<VenueBrowser {...base} mode="solo" />);
    const row = screen.getByText("Adil Kahve").closest('[role="button"]') as HTMLElement;
    fireEvent.mouseEnter(row);
    fireEvent.focus(row);
    expect(screen.queryByText("Seçimin")).not.toBeInTheDocument();
    fireEvent.click(row);
    expect(screen.getByText("Seçimin")).toBeInTheDocument();
  });

  it("A seçiliyken B hover'lanınca pop kart A'yı gösterir; tek onay kartı kalır", async () => {
    render(<VenueBrowser {...base} mode="solo" />);
    fireEvent.click(screen.getByRole("button", { name: "Haritada gör" }));
    await screen.findByTestId("mapview");
    const rowFor = (name: string) =>
      screen
        .getAllByText(name)
        .map((el) => el.closest('[role="button"]'))
        .find((el): el is HTMLElement => !!el)!;
    fireEvent.click(rowFor("Adil Kahve"));
    fireEvent.mouseEnter(rowFor("Puanlı Kahve"));
    expect(screen.getAllByText("Seçimin")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Kilitle" }));
    expect(base.onPick).toHaveBeenCalledWith("v1");
  });

  it("seçim listeyi seçili satıra yumuşakça kaydırır (harita pini de aynı yolu kullanır)", () => {
    const calls: ScrollIntoViewOptions[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
      if (arg && typeof arg === "object") calls.push(arg);
    };
    try {
      render(<VenueBrowser {...base} mode="host" />);
      fireEvent.click(screen.getByRole("button", { name: /Puanlı Kahve/ }));
      expect(calls).toContainEqual({ block: "nearest", behavior: "smooth" });
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("pop kart: afiş fotoğraf + kapat düğmesi; kapatınca seçim bırakılır", async () => {
    render(<VenueBrowser {...base} mode="host" />);
    fireEvent.click(screen.getByRole("button", { name: "Haritada gör" }));
    await screen.findByTestId("mapview");
    const row = screen.getByRole("button", { name: /Adil Kahve/ });
    fireEvent.mouseEnter(row);
    const close = screen.getByRole("button", { name: "Kapat" });
    fireEvent.click(close);
    expect(screen.queryByRole("button", { name: "Kapat" })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  it("gerçek lg genişlikte (matchMedia eşleşirse) harita ghost'a basılmadan mount olur", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    render(<VenueBrowser {...base} mode="host" />);
    expect(screen.getByTestId("mapview")).toBeInTheDocument();
    window.matchMedia = original;
  });

  it("davetli: salt okunur, harita ghost arkasında; liste ilk sıradaki mekanla açılır", () => {
    render(<VenueBrowser {...base} mode="guest" />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    expect(screen.queryByText("Seçimin")).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })[0].textContent).toBe("Adil Kahve");
  });

  it("varsayılan sıra 'Herkese adil' (en uzun yol artan); Puan'a geçince puan azalan", () => {
    render(<VenueBrowser {...base} mode="host" />);
    const first = () => screen.getAllByRole("heading", { level: 3 })[0].textContent;
    expect(first()).toBe("Adil Kahve"); // max 30
    fireEvent.click(screen.getByRole("radio", { name: "Puan" }));
    expect(first()).toBe("Puanlı Kahve"); // 4.8
  });

  it("tek HandNote: 'önce herkese en adil olanlar'", () => {
    render(<VenueBrowser {...base} mode="host" />);
    expect(screen.getAllByText(/önce herkese en adil olanlar/)).toHaveLength(1);
  });

  it("sağlayıcı bilinmiyorsa listede atıf hiç basılmaz", () => {
    useConfigStore.setState({ config: CONFIG });
    render(<VenueBrowser {...base} mode="host" />);
    expect(screen.queryByText("Google Maps")).not.toBeInTheDocument();
    expect(screen.queryByText("Powered by Foursquare")).not.toBeInTheDocument();
  });

  it("tüm mekanlar TEK sağlayıcıdaysa listede yalnız o sağlayıcının atfı gösterilir", () => {
    useConfigStore.setState({ config: CONFIG });
    const single = venues.map((v) => ({ ...v, provider: "GOOGLE" }));
    render(<VenueBrowser {...base} venues={single} mode="host" />);
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
    expect(screen.queryByText("Powered by Foursquare")).not.toBeInTheDocument();
  });

  it("karışık sağlayıcılı listede kümenin HER üyesi gösterilir", () => {
    useConfigStore.setState({ config: CONFIG });
    const mixed = [
      { ...venues[0], provider: "GOOGLE" },
      { ...venues[1], provider: "FOURSQUARE" },
    ];
    render(<VenueBrowser {...base} venues={mixed} mode="host" />);
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
    expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
  });

  // Spec §11 — kümeye YALNIZ bilinen sağlayıcılar girer; eksik olan hiçbir satır eklemez.
  it("bir mekanın sağlayıcısı bilinmiyorsa yalnız bilinenin atfı gösterilir", () => {
    useConfigStore.setState({ config: CONFIG });
    const partial = [{ ...venues[0], provider: "GOOGLE" }, venues[1]];
    render(<VenueBrowser {...base} venues={partial} mode="host" />);
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
    expect(screen.queryByText("Powered by Foursquare")).not.toBeInTheDocument();
  });

  it("satır meta çizgisinde semt orta nokta etiketiyle AYNIYSA tekrar edilmez", () => {
    const withLocality = [
      { ...venues[0], locality: "Eindhoven" },
      { ...venues[1], locality: "Helmond" },
    ];
    render(<VenueBrowser {...base} venues={withLocality} mode="host" midpointLabel="Eindhoven" />);
    // VenueMeta artık ★/fiyat/saat/semt'i TEK span'de birleştiriyor (R-W8) — tam eşleşme
    // ("Eindhoven") artık hiçbir düğümü bulamaz (satır "★ 4,0 · €€ · Eindhoven" yazar), bastırma
    // bozulsa bile bu iddia sessizce yeşil kalırdı; regex ile alt dize aranır.
    expect(screen.queryByText(/Eindhoven/)).not.toBeInTheDocument();
    expect(screen.getByText(/Helmond/)).toBeInTheDocument();
  });

  it("satırda bugünün saati basılır", () => {
    const withHours = [{ ...venues[0], hoursToday: "08:00 – 18:00" }, venues[1]];
    render(<VenueBrowser {...base} venues={withHours} mode="host" />);
    expect(screen.getByText(/Bugün 08:00 – 18:00/)).toBeInTheDocument();
  });

  it("tagline alanı yoksa o satır hiç çizilmez", () => {
    render(<VenueBrowser {...base} mode="host" />);
    expect(screen.queryByText(/Sakin, oturmalı/)).not.toBeInTheDocument();
  });

  // tagline (B-15/R-B7) openapi'de HENÜZ yok — cast şart. Yukarıdaki "yoksa yok" testi tek
  // başına hiçbir şey kanıtlamıyordu (fixture'da zaten olmayan bir dizeydi); bu test alan
  // GELİNCE gerçekten basıldığını gösterir.
  it("tagline alanı VARSA basılır", () => {
    const withTagline = [{ ...venues[0], tagline: "Sakin, oturmalı" } as never, venues[1]];
    render(<VenueBrowser {...base} venues={withTagline} mode="host" />);
    expect(screen.getByText("Sakin, oturmalı")).toBeInTheDocument();
  });

  it("konumu henüz gelmemiş TEK katılımcı: adlı pozitif not (§5.C)", () => {
    const waiting = [
      ...people,
      { id: "z", displayName: "Zeynep", host: false, hasLocation: false, deckDone: false, manual: false },
    ];
    render(<VenueBrowser {...base} participants={waiting} mode="host" />);
    expect(
      screen.getByText("Zeynep konumunu henüz paylaşmadı — süreler o gelince güncellenir"),
    ).toBeInTheDocument();
  });

  it("konumu henüz gelmemiş BİRDEN FAZLA katılımcı: genel not, isim/sayaç yok (§5.C)", () => {
    const waiting = [
      ...people,
      { id: "z", displayName: "Zeynep", host: false, hasLocation: false, deckDone: false, manual: false },
      { id: "y", displayName: "Yusuf", host: false, hasLocation: false, deckDone: false, manual: false },
    ];
    render(<VenueBrowser {...base} participants={waiting} mode="host" />);
    expect(screen.getByText("Konumu olmayanlar gelince süreler güncellenir")).toBeInTheDocument();
    expect(screen.queryByText(/Zeynep|Yusuf/)).not.toBeInTheDocument();
  });

  it("elle nokta ekleyen (manual) katılımcı §5.C notunu tetiklemez", () => {
    const manualOnly = [
      ...people,
      { id: "m", displayName: "Manuel", host: false, hasLocation: false, deckDone: false, manual: true },
    ];
    render(<VenueBrowser {...base} participants={manualOnly} mode="host" />);
    expect(screen.queryByText(/konumunu henüz paylaşmadı|Konumu olmayanlar/)).not.toBeInTheDocument();
  });

  it("varsayılan seçim YOK: veri gelince hiçbir satır seçili değil; hover seçer, ayrılınca bırakır", () => {
    const { rerender } = render(<VenueBrowser {...base} venues={[]} mode="host" />);
    rerender(<VenueBrowser {...base} mode="host" />);
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    const row = screen.getByRole("button", { name: /Adil Kahve/ });
    fireEvent.mouseEnter(row);
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
    fireEvent.mouseLeave(row);
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });
});
