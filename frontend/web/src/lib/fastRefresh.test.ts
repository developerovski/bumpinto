/* React Fast Refresh yalnız TÜM export'ları bileşen olan .tsx modülleri sıcak yamalayabilir.
   Bu test `src/components` ve `src/pages` altındaki tüm .tsx dosyalarını (test dosyaları hariç)
   tarar ve lowercase isimli bir `const`/`function`/`let` export'u (bileşen OLMAYAN bir değer —
   isim büyük harfle başlamıyorsa React bunu bileşen saymaz) kalmadığından emin olur.
   `export default function Component` her zaman serbesttir.
   `import.meta.glob` kullanılır (proje `@types/node` içermediği için `node:fs` yerine Vite'ın
   kendi build-time dosya taraması — vitest de aynı Vite dönüşüm hattını kullanır). */
import { describe, expect, it } from "vitest";

const files = import.meta.glob(["../components/**/*.tsx", "../pages/**/*.tsx", "!**/*.test.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const NON_COMPONENT_EXPORT = /^export (const|let) |^export function [a-z]/;

describe("Fast Refresh boundary guard", () => {
  it("scanned at least one component file (sanity check the glob isn't empty)", () => {
    expect(Object.keys(files).length).toBeGreaterThan(20);
  });

  it("no .tsx file under src/components or src/pages exports a const/let or a lowercase function (non-component values)", () => {
    const offenders: string[] = [];
    for (const [path, source] of Object.entries(files)) {
      for (const line of source.split("\n")) {
        if (NON_COMPONENT_EXPORT.test(line)) {
          offenders.push(`${path}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
