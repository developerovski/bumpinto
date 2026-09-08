/* Ekran testleri `app/` altına KONULMAZ (K-M9). TEST BAŞINA TEK `render`. */

import { render, screen, waitFor } from "@testing-library/react-native";

import SessionRoute from "../../app/s/[slug]";
import { api } from "../lib/api";
import { useSessionStore } from "../store/sessionStore";

/* `jest.mock` çağrıları babel tarafından import'ların ÜSTÜNE taşınır; kaynakta import'lardan
   sonra durmaları davranışı değiştirmez ve `import/first` kuralını korur. */
jest.mock("../lib/api", () => ({
  api: {
    getSession: jest.fn(),
    findVenues: jest.fn(),
    shuffle: jest.fn(),
    /* Atıf `/api/config`ten gelir; uç ulaşılamazsa Mekanlar ekranı yine ÇİZİLİR (yalnız
       sağlayıcı satırı düşer) — ikiz o yolu taklit eder. */
    getConfig: jest.fn(() => Promise.reject(new Error("no config"))),
  },
  webBase: "https://bumpinto.app",
  hasParticipantToken: jest.fn(() => true),
  rememberParticipantToken: jest.fn(),
}));

const base = {
  slug: "x7k2m",
  name: "Cuma kahvesi",
  sessionType: "GROUP" as const,
  participants: [],
  venues: [],
  viewer: { host: true },
};

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ view: null, error: null, loading: false });
});

/** Yönlendiricinin her durum için DOĞRU ekrana düştüğünü, o ekranın kendine ait bir metniyle
    doğrular: ekran adına değil KULLANICININ GÖRDÜĞÜ şeye bakılır. */
async function routeTo(status: string) {
  (api.getSession as jest.Mock).mockResolvedValue({ ...base, status });
  await render(<SessionRoute />);
}

test("COLLECTING host'u Lobi'ye düşürür", async () => {
  await routeTo("COLLECTING");
  await waitFor(() => expect(screen.getByText("Mekanları bul")).toBeTruthy());
});

test("BROWSING Mekanlar ekranına düşer", async () => {
  await routeTo("BROWSING");
  await waitFor(() => expect(screen.getByText("Karıştır ve kaydır")).toBeTruthy());
});

test("EXPIRED hata ekranına düşer", async () => {
  await routeTo("EXPIRED");
  await waitFor(() => expect(screen.getByText("Hmm.")).toBeTruthy());
});

/* Aynı durum, farklı görüntüleyen: davetli lobiyi DEĞİL bekleme ekranını görür. Host kapısı
   `viewer.host`tan gelir — ad eşlemesi yapılmaz. */
test("COLLECTING davetliyi Bekle ekranına düşürür", async () => {
  (api.getSession as jest.Mock).mockResolvedValue({
    ...base,
    status: "COLLECTING",
    viewer: { host: false, participantId: "p2" },
    participants: [{ id: "p2", displayName: "Ayşe", hasLocation: true, locationLabel: "Someren" }],
  });
  await render(<SessionRoute />);
  await waitFor(() => expect(screen.getByText("Mekanlar geliyor")).toBeTruthy());
  expect(screen.queryByText("Mekanları bul")).toBeNull();
});

/* SOLO oturumda davet linki HİÇ çalışmaz; host lobiyi değil nokta editörünü görmeli. */
test("SOLO oturum Bireysel kuruluma düşer, davet linki çizilmez", async () => {
  (api.getSession as jest.Mock).mockResolvedValue({
    ...base,
    status: "COLLECTING",
    sessionType: "SOLO",
  });
  await render(<SessionRoute />);
  await waitFor(() => expect(screen.getByText("Konumlar")).toBeTruthy());
  expect(screen.queryByText("Davet linki")).toBeNull();
});

test("görünüm gelmeden iskelet çizilir, hata ekranı DEĞİL", async () => {
  (api.getSession as jest.Mock).mockReturnValue(new Promise(() => {}));
  await render(<SessionRoute />);
  expect(screen.queryByText("Hmm.")).toBeNull();
  expect(screen.queryByText("Mekanları bul")).toBeNull();
});

test("oturum bulunamazsa hata ekranı çıkar", async () => {
  (api.getSession as jest.Mock).mockRejectedValue(new Error("404"));
  await render(<SessionRoute />);
  await waitFor(() => expect(screen.getByText("Hmm.")).toBeTruthy());
});
