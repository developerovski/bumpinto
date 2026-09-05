import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "../../i18n";
import RunoffIntro from "./RunoffIntro";

describe("RunoffIntro", () => {
  describe("en locale — sabit tr büyütme 'I/İ' harfini bozar (review bulgusu)", () => {
    afterEach(async () => {
      await i18n.changeLanguage("tr");
    });

    it("'Fitness' → 'FITNESS' (ASCII I, 'FİTNESS' DEĞİL)", async () => {
      await i18n.changeLanguage("en");
      render(<RunoffIntro activities={["FITNESS"]} people={3} finalists={2} sent={false} />);
      expect(screen.getByText(/FITNESS/)).toBeInTheDocument();
      expect(screen.queryByText(/FİTNESS/)).not.toBeInTheDocument();
    });
  });
});
