import * as Location from "expo-location";
import { Linking } from "react-native";

import { openAppSettings, requestLocationWhenInUse } from "../permissions";

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));

const get = Location.getForegroundPermissionsAsync as jest.Mock;
const req = Location.requestForegroundPermissionsAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test("izin varsa sistem diyaloğunu açmaz", async () => {
  get.mockResolvedValue({ granted: true, canAskAgain: true });
  expect(await requestLocationWhenInUse()).toBe("granted");
  expect(req).not.toHaveBeenCalled();
});

test("izin yoksa HER ZAMAN sistem diyaloğunu dener", async () => {
  /* Android'de `canAskAgain`, `shouldShowRequestPermissionRationale()`'a düşer ve izin HİÇ
     istenmemişken de false olur. `get*` sonucuna bakıp erken dönmek, diyaloğun ilk seferde
     hiç açılmaması demekti (2026-09-08 emülatörde görüldü; birim testler yanlış davranışı
     doğruluyordu). Karar `request*`'a bırakılır. */
  get.mockResolvedValue({ granted: false, canAskAgain: false });
  req.mockResolvedValue({ granted: false, canAskAgain: true });
  expect(await requestLocationWhenInUse()).toBe("denied");
  expect(req).toHaveBeenCalledTimes(1);
});

test("kalıcı reddi 'blocked' olarak bildirir; Ayarlar sistemden açılır", async () => {
  get.mockResolvedValue({ granted: false, canAskAgain: false });
  // `request*` kalıcı reddi tanır: diyalog AÇMADAN canAskAgain:false döner.
  req.mockResolvedValue({ granted: false, canAskAgain: false });
  expect(await requestLocationWhenInUse()).toBe("blocked");

  const spy = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  await openAppSettings();
  expect(spy).toHaveBeenCalled();
});
