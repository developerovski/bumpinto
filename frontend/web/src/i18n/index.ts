import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import nl from "./locales/nl.json";
import tr from "./locales/tr.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { tr: { translation: tr }, en: { translation: en }, nl: { translation: nl } },
    fallbackLng: "tr",
    detection: { order: ["querystring", "navigator"], caches: [] }, // storage'a yazma YOK
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;
