import { Platform } from "react-native";

import {
  endSessionActivity,
  isLiveActivityAvailable,
  startSessionActivity,
  updateSessionActivity,
} from "./liveActivity";

test("köprü bugün hiçbir platformda etkin değil ve null döner", async () => {
  expect(isLiveActivityAvailable()).toBe(false);
  expect(
    await startSessionActivity({
      slug: "x7k2m",
      title: "Cuma kahvesi",
      subtitle: "2/3 hazır · Kerem bekleniyor",
      readyCount: 2,
      totalCount: 3,
    }),
  ).toBeNull();
});

test("güncelleme ve bitirme, etkin etkinlik yokken sessizce geçer", async () => {
  await expect(updateSessionActivity("id", { readyCount: 3, totalCount: 3 })).resolves.toBeUndefined();
  await expect(endSessionActivity("id")).resolves.toBeUndefined();
});

/* Kapı YEREL MODÜLE bakar, platforma değil: iOS'ta bile modül yokken kapalı kalır (B-16 açar). */
test("iOS'ta bile yerel modül yoksa kapalı kalır", () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
  expect(isLiveActivityAvailable()).toBe(false);
  Object.defineProperty(Platform, "OS", { value: original, configurable: true });
});
