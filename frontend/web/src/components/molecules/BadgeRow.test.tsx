import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BadgeRow from "./BadgeRow";

describe("BadgeRow", () => {
  it("üç sayacı ve dört rozeti basar; kazanılmamış rozet soluk ve ilerleme taşır", () => {
    render(<BadgeRow stats={{ sessionsHosted: 12, friendsMet: 9, plansMet: 7, metStreakWeeks: 3 }} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("açtığın")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("hafta seri", { selector: "span" })).toBeInTheDocument();
    // friendsMet artık çizilmez (spec §11.6).
    expect(screen.queryByText("9")).toBeNull();
    expect(screen.getByText("İlk buluşma").closest("[data-earned]")).toHaveAttribute("data-earned", "true");
    expect(screen.getByText("10 buluşma").closest("[data-earned]")).toHaveAttribute("data-earned", "false");
    expect(screen.getByText("7/10 · 3 buluşma kaldı.")).toBeInTheDocument();
    expect(screen.getByText("3 hafta seri", { selector: "p" }).closest("[data-earned]")).toHaveAttribute("data-earned", "true");
    expect(screen.getByText("rozetler sende, kimseyle yarışmıyorsun")).toBeInTheDocument();
  });

  it("sayaç yoksa sıfırlar ve hiçbir rozet kazanılmış değil", () => {
    render(<BadgeRow stats={undefined} />);
    expect(screen.getAllByText("0")).toHaveLength(3);
    screen.getAllByText(/buluşma|seri/, { selector: "p" }).forEach((el) =>
      expect(el.closest("[data-earned]")).toHaveAttribute("data-earned", "false"));
  });
});
