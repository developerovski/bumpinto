import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import i18n from "./i18n";

// Kaynaklar inline; init senkron. jsdom navigator.language "en-US" döndürdüğü için
// dedektör en'e düşerdi — testler taban dili (tr) görmeli, sabitliyoruz.
void i18n.changeLanguage("tr");

// vitest `globals` kapalı olduğu için RTL kendi cleanup'ını kuramıyor:
// kurulmazsa render'lar birikir ve testler birbirinin DOM'unu görür.
afterEach(cleanup);
