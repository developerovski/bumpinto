import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import ConsentScreen from "../../app/account/consent";
import { api } from "../lib/api";
import { useMeStore } from "../store/meStore";
import { toggleSwitch } from "../testUtils/interact";

jest.mock("../lib/api", () => ({
  api: { me: jest.fn(), putConsents: jest.fn() },
  webBase: "https://bumpinto.app",
}));

const consents = {
  location: true,
  microphone: true,
  analytics: false,
  updatedAt: "2026-09-06T12:41:00Z",
  version: "1.0",
};

beforeEach(() => {
  jest.clearAllMocks();
  useMeStore.setState({ me: null, error: null });
  (api.me as jest.Mock).mockResolvedValue({ id: "u1", consents });
  (api.putConsents as jest.Mock).mockResolvedValue(undefined);
});

test("üç anahtarı gösterir; analitik kapalı; Kaydet'e kadar sunucuya YAZMAZ", async () => {
  await render(<ConsentScreen />);
  await waitFor(() =>
    expect(screen.getByLabelText("Kullanım verisi").props.accessibilityState.checked).toBe(false),
  );
  expect(screen.getByLabelText("Konum verimin işlenmesi")).toBeTruthy();
  expect(screen.getByLabelText("Mikrofon / sesli sohbet")).toBeTruthy();

  await toggleSwitch("Kullanım verisi", true);
  expect(api.putConsents).not.toHaveBeenCalled();

  fireEvent.press(screen.getByText("Kaydet"));
  await waitFor(() =>
    expect(api.putConsents).toHaveBeenCalledWith({
      location: true,
      microphone: true,
      analytics: true,
    }),
  );
  await waitFor(() => expect(router.back).toHaveBeenCalled());
});

test("verildiği tarih ve sürüm damgası gösterilir", async () => {
  await render(<ConsentScreen />);
  expect(await screen.findByText(/sürüm 1\.0/)).toBeTruthy();
});

test("'Aydınlatma metnini oku' KVKK okuyucusuna gider", async () => {
  await render(<ConsentScreen />);
  fireEvent.press(await screen.findByText("Aydınlatma metnini oku"));
  expect(router.push).toHaveBeenCalledWith("/account/legal/kvkk");
});

test("yazma başarısızsa ekran KAPANMAZ ve hata gösterilir", async () => {
  (api.putConsents as jest.Mock).mockRejectedValue(new Error("500"));
  await render(<ConsentScreen />);
  await screen.findByLabelText("Kullanım verisi");
  fireEvent.press(screen.getByText("Kaydet"));
  expect(await screen.findByText("Kaydedilemedi — tekrar dene.")).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
});
