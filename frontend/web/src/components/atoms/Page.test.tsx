import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./Page";

/* Bu iki kural masaüstünde ölçülmüş İKİ gerçek kusuru kilitler (UI review 2026-09-03):
   (1) main kendi `min-h-[calc(100dvh-…)]` ölçüsünü taşıdığında üst çubuk + main + atıf
       altbilgisi toplamı bir ekranı 33px aşıyor ve HER sayfada sahte kaydırma bırakıyordu;
   (2) aynı sınıf listesinde iki `lg:pb-*` bulunduğunda kazananı dizi sırası değil Tailwind'in
       çıktı sırası belirliyor — `lg:pb-4` sessizce ölüyor, haritanın altında 44px ölü alan
       kalıyordu. jsdom yerleşim ölçmez; bu yüzden sınıf sözleşmesi doğrulanır. */
describe("Page yerleşim sözleşmesi", () => {
  it("yükseklik ölçüsünü taşımaz — kabuğun dikey flex'inde yalnız kalanı alır", () => {
    render(<Page>içerik</Page>);
    const main = screen.getByRole("main");
    expect(main.className).toContain("flex-1");
    expect(main.className).not.toMatch(/min-h-\[/);
  });

  it("çakışan alt boşluk yok: tek bir lg:pb-* sınıfı basılır", () => {
    for (const el of [render(<Page>a</Page>), render(<Page wide>b</Page>), render(<Page fit>c</Page>)]) {
      const main = el.container.querySelector("main")!;
      expect(main.className.match(/\blg:pb-\S+/g)).toHaveLength(1);
    }
  });

  it("wide: kabuğa tam ekran işaretini verir ve kaydırmayı içeride tutar", () => {
    render(<Page wide>harita</Page>);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("data-wide");
    expect(main.className).toContain("lg:min-h-0");
    expect(main.className).toContain("lg:overflow-hidden");
    expect(main.className).toContain("lg:pb-4");
  });

  /* Lobi/Bekle haritası sabit `calc(100dvh - 14rem)` taşıyordu: kabuk gerçekte ~511px ederken
     varsayım 224px'ti, masaüstünde ~290px taşma bırakıyordu. `fit` ölçüyü kabuğa devreder. */
  it("fit: tek ekran işaretini verir ama max genişliği korur", () => {
    render(<Page fit>lobi</Page>);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("data-fit");
    expect(main).not.toHaveAttribute("data-wide");
    expect(main.className).toContain("fit:min-h-0");
    expect(main.className).toContain("fit:overflow-hidden");
    expect(main.className).toContain("lg:max-w-[80rem]");
  });

  it("fit işareti yalnız istendiğinde basılır", () => {
    render(<Page>içerik</Page>);
    expect(screen.getByRole("main")).not.toHaveAttribute("data-fit");
  });

  it("mutlak konumlu torunlara kap olur — sr-only etiketler belgeyi uzatamaz", () => {
    for (const el of [render(<Page>a</Page>), render(<Page wide>b</Page>), render(<Page variant="result">c</Page>)]) {
      expect(el.container.querySelector("main")!.className).toContain("relative");
    }
  });

  it("wide olmayan sayfa tam ekran işaretini vermez", () => {
    render(<Page>içerik</Page>);
    expect(screen.getByRole("main")).not.toHaveAttribute("data-wide");
  });
});
