/* Ekran testleri `app/` altına KONULMAZ (K-M9). TEST BAŞINA TEK `render`. */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import SeatRequestsScreen from "../screens/SeatRequestsScreen";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useSeatRequestsStore } from "../store/seatRequestsStore";
import { useSessionStore } from "../store/sessionStore";

jest.mock("../lib/api", () => ({
  api: { seatRequests: jest.fn(), approveSeat: jest.fn(), declineSeat: jest.fn(), getSession: jest.fn() },
  hasParticipantToken: jest.fn(() => true),
  rememberParticipantToken: jest.fn(),
}));

const view = {
  slug: "gp",
  name: "Pazar yürüyüşü",
  status: "COLLECTING" as const,
  activityTypes: ["WALK" as const],
  participants: [
    { id: "p0", displayName: "Ayşe", host: true },
    { id: "p1", displayName: "Priya", host: false },
  ],
  viewer: { participantId: "p0", host: true },
  openPlan: { meetAt: "2026-09-13T08:00:00Z", capacity: 4, approvedSeats: 2, confirmed: false, joinPolicy: "APPROVAL" as const },
};
const list = {
  approvedSeats: 2,
  capacity: 4,
  confirmed: false,
  requests: [
    { id: "r1", displayName: "Tomás", locality: "Gestel", note: "Yeni geldim", status: "PENDING", interests: [] },
    { id: "r0", displayName: "Priya", locality: "Woensel", status: "APPROVED", interests: [] },
    { id: "r2", displayName: "Lena", locality: "Strijp", status: "DECLINED", interests: [] },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  useSeatRequestsStore.getState().reset();
  useSessionStore.setState({ view, error: null });
  useAuthStore.setState({ status: "in" });
});

test("P4: bekleyen onaylanır → 'kesinleşti!' damgası; geçilen görünmez; dakika gelmezse yazılmaz; haptik", async () => {
  (api.seatRequests as jest.Mock).mockResolvedValue(list);
  (api.approveSeat as jest.Mock).mockResolvedValue({
    ...list,
    approvedSeats: 3,
    confirmed: true,
    requests: list.requests.map((r) => (r.id === "r1" ? { ...r, status: "APPROVED" } : r)),
  });
  await render(<SeatRequestsScreen slug="gp" />);
  await waitFor(() => expect(screen.getByText("Tomás")).toBeTruthy());
  expect(screen.getByText("1 yeni")).toBeTruthy();
  // "Geç" kimseye görünmez — host'a da.
  expect(screen.queryByText("Lena")).toBeNull();
  expect(screen.getByText("Gestel")).toBeTruthy();
  expect(screen.getByText("“Yeni geldim”")).toBeTruthy();
  // `SeatRequestDto.minutes` sunucudan hiç gelmez: uydurma "~ dk" basılmaz.
  expect(screen.queryByText(/dk/)).toBeNull();

  await act(async () => {
    fireEvent.press(screen.getByLabelText("Onayla"));
  });
  await waitFor(() => expect(screen.getByText("3/4 · kesinleşti!")).toBeTruthy());
  expect(screen.queryByLabelText("Onayla")).toBeNull();
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
});

test("hesap oturumu olmayan host liste ucuna GİTMEZ (401 → çıkış kesicisi)", async () => {
  useAuthStore.setState({ status: "out" });
  await render(<SeatRequestsScreen slug="gp" />);
  await act(async () => {});
  expect(api.seatRequests).not.toHaveBeenCalled();
});
