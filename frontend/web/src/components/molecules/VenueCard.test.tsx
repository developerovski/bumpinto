import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VenueCard from "./VenueCard";

// Tasarım denetimi bulgusu (2026-09-01): foto üstü rozet yerine artık kart altında gerçek atıf var.
describe("VenueCard", () => {
  it("fotoğrafsız kartta ambient gradyan + monogram var, gerçek atıf kart altında", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage" }} />);
    expect(screen.getByText("cb")).toBeInTheDocument();
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
    expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
  });

  it("provider verilince atıf yalnız o sağlayıcıya ait metni gösterir", () => {
    render(
      <VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg", provider: "FOURSQUARE" }} />,
    );
    expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
    expect(screen.queryByText("Google Maps")).not.toBeInTheDocument();
  });

  it("boş photoUrl fotoğrafsız sayılır — monogram var, atıf yine gösterilir", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "" }} />);
    expect(screen.getByText("cb")).toBeInTheDocument();
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
  });

  // Foto CSS arka planıyla çizilseydi ölü bağlantı bomboş beyaz kutu bırakırdı; <img>
  // olduğu için onError gradyan + monograma düşebiliyor.
  it("fotoğraf yüklenemezse monograma düşer", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg" }} />);
    const img = screen.getByRole("presentation", { hidden: true });
    expect(screen.queryByText("cb")).not.toBeInTheDocument();

    fireEvent.error(img);

    expect(screen.getByText("cb")).toBeInTheDocument();
  });

  // Yerel resim sürüklemesi SwipeCard'ın pointer olaylarını iptal ediyordu; kart kaydırılamıyordu.
  it("fotoğraf sürüklenemez ve pointer olaylarını karta bırakır", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg" }} />);
    const img = screen.getByRole("presentation", { hidden: true });
    expect(img).toHaveAttribute("draggable", "false");
    expect(img.className).toContain("pointer-events-none");
  });

  // Artboard d2/d3: yığındaki arka kartlar çıplak gradyan — içinde hiçbir şey yok.
  it("photoOnly kartın fotoğraf alanında içerik yok", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg" }} photoOnly />);
    expect(screen.queryByText("cb")).not.toBeInTheDocument();
    expect(screen.queryByText("Café Berlage")).not.toBeInTheDocument();
    expect(screen.queryByText("Google Maps")).not.toBeInTheDocument();
  });

  // Artboard "Liste modu 390": .row.wr satırı puan + TEK adalet rozetini birlikte gösterir.
  it("row varyantı meta satırında adalet rozetini gösterir (Liste modu 390)", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Café Berlage", rating: 4.6, travelMinutes: { p1: 30, p2: 25, p3: 35 } }}
        variant="row"
        travel={{ labels: { p1: "Sen", p2: "Ayşe", p3: "Kerem" }, selfId: "p1" }}
      />,
    );
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
  });

  // Kod kalitesi incelemesi: rozet null iken sarmalayıcı div boş kalıp flex-col gap'ini
  // yiyordu (SOLO / travelMinutes yok). Artık FairnessBadge doğrudan render edilir.
  it("adalet rozeti yokken boş sarmalayıcı bırakmaz (SOLO / travelMinutes yok)", () => {
    const { container } = render(<VenueCard venue={{ id: "v1", name: "Café Berlage" }} />);
    expect(container.querySelector(".flex.flex-wrap.items-center.gap-2")).toBeNull();
  });

  // Kart anatomisi §4.9: foto/monogram → ad → FitLine → ★ · fiyat · semt → rozet → çipler → atıf.
  it("activity + categories verilince uyum satırını başlıktan hemen sonra gösterir", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Bakkerij Bart", category: "Fırın" }}
        activity="COFFEE"
        categories={["Espresso bar", "Fırın"]}
      />,
    );
    expect(screen.getByText("Kahve değil: fırın")).toBeInTheDocument();
  });

  it("activity verilmezse uyum satırı hiç çizilmez", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", category: "Espresso bar" }} />);
    expect(screen.queryByText(/Kahve/)).not.toBeInTheDocument();
  });

  it("semt orta nokta etiketinden FARKLIYSA meta satırında gösterilir", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Café Berlage", rating: 4.6, locality: "Helmond" }}
        midpointLabel="Eindhoven"
      />,
    );
    expect(screen.getByText("★ 4,6")).toBeInTheDocument();
    expect(screen.getByText("Helmond")).toBeInTheDocument();
  });

  it("semt orta nokta etiketiyle AYNIYSA meta satırında tekrar edilmez", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Café Berlage", locality: "Eindhoven" }}
        midpointLabel="Eindhoven"
      />,
    );
    expect(screen.queryByText("Eindhoven")).not.toBeInTheDocument();
  });

  it("hoursToday varsa düz metin satırı basılır, 'Açık' asla yazılmaz", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", hoursToday: "08–22" }} />);
    expect(screen.getByText("Bugün 08–22")).toBeInTheDocument();
    expect(screen.queryByText(/[Aa]çık/)).not.toBeInTheDocument();
  });

  it("hoursToday yoksa satır hiç çizilmez, yer tutucu yazılmaz", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage" }} />);
    expect(screen.queryByText(/Bugün/)).not.toBeInTheDocument();
  });

  // ratingCount hiçbir artboard'da yok — sözleşmede kalır, ekranda hiç kullanılmaz.
  it("ratingCount alanı gelse bile ekranda hiçbir yerde gösterilmez", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", rating: 4.6, ratingCount: 312 }} />);
    expect(screen.getByText("★ 4,6")).toBeInTheDocument();
    expect(screen.queryByText(/312/)).not.toBeInTheDocument();
  });

  // attribution={false} — liste modunda satır başına atıf yok (VenueCheckRow bunu geçer).
  it("attribution={false} iken kart altında atıf çizilmez", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage" }} attribution={false} />);
    expect(screen.queryByText("Google Maps")).not.toBeInTheDocument();
  });

  // Kart anatomisi §4.9: DOM sırası foto → ad → FitLine → meta → saat → atıf'tır (tek geçişte).
  it("kart anatomisi DOM sırası §4.9'a birebir uyar", () => {
    const { container } = render(
      <VenueCard
        venue={{
          id: "v1",
          name: "Bakkerij Bart",
          category: "Fırın",
          rating: 4.3,
          locality: "Best",
          hoursToday: "08–17",
          provider: "GOOGLE",
        }}
        activity="COFFEE"
        categories={["Espresso bar", "Fırın"]}
      />,
    );
    const text = container.textContent ?? "";
    const iName = text.indexOf("Bakkerij Bart");
    const iFit = text.indexOf("Kahve değil: fırın");
    const iMeta = text.indexOf("★ 4,3");
    const iLocality = text.indexOf("Best");
    const iHours = text.indexOf("Bugün 08–17");
    const iAttr = text.indexOf("Google Maps");
    expect([iName, iFit, iMeta, iLocality, iHours, iAttr].every((i) => i !== -1)).toBe(true);
    expect(iName).toBeLessThan(iFit);
    expect(iFit).toBeLessThan(iMeta);
    expect(iMeta).toBeLessThan(iLocality);
    expect(iLocality).toBeLessThan(iHours);
    expect(iHours).toBeLessThan(iAttr);
  });
});
