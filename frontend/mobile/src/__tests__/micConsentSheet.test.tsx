import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Audio from "expo-audio";
import { router } from "expo-router";

import MicConsentSheet from "../../app/(sheets)/mic-consent";
import { presentMicConsent } from "../lib/micConsent";

beforeEach(() => jest.clearAllMocks());

test("O7 metinlerini çizer ve açılışta sistem iznini İSTEMEZ", async () => {
  await render(<MicConsentSheet />);
  expect(screen.getByText("Sesli sohbet için mikrofon")).toBeTruthy();
  expect(screen.getByText("İstediğin an kapat")).toBeTruthy();
  expect(screen.getByText("30 dakika sonra kendiliğinden biter")).toBeTruthy();
  expect(screen.getByText("Uygulama arka plandayken susar")).toBeTruthy();
  expect(Audio.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
});

test("'Şimdi değil' bekleyen sözü dismissed ile çözer, sistem iznini istemez", async () => {
  const pending = presentMicConsent();
  await render(<MicConsentSheet />);
  fireEvent.press(screen.getByText("Şimdi değil"));
  await expect(pending).resolves.toBe("dismissed");
  expect(Audio.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
  expect(router.back).toHaveBeenCalled();
});

test("'Devam et' sistem iznini ister ve sonucu söze taşır", async () => {
  (Audio.getRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: false,
    canAskAgain: true,
  });
  (Audio.requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
  const pending = presentMicConsent();
  await render(<MicConsentSheet />);
  fireEvent.press(screen.getByText("Devam et"));
  await waitFor(() => expect(Audio.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1));
  await expect(pending).resolves.toBe("granted");
});

test("kaydırarak kapatma (unmount) sözü dismissed ile çözer — dock sonsuza kadar beklemez", async () => {
  const pending = presentMicConsent();
  const view = await render(<MicConsentSheet />);
  view.unmount();
  await expect(pending).resolves.toBe("dismissed");
});
