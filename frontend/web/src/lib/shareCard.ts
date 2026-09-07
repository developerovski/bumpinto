/* Sonuç kartı görseli (W8 `.rc`): `html-to-image` ile 1080×1920 PNG'ye çizer, sonra Web Share
   dosya modu ya da indirme ile paylaşır. Font gömme (getFontEmbedCSS) CORS'lu font kaynaklarında
   çökebilir — çizim yine de devam etmeli, o yüzden ayrı try/catch. */
import { getFontEmbedCSS, toBlob } from "html-to-image";

export const CARD_W = 1080;
export const CARD_H = 1920;

/** Foto CORS-güvenli mi diye probe eder: `crossOrigin` olmadan çizilen görsel tuval'i "kirletir"
    (toBlob sessizce başarısız olur) — o yüzden çizmeden önce yükleyip doğrularız. */
export function probePhoto(url: string | undefined | null): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(url);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function renderShareCard(node: HTMLElement): Promise<Blob | null> {
  let fontEmbedCSS: string | undefined;
  try {
    fontEmbedCSS = await getFontEmbedCSS(node);
  } catch {
    fontEmbedCSS = undefined;
  }
  try {
    return await toBlob(node, {
      width: CARD_W,
      height: CARD_H,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: "#fffbf6",
      fontEmbedCSS,
    });
  } catch {
    return null;
  }
}

export type ShareResult = "shared" | "downloaded" | "failed";

export async function shareOrDownload(blob: Blob, fileName: string, text: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch {
      return "failed";
    }
  }
  try {
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(href);
    return "downloaded";
  } catch {
    return "failed";
  }
}
