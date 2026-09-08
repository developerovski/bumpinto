import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../store/authStore";
import { resetConfig, useConfigStore } from "../store/configStore";
import { useSessionStore } from "../store/sessionStore";
import JoinForm from "./JoinForm";

// `getConfig()` gerçek ağa gitmesin — MapView/MapPicker aynı configStore'u paylaşıyor; gerçek
// fetch'in GEÇ hatası (AggregateError) sonraki testin seed ettiği config'i sessizce eziyordu
// (MapPicker artık motoru config'ten okuyor, spec §7) ve MapLibre'yi mocksuz çökertiyordu.
vi.mock("../lib/api", () => ({ api: { getConfig: vi.fn(() => new Promise(() => {})) } }));

/** Katıl formunun ulaşım türü alanı: profil varsayılanından ön-dolar, yoksa CAR'a düşer,
    kullanıcı değiştirirse gönderilen `travelMode` değişir. Konum/geocode akışına GİRMEZ —
    `JoinRequest.lat/lng` opsiyonel, boş adresle gönderim engellenmez (JoinForm.tsx submit()). */
describe("JoinForm — travelMode", () => {
  beforeEach(() => {
    useSessionStore.setState({ slug: "x7k2m", preview: null, join: vi.fn().mockResolvedValue(undefined) });
  });

  function submitAs(name: string) {
    fireEvent.change(screen.getByRole("textbox", { name: "Adın" }), { target: { value: name } });
    fireEvent.click(screen.getByRole("button", { name: "Katıl" }));
  }

  it("profilde defaultTravelMode BIKE → form BIKE ile ön-dolu, öyle gönderir", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet", defaultTravelMode: "BIKE" } as never });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    expect(screen.getByRole("radio", { name: "Bisikletle" })).toHaveAttribute("aria-checked", "true");
    submitAs("Ayşe");
    await vi.waitFor(() =>
      expect(useSessionStore.getState().join).toHaveBeenCalledWith(expect.objectContaining({ travelMode: "BIKE" })),
    );
  });

  it("profilde varsayılan yoksa CAR ile gönderir", async () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    expect(screen.getByRole("radio", { name: "Arabayla" })).toHaveAttribute("aria-checked", "true");
    submitAs("Ayşe");
    await vi.waitFor(() =>
      expect(useSessionStore.getState().join).toHaveBeenCalledWith(expect.objectContaining({ travelMode: "CAR" })),
    );
  });

  it("kullanıcı modu değiştirirse gönderilen travelMode değişir", async () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Yürüyerek" }));
    submitAs("Ayşe");
    await vi.waitFor(() =>
      expect(useSessionStore.getState().join).toHaveBeenCalledWith(expect.objectContaining({ travelMode: "WALK" })),
    );
  });
});

describe("JoinForm — host çevrimiçiliği", () => {
  const preview = {
    slug: "x7k2m", name: "Cuma kahvesi", activityTypes: ["COFFEE"], sessionType: "GROUP",
    status: "COLLECTING", hostDisplayName: "Mehmet", participantCount: 1,
    participants: [{ displayName: "Mehmet", host: true, hasLocation: true }],
  };

  it("host çevrimdışıyken not gösterir ama Katıl butonu ÇALIŞIR (kapı değil, bilgi)", () => {
    useAuthStore.setState({ status: "anon", me: null });
    useSessionStore.setState({
      slug: "x7k2m",
      preview: { ...preview, hostOnline: false } as never,
      join: vi.fn().mockResolvedValue(undefined),
    });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    // Buton bos isimde zaten disabled — bu AYRI, ilgisiz bir kural. Bu test SADECE hostOnline'in
    // EK bir kapi eklemedigini olcer, o yuzden ismi doldurup o kurali devreden cikariyoruz.
    fireEvent.change(screen.getByRole("textbox", { name: "Adın" }), { target: { value: "Ayşe" } });

    expect(screen.getByText(/Mehmet şu an oturumda değil/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Katıl" })).toBeEnabled();
  });

  it("host çevrimiçiyken not görünmez", () => {
    useAuthStore.setState({ status: "anon", me: null });
    useSessionStore.setState({
      slug: "x7k2m",
      preview: { ...preview, hostOnline: true } as never,
      join: vi.fn().mockResolvedValue(undefined),
    });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);

    expect(screen.queryByText(/şu an oturumda değil/)).not.toBeInTheDocument();
  });
});

/** Artboard Katıl (1280 ve 390) konum bloğunu "Başka bir şehir ya da adres yaz" bağlantısında
    BİTİRİR — katılım ekranında harita seçici yok. Kural aynı zamanda maliyet kuralıdır:
    faturalanan birim `new google.maps.Map()` ÖRNEĞİdir, sayfa yüklemesi değil. */
describe("JoinForm — harita seçici yok", () => {
  // MapPicker motoru config'ten okuyor (spec §7) — seed edilmezse gerçek fetch'e düşerdi.
  beforeEach(() => {
    useConfigStore.setState({ config: { mapEngine: "google", tiles: { styleUrl: "https://x" }, sources: [] } });
  });
  afterEach(() => resetConfig());

  it("katılım ekranı hiçbir durumda harita seçici sunmaz", async () => {
    useAuthStore.setState({ status: "anon", me: null });
    useSessionStore.setState({ slug: "x7k2m", preview: null, join: vi.fn().mockResolvedValue(undefined) });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    // Sağdaki MapView de tembel; onun DOM'a düşmesini beklemek tembel chunk'lara fırsat verir.
    await screen.findByTestId("mapview");

    expect(screen.queryByRole("button", { name: "Haritadan seç" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Burayı seç" })).not.toBeInTheDocument();
  });
});

/** Backend 409'u `participants_too_far_apart` KODUYLA isaretliyor; istemci prose eslestirmeden
    dallanabilsin diye. Genel "katilamadin" mesaji burada yalan olurdu: kullanicinin yapabilecegi
    somut bir sey var — host'tan sabit bir bulusma yeri istemek. */
describe("JoinForm — gruptan çok uzak", () => {
  beforeEach(() => {
    useAuthStore.setState({ status: "anon", me: null });
  });

  it("participants_too_far_apart özel mesajı basar", async () => {
    useSessionStore.setState({
      slug: "x7k2m", preview: null,
      join: vi.fn().mockRejectedValue({
        response: { data: { error: "participants_too_far_apart" } },
      }),
    });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    fireEvent.change(screen.getByRole("textbox", { name: "Adın" }), { target: { value: "Ayşe" } });
    fireEvent.click(screen.getByRole("button", { name: "Katıl" }));

    expect(await screen.findByText(
      "Bu buluşma katılımcıların orta noktasında yapılıyor ve sen gruptan çok uzaktasın. Host'tan sabit bir buluşma yeri seçmesini iste.",
    )).toBeInTheDocument();
  });

  /** Baska bir hata GENEL mesaja duser — gerileme korumasi. */
  it("başka bir hata genel mesajı basar", async () => {
    useSessionStore.setState({
      slug: "x7k2m", preview: null,
      join: vi.fn().mockRejectedValue(new Error("network")),
    });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    fireEvent.change(screen.getByRole("textbox", { name: "Adın" }), { target: { value: "Ayşe" } });
    fireEvent.click(screen.getByRole("button", { name: "Katıl" }));

    expect(await screen.findByText("Katılamadın — bu oturum kapanmış olabilir."))
      .toBeInTheDocument();
  });
});

/** Artboard W4b 1280 (4229–4250): 409 halinde sağdaki kart özet şeridi bırakır, kişi başına
    satıra döner — "kim hazır" sorusu tek tek cevaplanır. */
describe("JoinForm — 409 sonrası sağ kart", () => {
  it("çok uzak hatasından sonra kart kişi satırlarına döner", async () => {
    useAuthStore.setState({ status: "anon", me: null });
    useSessionStore.setState({
      slug: "x7k2m",
      preview: {
        slug: "x7k2m", name: "Cuma kahvesi", activityTypes: ["COFFEE"], sessionType: "GROUP",
        status: "COLLECTING", hostDisplayName: "Mehmet", participantCount: 2, hostOnline: false,
        participants: [
          { displayName: "Mehmet", host: true, hasLocation: true },
          { displayName: "Kerem", host: false, hasLocation: false },
        ],
      } as never,
      join: vi.fn().mockRejectedValue({ response: { data: { error: "participants_too_far_apart" } } }),
    });
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    // Önce özet şerit: "Mehmet hazır." cümlesi.
    expect(screen.getByText(/Mehmet hazır\./)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Adın" }), { target: { value: "Ayşe" } });
    fireEvent.click(screen.getByRole("button", { name: "Katıl" }));

    expect(await screen.findByText("Kuran · çevrimdışı")).toBeInTheDocument();
    expect(screen.getByText("Konum bekleniyor…")).toBeInTheDocument();
    expect(screen.queryByText(/Mehmet hazır\./)).not.toBeInTheDocument();
  });
});
