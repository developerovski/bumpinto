import * as SecureStore from "expo-secure-store";

import { api, clearParticipantTokens } from "../lib/api";
import { useAuthStore } from "./authStore";
import { useDiscoverStore } from "./discoverStore";
import { useMeStore } from "./meStore";
import { useSeatRequestsStore } from "./seatRequestsStore";
import { useSeatStore } from "./seatStore";

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
  clearParticipantTokens: jest.fn(),
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

/* Paylaşılan cihazda sonraki hesaba sızmasın: Keşfet önceki kullanıcının ilgi alanı süzgecini,
   profil onun ev konumunu, koltuk deposu onun "onaylı" durumunu, istek deposu host listesini,
   katılımcı jetonları onun KOLTUKLARINI taşır. Kullanıcı çıkışı da, reddedilen yenileme de. */
test("çıkış ve reddedilen yenileme hesaba bağlı durumu (depolar + katılımcı jetonları) sıfırlar", async () => {
  const dirty = () => {
    (clearParticipantTokens as jest.Mock).mockClear();
    useDiscoverStore.setState({ filter: ["HIKE"], origin: { lat: 51.44, lng: 5.47 }, loaded: true });
    useSeatStore.setState({ slug: "gp", seat: "APPROVED" });
    useSeatRequestsStore.setState({ slug: "gp", list: { requests: [{ id: "r1", displayName: "T" }] } });
    // Keşfet dakika konumunu profilden okur: önceki hesabın ev konumu sonrakine kalmamalı.
    useMeStore.setState({ me: { displayName: "A", defaultLocation: { lat: 51.44, lng: 5.47, label: "Ev" } } });
  };
  const expectClean = () => {
    expect(useDiscoverStore.getState()).toMatchObject({ filter: [], origin: null, loaded: false });
    expect(useSeatStore.getState()).toMatchObject({ slug: null, seat: "loading" });
    expect(useSeatRequestsStore.getState()).toMatchObject({ slug: null, list: null });
    expect(useMeStore.getState().me).toBeNull();
    expect(clearParticipantTokens).toHaveBeenCalledTimes(1);
  };

  dirty();
  await useAuthStore.getState().signOut();
  expectClean();

  dirty();
  await useAuthStore.getState().signedOut();
  expectClean();
});
