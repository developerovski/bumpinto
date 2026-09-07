import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Badge from "./Badge";

describe("Badge — R-W16 kontrast ve punto", () => {
  it("amber ve flame rozet metni koyu token kullanır", () => {
    render(<><Badge tone="amber">Kerem için uzak</Badge><Badge tone="flame">Deste açık</Badge></>);
    expect(screen.getByText("Kerem için uzak").className).toContain("text-amber-ink");
    expect(screen.getByText("Deste açık").className).toContain("text-flame-ink");
  });

  it("11px `sm` boyutu kalktı — tek punto 0.75rem", () => {
    render(<Badge>Herkese ~aynı</Badge>);
    const cls = screen.getByText("Herkese ~aynı").className;
    expect(cls).toContain("text-[0.75rem]");
    // NOT: px-[0.6875rem] dolgusu artboard ölçüsüyle KALIR — burada denetlenen 11px PUNTO idi.
    expect(cls).not.toContain("text-[0.6875rem]");
  });
});
