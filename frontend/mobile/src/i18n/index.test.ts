import nl from "@bumpinto/shared/src/i18n/locales/nl.json";

import i18n from "./index";

test("cihaz dili desteklenmiyorsa en; tr/nl anahtarları yüklü", async () => {
  expect(i18n.options.fallbackLng).toEqual(["en"]);
  await i18n.changeLanguage("tr");
  expect(i18n.t("sessions.new")).toBe("Yeni buluşma kur");
  await i18n.changeLanguage("nl");
  expect(i18n.t("sessions.new")).toBe(nl.sessions.new);
});
