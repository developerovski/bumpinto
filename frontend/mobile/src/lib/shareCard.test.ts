import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import { captureRef } from "react-native-view-shot";

import { CARD_H, CARD_W, captureShareCard, shareCard } from "./shareCard";

const mock = (fn: unknown) => fn as jest.Mock;
const ref = { current: {} } as never;

beforeEach(() => jest.clearAllMocks());

test("1080×1920 yakalar; çizim çökerse null döner", async () => {
  mock(captureRef).mockResolvedValue("file:///card.png");
  expect(await captureShareCard(ref)).toBe("file:///card.png");
  expect(captureRef).toHaveBeenCalledWith(
    ref,
    expect.objectContaining({ format: "png", width: CARD_W, height: CARD_H, quality: 1 }),
  );
  expect([CARD_W, CARD_H]).toEqual([1080, 1920]);

  mock(captureRef).mockRejectedValue(new Error("surface"));
  expect(await captureShareCard(ref)).toBeNull();
});

test("dosya paylaşımı varsa görsel, yoksa metin paylaşılır", async () => {
  mock(Sharing.isAvailableAsync).mockResolvedValue(true);
  expect(await shareCard("file:///card.png", "metin", "Başlık")).toBe("shared");
  expect(Sharing.shareAsync).toHaveBeenCalledWith(
    "file:///card.png",
    expect.objectContaining({ mimeType: "image/png", UTI: "public.png" }),
  );

  mock(Sharing.isAvailableAsync).mockResolvedValue(false);
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  expect(await shareCard(null, "metin", "Başlık")).toBe("text");
  expect(share).toHaveBeenCalledWith({ message: "metin" }, { dialogTitle: "Başlık" });
  share.mockRestore();
});

/* Görsel üretilemediyse paylaşım sayfası HİÇ sorulmaz: doğrudan metin yolu işler. */
test("uri null ise dosya paylaşımı sorulmadan metne düşülür", async () => {
  mock(Sharing.isAvailableAsync).mockResolvedValue(true);
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  expect(await shareCard(null, "metin", "Başlık")).toBe("text");
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  share.mockRestore();
});

test("paylaşım sayfası hata verirse 'failed' döner, çökmez", async () => {
  mock(Sharing.isAvailableAsync).mockResolvedValue(true);
  mock(Sharing.shareAsync).mockRejectedValue(new Error("cancel"));
  expect(await shareCard("file:///card.png", "metin", "Başlık")).toBe("failed");
});
