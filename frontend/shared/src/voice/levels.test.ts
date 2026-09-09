import { describe, expect, it, vi } from "vitest";

import { createSpeechGate } from "./levels";

describe("createSpeechGate", () => {
  it("eşik üstü seviye bir kez konuşma bildirir, tutma bitince kapatır", () => {
    let t = 0;
    const onSpeaking = vi.fn();
    const gate = createSpeechGate(onSpeaking, { threshold: 0.02, holdMs: 300, now: () => t });

    gate.push("b", 0.1);
    gate.push("b", 0.1);
    expect(onSpeaking).toHaveBeenCalledTimes(1);
    expect(onSpeaking).toHaveBeenCalledWith("b", true);

    t = 200;
    gate.push("b", 0);
    expect(onSpeaking).toHaveBeenCalledTimes(1); // tutma penceresi

    t = 400;
    gate.push("b", 0);
    expect(onSpeaking).toHaveBeenLastCalledWith("b", false);
  });

  it("remove konuşan birini kapatır; clear hiç bildirim yaymaz", () => {
    const onSpeaking = vi.fn();
    const gate = createSpeechGate(onSpeaking, { now: () => 0 });

    gate.push("b", 0.5);
    gate.push("k", 0.5);
    expect(onSpeaking).toHaveBeenCalledTimes(2);

    gate.remove("b");
    expect(onSpeaking).toHaveBeenLastCalledWith("b", false);
    // Aynı id ikinci kez silinince tekrar bildirim YOK.
    gate.remove("b");
    expect(onSpeaking).toHaveBeenCalledTimes(3);

    // `close()` yolunda dinleyici zaten kapanıyor — kapanışta sahte "sustu" olayı yayılmaz.
    gate.clear();
    expect(onSpeaking).toHaveBeenCalledTimes(3);
  });
});
