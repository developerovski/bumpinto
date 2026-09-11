/* Ekran testleri `app/` altına KONULMAZ (K-M9). TEST BAŞINA TEK `render`. */

import { render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import ProfileScreen from "../../app/profile";
import { api } from "../lib/api";
import { useMeStore } from "../store/meStore";
import { tap } from "../testUtils/interact";

jest.mock("../lib/api", () => ({
  api: {
    me: jest.fn(),
    updateMe: jest.fn(),
    logout: jest.fn(),
    getConfig: jest.fn(() => Promise.reject(new Error("no config"))),
  },
  clearParticipantTokens: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useMeStore.setState({ me: null, error: null });
});

/* Keşfet POC P6 + spec §11.6: sayaçlar açtığın · buluşma · hafta seri — "dost görüldü" artık yok. */
test("profilde rozetler (sayaç + 2×2); eski 'dost görüldü' sayacı yok; ilgi alanları satırı alt sayfayı açar", async () => {
  (api.me as jest.Mock).mockResolvedValue({
    displayName: "Mehmet",
    stats: { sessionsHosted: 2, friendsMet: 5, plansMet: 1, metStreakWeeks: 1 },
    interests: ["COFFEE", "HIKE"],
  });
  await render(<ProfileScreen />);
  await waitFor(() => expect(screen.getByLabelText("İlk buluşma · kazanıldı")).toBeTruthy());
  expect(screen.getByText("Rozetler")).toBeTruthy();
  expect(screen.queryByText("dost görüldü")).toBeNull();
  expect(screen.getByText("Kahve, Doğa yürüyüşü")).toBeTruthy();

  await tap("İlgi alanların");
  expect(router.push).toHaveBeenCalledWith({ pathname: "/(sheets)/prefs", params: { field: "interests" } });
});
