import { describe, expect, it, vi } from "vitest";
import { reportThenBlock } from "./report";

describe("reportThenBlock", () => {
  it("iki adım da tutarsa done", async () => {
    const block = vi.fn(async () => undefined);
    await expect(reportThenBlock(async () => undefined, block)).resolves.toBe("done");
    expect(block).toHaveBeenCalled();
  });

  it("rapor düşerse engel HİÇ denenmez", async () => {
    const block = vi.fn(async () => undefined);
    await expect(
      reportThenBlock(async () => {
        throw new Error("500");
      }, block),
    ).resolves.toBe("reportFailed");
    expect(block).not.toHaveBeenCalled();
  });

  /**
   * K-W33: rapor GİTTİ, engel düştü. Bu hâl "gönderilemedi" DEĞİLDİR — öyle denirse kullanıcı
   * tekrar dener ve sunucuda ikinci bir rapor açılır.
   */
  it("engel düşerse rapor gittiği ayrı bir sonuçla söylenir", async () => {
    await expect(
      reportThenBlock(async () => undefined, async () => {
        throw new Error("500");
      }),
    ).resolves.toBe("blockFailed");
  });
});
