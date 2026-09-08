import * as Haptics from "expo-haptics";

import { api } from "../lib/api";
import { useDeckStore as store } from "./deckStore";

/**
 * Deste durumu — iyimser ilerleme, sunucuya yazma ve geri alma.
 *
 * Kaydırma GEOMETRİSİ burada sınanmaz: eşik/dönme/karar `@bumpinto/shared/swipeMath`ta
 * yaşar ve orada test edilir (ikinci eşik tanımı yasak, plan42 bağlayıcı kuralı).
 */

jest.mock("../lib/api", () => ({
  api: {
    swipe: jest.fn(async () => undefined),
    undoSwipe: jest.fn(async () => undefined),
    deckDone: jest.fn(async () => undefined),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  store.getState().start("x7k2m", [{ id: "a" }, { id: "b" }] as never);
});

test("beğeni: haptik + sunucuya yazma + sonraki kart", async () => {
  await store.getState().decide("right");

  expect(Haptics.impactAsync).toHaveBeenCalled();
  expect(api.swipe).toHaveBeenCalledWith("x7k2m", { venueId: "a", liked: true });
  expect(store.getState().index).toBe(1);
  expect(store.getState().liked).toEqual(["a"]);
});

test("geri al son kararı siler ve sunucudan kaldırır", async () => {
  await store.getState().decide("right");
  await store.getState().undo();

  expect(api.undoSwipe).toHaveBeenCalledWith("x7k2m", "a");
  expect(store.getState().index).toBe(0);
  expect(store.getState().liked).toEqual([]);
});
