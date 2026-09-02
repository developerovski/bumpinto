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

// jsdom 25 PointerEvent tanımlamıyor; fireEvent.pointer* düz Event'e düşüp pointerId/clientX'i
// yitiriyor. Deste jesti (SwipeCard) için asgari çokdolgu — MouseEvent koordinatları taşır.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "";
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
