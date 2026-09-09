import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { Share, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

/** Dikey story ölçüsü (piksel). `ShareCardImage` bu oranı dp cinsinden çizer. */
export const CARD_W = 1080;
export const CARD_H = 1920;
/** Düğüm ekran dışında bu dp ölçüsünde durur; `captureRef` çıktıyı 3× büyütür. */
export const CARD_DP_W = 360;
export const CARD_DP_H = 640;

/**
 * Ekran dışı düğümü PNG dosyasına çevirir; başarısızlıkta null.
 *
 * Çizim ÇÖKEBİLİR (yüzey kaybı, ölçek belleği) — o zaman kullanıcıya hata göstermek yerine
 * `shareCard` metin yoluna düşer: paylaşmak isteyen kişi elinde bir şeyle kalır.
 */
export async function captureShareCard(nodeRef: RefObject<View | null>): Promise<string | null> {
  try {
    return await captureRef(nodeRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      width: CARD_W,
      height: CARD_H,
    });
  } catch {
    return null;
  }
}

export type ShareCardResult = "shared" | "text" | "failed";

/**
 * `uri` varsa görsel paylaşım sayfası açılır; sistemde paylaşım yoksa ya da görsel
 * üretilemediyse RN `Share` ile METİN paylaşılır.
 *
 * Kullanıcı vazgeçerse "failed" döner ve İKİNCİ bir sayfa AÇILMAZ — vazgeçmek bir hata
 * değil, bir karardır; ona metin paylaşım sayfasını dayatmak kabalık olurdu.
 */
export async function shareCard(
  uri: string | null,
  text: string,
  dialogTitle: string,
): Promise<ShareCardResult> {
  if (uri && (await Sharing.isAvailableAsync())) {
    try {
      await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle });
      return "shared";
    } catch {
      return "failed";
    }
  }
  try {
    await Share.share({ message: text }, { dialogTitle });
    return "text";
  } catch {
    return "failed";
  }
}
