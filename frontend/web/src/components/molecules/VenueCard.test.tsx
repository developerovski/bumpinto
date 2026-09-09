import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "@bumpinto/shared";
import { resetConfig, useConfigStore } from "../../store/configStore";
import VenueCard from "./VenueCard";

// Spec §11 — atıf artık config'ten gelir; testler kendi kaynak listesini seed eder.
const CONFIG: AppConfig = {
  mapEngine: "google",
  tiles: { styleUrl: "https://example/style" },
  sources: [
    { id: "google", attributionKey: "attribution.google", attributionUrl: null, ratingScale: 5 },
    { id: "foursquare", attributionKey: "attribution.foursquare", attributionUrl: null, ratingScale: 10 },
  ],
};

// Tasarım denetimi bulgusu (2026-09-01): foto üstü rozet yerine artık kart altında gerçek atıf var.
describe("VenueCard", () => {
  afterEach(() => resetConfig());

  it("fotoğrafsız kartta ambient gradyan + monogram var, sağlayıcı yoksa atıf basılmaz", () => {
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage" }} />);
    expect(screen.getByText("cb")).toBeInTheDocument();
    expect(screen.queryByText("Google Maps")).not.toBeInTheDocument();
    expect(screen.queryByText("Powered by Foursquare")).not.toBeInTheDocument();
  });

  it("provider verilince atıf yalnız o sağlayıcıya ait metni gösterir", () => {
    useConfigStore.setState({ config: CONFIG });
    render(
      <VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "/p.jpg", provider: "FOURSQUARE" }} />,
    );
    expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
    expect(screen.queryByText("Google Maps")).not.toBeInTheDocument();
  });

  /**
   * K-M41 (LİSANS): kart `tagline`ı basıyorsa, o cümlenin KAYNAĞI da atıf ister. FSQ tips'ten
   * türeyen bir cümle Foursquare atfı doğurur — mekan Google'dan gelmiş olsa bile (GUIDE
   * kural 8). Eşleme paylaşılan `attributionProviders`ta; kart yalnız onu çağırır.
   */
  it("FSQ kaynaklı tagline Foursquare atfını da getirir", () => {
    useConfigStore.setState({ config: CONFIG });
    render(
      <VenueCard
        venue={{
          id: "v1",
          name: "Café Berlage",
          provider: "google",
          tagline: "Sakin, oturmalı",
          taglineSource: "FSQ",
        }}
      />,
    );
    expect(screen.getByText("Sakin, oturmalı")).toBeInTheDocument();
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
    expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
  });

  it("boş photoUrl fotoğrafsız sayılır — monogram var, provider'lı atıf yine gösterilir", () => {
    useConfigStore.setState({ config: CONFIG });
    render(<VenueCard venue={{ id: "v1", name: "Café Berlage", photoUrl: "", provider: "GOOGLE" }} />);
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
        venue={{
          id: "v1",
          name: "Café Berlage",
          rating: 4.6,
          travel: [
            { participantId: "p1", minutes: 30 },
            { participantId: "p2", minutes: 25 },
            { participantId: "p3", minutes: 35 },
          ],
        }}
        variant="row"
        travel={{ labels: { p1: "Sen", p2: "Ayşe", p3: "Kerem" }, selfId: "p1" }}
      />,
    );
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
  });

  // Kod incelemesi: bu test container.querySelector(".flex.flex-wrap.items-center.gap-2") arıyordu
  // ama varsayılan (polaroid) dalını render ediyordu — o seçici YALNIZ "row" dalında var, test
  // T6'dan ÖNCE de boşa geçiyordu. row dalına çevrilip RangeBar'ın gerçekten bastığı doğrulanır.
  it("row varyantı meta satırında RangeBar'ı gerçekten basar", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Café Berlage", travel: [{ participantId: "p1", minutes: 20 }] }}
        variant="row"
        travel={{ labels: { p1: "Sen" }, selfId: "p1" }}
      />,
    );
    expect(screen.getByTestId("range-dot-p1")).toBeInTheDocument();
    expect(screen.getByText("~20 dk")).toBeInTheDocument();
  });

  // Kart anatomisi §4.9: foto/monogram → ad → FitLine → ★ · fiyat · semt → saat → tagline → TravelBars → atıf.
  it("activity + categories verilince uyum satırını başlıktan hemen sonra gösterir", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Bakkerij Bart", category: "Fırın", activityType: "COFFEE" }}
        categories={["Espresso bar", "Fırın"]}
      />,
    );
    expect(screen.getByText("Kahve değil: fırın")).toBeInTheDocument();
  });

  it("mekânın activityType'ı yoksa uyum satırı hiç çizilmez", () => {
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
    useConfigStore.setState({ config: CONFIG });
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
          activityType: "COFFEE",
        }}
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

  /** Karışık destede kart KENDİ alanını söyler: hike kartı "kahve değil" demez. */
  it("uyum satırı mekânın kendi ilgi alanına bakar", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Trage Tocht", category: "Nature trail", activityType: "HIKE" }}
        categories={["Coffee shop", "Nature trail"]}
      />,
    );
    expect(screen.getByText(/Doğa yürüyüşü için/)).toBeInTheDocument();
  });

  /** Atıf yoksa satır HİÇ çizilmez — uydurma bir alan adı yazmaktansa sussun. */
  it("atıfsız mekânda uyum satırı çizilmez", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Trage Tocht", category: "Hiking area", activityType: undefined }}
        categories={["Coffee shop", "Hiking area"]}
      />,
    );
    expect(screen.queryByText(/için:/)).not.toBeInTheDocument();
  });

  /** Karışık destede kart rozeti gösterilir; tek alanlı destede gereksiz gürültüdür. */
  it("karışık destede aktivite rozeti basar", () => {
    render(<VenueCard venue={{ id: "v1", name: "Trage Tocht", activityType: "HIKE" }} mixedDeck />);
    expect(screen.getByText("Doğa yürüyüşü")).toBeInTheDocument();
  });

  it("mixedDeck geçilmezse rozet basılmaz (tek alanlı deste)", () => {
    render(<VenueCard venue={{ id: "v1", name: "Trage Tocht", activityType: "HIKE" }} />);
    expect(screen.queryByText("Doğa yürüyüşü")).not.toBeInTheDocument();
  });

  /**
   * Mobil (390) runoff iki finalisti YAN YANA gosterir. Karisik destede hangisinin hangi
   * alan oldugu yazmazsa kullanici neyi sectigini bilmez — row varyanti da rozet basmali.
   */
  it("row varyantı karışık destede aktivite rozeti basar", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Aa Trail", activityType: "HIKE", deckOrder: 0 }}
        variant="row"
        mixedDeck
      />,
    );
    expect(screen.getByText("Doğa yürüyüşü")).toBeInTheDocument();
  });

  it("row varyantı tek alanlı destede rozet basmaz", () => {
    render(
      <VenueCard
        venue={{ id: "v1", name: "Aa Trail", activityType: "HIKE", deckOrder: 0 }}
        variant="row"
      />,
    );
    expect(screen.queryByText("Doğa yürüyüşü")).not.toBeInTheDocument();
  });

  // Artboard 2015: saat AYRI satır değil, TEK `.mi` satırının parçası.
  it("saat bilgisi puan/fiyat/semt ile AYNI meta satırında yaşar", () => {
    const { container } = render(
      <VenueCard
        venue={{ id: "v1", name: "Café Berlage", rating: 4.6, priceLevel: 2, hoursToday: "08:00–18:00" }}
      />,
    );
    const meta = [...container.querySelectorAll("div")].find((d) =>
      (d.textContent ?? "").startsWith("★ 4,6") && d.className.includes("flex-wrap"),
    );
    expect(meta?.textContent).toContain("Bugün 08:00–18:00");
    expect(meta?.className).toContain("text-[0.75rem]");
  });

  // Artboard 2013 + 2023: rozet başlık satırında, alt satır lead'i TEKRAR ETMEZ.
  it("fairnessBadge ile adalet rozeti başlık satırında basılır ve yol satırında tekrar etmez", () => {
    render(
      <VenueCard
        venue={{
          id: "v1",
          name: "Café Berlage",
          travel: [
            { participantId: "p1", minutes: 25 },
            { participantId: "p2", minutes: 30 },
          ],
        }}
        travel={{ labels: { p1: "Sen", p2: "Ayşe" }, selfId: "p1" }}
        fairnessBadge
      />,
    );
    expect(screen.getAllByText("Herkese ~aynı")).toHaveLength(1);
    expect(screen.getByText(/fark 5 dk/)).toBeInTheDocument();
  });

  it("fairnessBadge geçilmezse rozet basılmaz, lead eskisi gibi yol satırında kalır", () => {
    render(
      <VenueCard
        venue={{
          id: "v1",
          name: "Café Berlage",
          travel: [
            { participantId: "p1", minutes: 25 },
            { participantId: "p2", minutes: 30 },
          ],
        }}
        travel={{ labels: { p1: "Sen", p2: "Ayşe" }, selfId: "p1" }}
      />,
    );
    expect(screen.getAllByText("Herkese ~aynı")).toHaveLength(1);
  });

  // Artboard 2111 / 2005 — ön kart fotoğrafı 390'da 210px, 1280'de 240px; satır-içi ölçü BASILMAZ.
  it("photoClassName verilince yükseklik sınıfla gelir, style ile değil", () => {
    const { container } = render(
      <VenueCard venue={{ id: "v1", name: "Café Berlage" }} photoClassName="h-[13.125rem] lg:h-[15rem]" />,
    );
    const photo = container.querySelector(".h-\\[13\\.125rem\\]") as HTMLElement | null;
    expect(photo).toBeTruthy();
    expect(photo?.style.height).toBe("");
  });

  /**
   * Artboard 4368/4383: oylama bitince başlık satırındaki seçim dairesi "N oy" rozetine döner —
   * daire artık bir şey ifade etmiyor. `footer` ise `.f-trail`'in kartın İÇİNDE yaşamasını
   * sağlar (eskiden kartın altında kardeş bir öğeydi).
   */
  it("voteCount verilince seçim dairesinin yerini 'N oy' rozeti alır ve footer kart içinde basılır", () => {
    const { container } = render(
      <VenueCard
        venue={{ id: "v1", name: "Café Berlage" }}
        variant="row"
        selected
        voteCount={1}
        footer={<span>toplam ~90 dk</span>}
      />,
    );
    expect(screen.getByText("1 oy")).toBeInTheDocument();
    // Seçim dairesi (PICK_BASE 26px) artık basılmaz.
    expect(container.innerHTML).not.toContain("w-[1.625rem]");
    // footer kartın kendi kutusunun içindedir, kardeşi değil.
    expect(container.firstElementChild?.textContent).toContain("toplam ~90 dk");
  });

  // Artboard `.pol` (24/10) ve `.card` (22/12) AYNI bileşenin iki yüzeyi — tek prop, çünkü
  // `className` ile eklenirse hangi `rounded-*`/`p-*` kazanacağını Tailwind çıktı sırası belirler.
  it("surface='card' yarıçap + iç boşluğu artboard `.card` değerine çevirir", () => {
    const { container } = render(
      <VenueCard venue={{ id: "v1", name: "Café Berlage" }} surface="card" />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("rounded-card");
    expect(card.className).not.toContain("rounded-3xl");
  });
});
