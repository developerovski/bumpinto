import * as Audio from "expo-audio";
import { router } from "expo-router";

import { presentMicConsent, resolveMicConsent } from "../micConsent";
import { requestMicrophone } from "../permissions";

beforeEach(() => {
  jest.clearAllMocks();
  resolveMicConsent("dismissed"); // önceki testten sarkan söz kalmasın
});

test("alt sayfayı açar ve sonucu bekleyen söz döndürür", async () => {
  const pending = presentMicConsent();
  expect(router.push).toHaveBeenCalledWith("/(sheets)/mic-consent");
  resolveMicConsent("granted");
  await expect(pending).resolves.toBe("granted");
});

test("eşzamanlı ikinci çağrı yeni sayfa açmaz", async () => {
  const a = presentMicConsent();
  const b = presentMicConsent();
  expect(router.push).toHaveBeenCalledTimes(1);
  resolveMicConsent("denied");
  await expect(Promise.all([a, b])).resolves.toEqual(["denied", "denied"]);
});

test("'Şimdi değil' sistem iznini hiç istemez; izin varsa 'granted' döner", async () => {
  const pending = presentMicConsent();
  resolveMicConsent("dismissed");
  await expect(pending).resolves.toBe("dismissed");
  expect(Audio.requestRecordingPermissionsAsync).not.toHaveBeenCalled();

  (Audio.getRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
  expect(await requestMicrophone()).toBe("granted");
  expect(Audio.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
});
