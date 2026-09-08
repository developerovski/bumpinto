import * as Location from "expo-location";

import { api } from "../lib/api";
import { requestLocationWhenInUse } from "../lib/permissions";
import { useLocationStore as store } from "./locationStore";

/* `jest.mock` çağrıları babel tarafından import'ların ÜSTÜNE taşınır; kaynakta import'lardan
   sonra durmaları davranışı değiştirmez ve `import/first` kuralını korur. */
jest.mock("expo-location", () => ({
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 51.7, longitude: 5.3 } })),
  Accuracy: { Balanced: 3 },
}));
/* İzin isteme M-5'in `lib/permissions.ts`'inden geçer (canAskAgain tuzağı orada çözüldü —
   K-M22). Store o modülü çağırdığını doğrular, `expo-location`ın izin API'sini DEĞİL. */
jest.mock("../lib/permissions", () => ({
  requestLocationWhenInUse: jest.fn(),
  openAppSettings: jest.fn(),
}));
jest.mock("../lib/api", () => ({
  api: { reverseGeocode: jest.fn(async () => ({ label: "'s-Hertogenbosch" })) },
}));

const asked = requestLocationWhenInUse as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  store.setState({ phase: "idle", point: null });
  (api.reverseGeocode as jest.Mock).mockResolvedValue({ label: "'s-Hertogenbosch" });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 51.7, longitude: 5.3 },
  });
});

test("açılışta izin İSTENMEZ; request() etiketi backend'den alır", async () => {
  expect(asked).not.toHaveBeenCalled();
  asked.mockResolvedValue("granted");
  await store.getState().request();
  expect(store.getState().point).toEqual({ lat: 51.7, lng: 5.3, label: "'s-Hertogenbosch" });
  expect(store.getState().phase).toBe("granted");
});

test("red: phase=denied ve nokta yok — ekranlar O6 kurtarmasını gösterir", async () => {
  asked.mockResolvedValue("denied");
  await store.getState().request();
  expect(store.getState().phase).toBe("denied");
  expect(store.getState().point).toBeNull();
  // Reddedilince konum HİÇ okunmaz: izinsiz çağrı sessizce patlardı.
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test("kalıcı ret ayrı bir fazdır: 'Tekrar dene' değil yalnız Ayarlar çıkışı kalır", async () => {
  asked.mockResolvedValue("blocked");
  await store.getState().request();
  expect(store.getState().phase).toBe("blocked");
});

/* Ön-ekran (O3) sistem diyaloğunu KENDİ çağırır ve sonucu rota parametresiyle döner;
   store o sonucu benimser — ikinci bir izin isteği YAPILMAZ (kullanıcıya iki diyalog çıkardı). */
test("adopt(): ön-ekranın sonucunu izin İSTEMEDEN benimser", async () => {
  await store.getState().adopt("granted");
  expect(asked).not.toHaveBeenCalled();
  expect(store.getState().phase).toBe("granted");
  expect(store.getState().point?.label).toBe("'s-Hertogenbosch");

  await store.getState().adopt("manual");
  expect(store.getState().phase).toBe("manual");
  expect(store.getState().point).toBeNull();
});

test("ters geocode başarısızsa nokta yine kullanılır, yalnız etiket boş kalır", async () => {
  asked.mockResolvedValue("granted");
  (api.reverseGeocode as jest.Mock).mockRejectedValue(new Error("offline"));
  await store.getState().request();
  expect(store.getState().phase).toBe("granted");
  expect(store.getState().point).toEqual({ lat: 51.7, lng: 5.3, label: undefined });
});

test("konum okunamazsa phase=failed — 'izin yok' ile karıştırılmaz", async () => {
  asked.mockResolvedValue("granted");
  (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error("no fix"));
  await store.getState().request();
  expect(store.getState().phase).toBe("failed");
  expect(store.getState().point).toBeNull();
});

test("fromAddress(): adres backend geocode'undan noktaya çevrilir", async () => {
  const geocode = jest.fn(async () => ({ lat: 41, lng: 29, label: "İstanbul, Kadıköy" }));
  (api as unknown as { geocode: unknown }).geocode = geocode;
  const point = await store.getState().fromAddress("Kadıköy");
  expect(point).toEqual({ lat: 41, lng: 29, label: "İstanbul, Kadıköy" });
  expect(store.getState().phase).toBe("manual");
  expect(store.getState().point).toEqual(point);
});
