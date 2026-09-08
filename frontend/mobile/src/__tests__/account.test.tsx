import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import AccountScreen from "../../app/account/index";
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
  (api.me as jest.Mock).mockResolvedValue({ id: "u1", authProviders: ["APPLE"], consents });
  (api.putConsents as jest.Mock).mockResolvedValue(undefined);
});

test("dokuz satırın hepsini çizer, export bayrağı kapalıyken indirme devre dışı", async () => {
  await render(<AccountScreen />);
  for (const label of [
    "Gizlilik politikası",
    "Kullanım şartları",
    "Veri hakların",
    "Açık rıza tercihlerin",
    "Kullanım verisi paylaş",
    "Verilerimi indir",
    "Atıflar ve lisanslar",
    "Destek ve iletişim",
    "Hesabı sil",
  ]) {
    expect(await screen.findByText(label)).toBeTruthy();
  }
  expect(screen.getByLabelText("Verilerimi indir").props.accessibilityState.disabled).toBe(true);
});

test("analitik anahtarı kapalı gelir; açılınca TAM gövde PUT edilir ve me tazelenir", async () => {
  await render(<AccountScreen />);
  await waitFor(() =>
    expect(
      screen.getByLabelText("Kullanım verisi paylaş").props.accessibilityState.checked,
    ).toBe(false),
  );

  await toggleSwitch("Kullanım verisi paylaş", true);

  await waitFor(() =>
    expect(api.putConsents).toHaveBeenCalledWith({
      location: true,
      microphone: true,
      analytics: true,
    }),
  );
  // Yazımdan sonra sunucudan yeniden okunur: rızanın tek kaynağı sunucudur.
  await waitFor(() => expect(api.me).toHaveBeenCalledTimes(2));
});

test("tehlikeli bölge satırı silme rotasını açar", async () => {
  await render(<AccountScreen />);
  fireEvent.press(await screen.findByText("Hesabı sil"));
  expect(router.push).toHaveBeenCalledWith("/account/delete");
});
