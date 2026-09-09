import { describe, expect, it, vi } from "vitest";

import { createWebAudioSink } from "./voiceMesh";

/**
 * Web ses adaptörü — mesh'ten buraya taşınan DOM davranışının yeni evi.
 *
 * Mesh artık `<audio>` bilmiyor (mantık `@bumpinto/shared/voice`'ta, platformsuz); tarayıcıya
 * özgü olan her şey — gizli eleman, `playsinline`, autoplay reddi — bu dosyada sınanır.
 */
const emptyStream = { getTracks: () => [], getAudioTracks: () => [] };

describe("createWebAudioSink", () => {
  it("gizli <audio> body'ye eklenir, akış çalınır, stop DOM'dan kaldırır", () => {
    document.body.replaceChildren();
    const sink = createWebAudioSink("b");
    const el = document.body.querySelector("audio") as HTMLAudioElement;

    expect(el.getAttribute("playsinline")).toBe("");
    expect(el.hidden).toBe(true);
    el.play = vi.fn(() => Promise.resolve());
    el.pause = vi.fn();

    sink.play(emptyStream);
    expect(el.play).toHaveBeenCalled();

    sink.setMuted(true);
    expect(el.muted).toBe(true);

    sink.stop();
    expect(document.body.querySelector("audio")).toBeNull();
  });

  it("autoplay reddi yutulmaz — onWarn çağrılır", async () => {
    document.body.replaceChildren();
    const onWarn = vi.fn();
    const sink = createWebAudioSink("b", onWarn);
    const el = document.body.querySelector("audio") as HTMLAudioElement;
    el.play = vi.fn(() => Promise.reject(new Error("NotAllowedError")));

    sink.play(emptyStream);
    await Promise.resolve();
    await Promise.resolve();

    expect(onWarn).toHaveBeenCalledWith("voice audio play rejected", "b", expect.any(Error));
  });
});
