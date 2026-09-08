import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Segmented from "./Segmented";

/* jsdom yerleşim YAPMAZ: `offsetLeft/Width` her zaman 0 döner, yani kayan hap'ın geometrisi
   testte kendiliğinden hiçbir şey kanıtlamaz (sıfırdan sıfıra "kayar"). Hücrelere sıralarına
   göre sahte kutu takıyoruz; böylece hap'ın DOĞRU hücreyi bulup (aria-checked seçicisi) onun
   kutusunu OKUDUĞU sınanır — hafızadaki "framework dikişi testsiz kalmaz" kuralı. */
const CELL = 98;
const PAD = 3;
const descriptors = new Map<string, PropertyDescriptor | undefined>();

function cellIndex(el: HTMLElement) {
  const rail = el.parentElement;
  if (!rail) return -1;
  return [...rail.querySelectorAll('[role="radio"]')].indexOf(el);
}

beforeAll(() => {
  const stubs: Record<string, (el: HTMLElement, i: number) => number> = {
    offsetLeft: (_el, i) => PAD + i * (CELL + 2),
    offsetTop: () => PAD,
    offsetWidth: (_el, i) => (i < 0 ? 0 : CELL),
    offsetHeight: (_el, i) => (i < 0 ? 0 : 44),
  };
  for (const [prop, value] of Object.entries(stubs)) {
    descriptors.set(prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop));
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get(this: HTMLElement) {
        const i = cellIndex(this);
        return i < 0 ? 0 : value(this, i);
      },
    });
  }
});

afterAll(() => {
  for (const [prop, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, prop, descriptor);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
  }
});

const options = [
  { value: "a", label: "Yürüyerek" },
  { value: "b", label: "Bisikletle" },
  { value: "c", label: "Arabayla" },
];

describe("Segmented", () => {
  it("hap seçili hücrenin kutusuna oturur", () => {
    render(<Segmented value="b" onChange={() => {}} options={options} ariaLabel="Nasıl geliyorsun?" />);
    const pill = screen.getByTestId("segmented-pill");
    // 1. hücre: 3 + 1 * (98 + 2) = 103
    expect(pill).toHaveStyle({ transform: "translate(103px, 3px)", width: "98px", height: "44px" });
    // Beyaz zemin ARTIK düğmede değil: iki yerde birden olsaydı kayan hap'ın altında ikinci
    // bir sabit hap görünürdü.
    expect(screen.getByRole("radio", { name: "Bisikletle" }).className).not.toContain("bg-white");
  });

  it("seçim değişince hap yeni hücreye taşınır — ikinci hap üretmez", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Segmented value="a" onChange={onChange} options={options} />);
    expect(screen.getByTestId("segmented-pill")).toHaveStyle({ transform: "translate(3px, 3px)" });

    fireEvent.click(screen.getByRole("radio", { name: "Arabayla" }));
    expect(onChange).toHaveBeenCalledWith("c");

    rerender(<Segmented value="c" onChange={onChange} options={options} />);
    expect(screen.getAllByTestId("segmented-pill")).toHaveLength(1);
    // 2. hücre: 3 + 2 * 100 = 203
    expect(screen.getByTestId("segmented-pill")).toHaveStyle({ transform: "translate(203px, 3px)" });
  });

  /** Geçişin GERÇEKTEN takılı olduğunu sabitler. Not: "ilk yerleşimde geçiş kapalı" yarısı
      jsdom'da GÖZLENEMEZ — RTL `render`'ı `act` içinde sarar, `useEffect` iddialardan önce
      boşalır ve `animate` hep true görünür. O yarı tarayıcıda boyama sırasına dayanır
      (layout effect boyamadan önce konumlar, effect boyamadan sonra geçişi açar). */
  it("değişimden sonra geçiş sınıfı takılıdır", () => {
    const { rerender } = render(<Segmented value="a" onChange={() => {}} options={options} />);
    rerender(<Segmented value="b" onChange={() => {}} options={options} />);
    expect(screen.getByTestId("segmented-pill").className).toContain("transition-[transform,width,height]");
  });
});
