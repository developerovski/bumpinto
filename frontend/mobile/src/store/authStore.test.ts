import * as SecureStore from "expo-secure-store";

import { api } from "../lib/api";
import { useAuthStore } from "./authStore";

/* NOT: `jest.mock` çağrıları babel-plugin-jest-hoist tarafından bu import'ların ÜSTÜNE
   taşınır — sıralama görsel, çalışma sırası değil. */
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({ data: { idToken: "ID_TOKEN" } })),
    signOut: jest.fn(async () => undefined),
  },
}));
jest.mock("../lib/api", () => ({
  api: {
    loginGoogle: jest.fn(async () => ({
      accessToken: "ACCESS", refreshToken: "REFRESH", userId: "u1",
    })),
    me: jest.fn(async () => ({ language: "nl" })),
    logout: jest.fn(async () => undefined),
  },
}));

test("giriş: id_token takas edilir, id_token SAKLANMAZ", async () => {
  await useAuthStore.getState().signIn();
  expect(api.loginGoogle).toHaveBeenCalledWith("ID_TOKEN");
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith("bumpinto.accessToken", "ACCESS");
  // B-16: yenileme jetonu da saklanır; olmadan kullanıcı 15 dakika sonra sessizce düşerdi.
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith("bumpinto.refreshToken", "REFRESH");
  expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith("bumpinto.idToken", expect.anything());
  expect(useAuthStore.getState().status).toBe("in");
});

/** Yenileme jetonu gelmezse giriş TAMAMLANMAZ: sessiz düşüşü baştan engelle. */
test("giriş: yenileme jetonu yoksa oturum açılmaz", async () => {
  (api.loginGoogle as jest.Mock).mockResolvedValueOnce({ accessToken: "ACCESS", userId: "u1" });

  await useAuthStore.getState().signIn();

  expect(useAuthStore.getState().status).toBe("out");
});

test("çıkış: token silinir ve durum out olur", async () => {
  // Testin KENDİSİ kurar: önceki testin bıraktığı duruma yaslanmak sırayı gizli bağımlılık yapar.
  await SecureStore.setItemAsync("bumpinto.refreshToken", "REFRESH");

  await useAuthStore.getState().signOut();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("bumpinto.accessToken");
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("bumpinto.refreshToken");
  // Jeton SUNUCUDA da iptal edilmeli: yalnız cihazdan silmek çalınmış kopyayı 30 gün yaşatırdı.
  expect(api.logout).toHaveBeenCalledWith("REFRESH");
  expect(useAuthStore.getState().status).toBe("out");
});
