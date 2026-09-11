/* Ekran testleri `app/` altına KONULMAZ (K-M9). TEST BAŞINA TEK `render`. */

import { act, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";

import NewSessionScreen from "../../app/sessions/new";
import { api } from "../lib/api";
import { useLocationStore } from "../store/locationStore";
import { useNewSessionStore as store } from "../store/newSessionStore";
import { tap } from "../testUtils/interact";

jest.mock("../lib/api", () => ({
  api: {
    createSession: jest.fn(),
    geocode: jest.fn(),
    reverseGeocode: jest.fn(async () => ({ label: "Stratum" })),
  },
  rememberParticipantToken: jest.fn(),
}));
/* Konum okuması cihaz yapıştırıcısıdır; burada yalnız "yeniden okundu mu" sorusu sınanır. */
jest.mock("expo-location", () => ({
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 51.7, longitude: 5.3 } })),
  Accuracy: { Balanced: 3 },
}));

const params = useLocalSearchParams as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  params.mockReturnValue({});
  store.setState(store.getInitialState());
  useLocationStore.setState({ phase: "idle", point: null });
});

const selected = (label: string) => screen.getByLabelText(label).props.accessibilityState;

test("Grup: Şimdi → süre, Nerede, kişi, katılım (OPEN), Kim görsün (Arkadaşlar YOK); buluşma yeri seçimi gizli; konumsuz CTA kapalı; SOLO planı Belirsiz'e çeker", async () => {
  await render(<NewSessionScreen />);
  expect(selected("Belirsiz")).toMatchObject({ selected: true });
  expect(screen.queryByLabelText("Nerede?")).toBeNull();

  await tap("Şimdi");
  expect(screen.getByText("Buradayım")).toBeTruthy();
  expect(selected("2 sa")).toMatchObject({ selected: true });
  expect(screen.getByLabelText("Nerede?")).toBeTruthy();
  expect(screen.getByLabelText("Bir kişi artır")).toBeTruthy();
  expect(selected("Herkes gelebilir")).toMatchObject({ selected: true });
  expect(selected("Herkes")).toMatchObject({ selected: true });
  expect(screen.getByLabelText("Kimse")).toBeTruthy();
  expect(screen.queryByLabelText("Arkadaşlar")).toBeNull();
  expect(screen.queryByLabelText("Orta noktada")).toBeNull();
  // Çapa kuranın O ANKİ konumu: konum yokken kurulamaz ve NEDEN kapalı olduğu söylenir.
  expect(selected("Buradayım de")).toMatchObject({ disabled: true });
  expect(screen.getByText("Konumun henüz yok")).toBeTruthy();

  await tap("Bireysel");
  expect(screen.queryByLabelText("Şimdi")).toBeNull();
  expect(store.getState().plan.when).toBe("UNSET");
});

/* Spec §1.3 — W-18 incelemesinin Critical'ı: OPEN planda koltuk alan herkes çapayı kesin nokta
   olarak görür. Depo globaldir; saatler önce okunmuş bir nokta "şu an buradayım" değildir. */
test("?now=1 Şimdi'yi seçer; depodaki BAYAT nokta çapa olmaz — konum yeniden okunur", async () => {
  params.mockReturnValue({ now: "1" });
  useLocationStore.setState({ phase: "granted", point: { lat: 1, lng: 1, label: "eski" } });
  await render(<NewSessionScreen />);
  await waitFor(() =>
    expect(store.getState().origin).toEqual({ lat: 51.7, lng: 5.3, label: "Stratum" }),
  );
  expect(store.getState().plan.when).toBe("NOW");
});

test("?open=1&activity=SWIM Tarih seç'i ve tek türü seçer; tarih/saat ileri bir saatle dolar", async () => {
  params.mockReturnValue({ open: "1", activity: "SWIM" });
  await render(<NewSessionScreen />);
  await waitFor(() => expect(store.getState().plan.when).toBe("DATE"));
  expect(store.getState().activityTypes).toEqual(["SWIM"]);
  const { meetDate, meetTime } = store.getState().plan;
  expect(new Date(`${meetDate}T${meetTime}`).getTime()).toBeGreaterThan(Date.now());
  expect(screen.getByLabelText("Tarih")).toBeTruthy();
  expect(screen.getByLabelText("Saat")).toBeTruthy();
});

test("?open=1 ile gelen BİLİNMEYEN tür yok sayılır (sunucu 400 dönerdi)", async () => {
  params.mockReturnValue({ open: "1", activity: "NOPE" });
  await render(<NewSessionScreen />);
  await waitFor(() => expect(store.getState().plan.when).toBe("DATE"));
  expect(store.getState().activityTypes).toEqual([]);
});

/* Depo globaldir: "Yeni buluşma" önceki Şimdi/OPEN/Herkes taslağıyla açılsaydı tek dokunuş
   istenmemiş bir herkese açık plan yayınlardı. */
test("taze açılış önceki açık plan taslağını SIFIRLAR", async () => {
  store.setState({
    activityTypes: ["COFFEE"],
    plan: { ...store.getState().plan, when: "NOW", whereLabel: "Café Zwart" },
  });
  await render(<NewSessionScreen />);
  await waitFor(() => expect(store.getState().plan.when).toBe("UNSET"));
  expect(store.getState().plan.whereLabel).toBe("");
  expect(selected("Belirsiz")).toMatchObject({ selected: true });
});

/* O3 ön-ekranı `router.replace` ile YENİ ekran kurar: kullanıcı formun ortasındaydı, taslak kalır.
   Şimdi'de "adres yazayım" dönüşü adres modunu da korumalı (tazeleme onu kapatmamalı). */
test("konum ön-ekranından dönüş taslağı KORUR; Şimdi'de adres modu kapanmaz", async () => {
  params.mockReturnValue({ locationPermission: "manual" });
  store.setState({
    activityTypes: ["COFFEE"],
    plan: { ...store.getState().plan, when: "NOW", whereLabel: "Café Zwart" },
  });
  await render(<NewSessionScreen />);
  await act(async () => {});
  expect(store.getState().plan).toMatchObject({ when: "NOW", whereLabel: "Café Zwart" });
  expect(useLocationStore.getState().phase).toBe("manual");
});

/* `toCreateRequest` geçersiz planda FIRLATIR (çizim ile basış arasında saat geçebilir) — ekran
   anahtarı gösterir, genel "kurulamadı" hatasına düşmez ve sunucuya gitmez. */
test("gönderim anında plan geçersizleşirse o planın hata anahtarı gösterilir, oturum KURULMAZ", async () => {
  store.setState({
    activityTypes: ["COFFEE"],
    canSubmit: () => true,
    toRequest: () => {
      throw new Error("plan.errMeetAtPast");
    },
  });
  await render(<NewSessionScreen />);
  await tap("Buluşmayı kur");
  expect(screen.getByText("Buluşma saati geçmiş olamaz.")).toBeTruthy();
  expect(api.createSession).not.toHaveBeenCalled();
});
