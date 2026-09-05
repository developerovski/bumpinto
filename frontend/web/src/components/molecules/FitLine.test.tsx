import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "../../i18n";
import FitLine from "./FitLine";

const coffee = { id: "c1", category: "Espresso bar", activityType: "COFFEE" as const };
const bakery = { id: "b1", category: "Fırın", activityType: "COFFEE" as const };
const iced = { id: "i1", category: "Iced Coffee Bar", activityType: "COFFEE" as const };

describe("FitLine", () => {
  it("destede tek kategori varsa satır çizilmez (12 aynı kart)", () => {
    const { container } = render(
      <FitLine venue={coffee} categories={["Espresso bar"]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("≥2 farklı kategori varsa 'Kahve için: espresso bar'", () => {
    render(<FitLine venue={coffee} categories={["Espresso bar", "Fırın"]} />);
    expect(screen.getByText("Kahve için: espresso bar")).toBeInTheDocument();
  });

  it("beklenen küme dışında amber uyarı", () => {
    render(<FitLine venue={bakery} categories={["Espresso bar", "Fırın"]} />);
    expect(screen.getByText("Kahve değil: fırın").className).toContain("text-amber");
  });

  it("category yoksa satır yok", () => {
    const { container } = render(<FitLine venue={{ id: "x", activityType: "COFFEE" }} categories={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("categories geçilmezse (ör. Karar ekranı) çeşitlilik denetimi atlanır", () => {
    render(<FitLine venue={coffee} />);
    expect(screen.getByText("Kahve için: espresso bar")).toBeInTheDocument();
  });

  describe("en locale — sabit tr küçültme 'I' harfini bozar (review bulgusu)", () => {
    afterEach(async () => {
      await i18n.changeLanguage("tr");
    });

    it("'Iced Coffee Bar' → 'iced coffee bar' (ASCII i, 'ıced' DEĞİL)", async () => {
      await i18n.changeLanguage("en");
      render(<FitLine venue={iced} />);
      expect(screen.getByText("For Coffee: iced coffee bar")).toBeInTheDocument();
    });
  });
});
