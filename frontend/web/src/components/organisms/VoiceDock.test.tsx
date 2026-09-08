import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({
  api: { voiceStart: vi.fn(), voiceEnd: vi.fn(), voiceCredentials: vi.fn(), getSession: vi.fn(), preview: vi.fn() },
}));
vi.mock("../../store/liveChannel", () => ({
  liveChannel: { subscribe: vi.fn(() => vi.fn()), publish: vi.fn(), open: vi.fn() },
  voiceInbox: (slug: string, participantId: string) => `/topic/session/${slug}/voice/${participantId}`,
  voiceSignal: (slug: string) => `/app/sessions/${slug}/voice/signal`,
  sessionTopic: (slug: string) => `/topic/session/${slug}`,
}));

import { api } from "../../lib/api";
import { useSessionStore } from "../../store/sessionStore";
import { useVoiceStore } from "../../store/voiceStore";
import VoiceDock from "./VoiceDock";

const person = (id: string, name: string, inVoice: boolean, host = false) =>
  ({ id, displayName: name, host, hasLocation: true, deckDone: false, manual: false, inVoice });

const base = {
  slug: "x", name: "Cuma", activityTypes: ["COFFEE"], sessionType: "GROUP", status: "COLLECTING",
  expiresAt: "", venues: [], runoffVenueIds: [], voteTally: {},
  participants: [person("h", "Mehmet", true, true), person("a", "Ayşe", true), person("b", "Kerem", false)],
};
const inTenMinutes = () => new Date(Date.now() + 10 * 60_000).toISOString();

// Sıfırlanmadan önceki gerçek uygulama — testler arasında spy'lar sızmasın diye her dock()
// çağrısı bu 5 aksiyonu TAZE bir vi.fn() ile sarar (varsayılan: gerçek davranışı çağırır).
const realActions = {
  join: useVoiceStore.getState().join,
  leave: useVoiceStore.getState().leave,
  toggleMute: useVoiceStore.getState().toggleMute,
  start: useVoiceStore.getState().start,
  end: useVoiceStore.getState().end,
};

function dock(
  view: object,
  voice: Partial<ReturnType<typeof useVoiceStore.getState>> = {},
  /** Varsayılan: alt aksiyon şeridi OLMAYAN sayfaların yerleşimi — her genişlikte basılır. */
  placement: "header" | "header-lg" | "strip" = "header",
) {
  useSessionStore.setState({ slug: "x", view: view as never, error: null });
  useVoiceStore.setState({
    phase: "idle", muted: false, peers: {}, selfSpeaking: false, endedReason: null, micDenied: false, connectFailed: false,
    limitMinutes: null,
    join: vi.fn(realActions.join),
    leave: vi.fn(realActions.leave),
    toggleMute: vi.fn(realActions.toggleMute),
    start: vi.fn(realActions.start),
    end: vi.fn(realActions.end),
    ...voice,
  });
  return render(<VoiceDock view={view as never} placement={placement} />);
}

describe("VoiceDock", () => {
  beforeEach(() => vi.clearAllMocks());

  it("kapalı + üye + sebep yok → hiçbir şey", () => {
    const { container } = dock({ ...base, voice: null, viewer: { participantId: "a", host: false } });
    expect(container).toBeEmptyDOMElement();
  });

  it("kapalı + host → başlat; tıklayınca sunucuya gider", async () => {
    vi.mocked(api.voiceStart).mockResolvedValue({ endsAt: inTenMinutes() } as never);
    vi.mocked(api.getSession).mockResolvedValue({ ...base, voice: { endsAt: inTenMinutes() } } as never);
    dock({ ...base, voice: null, viewer: { participantId: "h", host: true } });
    fireEvent.click(screen.getByRole("button", { name: /Sesli sohbeti başlat/ }));
    await screen.findByRole("button", { name: /Sesli sohbeti başlat/ });
    expect(api.voiceStart).toHaveBeenCalledWith("x");
  });

  it("api.voiceStart reddedilirse hata alanı görünür", async () => {
    vi.mocked(api.voiceStart).mockRejectedValue(new Error("boom"));
    dock({ ...base, voice: null, viewer: { participantId: "h", host: true } });
    fireEvent.click(screen.getByRole("button", { name: /Sesli sohbeti başlat/ }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Sesli sohbet başlatılamadı");
  });

  it("sunucu 'only for group' derse SOLO'ya özel çeviri gösterilir", async () => {
    const err = new AxiosError("x", "409", undefined, undefined, {
      status: 409, data: { error: "voice chat is only for group sessions" }, statusText: "",
      headers: {}, config: { headers: new AxiosHeaders() },
    } as never);
    vi.mocked(api.voiceStart).mockRejectedValue(err);
    dock({ ...base, voice: null, viewer: { participantId: "h", host: true } });
    fireEvent.click(screen.getByRole("button", { name: /Sesli sohbeti başlat/ }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Sesli sohbet yalnız grup buluşmalarında.");
  });

  it("açık + dışarıda → kişi sayısı, geri sayım ve Katıl", () => {
    const join = vi.fn();
    dock({ ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "b", host: false } }, { join });
    expect(screen.getByText("Sesli sohbet açık")).toBeInTheDocument();
    // Artboard 4559: alt satır "2 kişi · 24 dk kaldı" — TAM dakika, saniye sayacı değil.
    expect(screen.getByText(/2 kişi · (9|10) dk kaldı/)).toBeInTheDocument();
    // Saniyeli tam süre yalnız ekran okuyucu için kalır.
    expect(screen.getByText(/9:5\d kaldı|10:00 kaldı/)).toBeInTheDocument();
    // Artboard 4558: katılmadan ÖNCE de içerdekilerin avatarları görünür.
    expect(screen.getByText("Ayşe · sesli sohbette")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Katıl" }));
    expect(join).toHaveBeenCalled();
    // Davetlide oda eylemi yok: taşma menüsü düğmesi de basılmaz.
    expect(screen.queryByRole("button", { name: "Sesli sohbet seçenekleri" })).not.toBeInTheDocument();
  });

  it("süresi geçmiş endsAt → geri sayım 0'da kalır", () => {
    const past = new Date(Date.now() - 5_000).toISOString();
    dock({ ...base, voice: { endsAt: past }, viewer: { participantId: "b", host: false } });
    expect(screen.getByText(/0:00 kaldı/)).toBeInTheDocument();
  });

  it("host: taşma menüsünden 'Herkes için bitir' api.voiceEnd çağırır ve menü kapanır", async () => {
    vi.mocked(api.voiceEnd).mockResolvedValue(undefined as never);
    vi.mocked(api.getSession).mockResolvedValue({ ...base, voice: null } as never);
    dock({ ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "h", host: true } });
    // Artboard 4557-4560: pill TEK eylem taşır — bitirme, dock'un `.ic` taşma menüsünde.
    expect(screen.queryByRole("menuitem", { name: "Herkes için bitir" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sesli sohbet seçenekleri" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Herkes için bitir" }));
    await waitFor(() => expect(api.voiceEnd).toHaveBeenCalledWith("x"));
    expect(screen.queryByRole("menuitem", { name: "Herkes için bitir" })).not.toBeInTheDocument();
  });

  it("taşma menüsü Esc ile kapanır", () => {
    dock({ ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "h", host: true } });
    fireEvent.click(screen.getByRole("button", { name: "Sesli sohbet seçenekleri" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("içeride → avatarlar durumlarıyla, sustur, ayrıl; host'a bitir", () => {
    const toggleMute = vi.fn();
    const leave = vi.fn();
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "h", host: true } },
      { phase: "in", toggleMute, leave, peers: { a: { state: "connected", speaking: true } }, selfSpeaking: false },
    );
    expect(screen.getByText("Ayşe · konuşuyor")).toBeInTheDocument();
    expect(screen.getByText("Mehmet · sesli sohbette")).toBeInTheDocument();
    // Artboard 4578: başlık "Sesli sohbette", alt satır konuşanı söyler.
    expect(screen.getByText("Sesli sohbette")).toBeInTheDocument();
    expect(screen.getByText("Ayşe konuşuyor")).toBeInTheDocument();
    // Ayrılma düğmesi ikon-only (4579-4580): görünür metin YOK, ad aria-label'den gelir.
    expect(screen.getByRole("button", { name: "Ayrıl" })).toHaveTextContent("");
    fireEvent.click(screen.getByRole("button", { name: "Mikrofonu kapat" }));
    expect(toggleMute).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Ayrıl/ }));
    expect(leave).toHaveBeenCalled();
    // Host içerideyken de bitirme yalnız taşma menüsünde (pill: avatarlar + metin + mic + ayrıl).
    expect(screen.getByRole("button", { name: "Sesli sohbet seçenekleri" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("bağlanamayan peer yazıyla söylenir; sessizken düğme 'Mikrofonu aç'", () => {
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "h", host: true } },
      { phase: "in", muted: true, peers: { a: { state: "failed", speaking: false } } },
    );
    expect(screen.getByText("Ayşe · sesi gelmiyor")).toBeInTheDocument();
    // Artboard 4590: mikrofon kapalıyken alt satır bunu söyler.
    expect(screen.getByText("Mikrofonun kapalı")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mikrofonu aç" })).toHaveAttribute("aria-pressed", "true");
  });

  it("süre doldu → sebep ve host'a Yeniden başlat; üye sebebi görür, düğme yok", () => {
    dock({ ...base, voice: null, viewer: { participantId: "h", host: true } }, { endedReason: "TIME_LIMIT" });
    expect(screen.getByText("Süre doldu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Yeniden başlat/ })).toBeInTheDocument();
  });

  it("üye: bitiş sebebi görünür, hiçbir düğme yok", () => {
    dock({ ...base, voice: null, viewer: { participantId: "b", host: false } }, { endedReason: "EMPTY" });
    expect(screen.getByText("Herkes ayrıldı, sesli sohbet kapandı")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("bitiş sebebi taze endsAt'i ezer: Katıl değil kapanış çubuğu", () => {
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "h", host: true } },
      { endedReason: "HOST" },
    );
    expect(screen.getByText("Sesli sohbet bitirildi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Katıl" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sesli sohbeti başlat|Yeniden başlat/ })).toBeInTheDocument();
  });

  it("kimlik alınamadı (ağ) → bağlanılamadı ve Tekrar dene", () => {
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "b", host: false } },
      { phase: "error", connectFailed: true },
    );
    expect(screen.getByRole("alert")).toHaveTextContent("bağlanılamadı");
    expect(screen.getByRole("button", { name: "Tekrar dene" })).toBeInTheDocument();
    /* Artboard 4597-4601 `.dock.err` durumu açık pembe PILL zeminiyle anlatıyordu; kısa
       denetimde pill yok — durum uyarı ikonlu "Tekrar dene" düğmesi, `role="alert"` duyurusu
       ve ipucuyla anlatılır (2026-09-08). */
    expect(screen.getByText("Bağlanılamadı")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Bağlanılamadı");
    expect(screen.getByRole("button", { name: /Tekrar dene/ })).toBeInTheDocument();
  });

  it("mikrofon reddi → açıklama ve Tekrar dene", () => {
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "b", host: false } },
      { phase: "error", micDenied: true },
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Mikrofon izni gerekli");
    expect(screen.getByRole("button", { name: "Tekrar dene" })).toBeInTheDocument();
  });

  it("mount'ta oda açıkken (faz idle) odağı çalmaz", () => {
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "b", host: false } },
      { phase: "idle" },
    );
    expect(document.activeElement).toBe(document.body);
  });

  it("faz 'in'e geçince odak susturma düğmesine gider", () => {
    dock({ ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "h", host: true } });
    expect(document.activeElement).toBe(document.body);
    act(() => {
      useVoiceStore.setState({ phase: "in" });
    });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Mikrofonu kapat" }));
  });

  it("süre dolunca uzunluk biliniyorsa ipucu basılır, bilinmiyorsa satır çizilmez", () => {
    const view = { ...base, voice: null, viewer: { participantId: "a", host: false } };
    const { unmount } = dock(view, { endedReason: "TIME_LIMIT", limitMinutes: 30 });
    expect(screen.getByText("Süre doldu")).toBeInTheDocument();
    expect(screen.getByText("30 dk sesli sohbet bitti")).toBeInTheDocument();
    unmount();
    dock(view, { endedReason: "TIME_LIMIT", limitMinutes: null });
    expect(screen.queryByText(/sesli sohbet bitti/)).not.toBeInTheDocument();
  });

  it("durum 1 (kapalı · host): tek kısa düğme; davet cümlesi YAZILMAZ, sr-only'de durur", () => {
    dock({ ...base, voice: null, viewer: { participantId: "h", host: true } });
    /* Artboard 4549-4552 bunu flame-wash zeminli bir pill + iki satır metin olarak çiziyor.
       Kısa denetimde pill ve alt satır yok (kullanıcı kararı 2026-09-08): düğmenin KENDİSİ
       "Sesli sohbet" yazar, davet cümlesi ipucu + `sr-only` olarak kalır. */
    const region = screen.getByRole("region", { name: "Sesli sohbet" });
    expect(region.className).not.toContain("bg-flame-wash");
    expect(screen.getByText("Herkes gelmeden konuşmaya başla")).toBeInTheDocument();
    expect(region.getAttribute("title")).toContain("Herkes gelmeden konuşmaya başla");
    // Düğme metni kısa, erişilebilir ad uzun kalır.
    expect(screen.getByRole("button", { name: "Sesli sohbeti başlat" })).toHaveTextContent("Sesli sohbet");
  });

  it("durum 3 (bağlanıyor): ALT SATIRDA yazar, düğme 'Katıl' olarak kilitlenir", () => {
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "b", host: false } },
      { phase: "joining" },
    );
    // Artboard 4567-4568: "Bağlanıyor…" düğmenin değil alt satırın metnidir.
    expect(screen.getByText("Bağlanıyor…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Katıl" })).toBeDisabled();
  });

  /* Yerleşim sözleşmesi (kullanıcı kararı 2026-09-08): denetim sayfanın aksiyonlarıyla AYNI
     yerde durur. Alt şeridi OLAN sayfada başlık kopyası yalnız ≥1024'te (`header-lg`), şerit
     kopyası yalnız altında (`strip`) basılır — ikisi asla birlikte DOM'a girmez. Yüzen pill ve
     onun akışta ayırdığı yedek bant tümüyle kalktı. */
  it("alt şeridi olan sayfada `header-lg` 1024 ALTINDA basılmaz, `strip` basılır", () => {
    const view = { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "a", host: false } };
    expect(dock(view, {}, "header-lg").container).toBeEmptyDOMElement();
    dock(view, {}, "strip");
    expect(screen.getByRole("button", { name: /Katıl/ })).toBeInTheDocument();
  });

  it("alt şeridi OLMAYAN sayfada `header` her genişlikte basılır", () => {
    dock({ ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "a", host: false } });
    expect(screen.getByRole("button", { name: /Katıl/ })).toBeInTheDocument();
  });

  it("kısa denetim alt satır METNİNİ yazmaz; durum ipucunda ve ekran okuyucuda durur", () => {
    dock({ ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "a", host: false } });
    const region = screen.getByRole("region", { name: "Sesli sohbet" });
    // Yüzen pill'in ne zemini ne de sabit konumu kaldı.
    expect(region.className).not.toContain("sticky");
    expect(region.className).not.toContain("lg:fixed");
    // Bilgi kaybolmadı: tek cümle ipucunda, parçaları ekran okuyucuda ayrı düğümlerde.
    expect(region.getAttribute("title")).toContain("Sesli sohbet açık");
  });

  it("HOST bitirdiğinde limitMinutes dolu olsa bile süre ipucu basılmaz (yalnız TIME_LIMIT basar)", () => {
    dock(
      { ...base, voice: null, viewer: { participantId: "b", host: false } },
      { endedReason: "HOST", limitMinutes: 30 },
    );
    expect(screen.getByText("Sesli sohbet bitirildi")).toBeInTheDocument();
    expect(screen.queryByText(/sesli sohbet bitti/)).not.toBeInTheDocument();
  });
});
