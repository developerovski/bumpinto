/* Ekran testleri `app/` altına KONULMAZ (K-M9). TEST BAŞINA TEK `render`. */

import { render, screen, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";

import PrefsSheet from "../../app/(sheets)/prefs";
import { api } from "../lib/api";
import { useMeStore } from "../store/meStore";
import { tap } from "../testUtils/interact";

jest.mock("../lib/api", () => ({ api: { updateMe: jest.fn(), me: jest.fn() } }));

const params = useLocalSearchParams as jest.Mock;
const state = (label: string) => screen.getByLabelText(label).props.accessibilityState;

beforeEach(() => {
  jest.clearAllMocks();
  params.mockReturnValue({ field: "interests" });
  useMeStore.setState({
    me: { displayName: "M", interests: ["COFFEE", "FOOD", "BAR", "WALK"] },
    error: null,
    saving: false,
  });
});

/* Keşfet ilgi alanlarını varsayılan süzgeç yapar (B-17); sunucu sınırı 5. Tek seçimli tercihlerin
   aksine sayfa seçimde KAPANMAZ. */
test("ilgi alanları çoklu seçilir, EN ÇOK 5; sayfa açık kalır; kayıt gövdesi yeni listeyi taşır", async () => {
  (api.updateMe as jest.Mock).mockImplementation(async (body: { interests?: string[] }) => ({
    displayName: "M",
    interests: body.interests,
  }));
  await render(<PrefsSheet />);
  expect(screen.getByText("Keşfet bunları önce gösterir · en çok 5")).toBeTruthy();

  await tap("Yüzme");
  await waitFor(() =>
    expect(api.updateMe).toHaveBeenCalledWith(
      expect.objectContaining({ interests: ["COFFEE", "FOOD", "BAR", "WALK", "SWIM"] }),
    ),
  );
  await waitFor(() => expect(state("Sinema")).toMatchObject({ disabled: true }));
  expect(state("Yüzme")).toMatchObject({ selected: true, disabled: false });
  expect(router.back).not.toHaveBeenCalled();
});

/* İyimser seçim: kayıt düşerse ekran SUNUCUNUN ONAYLADIĞI listeye döner — kullanıcı kaydedildiğini
   sanmasın. */
test("kayıt başarısızsa seçim sunucunun onayladığı listeye DÖNER ve hata söylenir", async () => {
  (api.updateMe as jest.Mock).mockRejectedValue(new Error("500"));
  await render(<PrefsSheet />);
  await tap("Yüzme");
  await waitFor(() => expect(state("Yüzme")).toMatchObject({ selected: false }));
  expect(screen.getByText("Kaydedilemedi — tekrar dene.")).toBeTruthy();
});

/* T5 inceleme: kilit bileşende yaşıyordu — sayfa kapanıp yeniden açılınca yeni seçici kilitsiz ve
   ESKİ listeyle başlıyor, uçuştaki kaydın üstüne eski listeden kurulmuş ikinci bir kayıt atılabiliyordu. */
test("başka bir açılıştan kalan kayıt SÜRERKEN çipler kilitli, ikinci kayıt atılmaz", async () => {
  useMeStore.setState({ saving: true });
  await render(<PrefsSheet />);
  expect(state("Yüzme")).toMatchObject({ disabled: true });
  expect(state("Kahve")).toMatchObject({ disabled: true });
  await tap("Yüzme");
  expect(api.updateMe).not.toHaveBeenCalled();
});
