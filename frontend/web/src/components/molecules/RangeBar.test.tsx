import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RangeBar from "./RangeBar";

const venue = (m: Record<string, number>) => ({
  id: "v1", name: "Café Berlage",
  travel: Object.entries(m).map(([participantId, minutes]) => ({ participantId, minutes })),
});
const travel = { labels: { s: "Sen", k: "Kerem", a: "Ayşe" }, selfId: "s" };

describe("RangeBar", () => {
  it("aralığı, adalet satırını ve baş harfli noktaları basar", () => {
    render(<RangeBar venue={venue({ s: 30, k: 35, a: 25 })} travel={travel} />);
    expect(screen.getByText("25–35 dk")).toBeInTheDocument();
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
    expect(screen.getByText(/fark 10 dk · en uzun yol Kerem/)).toBeInTheDocument();
    expect(screen.getByTestId("range-dot-s")).toHaveTextContent("S");
    expect(screen.getByTestId("range-dot-s").className).toContain("bg-flame-deep");
    // Noktalar aria-hidden; dakikalar sr-only listede.
    expect(screen.getByText("Kerem ~35 dk")).toBeInTheDocument();
  });

  it("aykırı kişi varsa bant amber, o nokta işaretli — kenarlık YALNIZ amber", () => {
    render(<RangeBar venue={venue({ s: 20, k: 45, a: 25 })} travel={travel} />);
    expect(screen.getByTestId("range-span").className).toContain("bg-amber");
    const cls = screen.getByTestId("range-dot-k").className;
    expect(cls).toContain("border-amber");
    expect(cls).not.toContain("border-grass");
    expect(cls).not.toContain("border-flame-deep");
  });

  // A2/A5: pos() artboard ölçüsüyle (15%…85%) birebir — dolaylı metin/sınıf kontrolü YETMEZ.
  it("pos() noktaları ve bandı artboard ölçüsüne (15%/50%/85%) yerleştirir", () => {
    render(<RangeBar venue={venue({ s: 30, k: 35, a: 25 })} travel={travel} />);
    expect(screen.getByTestId("range-dot-a")).toHaveStyle({ left: "15%" });
    expect(screen.getByTestId("range-dot-k")).toHaveStyle({ left: "85%" });
    expect(screen.getByTestId("range-dot-s")).toHaveStyle({ left: "50%" });
    expect(screen.getByTestId("range-span")).toHaveStyle({ left: "15%", width: "70%" });
  });

  it("çapalı oturumda lead metni basılmaz ama aralık ve fark satırı kalır", () => {
    render(<RangeBar venue={venue({ s: 30, k: 35, a: 25 })} travel={{ ...travel, anchored: true }} />);
    expect(screen.getByText("25–35 dk")).toBeInTheDocument();
    expect(screen.queryByText("Herkese ~aynı")).not.toBeInTheDocument();
    expect(screen.getByText(/fark 10 dk · en uzun yol Kerem/)).toBeInTheDocument();
  });

  it("herkes eşit dakikadaysa bant çizilmez, değer tek sayı basılır", () => {
    render(<RangeBar venue={venue({ s: 30, k: 30 })} travel={travel} />);
    expect(screen.queryByTestId("range-span")).not.toBeInTheDocument();
    expect(screen.getByText("~30 dk")).toBeInTheDocument();
  });

  /** `.me` (zemin/metin) ve `.far` (yalnız kenarlık) artboard'da AYRI ailelerdir: kendi kişin
      aynı anda aykırıysa flame dolgu KALIR, üstüne amber halka biner. Kenarlık ailesinden yine
      tek sınıf basılır (A1) — `border-flame-deep` düşer. */
  it("kendi kişin AYNI ANDA aykırıysa amber halka + flame dolgu birlikte", () => {
    render(<RangeBar venue={venue({ s: 45, k: 20, a: 25 })} travel={travel} />);
    const cls = screen.getByTestId("range-dot-s").className;
    expect(cls).toContain("border-amber");
    expect(cls).not.toContain("border-flame-deep");
    expect(cls).toContain("bg-flame-deep");
    expect(cls).not.toContain("bg-white");
  });

  it("tek kişide bant yok; yol verisi yoksa hiç çizilmez", () => {
    const { rerender, container } = render(<RangeBar venue={venue({ s: 30 })} travel={travel} />);
    expect(screen.getByText("~30 dk")).toBeInTheDocument();
    expect(screen.queryByTestId("range-span")).not.toBeInTheDocument();
    rerender(<RangeBar venue={{ id: "v1", name: "X" }} travel={travel} />);
    expect(container).toBeEmptyDOMElement();
  });
});
