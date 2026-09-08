import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TravelBars from "./TravelBars";

const venue = (m: Record<string, number>) => ({
  id: "v1", travel: Object.entries(m).map(([participantId, minutes]) => ({ participantId, minutes })),
});
const travel = { labels: { s: "Sen", k: "Kerem", a: "Ayşe" }, selfId: "s" };

describe("TravelBars", () => {
  it("herkes için bir satır, kendin en üstte; fark satırı altta", () => {
    render(<TravelBars venue={venue({ s: 30, k: 35, a: 25 })} travel={travel} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Sen")).toBeInTheDocument();
    expect(within(rows[0]).getByText("~30 dk")).toBeInTheDocument();
    expect(screen.getByText(/fark 10 dk/)).toBeInTheDocument();
  });

  it("en uzun yol flame ve en geniş; başlık üstlük olur; veri yoksa hiç çizilmez", () => {
    const { rerender, container } = render(
      <TravelBars venue={venue({ s: 30, k: 40 })} travel={travel} title="Herkesin yolu" />,
    );
    expect(screen.getByText("Herkesin yolu")).toBeInTheDocument();
    expect(screen.getByTestId("travel-fill-k").className).toContain("bg-flame");
    expect(screen.getByTestId("travel-fill-s").className).toContain("bg-grass");
    expect(screen.getByTestId("travel-fill-k")).toHaveStyle({ width: "88%" });
    expect(screen.getByTestId("travel-fill-s")).toHaveStyle({ width: "66%" });
    rerender(<TravelBars venue={{ id: "v1" }} travel={travel} title="Herkesin yolu" />);
    expect(container).toBeEmptyDOMElement();
  });

  /* Artboard 2580-2584: Karar ekranının `.tb` kartında adalet cümlesi YOK — o cümle imza
     kartının `.rc-ft` altbilgisinde. `note={false}` iki yüzeyin aynı cümleyi basmasını keser. */
  it("note={false} adalet satırını düşürür, çubuklar kalır", () => {
    render(<TravelBars venue={venue({ s: 30, k: 35, a: 25 })} travel={travel} note={false} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText(/fark 10 dk/)).not.toBeInTheDocument();
  });
});
