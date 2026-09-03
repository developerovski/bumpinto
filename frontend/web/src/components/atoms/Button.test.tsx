import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("ghost kind: saydam zemin, ink metin, line2 kenarlık (artboard .b-gh)", () => {
    render(<Button kind="ghost">Google Maps'te aç</Button>);
    const btn = screen.getByRole("button", { name: "Google Maps'te aç" });
    expect(btn.className).toContain("bg-transparent");
    expect(btn.className).toContain("text-ink");
    expect(btn.className).toContain("border-line2");
  });
});
