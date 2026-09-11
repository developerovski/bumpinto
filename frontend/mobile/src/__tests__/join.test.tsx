/* Ekran testleri `app/` altına KONULMAZ (K-M9): expo-router `require.context` regex'i
   `.test.tsx`i de ROTA sayar, `@testing-library/react-native` bundle'a girer ve uygulama
   cihazda açılmaz. TEST BAŞINA TEK `render` — ikincisi sonraki testlerin `screen`'ini bozar. */

import { render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import JoinScreen from "../../app/j/[slug]";
import { api, hasParticipantToken, rememberParticipantToken } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useLocationStore } from "../store/locationStore";
import { tap, typeText } from "../testUtils/interact";

/* `jest.mock` çağrıları babel tarafından import'ların ÜSTÜNE taşınır; kaynakta import'lardan
   sonra durmaları davranışı değiştirmez ve `import/first` kuralını korur. */
jest.mock("../lib/api", () => ({
  api: { preview: jest.fn(), join: jest.fn() },
  rememberParticipantToken: jest.fn(),
  hasParticipantToken: jest.fn(() => false),
}));

const preview = {
  slug: "x7k2m",
  name: "Cuma kahvesi",
  hostDisplayName: "Mehmet",
  participantCount: 2,
  activityTypes: ["COFFEE"] as const,
  status: "COLLECTING" as const,
  hostOnline: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  (hasParticipantToken as jest.Mock).mockReturnValue(false);
  // Davet linkiyle gelen misafir: hesabı yok. Ekran oturum durumu bilinmeden önizleme sormaz
  // (soğuk açılışta "hesabıyla koltuğu var mı" sorusu için bekler) — kökteki `restore` burada yok.
  useAuthStore.setState({ status: "out" });
  // Katılım konumsuz da mümkün ama testler formun DOLU hâlini sınıyor: konum store'dan gelir.
  useLocationStore.setState({
    phase: "granted",
    point: { lat: 51.4, lng: 5.6, label: "Someren" },
  });
});

/** Form CTA'sı ("Katıl") görünene kadar bekler — önizleme yüklenmeden çizilmez. */
const ready = () => waitFor(() => expect(screen.getByRole("button", { name: "Katıl" })).toBeTruthy());

test("host çevrimdışıysa uyarı notu çıkar", async () => {
  (api.preview as jest.Mock).mockResolvedValue({ ...preview, hostOnline: false });
  await render(<JoinScreen />);
  await waitFor(() => expect(screen.getByText(/şu an oturumda değil/)).toBeTruthy());
});

test("host çevrimiçiyken uyarı notu ÇIKMAZ", async () => {
  (api.preview as jest.Mock).mockResolvedValue(preview);
  await render(<JoinScreen />);
  await ready();
  expect(screen.queryByText(/şu an oturumda değil/)).toBeNull();
});

test("100 km hatasında (409) uyarı çıkar, form kaybolmaz", async () => {
  (api.preview as jest.Mock).mockResolvedValue(preview);
  (api.join as jest.Mock).mockRejectedValue({ response: { status: 409 } });
  await render(<JoinScreen />);
  await ready();
  await typeText("Adın", "Ayşe");
  await tap("Katıl");
  await waitFor(() => expect(screen.getByText(/çok uzaktasın/)).toBeTruthy());
  // Çıkmaz sokak YOK: kullanıcı adres değiştirip yeniden dener.
  expect(screen.getByRole("button", { name: "Katıl" })).toBeTruthy();
});

test("başarılı katılımda jeton saklanır ve oturuma geçilir", async () => {
  (api.preview as jest.Mock).mockResolvedValue(preview);
  (api.join as jest.Mock).mockResolvedValue({ participantId: "p2", participantToken: "TOKEN" });
  await render(<JoinScreen />);
  await ready();
  await typeText("Adın", "Ayşe");
  await tap("Katıl");
  await waitFor(() => expect(rememberParticipantToken).toHaveBeenCalledWith("x7k2m", "TOKEN"));
  expect(api.join).toHaveBeenCalledWith("x7k2m", {
    displayName: "Ayşe",
    lat: 51.4,
    lng: 5.6,
    locationLabel: "Someren",
    travelMode: "CAR",
  });
  expect(router.replace).toHaveBeenCalledWith("/s/x7k2m");
});

test("ad boşken CTA kapalı — sunucuya 400'lük istek atılmaz", async () => {
  (api.preview as jest.Mock).mockResolvedValue(preview);
  await render(<JoinScreen />);
  await ready();
  await tap("Katıl");
  expect(api.join).not.toHaveBeenCalled();
});

/* Zaten katılmış kişi formu TEKRAR görmez — link ikinci kez açıldığında doğrudan oturuma. */
test("jetonu olan kişi doğrudan oturuma yönlendirilir", async () => {
  (hasParticipantToken as jest.Mock).mockReturnValue(true);
  (api.preview as jest.Mock).mockResolvedValue(preview);
  await render(<JoinScreen />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/s/x7k2m"));
  expect(api.preview).not.toHaveBeenCalled();
});

test("süresi dolmuş oturumda form değil hata ekranı çıkar", async () => {
  (api.preview as jest.Mock).mockResolvedValue({ ...preview, status: "EXPIRED" });
  await render(<JoinScreen />);
  await waitFor(() => expect(screen.getByText("Hmm.")).toBeTruthy());
  expect(screen.queryByRole("button", { name: "Katıl" })).toBeNull();
});

test("önizleme alınamazsa hata ekranı çıkar (boş forma düşülmez)", async () => {
  (api.preview as jest.Mock).mockRejectedValue(new Error("404"));
  await render(<JoinScreen />);
  await waitFor(() => expect(screen.getByText("Hmm.")).toBeTruthy());
});
