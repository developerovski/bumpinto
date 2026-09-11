import * as Haptics from "expo-haptics";

import { api } from "../lib/api";
import { emitSessionEvent } from "./liveEvents";
import { useSeatRequestsStore as store } from "./seatRequestsStore";
import { useToastStore } from "./toastStore";

jest.mock("../lib/api", () => ({
  api: { seatRequests: jest.fn(), approveSeat: jest.fn(), declineSeat: jest.fn() },
}));

const s = () => store.getState();
const seatRequests = api.seatRequests as jest.Mock;
const approveSeat = api.approveSeat as jest.Mock;

const list = {
  approvedSeats: 2,
  capacity: 4,
  confirmed: false,
  requests: [
    { id: "r1", displayName: "Tomás", status: "PENDING" },
    { id: "r0", displayName: "Priya", status: "APPROVED" },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  s().reset();
  useToastStore.setState({ toasts: [] });
});

test("onay TAM listeyi döner (ikinci GET yok); yeter sayıyı geçiren onay damgayı o satıra bağlar; haptik", async () => {
  seatRequests.mockResolvedValueOnce(list);
  await s().load("gp");
  approveSeat.mockResolvedValueOnce({
    ...list,
    approvedSeats: 3,
    confirmed: true,
    requests: list.requests.map((r) => ({ ...r, status: "APPROVED" })),
  });
  await s().approve("gp", "r1");
  expect(s().list?.confirmed).toBe(true);
  expect(s().confirmedBy).toBe("r1");
  expect(seatRequests).toHaveBeenCalledTimes(1);
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
});

/* Gövdeler düz metin (`SeatRequests`): "already decided" = başka cihazdan karar verildi — hata
   değil, liste bayat; "plan full" kullanıcıya söylenir. */
test("409 düz metin: 'already decided' sessizce tazeler; 'plan full' Plan doldu bildirimi basar", async () => {
  seatRequests.mockResolvedValue(list);
  await s().load("gp");

  approveSeat.mockRejectedValueOnce({ response: { status: 409, data: { error: "already decided" } } });
  await s().approve("gp", "r1");
  expect(seatRequests).toHaveBeenCalledTimes(2);
  expect(useToastStore.getState().toasts).toHaveLength(0);

  approveSeat.mockRejectedValueOnce({ response: { status: 409, data: { error: "plan full" } } });
  await s().approve("gp", "r1");
  expect(useToastStore.getState().toasts.map((t) => t.messageKey)).toEqual(["seat.errFull"]);
});

test("plana bağlı: geç dönen ESKİ planın listesi yeni planda basılmaz; reset temizler", async () => {
  let resolveOld: (v: unknown) => void = () => {};
  seatRequests
    .mockReturnValueOnce(new Promise((r) => { resolveOld = r; }))
    .mockResolvedValueOnce({ ...list, requests: [] });
  const old = s().load("old");
  await s().load("new");
  resolveOld(list);
  await old;
  expect(s().slug).toBe("new");
  expect(s().list?.requests).toEqual([]);

  s().reset();
  expect(s()).toMatchObject({ slug: null, list: null, busy: null, confirmedBy: null });
});

/* Zil oturumun TÜM koltuklu abonelerine gider; liste ucu host'a özel ve hesap kimliği ister —
   üye 403, hesapsız host 401 (→ çıkış kesicisi) alırdı. Kapıyı çağıran verir. */
test("seat_requests_changed zili yalnız kapı açıkken tazeler; başka olayı yok sayar; bırakılınca dinlemez", () => {
  seatRequests.mockResolvedValue(list);
  let allowed = false;
  const stop = s().listen("gp", () => allowed);

  emitSessionEvent({ type: "seat_requests_changed" });
  expect(seatRequests).not.toHaveBeenCalled();

  allowed = true;
  emitSessionEvent({ type: "participant_joined" });
  expect(seatRequests).not.toHaveBeenCalled();

  emitSessionEvent({ type: "seat_requests_changed" });
  expect(seatRequests).toHaveBeenCalledWith("gp");

  stop();
  emitSessionEvent({ type: "seat_requests_changed" });
  expect(seatRequests).toHaveBeenCalledTimes(1);
});
