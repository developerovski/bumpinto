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
  activityType: "COFFEE",
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
  it("harita hiçbir genişlikte mount edilmez (§4.7)", () => {
    render(<WaitingRoom view={view as never} />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
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
});
