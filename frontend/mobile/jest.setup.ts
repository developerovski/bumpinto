/**
 * jest-expo kurulum dosyası — RN modüllerinin test ikizleri.
 *
 * Bunlar yalnız YÜZEY taklididir: izin akışı, derin link ve STOMP el sıkışması gibi
 * framework yapıştırıcıları burada DOĞRULANMAZ; gerçek istemciyle M-8:T5 (Maestro) ve
 * M-6:T3 (ws-smoke) koşar — depo kuralı: "framework yapıştırıcısı testsiz bırakılmaz".
 *
 * Not: @testing-library/react-native 14'te Jest matcher'ları dahilidir;
 * eski `@testing-library/react-native/extend-expect` içe aktarımı YOKTUR.
 */

jest.mock("expo-secure-store", () => {
  const m = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => m.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void m.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void m.delete(k)),
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => () => undefined),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiUrl: "http://localhost:8060",
        webBase: "https://bumpinto.app",
        googleWebClientId: "web",
        googleIosClientId: "ios",
      },
    },
  },
}));

jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [{ languageCode: "tr", languageTag: "tr-TR", regionCode: "TR" }]),
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ""),
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ slug: "x7k2m" }),
  Stack: Object.assign(({ children }: { children?: unknown }) => children ?? null, {
    Screen: () => null,
  }),
  Link: ({ children }: { children?: unknown }) => children ?? null,
}));

/* Google girişi yerel modüldür: `authStore` modül düzeyinde `configure` çağırır, o yüzden
   ikizi burada kurulur. Gerçek akış M-8:T5 Maestro koşusunda doğrulanır. */
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({ data: { idToken: "ID_TOKEN" } })),
    signOut: jest.fn(async () => undefined),
  },
}));

/* Güvenli alan bağlamı: ekranlar `useSafeAreaInsets` çağırır ve testte sağlayıcı yoktur.
   Paketin kendi ikizi kullanılır (sabit kenar boşlukları döner). */
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);
