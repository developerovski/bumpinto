import { beforeEach, describe, expect, it, vi } from "vitest";

/* `vi.mock` factories hoist above plain `const`s — referencing them directly here trips a TDZ
   ReferenceError. `vi.hoisted` hoists the declarations too, so the factory can see them. */
const { toBlob, getFontEmbedCSS } = vi.hoisted(() => ({ toBlob: vi.fn(), getFontEmbedCSS: vi.fn() }));
vi.mock("html-to-image", () => ({ toBlob, getFontEmbedCSS }));

import { probePhoto, renderShareCard, shareOrDownload } from "./shareCard";

describe("shareCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFontEmbedCSS.mockResolvedValue("@font-face{}");
  });

  it("1080×1920 çizer, font CSS'ini gömer; font ya da çizim çökerse null döner", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    toBlob.mockResolvedValue(blob);
    const node = document.createElement("div");
    expect(await renderShareCard(node)).toBe(blob);
    expect(toBlob).toHaveBeenCalledWith(
      node,
      expect.objectContaining({ width: 1080, height: 1920, pixelRatio: 1, fontEmbedCSS: "@font-face{}" }),
    );

    getFontEmbedCSS.mockRejectedValue(new Error("cors"));
    toBlob.mockRejectedValue(new Error("taint"));
    expect(await renderShareCard(node)).toBeNull();
    expect(toBlob).toHaveBeenLastCalledWith(node, expect.objectContaining({ fontEmbedCSS: undefined }));
  });

  it("probePhoto: yüklenirse url, hata/boş girdide null", async () => {
    class FakeImage {
      static ok = true;
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        setTimeout(() => (FakeImage.ok ? this.onload?.() : this.onerror?.()), 0);
      }
    }
    vi.stubGlobal("Image", FakeImage);
    expect(await probePhoto("https://cdn/x.jpg")).toBe("https://cdn/x.jpg");
    FakeImage.ok = false;
    expect(await probePhoto("https://cdn/x.jpg")).toBeNull();
    expect(await probePhoto(undefined)).toBeNull();
    vi.unstubAllGlobals();
  });

  it("navigator dosya paylaşımını kabul ediyorsa paylaşır, etmiyorsa indirir", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    vi.stubGlobal("navigator", { share: vi.fn().mockResolvedValue(undefined), canShare: () => true });
    expect(await shareOrDownload(blob, "a.png", "metin")).toBe("shared");

    vi.stubGlobal("navigator", {});
    vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() });
    expect(await shareOrDownload(blob, "a.png", "metin")).toBe("downloaded");
    vi.unstubAllGlobals();
  });
});
