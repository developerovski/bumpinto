import { describe, expect, it } from "vitest";
// `node:fs`/`node:path` yok — proje `@types/node` içermiyor (bkz. lib/fastRefresh.test.ts).
// Vite'ın kendi build-time dosya taraması aynı işi görür.
const html = (
  import.meta.glob("../index.html", { query: "?raw", import: "default", eager: true }) as Record<string, string>
)["../index.html"];
describe("index.html — paylaşım önizlemesi", () => {
  it("Open Graph ve Twitter kartı etiketleri var", () => {
    for (const tag of ["og:type", "og:title", "og:description", "og:image", "og:url"])
      expect(html).toContain(`property="${tag}"`);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });
  it("og:image mutlak URL'dir (göreli yol crawler'da çözülmez)", () => {
    expect(html.match(/property="og:image" content="([^"]+)"/)?.[1]).toMatch(/^https:\/\//);
  });
});
