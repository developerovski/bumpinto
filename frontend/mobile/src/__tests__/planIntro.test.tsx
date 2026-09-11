/* Ekran testleri `app/` altına KONULMAZ (K-M9). TEST BAŞINA TEK `render`.
   Plan detayı (P2/P2a) `/j/[slug]`'da yaşar: Keşfet kartı da davet linki de oraya gelir. */

import { act, render, screen, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";

import JoinScreen from "../../app/j/[slug]";
import { api, rememberParticipantToken } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useLocationStore } from "../store/locationStore";
import { useMeStore } from "../store/meStore";
import { useSeatStore } from "../store/seatStore";
import { tap, typeText } from "../testUtils/interact";

jest.mock("../lib/api", () => ({
  api: {
    preview: jest.fn(),
    join: jest.fn(),
    getSession: jest.fn(),
    mySeat: jest.fn(),
    requestSeat: jest.fn(),
    me: jest.fn(),
  },
  rememberParticipantToken: jest.fn(),
  hasParticipantToken: jest.fn(() => false),
}));
jest.mock("../lib/useNow", () => ({ useNow: () => new Date("2026-09-09T10:00:00Z") }));

const params = useLocalSearchParams as jest.Mock;

const participants = [
  { displayName: "Ayşe", host: true, hasLocation: true },
  { displayName: "Tomás", host: false, hasLocation: true },
];
const livePlan = {
  slug: "gp", name: "Öğleden sonra kahve", activityTypes: ["COFFEE"], status: "COLLECTING",
  hostDisplayName: "Ayşe", participantCount: 2, participants,
  openPlan: {
    meetAt: "2026-09-09T09:40:00Z", openUntil: "2026-09-09T11:20:00Z", capacity: 4, approvedSeats: 2,
    confirmed: false, meetPassed: false, inProgress: true, joinPolicy: "OPEN", audience: "PUBLIC",
  },
};
const approvalPlan = {
  ...livePlan,
  name: "Pazar yürüyüşü",
  activityTypes: ["HIKE"],
  openPlan: {
    meetAt: "2026-09-13T08:00:00Z", capacity: 4, approvedSeats: 3, confirmed: true, meetPassed: false,
    inProgress: false, joinPolicy: "APPROVAL", audience: "PUBLIC",
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  params.mockReturnValue({ slug: "gp" });
  useSeatStore.getState().reset();
  useAuthStore.setState({ status: "in", displayName: "Priya" });
  useMeStore.setState({
    me: {
      displayName: "Priya",
      defaultTravelMode: "BIKE",
      interests: ["COFFEE"],
      defaultLocation: { lat: 51.44, lng: 5.47, label: "Ev adresi 12" },
    },
    error: null,
  });
  useLocationStore.setState({ phase: "idle", point: null });
  // Üye olmayan hesaba sunucu 403 döner (401 DEĞİL — çıkış kesicisi tetiklenmez).
  (api.getSession as jest.Mock).mockRejectedValue({ response: { status: 403 } });
});

test("süren OPEN plan (P2a): 'şimdi · kalan' satırı, Katıl + anında koltuk notu, açık plan güven metni; katılım formu AÇILMAZ", async () => {
  (api.preview as jest.Mock).mockResolvedValue(livePlan);
  (api.mySeat as jest.Mock).mockRejectedValue({ response: { status: 404 } });
  await render(<JoinScreen />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Katıl" })).toBeTruthy());
  expect(screen.getByText("şimdi · ~1 sa 20 dk daha")).toBeTruthy();
  expect(screen.getByText("Anında koltuk alırsın, kesin noktayı görürsün.")).toBeTruthy();
  expect(screen.getByText(/Bu plan herkese açık/)).toBeTruthy();
  expect(screen.getByText("ilgi alanına uyuyor: kahve")).toBeTruthy();
  expect(screen.getByText("2 yer boş — biri seninki olabilir")).toBeTruthy();
  // K-B37: açık planda katılım formu yanlış ekrandır (konum ister, sunucu 409 döner).
  expect(screen.queryByLabelText("Adın")).toBeNull();
  expect(api.join).not.toHaveBeenCalled();
});

test("OPEN: Katıl → koltuk anında; jeton `mine`den saklanır, oturuma geçilir; not + profil koordinatı gider, ETİKET gitmez", async () => {
  (api.preview as jest.Mock).mockResolvedValue(livePlan);
  (api.mySeat as jest.Mock)
    .mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ status: "APPROVED", participantToken: "TOK" });
  (api.requestSeat as jest.Mock).mockResolvedValue({ status: "APPROVED" });
  await render(<JoinScreen />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Katıl" })).toBeTruthy());
  await typeText("Kısa bir not (isteğe bağlı)", "Selam");
  await tap("Katıl");
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/s/gp"));
  expect(rememberParticipantToken).toHaveBeenCalledWith("gp", "TOK");
  // Host onaydan önce isteğin yerini görür; kayıtlı etiket ev adresi olabilir — gönderilmez.
  expect(api.requestSeat).toHaveBeenCalledWith("gp", {
    displayName: "Priya",
    note: "Selam",
    travelMode: "BIKE",
    lat: 51.44,
    lng: 5.47,
  });
});

test("APPROVAL: istek → bekleme; 10 sn yoklamada ağ hatası beklemeyi DÜŞÜRMEZ, onay gelince oturuma geçer", async () => {
  // Yalnız aralık zamanlayıcısı sahte: RNTL'nin `waitFor`u gerçek setTimeout ve Date ile döner.
  jest.useFakeTimers({
    doNotFake: [
      "Date", "hrtime", "nextTick", "performance", "queueMicrotask", "requestAnimationFrame",
      "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "setImmediate",
      "clearImmediate", "setTimeout", "clearTimeout",
    ],
  });
  try {
    (api.preview as jest.Mock).mockResolvedValue(approvalPlan);
    (api.mySeat as jest.Mock)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ status: "APPROVED", participantToken: "TOK" });
    (api.requestSeat as jest.Mock).mockResolvedValue({ status: "PENDING" });
    await render(<JoinScreen />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Katılmak istiyorum" })).toBeTruthy());
    await tap("Katılmak istiyorum");
    await waitFor(() => expect(screen.getByText("İsteğin gönderildi")).toBeTruthy());
    expect(screen.getByText("Ayşe onaylayınca burası açılır.")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("İsteğin gönderildi")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/s/gp"));
    expect(rememberParticipantToken).toHaveBeenCalledWith("gp", "TOK");
  } finally {
    jest.useRealTimers();
  }
});

test("anonim ziyaretçi hesap uçlarını ÇAĞIRMAZ (401 → çıkış kesicisi); giriş bloğu görür", async () => {
  useAuthStore.setState({ status: "out", displayName: null });
  (api.preview as jest.Mock).mockResolvedValue(approvalPlan);
  await render(<JoinScreen />);
  await waitFor(() => expect(screen.getByLabelText("Google ile devam et")).toBeTruthy());
  expect(api.mySeat).not.toHaveBeenCalled();
  expect(api.getSession).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Adın")).toBeNull();
});

/* K-B37 devri: önizleme gizli oturum sanıldı (bayat/yarış) ama sunucu açık planı tanıyor. */
test("K-B37: katılım 409 open_plan_seat_request_required → önizleme tazelenir, plan detayına geçilir", async () => {
  useAuthStore.setState({ status: "out", displayName: null });
  (api.preview as jest.Mock)
    .mockResolvedValueOnce({ ...approvalPlan, openPlan: undefined })
    .mockResolvedValueOnce(approvalPlan);
  (api.join as jest.Mock).mockRejectedValue({
    response: { status: 409, data: { error: "open_plan_seat_request_required" } },
  });
  await render(<JoinScreen />);
  await waitFor(() => expect(screen.getByLabelText("Adın")).toBeTruthy());
  await typeText("Adın", "Priya");
  await tap("Katıl");
  await waitFor(() => expect(screen.getByText("kim geliyor")).toBeTruthy());
  expect(screen.queryByLabelText("Adın")).toBeNull();
  expect(screen.queryByText(/çok uzaktasın/)).toBeNull();
  expect(api.preview).toHaveBeenCalledTimes(2);
});

/* T3 inceleme: ön kontrol durumu bir kez okuyordu — App Link soğuk açılışında durum henüz
   "unknown" iken atlanıyor, host kendi planında "Katıl" görüyordu. */
test("soğuk açılış: oturum durumu bilinmeden sorulmaz; anlaşılınca koltuklu hesap oturuma geçer", async () => {
  useAuthStore.setState({ status: "unknown" });
  (api.getSession as jest.Mock).mockResolvedValueOnce({ slug: "gp", viewer: { participantId: "p1", host: true } });
  await render(<JoinScreen />);
  await act(async () => {});
  expect(api.preview).not.toHaveBeenCalled();
  expect(api.getSession).not.toHaveBeenCalled();

  await act(async () => {
    useAuthStore.setState({ status: "in" });
  });
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/s/gp"));
  expect(api.preview).not.toHaveBeenCalled();
});

test("K-B37 devri: önizleme tazelenemezse form SESSİZ kalmaz", async () => {
  useAuthStore.setState({ status: "out", displayName: null });
  (api.preview as jest.Mock)
    .mockResolvedValueOnce({ ...approvalPlan, openPlan: undefined })
    .mockRejectedValueOnce(new Error("Network Error"));
  (api.join as jest.Mock).mockRejectedValue({
    response: { status: 409, data: { error: "open_plan_seat_request_required" } },
  });
  await render(<JoinScreen />);
  await waitFor(() => expect(screen.getByLabelText("Adın")).toBeTruthy());
  await typeText("Adın", "Priya");
  await tap("Katıl");
  await waitFor(() => expect(screen.getByText("Katılamadın — bu oturum kapanmış olabilir.")).toBeTruthy());
});

/* Keşfet kendi planını da listeler; host'un ya da onaylı kişinin jetonu bellekten düşmüş olabilir. */
test("hesabıyla koltuğu olan (host/onaylı) plan detayında kalmaz — doğrudan oturuma geçer", async () => {
  (api.getSession as jest.Mock).mockResolvedValueOnce({ slug: "gp", viewer: { participantId: "p1", host: true } });
  await render(<JoinScreen />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/s/gp"));
  expect(api.preview).not.toHaveBeenCalled();
});
