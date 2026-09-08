import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { createSession: vi.fn(), addPoint: vi.fn(), findVenues: vi.fn() } }));
vi.mock("../lib/geocode", () => ({ geocode: vi.fn(), reverseGeocode: vi.fn() }));

import { api } from "../lib/api";
import { geocode, reverseGeocode } from "../lib/geocode";
import { useAuthStore } from "../store/authStore";
import { resetConfig, useConfigStore } from "../store/configStore";
import { useNewSessionStore } from "../store/newSessionStore";
import NewSessionPage from "./NewSessionPage";

/** CTA artık İKİ yerleşimde birden basılıyor (artboard 888–890 masaüstü satırı + 1044–1047
    yapışkan `.cta`); biri `hidden lg:flex`, diğeri `lg:hidden`. jsdom CSS uygulamadığından
    ikisi de DOM'da — sorgular ikisini de görür ve durum iddiaları HER İKİSİ için doğrulanır. */
const ctas = (name: string) => screen.getAllByRole("button", { name });

/** jsdom Geolocation uygulamıyor; `useOwnLocation` mount'ta `"geolocation" in navigator`
    diye bakıyor. Bu güdük olmadan otomatik konum HİÇ alınmaz — hatanın yaşandığı hâl
    (izin verilmiş, konum gelmiş) test edilemez. */
function stubGeolocation(latitude: number, longitude: number) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude, longitude } } as GeolocationPosition) },
  });
  return () => {
    delete (navigator as { geolocation?: unknown }).geolocation;
  };
}


describe("NewSessionPage", () => {
  it("Grup varsayılan; Bireysel'e geçince Konumlar ve kapalı 'Mekanları bul'", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    expect(ctas("Buluşmayı kur")).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    expect(screen.getByText("Konumlar")).toBeInTheDocument();
    ctas("Mekanları bul").forEach((b) => expect(b).toBeDisabled());
  });

  it("Bireysel'de 390'da harita hiç mount edilmez (§4.7)", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
  });

  it("Bireysel'de gerçek lg genişlikte (matchMedia eşleşirse) harita mount olur (§4.7)", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
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
    // MapView artik motoru config'ten okuyor — bu testte "api" mock'u getConfig tanimiyor,
    // config seed edilmezse load() cokuyordu. Motor secimi burada onemsiz.
    useConfigStore.setState({ config: { mapEngine: "google", tiles: { styleUrl: "https://x" }, sources: [] } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    expect(await screen.findByTestId("mapview")).toBeInTheDocument();
    window.matchMedia = original;
    resetConfig();
  });

  it("varsayılan orta nokta modu — çapa alanı görünmez", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    expect(screen.queryByLabelText("Buluşma yeri")).not.toBeInTheDocument();
  });

  it("'belli bir yerde' seçilince çapa alanı çıkar", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    expect(screen.getByLabelText("Buluşma yeri")).toBeInTheDocument();
  });

  // Kapı SOLO düğmesinde: çapasız Bireysel'de iki nokta ŞART (1. test), çapalıda değil.
  it("çapa modunda host konumu olmadan da kurulabilir — düğme kilitli değil", () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    ctas("Mekanları bul").forEach((b) => expect(b).toBeEnabled());
    // Düğmeyle notun kapısı AYNI: açık düğmenin altında "En az 2 konum gerekir." yazamaz.
    expect(screen.queryByText("En az 2 konum gerekir.")).not.toBeInTheDocument();
  });

  // Klavye yolu çapayı GERÇEKTEN kuruyor mu: not, store'daki çapanın etiketini basar —
  // `setAnchor` düşerse metin "Mekanlar bu noktanın 2 km çevresinde aranır."ta kalır.
  it("çapa alanına yazılan adres çözülünce not yeri söyler", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(geocode).mockResolvedValue({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    const field = screen.getByLabelText("Buluşma yeri");
    fireEvent.change(field, { target: { value: "Amsterdam" } });
    fireEvent.blur(field);
    expect(await screen.findByText("Amsterdam çevresinde aranacak")).toBeInTheDocument();
    // Artboard 3860: yarıçap sözü onayla birlikte KALIR — onay ipucunun yerine geçseydi
    // "2 km" tam gerektiği anda ekrandan silinirdi.
    expect(screen.getByText("Mekanlar bu noktanın 2 km çevresinde aranır.")).toBeInTheDocument();
  });

  // create()'in gevşetilmiş konum kapısı: host konum vermeden kurabilmeli ve istek çapayı taşımalı.
  it("çapalı oturum host konumu olmadan kurulur — istek çapayı taşır", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(geocode).mockResolvedValue({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });
    vi.mocked(api.createSession).mockResolvedValue({ slug: "x7k2m" } as never);
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    const field = screen.getByLabelText("Buluşma yeri");
    fireEvent.change(field, { target: { value: "Amsterdam" } });
    fireEvent.blur(field);
    await screen.findByText("Amsterdam çevresinde aranacak");
    fireEvent.click(ctas("Buluşmayı kur")[0]);
    await waitFor(() =>
      expect(api.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ anchor: { lat: 52.3676, lng: 4.9041, label: "Amsterdam" }, lat: undefined }),
      ),
    );
  });

  /** POZITIF KONTROL: bu test duzeltmeden ONCE de sonra da yesildir. Amaci, create() icine
      eklenen "bekleyen sorguyu coz" adiminin MUTLU YOLU bozmamasi — ayni adres icin ikinci bir
      Nominatim cagrisi yapilmamali ve gonderim yine capayi tasimali.
      (Not: "ilk gonderim kaybolur" senaryosu jsdom'da yeniden URETILEMEDI; blur/submit
      siralamasi tarayiciya ozgu. Kanitlanan yari asagidaki bayat-capa testidir.) */
  it("adres yazıp doğrudan gönderince çapa çözülür ve isteğe girer", async () => {
    // Zustand store testler arasi SIZIYOR: onceki test capayi Amsterdam birakiyor ve
    // sifirlamazsak bu test kendi cozumunu degil o kalintiyi dogrular (sahte yesil).
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(geocode).mockResolvedValue({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });
    vi.mocked(api.createSession).mockResolvedValue({ slug: "x7k2m" } as never);
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    fireEvent.change(screen.getByLabelText("Buluşma yeri"), { target: { value: "Amsterdam" } });
    fireEvent.click(ctas("Buluşmayı kur")[0]);

    await waitFor(() =>
      expect(api.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ anchor: { lat: 52.3676, lng: 4.9041, label: "Amsterdam" } }),
      ),
    );
  });

  /** Artboard 897/1018: orta nokta modunun kendi açıklaması var — segment tek başına
      "adil orta nokta" vaadini söylemiyordu. */
  it("orta nokta modunda adil orta nokta notu basılır", () => {
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    expect(screen.getByText("Herkesin konumundan adil orta nokta")).toBeInTheDocument();
  });

  /** Artboard 3872/3941: çapalı modda host konumu zorunlu DEĞİL (create() de öyle davranıyor),
      bu yüzden not basılır. Ama not, DEĞİŞTİRME yeteneğinin yerine GEÇMEZ — bu testin eski hâli
      "bağlantı kaybolmalı" diyerek hatayı sözleşmeye yazmıştı (2026-09-09). İkinci giriş yolu:
      konum tarayıcıdan değil HESAP VARSAYILANINDAN geliyor; tuzak orada da aynı. */
  it("çapalı modda 'zorunlu değil' notu basılır ama konum yine değiştirilebilir", () => {
    useNewSessionStore.getState().reset();
    useAuthStore.setState({
      status: "signed",
      me: { displayName: "Mehmet", defaultLocation: { lat: 51.44, lng: 5.47, label: "Eindhoven" } },
    });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    expect(screen.getByText("…ya da adres yaz")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    expect(screen.getByText("Yalnız senin yol süreni göstermek için; zorunlu değil.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Değiştir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kaldır" })).toBeInTheDocument();
  });

  /** Artboard 910: host'un ulaşım türü Konumlar kartının "Sen" SATIRINDA (`.f-mp`) — sol
      bölgedeki tam boy ray 390 için kalır, masaüstünde satır içi hâli devralır. */
  it("Bireysel: host'un ulaşım rayı Konumlar satırında da vardır", () => {
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    expect(screen.getByRole("radiogroup", { name: "Sen nasıl geliyor?" })).toBeInTheDocument();
  });

  /** Artboard 3949–3972: 390'da seçici bir ALT SAYFA — scrim arkadaki formu kilitler,
      Esc kapatır. Sayfa inline render ederken form seçicinin ardında düzenlenebilir kalıyordu. */
  it("390: 'Haritadan seç' alt sayfa açar, Esc kapatır", async () => {
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    // MapPicker motoru config'ten okur — seed edilmezse load() çöker (bkz. harita testi).
    useConfigStore.setState({ config: { mapEngine: "google", tiles: { styleUrl: "https://x" }, sources: [] } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Haritadan seç" })[0]);
    // MapPicker tembel chunk: alt sayfanın kendisi eşzamanlı basılsa da tam koşuda
    // Suspense çözümü yavaşlayabiliyor — çözüme pay ver (JoinForm testindeki not).
    const sheet = await screen.findByRole("dialog", { name: "Haritadan seç" }, { timeout: 5000 });
    expect(sheet).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: 5000 });
    resetConfig();
  });

  /** Adres DEGISTIRILIRSE eski capa gonderilmez: kullanici sectiginden baska bir yerde
      bulusma kurulmasi sessiz ve pahali bir hatadir. */
  it("adres değiştirilince eski çapa değil yenisi gönderilir", async () => {
    // Zustand store testler arasi SIZIYOR: onceki test capayi Amsterdam birakiyor ve
    // sifirlamazsak bu test kendi cozumunu degil o kalintiyi dogrular (sahte yesil).
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(geocode)
      .mockResolvedValueOnce({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" })
      .mockResolvedValueOnce({ lat: 51.4416, lng: 5.4697, label: "Eindhoven" });
    vi.mocked(api.createSession).mockResolvedValue({ slug: "x7k2m" } as never);
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    const field = screen.getByLabelText("Buluşma yeri");
    fireEvent.change(field, { target: { value: "Amsterdam" } });
    fireEvent.blur(field);
    await screen.findByText("Amsterdam çevresinde aranacak");

    fireEvent.change(field, { target: { value: "Eindhoven" } });
    fireEvent.click(ctas("Buluşmayı kur")[0]);

    await waitFor(() =>
      expect(api.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ anchor: { lat: 51.4416, lng: 5.4697, label: "Eindhoven" } }),
      ),
    );
  });

  /** REGRESYON (2026-09-09): çapa modunda `hint`, "…ya da adres yaz" bağlantısının YERİNE
      basılıyordu; "Haritadan seç" de yalnız idle/denied dallarında olduğu için otomatik alınan
      konumu değiştirmenin HİÇBİR yolu kalmıyordu. Ankara'da buluşma kuran host lobide
      "'s-Hertogenbosch · ~2695 dk" satırına mahkûm oluyordu. */
  it("çapa modunda otomatik alınan konum kilitlenmez — değiştir ve kaldır vardır", async () => {
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(reverseGeocode).mockResolvedValue("'s-Hertogenbosch");
    const restore = stubGeolocation(51.7288, 5.2927);
    try {
      render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
      expect(await screen.findByText("'s-Hertogenbosch civarı · otomatik alındı")).toBeInTheDocument();
      // Yeşil "Tamam" hapı çapalıda basılmaz: konum merkezi de deste sırasını da belirlemiyor.
      expect(screen.queryByText("Tamam")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Değiştir" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Kaldır" })).toBeInTheDocument();
      // "zorunlu değil" cümlesi bağlantının YERİNE geçmez, yanında durur.
      expect(screen.getByText("Yalnız senin yol süreni göstermek için; zorunlu değil.")).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("çapa modunda 'Değiştir' adres alanını ve haritadan seçmeyi geri getirir", async () => {
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(reverseGeocode).mockResolvedValue("'s-Hertogenbosch");
    const restore = stubGeolocation(51.7288, 5.2927);
    try {
      render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
      fireEvent.click(await screen.findByRole("button", { name: "Değiştir" }));
      expect(screen.getByLabelText("Şehir ya da adres")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Haritadan seç/ }).length).toBeGreaterThan(0);
    } finally {
      restore();
    }
  });

  it("çapa modunda 'Kaldır' sonrası istek konum taşımaz", async () => {
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(reverseGeocode).mockResolvedValue("'s-Hertogenbosch");
    vi.mocked(geocode).mockResolvedValue({ lat: 39.9208, lng: 32.8541, label: "Ankara" });
    vi.mocked(api.createSession).mockResolvedValue({ slug: "x7k2m" } as never);
    const restore = stubGeolocation(51.7288, 5.2927);
    try {
      render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
      const field = screen.getByLabelText("Buluşma yeri");
      fireEvent.change(field, { target: { value: "Ankara" } });
      fireEvent.blur(field);
      await screen.findByText("Ankara çevresinde aranacak");
      fireEvent.click(await screen.findByRole("button", { name: "Kaldır" }));
      expect(screen.getByText("Konum eklemedin")).toBeInTheDocument();
      fireEvent.click(ctas("Buluşmayı kur")[0]);
      await waitFor(() =>
        expect(api.createSession).toHaveBeenCalledWith(
          expect.objectContaining({ lat: undefined, lng: undefined, locationLabel: undefined }),
        ),
      );
    } finally {
      restore();
    }
  });

  /** Orta nokta modunda konum ZORUNLU: sessiz satır oraya sızarsa alan zorunluluğunu gizler. */
  it("orta nokta modunda yeşil konum hapı ve 'başka adres' bağlantısı korunur", async () => {
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    vi.mocked(reverseGeocode).mockResolvedValue("'s-Hertogenbosch");
    const restore = stubGeolocation(51.7288, 5.2927);
    try {
      render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
      expect(await screen.findByText("Tamam")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "…ya da adres yaz" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Kaldır" })).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  /** GRUP'ta sol bölge uzun, sağdaki davet önizlemesi kısa: kaydırırken önizleme üst çubuğun
      altında durup ekranda kalmalı. SOLO'da oran ters (sağda harita + nokta düzenleyici) —
      orada yapıştırmak bölgenin altını erişilemez kılardı, bu yüzden kapalı. */
  it("GRUP'ta sağ bölge lg'de yapışkan, SOLO'da değil", () => {
    useNewSessionStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);
    const right = () => screen.getByTestId("zone-right").className;
    expect(right()).toContain("lg:sticky");
    // Yapışma ofseti üst çubuk (64px) + sayfa üst dolgusu (34px): kart sıçramadan durur.
    expect(right()).toContain("lg:top-[6.125rem]");
    // Ekrana sığmayan sağ bölge (dar pencerede harita seçici) erişilemez kalmasın.
    expect(right()).toContain("lg:overflow-y-auto");

    fireEvent.click(screen.getAllByRole("radio", { name: "Bireysel" })[0]);
    expect(right()).not.toContain("lg:sticky");
  });
});
