import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { router } from "expo-router";

import { goBackOr } from "../lib/nav";

/**
 * ÇIKIŞSIZ EKRAN OLMAZ (2026-09-08 emülatörde görüldü, K-M23 ile aynı sınıf).
 *
 * `router.back()` tek başına, ekrana geçmiş yığını olmadan girilebildiği her durumda ölü bir
 * düğmedir: derin link, Android'in arka plandaki uygulamayı öldürüp URL'i geri yüklemesi,
 * geliştirmede Metro yeniden yüklemesi. Navigatör `GO_BACK`i işleyemez ve kullanıcı ekranda
 * KİLİTLİ kalır — dil alt sayfasında tam olarak bu oldu.
 */

describe("goBackOr", () => {
  beforeEach(() => jest.clearAllMocks());

  it("geçmiş VARSA normal geri gider", () => {
    (router.canGoBack as jest.Mock).mockReturnValue(true);
    goBackOr("/sessions");
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("geçmiş YOKSA yedek rotaya düşer — ekran kilitlenmez", () => {
    (router.canGoBack as jest.Mock).mockReturnValue(false);
    goBackOr("/profile");
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/profile");
  });
});

/** `app/` altındaki tüm rota dosyaları. */
function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(
    (e: { isDirectory: () => boolean; name: string }) =>
      e.isDirectory() ? routeFiles(join(dir, e.name)) : [join(dir, e.name)],
  );
}

/* Statik kapı: jest ve tsc bu hatayı göremez (kod DERLENİYOR, yalnız çalışma anında ölü),
   yalnız uygulamayı geçmişsiz açmak gösterir. M-8/M-9 yeni alt sayfa eklerken bu kural
   sessizce unutulmasın. */
test("app/ altında ÇIPLAK router.back() yok — hepsi goBackOr ile yedekli", () => {
  const offenders = routeFiles(join(__dirname, "..", "..", "app"))
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => /(^|[^.\w])router\.back\(\)/.test(readFileSync(f, "utf8")))
    .map((f) => f.slice(f.indexOf("/app/") + 1));
  expect(offenders).toEqual([]);
});
