import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TravelChips from "./TravelChips";

const labels = { p1: "Sen", p2: "Ayşe", p3: "Kerem" };

describe("TravelChips", () => {
  it("herkesi gösterir, en uzun önce, sonda fark çipi", () => {
    render(
      <TravelChips
        venue={{ id: "v1", travelMinutes: { p1: 28, p2: 24, p3: 36 } }}
        travel={{ labels, selfId: "p1" }}
      />,
    );
    const items = screen.getAllByRole("listitem");
    const chips = items.map((n) => n.textContent);
    expect(chips[0]).toContain("Kerem");
    expect(chips[0]).toContain("~35 dk");
    // ▲ isim/dakikadan SONRA gelir (artboard: "Kerem ~35 dk ▲").
    expect(chips[0]?.indexOf("▲")).toBeGreaterThan(chips[0]!.indexOf("35 dk"));
    expect(chips.at(-1)).toBe("fark 10 dk");
    // fark çipi .f-fark tedavisi: kesikli kenarlık, saydam zemin — sand dolgulu çip değil.
    expect(items.at(-1)!.className).toContain("border-dashed");
    expect(items.at(-1)!.className).not.toContain("bg-sand");
    // 3. katılımcı ASLA düşmez (karar dokümanı §4.3)
    expect(screen.getByText("Ayşe")).toBeInTheDocument();
  });

  it("viewer adı kalın, en uzunda ▲ ve ekran okuyucu karşılığı var", () => {
    render(
      <TravelChips
        venue={{ id: "v1", travelMinutes: { p1: 28, p3: 36 } }}
        travel={{ labels, selfId: "p1" }}
      />,
    );
    expect(screen.getByText("Sen").className).toContain("font-extrabold");
    expect(screen.getByText("en uzun yol")).toBeInTheDocument();
  });

  it("travelMinutes yoksa hiç render etmez", () => {
    const { container } = render(<TravelChips venue={{ id: "v1" }} travel={{ labels: {} }} />);
    expect(container).toBeEmptyDOMElement();
  });

  // Viewer travelMinutes'ta hiç yoksa (ör. konumsuz/manuel katılımcı görüntülüyor) çipler
  // hâlâ mevcut herkesi gösterir, çökmez ve "Sen" hiçbir çipte görünmez.
  it("viewer travelMinutes'ta yoksa çip herkesi gösterir, çökmez, 'Sen' düşmez", () => {
    render(
      <TravelChips
        venue={{ id: "v1", travelMinutes: { p2: 24, p3: 36 } }}
        travel={{ labels, selfId: "p1" }}
      />,
    );
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.getByText("Ayşe")).toBeInTheDocument();
    expect(screen.getByText("Kerem")).toBeInTheDocument();
    expect(screen.queryByText("Sen")).not.toBeInTheDocument();
  });
});
