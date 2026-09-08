import { render, waitFor } from "@testing-library/react-native";
import { router, usePathname } from "expo-router";

import RootLayout from "../../app/_layout";
import { useAuthStore } from "../store/authStore";

jest.mock("../lib/api", () => ({
  api: { me: jest.fn(async () => null), logout: jest.fn(async () => undefined) },
  webBase: "https://bumpinto.app",
}));

const path = usePathname as unknown as jest.Mock;
/* Store MODÜL TEKİLİDİR: `mountAt` `restore`'u sahteyle değiştirir ve bu testler arası kalıcıdır.
   Gerçek uygulama en başta yakalanır, uçtan uca testte geri konur. */
const realRestore = useAuthStore.getState().restore;

/* `restore` burada devre dışı bırakılır: muhafızın SÖZLEŞMESİ "durum + yol → yönlendirme"dir.
   Gerçek `restore` (token yoksa `out`'a düşürme) `authStore.test.ts`in işi; ikisi karışırsa
   test neyin kırıldığını söyleyemez. Uçtan uca hâli en alttaki testte. */
const mountAt = async (pathname: string, status: "in" | "out" | "unknown") => {
  path.mockReturnValue(pathname);
  useAuthStore.setState({
    status,
    userId: null,
    displayName: null,
    error: null,
    restore: jest.fn(async () => undefined),
  });
  await render(<RootLayout />);
};

beforeEach(() => jest.clearAllMocks());

test("oturum yokken hesap ekranları giriş ekranına atılır", async () => {
  for (const p of [
    "/account",
    "/account/consent",
    "/account/delete",
    "/sessions",
    "/profile",
    "/participant", // bildir/engelle — /api/me/blocks'a yazar
    "/prefs", // profil tercihleri — /api/me'ye yazar
  ]) {
    jest.clearAllMocks();
    await mountAt(p, "out");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  }
});

test("yasal okuyucular, silme onayı ve davet linki ANONİM kalır", async () => {
  for (const p of [
    "/account/legal/privacy",
    "/account/legal/terms",
    "/account/deleted",
    "/j/x7k2m",
    "/",
    "/location-consent",
    "/mic-consent",
  ]) {
    jest.clearAllMocks();
    await mountAt(p, "out");
    expect(router.replace).not.toHaveBeenCalled();
  }
});

test("oturum varken hiçbir ekran yönlendirilmez", async () => {
  await mountAt("/account/delete", "in");
  expect(router.replace).not.toHaveBeenCalled();
});

test("durum 'unknown' iken YÖNLENDİRME YOK — token okunmadan atmak oturumu düşürürdü", async () => {
  await mountAt("/account", "unknown");
  expect(router.replace).not.toHaveBeenCalled();
});

test("oturum kökte geri yüklenir — derin linkle girişte de muhafız çalışsın", async () => {
  const restore = jest.fn(async () => undefined);
  path.mockReturnValue("/account");
  useAuthStore.setState({ status: "unknown", restore });
  await render(<RootLayout />);
  await waitFor(() => expect(restore).toHaveBeenCalledTimes(1));
});

test("UÇTAN UCA: token yokken /account derin linki giriş ekranına düşer", async () => {
  // Gerçek `restore` koşar: SecureStore ikizi boş → durum `out` → muhafız yönlendirir.
  path.mockReturnValue("/account");
  useAuthStore.setState({ status: "unknown", restore: realRestore });
  await render(<RootLayout />);
  await waitFor(() => expect(useAuthStore.getState().status).toBe("out"));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
});
