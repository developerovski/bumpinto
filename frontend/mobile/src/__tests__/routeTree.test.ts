import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * expo-router `app/` kökünü `require.context` ile tarar; regex'i YALNIZ `+api` / `+html` /
 * `+middleware` dosyalarını eler, `.test.tsx` dahil diğer her `.ts(x)` dosyası ROTA olur ve
 * bundle'a girer. Test dosyası oraya kaçarsa `@testing-library/react-native` uygulamaya
 * sızar, Node'un `console` modülünü ister ve uygulama cihazda AÇILMAZ (2026-09-08, emülatör).
 *
 * Jest, tsc ve lint bunu yakalayamaz — kapı burasıdır. Ekran testleri `src/__tests__/`te yaşar.
 */
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e: { isDirectory: () => boolean; name: string }) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

test("app/ altında test dosyası yok (expo-router hepsini rota sayar)", () => {
  const strays = walk(join(__dirname, "..", "..", "app")).filter((f) =>
    /\.(test|spec)\.[jt]sx?$/.test(f),
  );
  expect(strays).toEqual([]);
});
