import { beforeEach, describe, expect, it, vi } from "vitest";

type Sub = { destination: string; cb: (m: { body: string }) => void };

vi.mock("@stomp/stompjs", () => {
  class FakeClient {
    static last: FakeClient | null = null;
    connected = false;
    subs: Sub[] = [];
    onConnect: () => void;
    onWebSocketClose: () => void;
    subscribe = vi.fn((destination: string, cb: (m: { body: string }) => void) => {
      this.subs.push({ destination, cb });
      return { id: String(this.subs.length), unsubscribe: vi.fn() };
    });
    publish = vi.fn();
    activate = vi.fn();
    // Gerçek stompjs'te deactivate() soketi asenkron kapatır; mikro görevde drop() tetikleyip
    // bunu taklit ediyoruz (kapanış close()'un hemen ardından değil, sonra gelir).
    deactivate = vi.fn(() => Promise.resolve().then(() => this.drop()));
    constructor(opts: { onConnect: () => void; onWebSocketClose: () => void }) {
      this.onConnect = opts.onConnect;
      this.onWebSocketClose = opts.onWebSocketClose;
      FakeClient.last = this;
    }
    connect() {
      this.connected = true;
      this.onConnect();
    }
    drop() {
      this.connected = false;
      this.onWebSocketClose();
    }
  }
  return { Client: FakeClient };
});

type Fake = { last: { connected: boolean; subs: Sub[]; subscribe: ReturnType<typeof vi.fn>;
  publish: ReturnType<typeof vi.fn>; deactivate: ReturnType<typeof vi.fn>;
  connect(): void; drop(): void } | null };

describe("liveChannel", () => {
  beforeEach(() => {
    // Her testte modül durumu (client/registrations) ve mock istemci sınıfı sıfırdan kurulur —
    // testler arası sızıntı olmasın diye.
    vi.resetModules();
  });

  it("bağlanmadan kaydedilen abonelik bağlanınca kurulur, kopup gelince yeniden kurulur", async () => {
    const { Client } = await import("@stomp/stompjs");
    const { liveChannel } = await import("./liveChannel");
    const fake = () => (Client as unknown as Fake).last!;

    const handler = vi.fn();
    const unsubscribe = liveChannel.subscribe("/topic/session/x", handler);
    const onConnect = vi.fn();
    const close = liveChannel.open("x", onConnect);

    expect(fake().subscribe).not.toHaveBeenCalled();
    fake().connect();
    expect(fake().subscribe).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledTimes(1);
    fake().subs[0].cb({ body: "{\"type\":\"presence_changed\"}" });
    expect(handler).toHaveBeenCalledWith("{\"type\":\"presence_changed\"}");

    fake().drop();
    fake().connect();
    expect(fake().subscribe).toHaveBeenCalledTimes(2);

    const secondSub = fake().subscribe.mock.results[1].value as { unsubscribe: ReturnType<typeof vi.fn> };
    unsubscribe();
    expect(secondSub.unsubscribe).toHaveBeenCalledTimes(1);

    close();
  });

  it("bağlıyken eklenen abonelik hemen kurulur; unsubscribe yalnız bağlıyken çağrılır", async () => {
    const { Client } = await import("@stomp/stompjs");
    const { liveChannel } = await import("./liveChannel");
    const fake = () => (Client as unknown as Fake).last!;

    const close = liveChannel.open("x", () => undefined);
    fake().connect();
    const unsubscribe = liveChannel.subscribe("/topic/session/x/voice/a", () => undefined);
    expect(fake().subscribe).toHaveBeenCalledTimes(1);

    fake().drop();
    expect(() => unsubscribe()).not.toThrow();
    close();
  });

  it("publish bağlı değilken false döner, bağlıyken JSON gövde ile gider; close() sonrası deactivate çağrılır ve publish false döner", async () => {
    const { Client } = await import("@stomp/stompjs");
    const { liveChannel } = await import("./liveChannel");
    const fake = () => (Client as unknown as Fake).last!;

    const close = liveChannel.open("x", () => undefined);
    expect(liveChannel.publish("/app/sessions/x/voice/signal", { to: "h" })).toBe(false);

    fake().connect();
    expect(liveChannel.publish("/app/sessions/x/voice/signal", { to: "h", type: "offer" })).toBe(true);
    expect(fake().publish).toHaveBeenCalledWith({
      destination: "/app/sessions/x/voice/signal",
      body: "{\"to\":\"h\",\"type\":\"offer\"}",
      headers: { "content-type": "application/json" },
    });

    const openClient = fake();
    close();
    expect(openClient.deactivate).toHaveBeenCalledTimes(1);
    expect(liveChannel.publish("/app/sessions/x/voice/signal", { to: "h" })).toBe(false);
  });

  it("slug değişince eski kayıt yeni soketle taşınmaz; eski istemcinin geç kapanışı yeniyi bozmaz", async () => {
    const { Client } = await import("@stomp/stompjs");
    const { liveChannel } = await import("./liveChannel");
    const fake = () => (Client as unknown as Fake).last!;

    const closeA = liveChannel.open("a", () => undefined);
    fake().connect();
    liveChannel.subscribe("/topic/session/a", () => undefined);
    const clientA = fake();

    // close() -> deactivate() burada senkron dönmez; drop() mikro görevde bekliyor.
    closeA();
    const closeB = liveChannel.open("b", () => undefined);
    const clientB = fake();
    expect(clientB).not.toBe(clientA);

    const unsubscribeB = liveChannel.subscribe("/topic/session/b", () => undefined);
    clientB.connect();
    expect(clientB.subscribe).toHaveBeenCalledTimes(1);
    clientB.drop();
    clientB.connect();
    expect(clientB.subscribe).toHaveBeenCalledTimes(2);
    // A'nın gecikmiş onWebSocketClose'u ŞİMDİ düşsün — B'nin canlı aboneliğini bozmamalı.
    await Promise.resolve();
    await Promise.resolve();
    const subB = clientB.subscribe.mock.results[1].value as { unsubscribe: ReturnType<typeof vi.fn> };
    unsubscribeB();
    expect(subB.unsubscribe).toHaveBeenCalledTimes(1); // guard yoksa reg.sub null → çağrılmaz

    closeB();
  });

  it("değiştirilen eski istemcinin geç bağlanması yeni istemcinin kaydını çalmaz", async () => {
    const { Client } = await import("@stomp/stompjs");
    const { liveChannel } = await import("./liveChannel");
    const fake = () => (Client as unknown as Fake).last!;
    liveChannel.open("x", () => undefined);           // close() çağrılmadan ikinci open
    const clientA = fake();
    const closeB = liveChannel.open("x", () => undefined);
    const clientB = fake();
    expect(clientA.deactivate).toHaveBeenCalled();    // open() öncekini kapatır
    liveChannel.subscribe("/topic/session/x", () => undefined);
    clientB.connect();
    clientA.connect();                                 // geç bağlanan eski istemci
    expect(clientA.subscribe).not.toHaveBeenCalled();  // guard yoksa canlı kaydı kendine bağlardı
    expect(clientB.subscribe).toHaveBeenCalledTimes(1);
    closeB();
  });
});
