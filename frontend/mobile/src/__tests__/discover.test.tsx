/* Ekran testleri `app/` altına KONULMAZ (K-M9). TEST BAŞINA TEK `render`. */

import { render, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";

import DiscoverScreen from "../screens/DiscoverScreen";
import { api } from "../lib/api";
import { useDiscoverStore } from "../store/discoverStore";
import { useLocationStore } from "../store/locationStore";
import { useMeStore } from "../store/meStore";
import { tap } from "../testUtils/interact";

jest.mock("../lib/api", () => ({ api: { discover: jest.fn(), me: jest.fn() } }));
/* Saat taklidi YOK (RNTL'nin zamanlayıcılarını bozuyor): ekranın "şimdi"si tek kancadan gelir. */
jest.mock("../lib/useNow", () => ({ useNow: () => new Date("2026-09-09T10:00:00Z") }));

const later = {
  slug: "later", name: "Akşam kahvesi", activityTypes: ["COFFEE"], meetAt: "2026-09-09T16:00:00Z",
  capacity: 4, approvedSeats: 3, confirmed: true, joinPolicy: "APPROVAL", hostDisplayName: "Jonas",
  locality: "Merkez",
};
const live = {
  slug: "live", name: "Öğleden sonra kahve", activityTypes: ["COFFEE"], meetAt: "2026-09-09T09:40:00Z",
  openUntil: "2026-09-09T11:20:00Z", capacity: 4, approvedSeats: 2, confirmed: false, joinPolicy: "OPEN",
  hostDisplayName: "Ayşe", locality: "Stratum", minutes: 20, travelMode: "BIKE",
};

const discover = api.discover as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useDiscoverStore.getState().reset();
  useLocationStore.setState({ phase: "idle", point: null });
  useMeStore.setState({ me: { displayName: "M", interests: ["COFFEE"] }, error: null });
});

const cards = () => screen.getAllByRole("link");

test("süren plan üstte: kalan süre + amber damga; kesin plan sarı damga; Buradayım kısayolu", async () => {
  discover.mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later, live] });
  await render(<DiscoverScreen />);
  await waitFor(() => expect(cards()).toHaveLength(2));
  expect(cards().map((c) => c.props.accessibilityLabel)).toEqual(["Öğleden sonra kahve", "Akşam kahvesi"]);
  expect(within(cards()[0]).getByText("~1 sa 20 dk daha")).toBeTruthy();
  expect(within(cards()[0]).getByText("2/4 · şimdi")).toBeTruthy();
  expect(within(cards()[0]).getByText("sana ~20 dk")).toBeTruthy();
  expect(within(cards()[1]).getByText("3/4 · kesin")).toBeTruthy();
  expect(within(cards()[1]).getByText("1 yer")).toBeTruthy();

  await tap("Buradayım");
  expect(router.push).toHaveBeenCalledWith({ pathname: "/sessions/new", params: { now: "1" } });
});

test("kart plan detayına (/j/) gider", async () => {
  discover.mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later] });
  await render(<DiscoverScreen />);
  await waitFor(() => expect(cards()).toHaveLength(1));
  await tap("Akşam kahvesi");
  expect(router.push).toHaveBeenCalledWith("/j/later");
});

/* Spec §11.2: "Şimdi" bir süzgeçtir — depoda kalmış olsa bile Keşfet her açılışta "Bu hafta"dır. */
test("her açılış 'Bu hafta'; Şimdi boşken P1c; 'Bu haftanın planlarına bak' süzgeci geri alır", async () => {
  useDiscoverStore.setState({ range: "now" });
  discover.mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later] });
  await render(<DiscoverScreen />);
  await waitFor(() => expect(screen.getByText("Akşam kahvesi")).toBeTruthy());

  await tap("Şimdi");
  expect(screen.getByText("Şu an süren plan yok.")).toBeTruthy();
  expect(screen.queryByText("Akşam kahvesi")).toBeNull();
  expect(screen.getByLabelText("Buradayım")).toBeTruthy();

  await tap("Bu haftanın planlarına bak");
  expect(screen.getByText("Akşam kahvesi")).toBeTruthy();
});

test("tek türde boş hafta: o türün planını aç; 'Diğer türlere bak' tüm türlerle sorar", async () => {
  discover.mockResolvedValue({ filter: ["SWIM"], plans: [] });
  await render(<DiscoverScreen />);
  await waitFor(() => expect(screen.getByText("Bu hafta yüzme planı yok.")).toBeTruthy());

  await tap("Yüzme planı aç");
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/sessions/new",
    params: { open: "1", activity: "SWIM" },
  });

  await tap("Diğer türlere bak");
  await waitFor(() => expect(discover).toHaveBeenCalledTimes(2));
  expect(discover.mock.calls[1][0].activity).toHaveLength(15);
});

test("tür çipleri: seçili tür işaretli", async () => {
  discover.mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later] });
  await render(<DiscoverScreen />);
  await waitFor(() => expect(screen.getByText("Akşam kahvesi")).toBeTruthy());
  expect(screen.getByLabelText("Kahve").props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByLabelText("Yüzme").props.accessibilityState).toMatchObject({ selected: false });
});

/* Sunucu yeni bir tür eklediğinde (web'de ilgi alanı seçilmiş) eski uygulama sürümü çökmesin. */
test("sunucunun bilinmeyen türü ekranı çökertmez, çip olarak çizilmez", async () => {
  discover.mockResolvedValueOnce({ filter: ["COFFEE", "KITESURF"], plans: [later] });
  await render(<DiscoverScreen />);
  await waitFor(() => expect(screen.getByText("Akşam kahvesi")).toBeTruthy());
  expect(screen.getByLabelText("Kahve")).toBeTruthy();
  expect(screen.queryByLabelText("activity.KITESURF")).toBeNull();
});

/* Dakika konumu: açılışta YENİ izin istenmez. İzin zaten verilmişse o anki nokta, yoksa profil
   varsayılanı — ikisi de ~1 km'ye yuvarlanır (kart kesin konumdan hesaplanmaz). */
test("izin verilmiş konum yuvarlanıp gönderilir", async () => {
  useLocationStore.setState({ phase: "granted", point: { lat: 51.44163, lng: 5.46972, label: "Ev" } });
  useMeStore.setState({ me: { displayName: "M", defaultTravelMode: "WALK" } });
  discover.mockResolvedValueOnce({ filter: ["COFFEE"], plans: [] });
  await render(<DiscoverScreen />);
  await waitFor(() => expect(discover).toHaveBeenCalledTimes(1));
  expect(discover.mock.calls[0][0]).toEqual({ lat: 51.44, lng: 5.47, travelMode: "WALK" });
});

test("izin yoksa profil varsayılanı yuvarlanır; kart semt dışında yer ve dakikasız satır basmaz", async () => {
  useMeStore.setState({
    me: {
      displayName: "M",
      defaultTravelMode: "BIKE",
      defaultLocation: { lat: 51.4371, lng: 5.4789, label: "Kleine Berg 12" },
    },
  });
  discover.mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later] });
  await render(<DiscoverScreen />);
  await waitFor(() => expect(cards()).toHaveLength(1));
  expect(discover.mock.calls[0][0]).toEqual({ lat: 51.44, lng: 5.48, travelMode: "BIKE" });
  expect(within(cards()[0]).getByText("Merkez")).toBeTruthy();
  expect(screen.queryByText(/Kleine Berg/)).toBeNull();
  expect(screen.queryByText(/sana ~/)).toBeNull();
});

test("profil yüklenmemişse önce yüklenir; konum hiç yoksa konumsuz sorar", async () => {
  useMeStore.setState({ me: null });
  (api.me as jest.Mock).mockResolvedValueOnce({ displayName: "M" });
  discover.mockResolvedValueOnce({ filter: ["COFFEE"], plans: [] });
  await render(<DiscoverScreen />);
  await waitFor(() => expect(discover).toHaveBeenCalledTimes(1));
  expect(api.me).toHaveBeenCalledTimes(1);
  expect(discover.mock.calls[0][0]).toEqual({});
});
