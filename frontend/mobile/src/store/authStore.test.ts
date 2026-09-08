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
    loginGoogle: jest.fn(async () => ({ accessToken: "ACCESS", userId: "u1" })),
    me: jest.fn(async () => ({ language: "nl" })),
    logout: jest.fn(async () => undefined),
  },
}));

test("giriş: id_token takas edilir, SADECE access token saklanır", async () => {
  await useAuthStore.getState().signIn();
  expect(api.loginGoogle).toHaveBeenCalledWith("ID_TOKEN");
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith("bumpinto.accessToken", "ACCESS");
  expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith("bumpinto.idToken", expect.anything());
  expect(useAuthStore.getState().status).toBe("in");
});

test("çıkış: token silinir ve durum out olur", async () => {
  await useAuthStore.getState().signOut();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("bumpinto.accessToken");
  expect(useAuthStore.getState().status).toBe("out");
});
