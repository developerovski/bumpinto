import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { updateLocation: vi.fn() } }));
vi.mock("../lib/geocode", () => ({ geocode: vi.fn(), reverseGeocode: vi.fn() }));

import { api } from "../lib/api";
import { geocode } from "../lib/geocode";
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
  it("lg: harita ghost'a basmadan mount edilir", async () => {
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
      const map = await screen.findByTestId("mapview");
      // LobbyPage ile AYNI sözleşme: harita sabit lg yüksekliği taşımaz, kalanı doldurur.
      expect(map.className).toContain("fit:h-full");
      expect(map.className).not.toMatch(/lg:h-\[/);
      expect(screen.getByRole("main")).toHaveAttribute("data-fit");
    } finally {
      window.matchMedia = original;
    }
  });

  it("390: harita mount edilmez, ghost görünür", () => {
    render(<WaitingRoom view={view as never} />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Haritayı aç" })).toBeInTheDocument();
  });

  it("§5.C gizlilik satırı LobbyPage ile AYNI anahtarla görünür", () => {
    render(<WaitingRoom view={view as never} />);
    expect(
      screen.getByText("Konumun bu buluşma için kullanılır ve gruba haritada yaklaşık gösterilir."),
    ).toBeInTheDocument();
  });

  it("390 sırası: sağ bölge (orta nokta) `order-1`, sol bölge (roster) `order-2` — ≥1024'te sıfırlanır", () => {
    const { getByTestId } = render(<WaitingRoom view={view as never} />);
    expect(getByTestId("zone-left").className).toContain("order-2");
    expect(getByTestId("zone-left").className).toContain("lg:order-none");
    expect(getByTestId("zone-right").className).toContain("order-1");
    expect(getByTestId("zone-right").className).toContain("lg:order-none");
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
