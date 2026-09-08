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

test("sorulabiliyorsa diyaloğu açar; sorulamıyorsa 'blocked'; Ayarlar sistemden açılır", async () => {
  get.mockResolvedValue({ granted: false, canAskAgain: true });
  req.mockResolvedValue({ granted: false, canAskAgain: true });
  expect(await requestLocationWhenInUse()).toBe("denied");
  expect(req).toHaveBeenCalledTimes(1);

  get.mockResolvedValue({ granted: false, canAskAgain: false });
  const spy = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  expect(await requestLocationWhenInUse()).toBe("blocked");
  expect(req).toHaveBeenCalledTimes(1); // ikinci kez sistem diyaloğu AÇILMADI
  await openAppSettings();
  expect(spy).toHaveBeenCalled();
});
