import { AppState } from "react-native";

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
  /* `canGoBack` VARSAYILAN true: ekranların normal (geçmişli) yolu testlerde de normal yol
     olsun. Yedek dalını sınayan test bunu `mockReturnValue(false)` ile çevirir. */
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  /* `jest.fn` (sabit nesne DEĞİL): parametreli rotaları test eden ekranlar bunu
     `mockReturnValue` ile değiştirir. Varsayılan, oturum rotalarının beklediği slug. */
  useLocalSearchParams: jest.fn(() => ({ slug: "x7k2m" })),
  usePathname: jest.fn(() => "/"),
  /* Muhafız/yönlendirme dalları render edilebilsin diye görünür bir işaret çizer. */
  Redirect: ({ href }: { href?: unknown }) =>
    require("react").createElement(require("react-native").Text, null, `redirect:${String(href)}`),
  Stack: Object.assign(({ children }: { children?: unknown }) => children ?? null, {
    Screen: () => null,
  }),
  /* Gerçek `Link` yerel tarafta KENDİ <Text>'ini çizer; ikiz de öyle yapmalı, aksi hâlde
     `getByText` bağlantı metnini üst <Text>'in parçası sanır ve eşleşmez (M-5:T5). */
  Link: ({ children, style }: { children?: unknown; style?: unknown }) =>
    require("react").createElement(
      require("react-native").Text,
      { style, accessibilityRole: "link" },
      children,
    ),
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

/* Jest ikizi paketin KENDİSİNDEN gelir: `GestureHandlerRootView` yerel modülü açılışta
   `install()` çağırır ve testte patlar. */
require("react-native-gesture-handler/jestSetup");

/* Güvenli alan bağlamı: ekranlar `useSafeAreaInsets` çağırır ve testte sağlayıcı yoktur.
   Paketin kendi ikizi kullanılır (sabit kenar boşlukları döner). */
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

/* İzin modülleri (M-5). `expo-audio` jest-expo altında İÇE AKTARILAMAZ: yerel modül sınıfı
   yoksa `ExpoAudio.ts` açılışta `prototype` okur ve patlar — bu yüzden ikizi burada kurulur.
   Gerçek yüzey (fonksiyon adları) `src/lib/__tests__/native-contract.test.ts` ile
   paketin TİP BİLDİRİMİ üzerinden doğrulanır; akış Maestro'da (T12) koşar. */
jest.mock("expo-audio", () => ({
  getRecordingPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
}));

/* WebRTC (M-6) yerel modüldür: içe aktarımda `NativeEventEmitter` kurar ve testte patlar.
   İkiz yalnız YÜZEYDİR — gerçek medya/eşleşme cihazda (`scripts/ws-smoke.mjs` + Maestro)
   doğrulanır. `RTCPeerConnection` T5'in adaptörü için burada; mesh mantığı zaten
   `@bumpinto/shared/voice`ta platformsuz test ediliyor. */
jest.mock("react-native-webrtc", () => ({
  mediaDevices: {
    getUserMedia: jest.fn(async () => ({ getTracks: () => [], getAudioTracks: () => [] })),
  },
  RTCPeerConnection: jest.fn(() => ({
    addTrack: jest.fn(),
    createOffer: jest.fn(async () => ({ type: "offer", sdp: "sdp" })),
    createAnswer: jest.fn(async () => ({ type: "answer", sdp: "sdp" })),
    setLocalDescription: jest.fn(async () => undefined),
    setRemoteDescription: jest.fn(async () => undefined),
    addIceCandidate: jest.fn(async () => undefined),
    getStats: jest.fn(async () => new Map()),
    close: jest.fn(),
    connectionState: "new",
    signalingState: "stable",
    remoteDescription: null,
  })),
}));

/* Ses yönlendirmesi (M-6). Eski tarz yerel modül; New Arch'ta interop katmanından geçer ve
   testte yoktur. Gerçek yönlendirme (kulaklık/hoparlör/bluetooth) yalnız CİHAZDA doğrulanır. */
jest.mock("react-native-incall-manager", () => ({
  __esModule: true,
  default: { start: jest.fn(), stop: jest.fn(), setForceSpeakerphoneOn: jest.fn() },
}));

jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButton: () => null,
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "raw-nonce"),
  digestStringAsync: jest.fn(async () => "hashed-nonce"),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(async () => ({ type: "opened" })) }));

/* Uygulama durumu: jest-expo `AppState.currentState`i bir `jest.fn()` olarak bırakıyor ve
   `addEventListener` abonelik nesnesi döndürmüyor. `useSessionLive` (M-7) canlı sorguyu
   "uygulama ÖNDE mi" kapısına bağlıyor — ikiz düzeltilmeden kapı testte hep kapalı kalıyor ve
   yönlendirici testleri üretim kodu doğruyken boş ekran görüyordu (2026-09-08).
   İkiz CİHAZIN normal hâlini taklit eder: uygulama önde, dinleyici kaldırılabilir.
   Ön/arka plan GEÇİŞİ bir framework yapıştırıcısıdır ve burada doğrulanmış SAYILMAZ —
   gerçek geçiş Maestro koşusunda (M-8:T5) sınanır. */
Object.defineProperty(AppState, "currentState", { get: () => "active", configurable: true });
AppState.addEventListener = jest.fn(() => ({ remove: jest.fn() })) as never;

/* i18n'i AÇIKÇA kur. Aksi hâlde çeviriler yalnız test edilen ekran dolaylı olarak bir store
   (→ `src/i18n`) içe aktardığında hazır olur; store'suz ekranlar ham anahtar çizer ve test
   sebepsiz kırılır. Kurulum mock'lardan SONRA gelir (expo-localization ikizi hazır olsun). */
require("./src/i18n");

/* M-9 yerel modülleri. Hepsi YÜZEY ikizidir: kamera, dosya yazımı, kart çizimi ve sistem
   paylaşım sayfası jest'te DOĞRULANMAZ — gerçek yüzeyler T8'in cihaz kontrol listesinde
   dev build'de koşar (depo kuralı: framework yapıştırıcısı testsiz bırakılmaz). */
jest.mock("react-native-view-shot", () => ({ captureRef: jest.fn(async () => "file:///card.png") }));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

/* SDK 57 `File`/`Paths` API'si. `File`in kurucusu dizin + ad alır ve `uri` üretir; gerçek
   dosya yazımı taklit edilmez (çağrıldığı doğrulanır, diske dokunulmaz). */
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache/" },
  File: class {
    uri: string;
    constructor(dir: { toString?: () => string } | string, name: string) {
      this.uri = `${String(dir)}${name}`;
    }
    write = jest.fn();
    delete = jest.fn();
  },
}));

jest.mock("react-native-qrcode-svg", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View };
});

jest.mock("expo-camera", () => {
  const { View } = require("react-native");
  return { CameraView: View, useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]) };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View };
});
