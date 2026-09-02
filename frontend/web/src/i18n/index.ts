import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import nl from "./locales/nl.json";
import tr from "./locales/tr.json";

// init() eşzamanlı emit eder (gömülü resources) — dinleyici init'ten ÖNCE kayıtlı olmalı,
// yoksa ilk dil değişimi kaçırılır ve <html lang>/title hiç ayarlanmaz.
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  document.title = i18n.t("common.title");
});

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { tr: { translation: tr }, en: { translation: en }, nl: { translation: nl } },
    fallbackLng: "en",
    supportedLngs: ["tr", "en", "nl"],
    nonExplicitSupportedLngs: true,
    detection: { order: ["querystring", "navigator"], caches: [] }, // storage'a yazma YOK
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;
