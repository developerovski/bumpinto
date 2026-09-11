import { api, rememberParticipantToken } from "../lib/api";
import { useSeatStore as store } from "./seatStore";

jest.mock("../lib/api", () => ({
  api: { mySeat: jest.fn(), requestSeat: jest.fn() },
  rememberParticipantToken: jest.fn(),
}));

const s = () => store.getState();
const mySeat = api.mySeat as jest.Mock;
const requestSeat = api.requestSeat as jest.Mock;
const conflict = (error: string) => ({ response: { status: 409, data: { error } } });

beforeEach(() => {
  jest.clearAllMocks();
  s().reset();
});

test("check: 404 → istek yok, 409 → plan kapandı; onaylıysa katılımcı jetonu `mine` gövdesinden saklanır", async () => {
  mySeat.mockRejectedValueOnce({ response: { status: 404 } });
  await s().check("gp");
  expect(s().seat).toBe("none");

  mySeat.mockRejectedValueOnce({ response: { status: 409 } });
  await s().check("gp");
  expect(s().seat).toBe("closed");

  mySeat.mockResolvedValueOnce({ status: "APPROVED", participantToken: "TOK" });
  await s().check("gp");
  expect(s().seat).toBe("APPROVED");
  expect(rememberParticipantToken).toHaveBeenCalledWith("gp", "TOK");
});

/* Bekleyene WS konusu KAPALI, yoklama tek yol: ağ hatası bekleyen isteği "yok" sayarsa yoklama
   durur ve host'un onayı hiç fark edilmez. */
test("yoklamada ağ hatası BEKLEYEN durumu değiştirmez", async () => {
  mySeat.mockResolvedValueOnce({ status: "PENDING" });
  await s().check("gp");
  mySeat.mockRejectedValueOnce(new Error("Network Error"));
  await s().check("gp");
  expect(s().seat).toBe("PENDING");
});

/* OPEN plan koltuğu anında verir ama `requestSeat` yanıtı katılımcı jetonu TAŞIMAZ. */
test("OPEN istek anında onaylanır; jeton `mine`den alınır", async () => {
  store.setState({ slug: "gp", seat: "none" });
  requestSeat.mockResolvedValueOnce({ status: "APPROVED" });
  mySeat.mockResolvedValueOnce({ status: "APPROVED", participantToken: "TOK" });
  await s().request("gp", { displayName: "Priya" });
  expect(s().seat).toBe("APPROVED");
  expect(rememberParticipantToken).toHaveBeenCalledWith("gp", "TOK");
});

test("409 gövdeleri düz metin: dolu → errFull; zaten istenmiş → yeniden sorgu; kapandı → closed; host → oturumuna", async () => {
  store.setState({ slug: "gp", seat: "none" });

  requestSeat.mockRejectedValueOnce(conflict("plan full"));
  await s().request("gp", { displayName: "P" });
  expect(s().error).toBe("seat.errFull");

  requestSeat.mockRejectedValueOnce(conflict("already requested"));
  mySeat.mockResolvedValueOnce({ status: "PENDING" });
  await s().request("gp", { displayName: "P" });
  expect(s()).toMatchObject({ seat: "PENDING", error: null });

  store.setState({ seat: "none" });
  requestSeat.mockRejectedValueOnce(conflict("plan is closed"));
  await s().request("gp", { displayName: "P" });
  expect(s().seat).toBe("closed");

  // Host kendi planını Keşfet'ten açtı: koltuğu zaten var — oturum ekranı onu hesabından tanır.
  store.setState({ seat: "none" });
  requestSeat.mockRejectedValueOnce(conflict("host cannot request own plan"));
  await s().request("gp", { displayName: "P" });
  expect(s().seat).toBe("APPROVED");

  store.setState({ seat: "none" });
  requestSeat.mockRejectedValueOnce({ response: { status: 403, data: { error: "cannot request a seat in this plan" } } });
  await s().request("gp", { displayName: "P" });
  expect(s()).toMatchObject({ seat: "none", error: "seat.errRequest" });
});

test("plana bağlı: geç dönen ESKİ planın yanıtı yeni planın durumunu ezmez; reset temizler", async () => {
  let resolveOld: (v: unknown) => void = () => {};
  mySeat
    .mockReturnValueOnce(new Promise((r) => { resolveOld = r; }))
    .mockRejectedValueOnce({ response: { status: 404 } });
  const old = s().check("old");
  await s().check("new");
  resolveOld({ status: "APPROVED", participantToken: "X" });
  await old;
  expect(s()).toMatchObject({ slug: "new", seat: "none" });

  s().reset();
  expect(s()).toMatchObject({ slug: null, seat: "loading", error: null, busy: false });
});
