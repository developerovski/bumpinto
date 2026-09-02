import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import i18n from "../../i18n";
import LangMenu from "./LangMenu";

describe("LangMenu", () => {
  it("English seçince dil ve <html lang> değişir", async () => {
    render(
      <MemoryRouter>
        <LangMenu />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /dil seç/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "English" }));
    expect(i18n.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    await i18n.changeLanguage("tr"); // diğer testler tr bekler
  });
});
