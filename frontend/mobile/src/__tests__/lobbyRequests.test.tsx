/* Ekran testleri `app/` altına KONULMAZ (K-M9). TEST BAŞINA TEK `render`. */

import { act, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import LobbyScreen from "../screens/LobbyScreen";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useSeatRequestsStore } from "../store/seatRequestsStore";
import { tap } from "../testUtils/interact";

jest.mock("../lib/api", () => ({
  api: {
    seatRequests: jest.fn(),
    findVenues: jest.fn(),
    getConfig: jest.fn(() => Promise.reject(new Error("no config"))),
  },
  webBase: "https://bumpinto.app",
  API_BASE_URL: "http://localhost:8060",
  participantToken: jest.fn(() => "tok-1"),
  hasParticipantToken: jest.fn(() => true),
  rememberParticipantToken: jest.fn(),
}));
jest.mock("../store/liveChannel", () => ({
  liveChannel: { open: jest.fn(() => jest.fn()), subscribe: jest.fn(() => jest.fn()), publish: jest.fn(() => true) },
  sessionTopic: (slug: string) => `/topic/session/${slug}`,
  voiceInbox: (slug: string, id: string) => `/topic/session/${slug}/voice/${id}`,
  voiceSignal: (slug: string) => `/app/sessions/${slug}/voice/signal`,
}));

const base = {
  slug: "gp",
  name: "Pazar yürüyüşü",
  sessionType: "GROUP" as const,
  status: "COLLECTING" as const,
  participants: [],
  venues: [],
  viewer: { host: true, participantId: "p0" },
};

beforeEach(() => {
  jest.clearAllMocks();
  useSeatRequestsStore.getState().reset();
  useAuthStore.setState({ status: "in" });
});

/* Artboard P4 ayrı ekran: Lobi host'a girişi ve yeni istek sayısını verir (web panelinin yerleşimi). */
test("açık planda host'a 'Katılmak isteyenler' girişi + yeni sayısı; basınca istek ekranına", async () => {
  (api.seatRequests as jest.Mock).mockResolvedValue({
    approvedSeats: 1,
    capacity: 4,
    requests: [
      { id: "r1", displayName: "Tomás", status: "PENDING" },
      { id: "r2", displayName: "Lena", status: "PENDING" },
    ],
  });
  await render(
    <LobbyScreen view={{ ...base, openPlan: { capacity: 4, approvedSeats: 1, joinPolicy: "APPROVAL" } }} />,
  );
  await waitFor(() => expect(screen.getByText("2 yeni")).toBeTruthy());
  await tap("Katılmak isteyenler");
  expect(router.push).toHaveBeenCalledWith("/sessions/gp/requests");
});

test("gizli oturumda (openPlan yok) giriş çizilmez, uç çağrılmaz", async () => {
  await render(<LobbyScreen view={base} />);
  await act(async () => {});
  expect(screen.queryByLabelText("Katılmak isteyenler")).toBeNull();
  expect(api.seatRequests).not.toHaveBeenCalled();
});
