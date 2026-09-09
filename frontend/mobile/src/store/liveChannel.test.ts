import { liveChannel, sessionTopic, voiceInbox, voiceSignal } from "./liveChannel";

/**
 * STOMP kanalı — RN portu.
 *
 * Mobilde ÇEREZ YOK: katılımcı kimliği el sıkışmaya `X-Participant-Token` BAŞLIĞIYLA girer ve
 * bunun tek yolu `webSocketFactory`dir (`brokerURL` başlık kabul etmez). Bu dosya sözleşmeyi
 * sahte soketle sınar; gerçek el sıkışma ve sinyal rölesi `scripts/ws-smoke.mjs` ile
 * canlı sunucuya karşı koşar (framework yapıştırıcısı testsiz bırakılmaz).
 */
type FakeClient = {
  activate: jest.Mock;
  deactivate: jest.Mock;
  publish: jest.Mock;
  subscribe: jest.Mock;
  connected: boolean;
  config: {
    webSocketFactory?: () => unknown;
    onConnect: () => void;
    onWebSocketClose: () => void;
  };
};

const clients: FakeClient[] = [];

jest.mock("@stomp/stompjs", () => ({
  Client: jest.fn().mockImplementation((config) => {
    const c: FakeClient = {
      config,
      connected: false,
      publish: jest.fn(),
      activate: jest.fn(() => {
        c.connected = true;
        config.onConnect();
      }),
      deactivate: jest.fn(async () => {
        c.connected = false;
      }),
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    };
    clients.push(c);
    return c;
  }),
}));

const sockets: { url: string; headers?: Record<string, string> }[] = [];

beforeEach(() => {
  clients.length = 0;
  sockets.length = 0;
  (global as unknown as { WebSocket: unknown }).WebSocket = class {
    constructor(url: string, _p?: unknown, o?: { headers?: Record<string, string> }) {
      sockets.push({ url, headers: o?.headers });
    }
  };
});

test("el sıkışma katılımcı token'ını BAŞLIKLA taşır (mobilde çerez yok)", () => {
  liveChannel.open(
    "x7k2m",
    "http://h:8060",
    () => "tok-1",
    () => undefined,
  );

  clients[0].config.webSocketFactory?.();

  expect(sockets[0].url).toBe("ws://h:8060/api/sessions/x7k2m/ws");
  expect(sockets[0].headers).toEqual({ "X-Participant-Token": "tok-1" });
});

test("kopukluk sonrası abonelik YENİDEN kurulur", () => {
  liveChannel.open(
    "x7k2m",
    "http://h:8060",
    () => "tok-1",
    () => undefined,
  );
  liveChannel.subscribe(sessionTopic("x7k2m"), () => undefined);
  expect(clients[0].subscribe).toHaveBeenCalledTimes(1);

  clients[0].config.onWebSocketClose();
  clients[0].config.onConnect();

  expect(clients[0].subscribe).toHaveBeenCalledTimes(2);
});

test("hedef adresleri sunucunun beklediği kalıplarda", () => {
  expect(sessionTopic("x7k2m")).toBe("/topic/session/x7k2m");
  expect(voiceInbox("x7k2m", "p1")).toBe("/topic/session/x7k2m/voice/p1");
  expect(voiceSignal("x7k2m")).toBe("/app/sessions/x7k2m/voice/signal");
});

test("yeni oturum ESKİ slug'ın aboneliğini taşımaz", () => {
  const closeA = liveChannel.open(
    "aaa",
    "http://h:8060",
    () => "t",
    () => undefined,
  );
  liveChannel.subscribe(sessionTopic("aaa"), () => undefined);
  closeA();

  liveChannel.open(
    "bbb",
    "http://h:8060",
    () => "t",
    () => undefined,
  );

  // İkinci istemci yalnız KENDİ oturumunun kayıtlarını açar — eski ses kutusu taşınmaz.
  expect(clients[1].subscribe).not.toHaveBeenCalled();
});

test("bağlı değilken publish false döner ve kuyruğa ALMAZ", () => {
  const close = liveChannel.open(
    "x7k2m",
    "http://h:8060",
    () => "t",
    () => undefined,
  );
  close();

  expect(liveChannel.publish(voiceSignal("x7k2m"), { to: "b" })).toBe(false);
  expect(clients[0].publish).not.toHaveBeenCalled();
});
