import { AppState } from "react-native";

import { useVoiceStore } from "../store/voiceStore";
import { watchAppBackground } from "./backgroundGuard";

/**
 * Arka planda susma — O7'de kullanıcıya VERİLEN söz ("Uygulama arka plandayken susar").
 *
 * Gerçek ön/arka plan geçişi bir framework yapıştırıcısıdır ve burada doğrulanmış SAYILMAZ;
 * cihazda Maestro/el testiyle koşar. Burada sınanan: olay geldiğinde doğru çağrı yapılıyor mu.
 */
jest.mock("../store/voiceStore", () => ({
  useVoiceStore: { getState: jest.fn() },
}));

const setBackgroundMuted = jest.fn();

function fire(state: string) {
  const handler = jest.mocked(AppState.addEventListener).mock.calls.at(-1)?.[1] as (
    s: string,
  ) => void;
  handler(state);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useVoiceStore.getState).mockReturnValue({
    phase: "in",
    setBackgroundMuted,
  } as never);
});

test("arka plana geçince mikrofon susar, öne dönünce açılır", () => {
  watchAppBackground();

  fire("background");
  expect(setBackgroundMuted).toHaveBeenCalledWith(true);

  fire("active");
  expect(setBackgroundMuted).toHaveBeenLastCalledWith(false);
});

test("sesli sohbette DEĞİLKEN hiçbir şey yapılmaz", () => {
  jest.mocked(useVoiceStore.getState).mockReturnValue({
    phase: "idle",
    setBackgroundMuted,
  } as never);
  watchAppBackground();

  fire("background");

  expect(setBackgroundMuted).not.toHaveBeenCalled();
});

test("abonelik kaldırılabilir", () => {
  const remove = jest.fn();
  jest.mocked(AppState.addEventListener).mockReturnValueOnce({ remove } as never);

  watchAppBackground()();

  expect(remove).toHaveBeenCalled();
});
