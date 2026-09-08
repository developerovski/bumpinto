import { LANGUAGES } from "@bumpinto/shared";
import en from "@bumpinto/shared/src/i18n/locales/en.json";
import nl from "@bumpinto/shared/src/i18n/locales/nl.json";
import tr from "@bumpinto/shared/src/i18n/locales/tr.json";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * Dil dosyaları `@bumpinto/shared`'ta — web ile TEK kaynak (M-4:T5).
 * Cihaz dili desteklenmiyorsa `en`; kullanıcı tercihi girişte `api.me().language` ile
 * üzerine yazılır (T7 `authStore`).
 */
const SUPPORTED: readonly string[] = LANGUAGES.map((l) => l.code);
const device = getLocales()[0]?.languageCode ?? "en";

// eslint-disable-next-line import/no-named-as-default-member -- i18next'in belgelenmiş zincir API'si
void i18n.use(initReactI18next).init({
  resources: { tr: { translation: tr }, en: { translation: en }, nl: { translation: nl } },
  lng: SUPPORTED.includes(device) ? device : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
