import { render, screen, waitFor } from "@testing-library/react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import Landing from "../../app/index";
import { useAuthStore } from "../store/authStore";

jest.mock("../lib/api", () => ({
  api: { me: jest.fn(), loginGoogle: jest.fn(), loginApple: jest.fn(), logout: jest.fn() },
  webBase: "https://bumpinto.app",
}));

const available = AppleAuthentication.isAvailableAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ status: "out", error: null });
});

test("Apple varken iki düğme eşit ağırlıkta, yasal linkler görünür", async () => {
  available.mockResolvedValue(true);
  await render(<Landing />);
  expect(await screen.findByText("Apple ile devam et")).toBeTruthy();
  expect(screen.getByText("Google ile devam et")).toBeTruthy();
  expect(screen.getByText("Kullanım şartlarını")).toBeTruthy();
  expect(screen.getByText("Gizlilik politikası")).toBeTruthy();
});

test("Apple yoksa (Android / eski iOS) düğme hiç çizilmez", async () => {
  available.mockResolvedValue(false);
  await render(<Landing />);
  expect(await screen.findByText("Google ile devam et")).toBeTruthy();
  await waitFor(() => expect(available).toHaveBeenCalled());
  expect(screen.queryByText("Apple ile devam et")).toBeNull();
});
