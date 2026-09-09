import type { MeshPeerConnection } from "@bumpinto/shared";

import { createStatsLevelSampler } from "./statsLevels";

const pc = (entries: object[]) =>
  ({
    getStats: jest.fn(async () => ({
      forEach: (cb: (e: never) => void) => entries.forEach(cb as never),
    })),
  }) as unknown as MeshPeerConnection;

test("inbound-rtp audioLevel peer'e, media-source audioLevel kendine yazılır", async () => {
  const onSpeaking = jest.fn();
  const sampler = createStatsLevelSampler(onSpeaking, { selfId: "me", now: () => 0 });

  sampler.attachPeer?.(
    "b",
    pc([
      { type: "inbound-rtp", kind: "audio", audioLevel: 0.4 },
      { type: "media-source", kind: "audio", audioLevel: 0.5 },
    ]),
  );
  await sampler.tick();

  expect(onSpeaking).toHaveBeenCalledWith("b", true);
  expect(onSpeaking).toHaveBeenCalledWith("me", true);
  sampler.close();
});

test("detach konuşan peer'i susturur", async () => {
  const onSpeaking = jest.fn();
  const sampler = createStatsLevelSampler(onSpeaking, { selfId: "me", now: () => 0 });
  sampler.attachPeer?.("b", pc([{ type: "inbound-rtp", kind: "audio", audioLevel: 0.4 }]));
  await sampler.tick();
  onSpeaking.mockClear();

  sampler.detach("b");

  expect(onSpeaking).toHaveBeenCalledWith("b", false);
  sampler.close();
});

test("getStats fırlatırsa tick REDDETMEZ, örnekleyici ayakta kalır", async () => {
  const onSpeaking = jest.fn();
  const sampler = createStatsLevelSampler(onSpeaking, { selfId: "me", now: () => 0 });
  sampler.attachPeer?.("b", {
    getStats: jest.fn(async () => {
      throw new Error("closed");
    }),
  } as unknown as MeshPeerConnection);

  await expect(sampler.tick()).resolves.toBeUndefined();
  // Kapanan bağlantı kendi halkamızı da düşürmemeli: "kimse yok" turu sessizlik yazar.
  expect(onSpeaking).not.toHaveBeenCalledWith("me", true);
  sampler.close();
});
