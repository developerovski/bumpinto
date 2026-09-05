/* Preview/design-time context for the BumpInto DS.
   15 of the components call `useTranslation()`; outside an i18next context they
   render raw keys. This module ships an initialised, deterministic instance
   (no LanguageDetector — previews must not depend on navigator/querystring)
   plus the wrapper the design agent should mount at the app root.
   Wired via cfg.extraEntries, so both land on window.BumpInto. */
import i18next from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import en from "../frontend/web/src/i18n/locales/en.json";
import nl from "../frontend/web/src/i18n/locales/nl.json";
import tr from "../frontend/web/src/i18n/locales/tr.json";

/** The DS's i18n instance, pinned to the app's own default locale (`tr`). */
export const bumpintoI18n = i18next.createInstance();
void bumpintoI18n.use(initReactI18next).init({
  resources: { tr: { translation: tr }, en: { translation: en }, nl: { translation: nl } },
  lng: "tr",
  fallbackLng: "tr",
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Root wrapper: every BumpInto component must render inside it. */
export function BumpIntoProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={bumpintoI18n}>{children}</I18nextProvider>;
}

/** ÖNİZLEME KÖKÜ — yalnız kartlar için (cfg.provider). Uygulamada KULLANMA:
    orada kendi router'ın olur, iç içe iki router bozulur.

    Neden burada: TopBar / LangMenu / GoogleSignIn / AvatarMenu / AppShell / RequireAuth
    react-router kancalarını koşulsuz çağırıyor. Her preview AYRI bir esbuild bundle'ı
    olarak derlendiği için preview dosyasına yazılan bir <MemoryRouter> BAŞKA bir modül
    örneği (ve başka bir Context kimliği) üretir — bileşenin kancası onu asla göremez ve
    "useLocation() may be used only in the context of a <Router>" hatası atar.
    Bu modül ise cfg.extraEntries ile _ds_bundle.js'in İÇİNE derleniyor, dolayısıyla
    buradaki react-router-dom bileşenlerin kullandığı AYNI örnek. */
export function BumpIntoPreviewRoot({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <BumpIntoProvider>{children}</BumpIntoProvider>
    </MemoryRouter>
  );
}

export default BumpIntoProvider;
