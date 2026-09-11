import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import DeleteAccountScreen from "../../app/account/delete";
import { api, clearParticipantTokens } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { typeText } from "../testUtils/interact";

jest.mock("../lib/api", () => ({
  // `logout` SÖZ döndürmeli: `signOut()` üzerine `.catch` zincirliyor.
  api: { deleteMe: jest.fn(), me: jest.fn(), logout: jest.fn(async () => undefined) },
  webBase: "https://bumpinto.app",
  // Çıkış hesaba bağlı durumu sıfırlarken katılımcı jetonlarını da düşürür (M-11/M-12).
  clearParticipantTokens: jest.fn(),
}));

const openSheet = async (text: string) => {
  fireEvent.press(screen.getByText("Hesabımı sil"));
  await screen.findByLabelText("Onay metni");
  await typeText("Onay metni", text);
};
const confirmButton = () => screen.getByLabelText("Hesabı kalıcı olarak sil");

beforeEach(() => {
  jest.clearAllMocks();
  (api.logout as jest.Mock).mockResolvedValue(undefined);
  useAuthStore.setState({ status: "in", userId: "u1", displayName: "Mehmet", error: null });
});

test("ne silinir / ne kalır listelerini gösterir; 'SİL' yazılmadan onay KAPALIDIR", async () => {
  await render(<DeleteAccountScreen />);
  expect(screen.getByText("Silinecekler")).toBeTruthy();
  expect(screen.getByText("Kalacaklar")).toBeTruthy();
  expect(screen.getByText("Zorunlu yasal kayıtlar (en fazla 30 gün)")).toBeTruthy();

  await openSheet("evet");
  expect(confirmButton().props.accessibilityState.disabled).toBe(true);

  await typeText("Onay metni", "SİL");
  expect(confirmButton().props.accessibilityState.disabled).toBe(false);
});

/* Küçük harf kabul edilir: `toLocaleUpperCase("tr-TR")` Türkçe i→İ eşlemesini doğru yapar
   (varsayılan yerelde "sil" → "SIL" olur ve HİÇ eşleşmezdi). */
test("onay sözcüğü ÇEVRİLİR — test dili tr olduğu için SİL beklenir", async () => {
  await render(<DeleteAccountScreen />);
  fireEvent.press(screen.getByText("Hesabımı sil"));
  expect(await screen.findByText("Onaylamak için SİL yaz")).toBeTruthy();
});

test("küçük harf 'sil' ve boşluklu giriş kabul edilir", async () => {
  await render(<DeleteAccountScreen />);
  await openSheet(" sil ");
  expect(confirmButton().props.accessibilityState.disabled).toBe(false);
});

test("onaylayınca DELETE /api/me çağrılır, oturum kapanır, O17'ye gidilir", async () => {
  (api.deleteMe as jest.Mock).mockResolvedValue(undefined);
  await render(<DeleteAccountScreen />);
  await openSheet("SİL");
  fireEvent.press(confirmButton());

  await waitFor(() => expect(api.deleteMe).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account/deleted"));
  expect(useAuthStore.getState().status).toBe("out");
  // Silinen hesabın koltuk jetonları cihazda KALMAZ.
  expect(clearParticipantTokens).toHaveBeenCalled();
});

test("silme başarısızsa oturum KAPANMAZ ve hata gösterilir", async () => {
  (api.deleteMe as jest.Mock).mockRejectedValue(new Error("500"));
  await render(<DeleteAccountScreen />);
  await openSheet("SİL");
  fireEvent.press(confirmButton());

  expect(await screen.findByText("Hesap silinemedi — tekrar dene.")).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
  expect(useAuthStore.getState().status).toBe("in");
});
