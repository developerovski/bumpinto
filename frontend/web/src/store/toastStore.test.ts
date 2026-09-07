import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToastStore } from "./toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });
  afterEach(() => vi.useRealTimers());

  it("anahtar + parametreyi kuyruğa koyar, 5 sn sonra düşürür", () => {
    useToastStore.getState().push("social.blocked", { name: "Kerem" });
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      messageKey: "social.blocked",
      params: { name: "Kerem" },
      tone: "grass",
    });
    vi.advanceTimersByTime(5000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("aynı anahtar tekrarlanmaz; dismiss zamanlayıcıyı beklemez", () => {
    const { push, dismiss } = useToastStore.getState();
    push("presence.nudged");
    push("presence.nudged");
    push("social.error", {}, "flame");
    expect(useToastStore.getState().toasts).toHaveLength(2);
    dismiss(useToastStore.getState().toasts[0].id);
    expect(useToastStore.getState().toasts.map((toast) => toast.tone)).toEqual(["flame"]);
  });
});
