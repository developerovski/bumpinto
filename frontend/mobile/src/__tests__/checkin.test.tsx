/* Ekran testleri `app/` altına KONULMAZ (K-M9). TEST BAŞINA TEK `render`.
   Artboard P5 ("Buluştunuz mu?") + P5b (rozet anı). */

import { act, render, screen, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

import CheckinPrompt from "../components/organisms/CheckinPrompt";
import { api, forgetParticipantToken, hasParticipantToken, rememberParticipantToken } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useMeStore } from "../store/meStore";
import { tap } from "../testUtils/interact";

jest.mock("../lib/api", () => ({
  api: { checkin: jest.fn(), me: jest.fn(), join: jest.fn() },
  hasParticipantToken: jest.fn(() => true),
  rememberParticipantToken: jest.fn(),
  forgetParticipantToken: jest.fn(),
}));

const KEY = "bumpinto.checkin.gp";
const forbidden = { response: { status: 403, data: { error: "participant token required" } } };
const view = {
  slug: "gp",
  name: "Pazar yürüyüşü",
  status: "DECIDED" as const,
  participants: [
    { id: "p0", displayName: "Ayşe", host: true },
    { id: "p1", displayName: "M", host: false },
  ],
  viewer: { participantId: "p1", host: false },
  openPlan: {
    meetAt: "2026-09-09T08:00:00Z", capacity: 4, approvedSeats: 3, confirmed: true, meetPassed: true,
    joinPolicy: "APPROVAL" as const,
  },
};

beforeEach(async () => {
  jest.clearAllMocks();
  (hasParticipantToken as jest.Mock).mockReturnValue(true);
  await SecureStore.deleteItemAsync(KEY);
  useAuthStore.setState({ status: "in", userId: "u1" });
  useMeStore.setState({ me: { id: "u1", displayName: "M", stats: { plansMet: 2, metStreakWeeks: 0 } }, error: null });
});

const asked = () => waitFor(() => expect(screen.getByText("Buluştunuz mu?")).toBeTruthy());

test("buluşma geçince sorulur; 'Evet' check-in atar ve İŞARETLER; yeni rozet → kutlama + haptik", async () => {
  (api.checkin as jest.Mock).mockResolvedValue(undefined);
  (api.me as jest.Mock).mockResolvedValue({ id: "u1", displayName: "M", stats: { plansMet: 3, metStreakWeeks: 0 } });
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Evet, buluştuk");
  await waitFor(() => expect(screen.getByText("3 buluşma!")).toBeTruthy());
  expect(screen.getByText(/Bir sonraki: 10 buluşma/)).toBeTruthy();
  expect(api.checkin).toHaveBeenCalledWith("gp", true);
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  expect(await SecureStore.getItemAsync(KEY)).toBe("1");
});

test("yeni rozet yoksa kutlama da haptik de yok", async () => {
  (api.checkin as jest.Mock).mockResolvedValue(undefined);
  (api.me as jest.Mock).mockResolvedValue({ id: "u1", displayName: "M", stats: { plansMet: 2, metStreakWeeks: 0 } });
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Evet, buluştuk");
  await waitFor(() => expect(api.me).toHaveBeenCalled());
  await act(async () => {});
  expect(screen.queryByText("yeni rozet")).toBeNull();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

/* T4 inceleme: "önce" listesi okunamazsa kullanıcının ZATEN sahip olduğu her rozet yeni sayılırdı
   (8 buluşmalı kullanıcıya "İlk buluşma!"). Fark ancak iki uç da okunmuşsa hesaplanır. */
test("ilk profil yüklemesi düşerse eski rozetler 'yeni' sayılmaz", async () => {
  useMeStore.setState({ me: null, error: null });
  (api.me as jest.Mock)
    .mockRejectedValueOnce(new Error("Network Error"))
    .mockResolvedValue({ id: "u1", displayName: "M", stats: { plansMet: 8, metStreakWeeks: 0 } });
  (api.checkin as jest.Mock).mockResolvedValue(undefined);
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Evet, buluştuk");
  await waitFor(async () => expect(await SecureStore.getItemAsync(KEY)).toBe("1"));
  await act(async () => {});
  expect(screen.queryByText("yeni rozet")).toBeNull();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

/* Kapatmak bu açılışlık gizler; bir sonraki açılışta yine sorulur. Yalnız CEVAP işaretler. */
test("kapatmak İŞARETLEMEZ ve check-in atmaz", async () => {
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Kapat");
  expect(api.checkin).not.toHaveBeenCalled();
  expect(await SecureStore.getItemAsync(KEY)).toBeNull();
});

test("cevaplanmış plan bir daha sorulmaz", async () => {
  await SecureStore.setItemAsync(KEY, "1");
  await render(<CheckinPrompt view={view} />);
  await waitFor(() => expect(SecureStore.getItemAsync).toHaveBeenCalledWith(KEY));
  await act(async () => {});
  expect(screen.queryByText("Buluştunuz mu?")).toBeNull();
});

test("hesapsız katılımcı: cevap işaretlenir, profil/rozet sorulmaz", async () => {
  useAuthStore.setState({ status: "out", userId: null });
  (api.checkin as jest.Mock).mockResolvedValue(undefined);
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Evet, buluştuk");
  await waitFor(async () => expect(await SecureStore.getItemAsync(KEY)).toBe("1"));
  expect(api.me).not.toHaveBeenCalled();
});

/* Check-in katılımcı jetonu ister (yoksa 403); mobilde jeton bellektedir ve yeniden başlatmada düşer. */
test("katılımcı jetonu bellekte yoksa check-in'den ÖNCE onarılır", async () => {
  useAuthStore.setState({ status: "out", userId: null });
  (hasParticipantToken as jest.Mock).mockReturnValue(false);
  (api.join as jest.Mock).mockResolvedValue({ participantToken: "T" });
  (api.checkin as jest.Mock).mockResolvedValue(undefined);
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Olmadı");
  await waitFor(() => expect(api.checkin).toHaveBeenCalledWith("gp", false));
  expect(rememberParticipantToken).toHaveBeenCalledWith("gp", "T");
  expect((api.join as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
    (api.checkin as jest.Mock).mock.invocationCallOrder[0],
  );
});

/* T4 inceleme (Critical): onarım düşerse çağrı jetonsuz gider, 403 alır ve eski kod bunu KALICI
   sayıp işaretliyordu — cevap sunucuya hiç yazılmadan soru sonsuza dek susardı. */
test("jeton onarılamazsa check-in ATILMAZ, işaretlenmez, tekrar denenebilir", async () => {
  useAuthStore.setState({ status: "out", userId: null });
  (hasParticipantToken as jest.Mock).mockReturnValue(false);
  (api.join as jest.Mock).mockRejectedValue(new Error("Network Error"));
  (api.checkin as jest.Mock).mockRejectedValue(forbidden);
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Olmadı");
  await waitFor(() => expect(screen.getByText("Cevabın kaydedilemedi — tekrar dene.")).toBeTruthy());
  expect(api.checkin).not.toHaveBeenCalled();
  expect(await SecureStore.getItemAsync(KEY)).toBeNull();
});

/* Bellekteki jeton 24 saati aşmış olabilir: sunucu onu sessizce yok sayar ve 403 döner. */
test("403'te bayat jeton atılır, onarılır ve BİR KEZ yeniden denenir; başarıda işaretlenir", async () => {
  useAuthStore.setState({ status: "out", userId: null });
  (hasParticipantToken as jest.Mock).mockReturnValueOnce(true).mockReturnValue(false);
  (api.join as jest.Mock).mockResolvedValue({ participantToken: "T2" });
  (api.checkin as jest.Mock).mockRejectedValueOnce(forbidden).mockResolvedValueOnce(undefined);
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Olmadı");
  await waitFor(async () => expect(await SecureStore.getItemAsync(KEY)).toBe("1"));
  expect(forgetParticipantToken).toHaveBeenCalledWith("gp");
  expect(rememberParticipantToken).toHaveBeenCalledWith("gp", "T2");
  expect(api.checkin).toHaveBeenCalledTimes(2);
});

test("onarımdan SONRA da 403 → gerçekten koltuk yok: kalıcı, işaretlenir", async () => {
  useAuthStore.setState({ status: "out", userId: null });
  (hasParticipantToken as jest.Mock).mockReturnValueOnce(true).mockReturnValue(false);
  (api.join as jest.Mock).mockResolvedValue({ participantToken: "T2" });
  (api.checkin as jest.Mock).mockRejectedValue(forbidden);
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Olmadı");
  await waitFor(async () => expect(await SecureStore.getItemAsync(KEY)).toBe("1"));
  expect(api.checkin).toHaveBeenCalledTimes(2);
});

test("409 (sunucuya göre henüz geçmedi) işaretlemez, hata basar, tekrar denenebilir", async () => {
  (api.checkin as jest.Mock).mockRejectedValueOnce({ response: { status: 409 } });
  await render(<CheckinPrompt view={view} />);
  await asked();
  await tap("Olmadı");
  await waitFor(() => expect(screen.getByText("Cevabın kaydedilemedi — tekrar dene.")).toBeTruthy());
  expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  expect(screen.getByLabelText("Olmadı").props.accessibilityState).toMatchObject({ disabled: false });
});

test("buluşma geçmediyse sorulmaz", async () => {
  await render(<CheckinPrompt view={{ ...view, openPlan: { ...view.openPlan, meetPassed: false } }} />);
  await act(async () => {});
  expect(screen.queryByText("Buluştunuz mu?")).toBeNull();
});
