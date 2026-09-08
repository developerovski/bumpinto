import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VenueCheckRow from "./VenueCheckRow";

/** Artboard `W6c · Liste modu 390` (2289-2349): satır polaroid DEĞİL, `.f-lk` satırı. */
describe("VenueCheckRow", () => {
  it("polaroid kart değil, 44px küçük görselli satır basar", () => {
    const { container } = render(
      <VenueCheckRow venue={{ id: "v1", name: "Café Berlage" }} checked={false} onChange={() => {}} />,
    );
    // 44×44 küçük görsel (VenueThumb satır-içi ölçüyle) — polaroid fotoğraf alanı yok.
    expect(container.querySelector('[style*="44px"]')).toBeTruthy();
    expect(screen.getByText("cb")).toBeInTheDocument();
  });

  it("işaret kutusu gerçek checkbox olarak kalır ve tıklama durumu bildirir", () => {
    const onChange = vi.fn();
    render(<VenueCheckRow venue={{ id: "v1", name: "Café Berlage" }} checked={false} onChange={onChange} />);
    const box = screen.getByRole("checkbox");
    expect(box).not.toBeChecked();
    // Görünüm artboard'ın `.chk` dairesi; girdi sr-only kalır (odak + ekran okuyucu korunur).
    expect(box.className).toContain("sr-only");
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("dar satırda kişi başı çubuk değil `.rg` bandı çizilir", () => {
    render(
      <VenueCheckRow
        venue={{
          id: "v1",
          name: "Café Berlage",
          travel: [
            { participantId: "p1", minutes: 25 },
            { participantId: "p2", minutes: 35 },
          ],
        }}
        checked
        onChange={() => {}}
        travel={{ labels: { p1: "Sen", p2: "Kerem" }, selfId: "p1" }}
      />,
    );
    expect(screen.getByTestId("range-dot-p1")).toBeInTheDocument();
    expect(screen.getByText("25–35 dk")).toBeInTheDocument();
    expect(screen.queryByTestId("travel-fill-p1")).not.toBeInTheDocument();
  });

  it("meta satırı puan · fiyat · semt'i TEK satırda yazar", () => {
    render(
      <VenueCheckRow
        venue={{ id: "v1", name: "Bakkerij Bart", rating: 4.3, priceLevel: 1, locality: "Best" }}
        checked={false}
        onChange={() => {}}
        midpointLabel="Eindhoven"
      />,
    );
    expect(screen.getByText("★ 4,3 · € · Best")).toBeInTheDocument();
  });

  // §4.9: semt orta nokta şehriyle aynıysa tekrar edilmez (VenueCard ile aynı kural).
  it("semt orta nokta etiketiyle aynıysa meta satırına girmez", () => {
    render(
      <VenueCheckRow
        venue={{ id: "v1", name: "Café Berlage", locality: "Eindhoven" }}
        checked={false}
        onChange={() => {}}
        midpointLabel="Eindhoven"
      />,
    );
    expect(screen.queryByText(/Eindhoven/)).not.toBeInTheDocument();
  });
});
