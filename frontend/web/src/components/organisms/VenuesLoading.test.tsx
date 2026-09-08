import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "@bumpinto/shared";
import { resetConfig, useConfigStore } from "../../store/configStore";
import VenuesLoading from "./VenuesLoading";

const CONFIG: AppConfig = {
  mapEngine: "google",
  tiles: { styleUrl: "https://example/style" },
  sources: [
    { id: "google", attributionKey: "attribution.google", attributionUrl: null, ratingScale: 5 },
    { id: "foursquare", attributionKey: "attribution.foursquare", attributionUrl: null, ratingScale: 10 },
  ],
};

const view = {
  name: "Cuma kahvesi",
  activityTypes: ["COFFEE"],
  radiusKm: 9,
  midpointLabel: "Eindhoven",
  participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, manual: false, midpointMinutes: 25 },
    { id: "a", displayName: "Ayşe", host: false, hasLocation: true, manual: false, midpointMinutes: 30 },
    { id: "k", displayName: "Kerem", host: false, hasLocation: true, manual: false, midpointMinutes: 35 },
  ],
};

describe("VenuesLoading", () => {
  afterEach(() => resetConfig());

  it("arama başlığını, kopyayı ve dört iskelet satırı basar", () => {
    render(<VenuesLoading name="Cuma kahvesi" />);
    expect(screen.getByText("Cuma kahvesi")).toBeInTheDocument();
    expect(screen.getByText("mekanlar aranıyor…")).toBeInTheDocument();
    expect(screen.getByText("Çevredeki mekanlar aranıyor")).toBeInTheDocument();
    expect(screen.getAllByTestId("venue-skeleton")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    // Artboard 559: parıltı soldan sağa SÜPÜRME (`--animate-shimmer`), opaklık nabzı değil; ve
    // yalnız hareket açıkken (app.css reduced-motion kuralını okunur kılar).
    expect(screen.getAllByTestId("venue-skeleton")[0].querySelector("span")!.className)
      .toContain("motion-safe:animate-shimmer");
  });

  /** Artboard 4337: devre dışı `.cta` — liste gelince düğme yerinde belirir, düzen atlamaz. */
  it("alt CTA'da devre dışı 'Karıştır ve kaydır' durur", () => {
    render(<VenuesLoading name="Cuma kahvesi" />);
    expect(screen.getByRole("button", { name: "Karıştır ve kaydır" })).toBeDisabled();
  });

  /** Artboard 4281-4288: beklerken ekranda duran TEK gerçek bilgi orta nokta kartıdır. */
  it("view verilince orta nokta kartını basar", () => {
    render(<VenuesLoading view={view as never} />);
    expect(screen.getByText("Orta nokta")).toBeInTheDocument();
    expect(screen.getByText("Eindhoven civarı")).toBeInTheDocument();
  });

  /** Artboard 4291: tek ilgi alanı varsa adı başlığa girer. */
  it("tek ilgi alanında başlık alana özel", () => {
    render(<VenuesLoading view={view as never} />);
    expect(screen.getByText("Çevredeki kahve mekanları aranıyor")).toBeInTheDocument();
  });

  it("karışık destede genel başlığa döner (alan adı uydurulmaz)", () => {
    render(<VenuesLoading view={{ ...view, activityTypes: ["COFFEE", "HIKE"] } as never} />);
    expect(screen.getByText("Çevredeki mekanlar aranıyor")).toBeInTheDocument();
  });

  /** Artboard 4292: kaynak adları config'ten, kişi sayısı view'dan — ikisi de gerçek veri. */
  it("config geldiyse kaynakları ve kişi sayısını yazar", () => {
    useConfigStore.setState({ config: CONFIG });
    render(<VenuesLoading view={view as never} />);
    expect(
      screen.getByText("Google ve Foursquare kaynağından 3 kişinin yoluna göre sıralanıyor."),
    ).toBeInTheDocument();
  });

  it("config yoksa genel kopyaya düşer — sağlayıcı uydurulmaz", () => {
    render(<VenuesLoading view={view as never} />);
    expect(screen.getByText("Herkesin yoluna göre sıralanıyor.")).toBeInTheDocument();
  });

  /** Kimliği i18n'de karşılığı olmayan bir kaynak varsa cümle hiç kurulmaz. */
  it("bilinmeyen kaynak kimliğinde genel kopyaya düşer", () => {
    useConfigStore.setState({
      config: {
        ...CONFIG,
        sources: [{ id: "acme", attributionKey: "attribution.google", attributionUrl: null, ratingScale: 5 }],
      },
    });
    render(<VenuesLoading view={view as never} />);
    expect(screen.getByText("Herkesin yoluna göre sıralanıyor.")).toBeInTheDocument();
  });
});
