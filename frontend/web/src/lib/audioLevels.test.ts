import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLevelSampler, sharedAudioContext } from "./audioLevels";

/** 128 = sessizlik; 160 → RMS 0.25 (eşik 0.02'nin çok üstü). */
function fakeContext() {
  let level = 128;
  const analyser = {
    fftSize: 0,
    getByteTimeDomainData: (buffer: Uint8Array) => buffer.fill(level),
  };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = {
    createMediaStreamSource: vi.fn(() => source),
    createAnalyser: vi.fn(() => analyser),
    close: vi.fn(),
  } as unknown as AudioContext;
  return { context, source, setLevel: (v: number) => { level = v; } };
}

/** vi.stubGlobal ile kurulan sahte AudioContext: sharedAudioContext() bunu kaç kez açtığını
    görmek için constructor'ı örnek sayısını sayar. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = "suspended";
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
  createAnalyser = vi.fn(() => ({ fftSize: 0, getByteTimeDomainData: vi.fn() }));
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

describe("createLevelSampler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("eşik üstü ses konuşmayı bir kez bildirir, sessizlik tutma süresinden sonra kapatır", () => {
    const { context, setLevel } = fakeContext();
    const onSpeaking = vi.fn();
    const sampler = createLevelSampler(onSpeaking, { context, intervalMs: 200, holdMs: 300 });
    sampler.attach("a", {} as MediaStream);

    setLevel(160);
    vi.advanceTimersByTime(200);
    vi.advanceTimersByTime(200);
    expect(onSpeaking).toHaveBeenCalledTimes(1);
    expect(onSpeaking).toHaveBeenCalledWith("a", true);

    setLevel(128);
    vi.advanceTimersByTime(200); // 200 ms sessiz: tutma içinde, hâlâ konuşuyor
    expect(onSpeaking).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200); // 400 ms sessiz: tutma bitti
    expect(onSpeaking).toHaveBeenLastCalledWith("a", false);
    sampler.close();
  });

  it("detach konuşan kişiyi kapatır, close ENJEKTE EDİLMİŞ bağlamı kapatmaz", () => {
    const { context, source, setLevel } = fakeContext();
    const onSpeaking = vi.fn();
    const sampler = createLevelSampler(onSpeaking, { context, intervalMs: 200 });
    sampler.attach("a", {} as MediaStream);
    setLevel(160);
    vi.advanceTimersByTime(200);

    sampler.detach("a");
    expect(onSpeaking).toHaveBeenLastCalledWith("a", false);
    expect(source.disconnect).toHaveBeenCalled();

    sampler.close();
    // Paylaşılan bağlam (voiceStore singleton'ı) kapatılırsa diğer tüm ses akışları da suskun kalır.
    expect((context as unknown as { close: ReturnType<typeof vi.fn> }).close).not.toHaveBeenCalled();
  });

  it("sharedAudioContext tek örneği paylaşır, askıdaysa her istekte resume dener", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const a = sharedAudioContext();
    const b = sharedAudioContext();
    expect(a).toBe(b);
    expect(FakeAudioContext.instances).toHaveLength(1); // tek bağlam, tek kez açılır
    expect((a as unknown as FakeAudioContext).resume).toHaveBeenCalledTimes(2); // her istekte tekrar denenir

    // context enjekte edilmediyse createLevelSampler paylaşılanı kullanır, close() onu ASLA kapatmaz.
    const sampler = createLevelSampler(vi.fn());
    sampler.close();
    expect((a as unknown as FakeAudioContext).close).not.toHaveBeenCalled();
  });
});
