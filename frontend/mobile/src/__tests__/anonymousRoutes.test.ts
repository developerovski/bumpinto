import { existsSync } from "node:fs";
import { join } from "node:path";

import config from "../../app.config";
import { ANONYMOUS_ROUTES, isAnonymousRoute } from "../../app/_layout";

const app = (p: string) => join(__dirname, "..", "..", "app", p);

/**
 * M-5'in mağaza yüzeyleri ROTA olarak var olmalı ve oturum muhafızının dışında kalmalı.
 * Dosya adı değişirse (ör. `[doc].tsx` → `[slug].tsx`) derin link ve mağaza URL'si sessizce
 * kırılırdı; bu kapı onu yakalar.
 */
test("uyumluluk rotalarının dosyaları yerinde", () => {
  for (const file of [
    "account/_layout.tsx",
    "account/index.tsx",
    "account/consent.tsx",
    "account/delete.tsx",
    "account/deleted.tsx",
    "account/legal/[doc].tsx",
    "(sheets)/location-consent.tsx",
    "(sheets)/mic-consent.tsx",
    "(sheets)/participant.tsx",
  ]) {
    expect({ file, exists: existsSync(app(file)) }).toEqual({ file, exists: true });
  }
});

test("yasal okuyucular, silme onayı ve davet linki ANONİM açılır", () => {
  for (const path of [
    "/account/legal/privacy",
    "/account/legal/terms",
    "/account/legal/kvkk",
    "/account/deleted",
    "/j/x7k2m",
  ]) {
    expect({ path, anonymous: isAnonymousRoute(path) }).toEqual({ path, anonymous: true });
  }
});

test("hesap ekranları oturum GEREKTİRİR (anonim listede değil)", () => {
  for (const path of ["/account", "/account/consent", "/account/delete", "/sessions", "/profile"]) {
    expect({ path, anonymous: isAnonymousRoute(path) }).toEqual({ path, anonymous: false });
  }
});

test("anonim /j/ ön eki App Links beyanıyla aynı yolu gösterir", () => {
  const data = config.android!.intentFilters!.flatMap((f) => (f.data ? [f.data].flat() : []));
  expect(data.some((d) => d.pathPrefix === "/j")).toBe(true);
  expect(ANONYMOUS_ROUTES).toContain("/j/");
  // /account App Links'te OLMAMALI: Play hesap silme URL'si uygulama kurulu değilken de açılır.
  expect(data.some((d) => String(d.pathPrefix).startsWith("/account"))).toBe(false);
});
