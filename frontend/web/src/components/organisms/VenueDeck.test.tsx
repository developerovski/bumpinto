import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import { useDeckStore } from "../../store/deckStore";
import VenueDeck from "./VenueDeck";

vi.mock("../../lib/api", () => ({ api: { swipe: vi.fn(), undoSwipe: vi.fn() } }));

const venues = [
  { id: "a", name: "Café Berlage", deckOrder: 0 },
  { id: "b", name: "Koffie Top", deckOrder: 1 },
  { id: "c", name: "Sofra", deckOrder: 2 },
];

// Olaylar kart başlığından yükselir; SwipeCard kökündeki React işleyicileri yakalar.
function drag(toX: number) {
  const el = screen.getByText("Café Berlage");
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, button: 0 });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: toX, clientY: 0 });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: toX, clientY: 0 });
}

describe("VenueDeck jesti (plan 14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Sabit saat: dt = 0 → hız 0; fırlatma yolu swipeMath testinde, burada yalnız mesafe.
    vi.spyOn(performance, "now").mockReturnValue(1000);
    vi.mocked(api.swipe).mockResolvedValue({} as never);
    useDeckStore.setState({ slug: "s", index: 0, liked: {}, listMode: false, sending: false });
  });

  it("eşiği aşan sağa sürükleme beğeni sayılır ve sonraki karta geçer", () => {
    render(<VenueDeck venues={venues} />);
    drag(200);
    expect(api.swipe).toHaveBeenCalledWith("s", { venueId: "a", liked: true });
    expect(useDeckStore.getState().index).toBe(1);
  });

  it("eşiği aşan sola sürükleme geç sayılır", () => {
    render(<VenueDeck venues={venues} />);
    drag(-200);
    expect(api.swipe).toHaveBeenCalledWith("s", { venueId: "a", liked: false });
    expect(useDeckStore.getState().liked).toEqual({ a: false });
  });

  it("kısa sürükleme karar değildir — kart yerinde kalır", () => {
    render(<VenueDeck venues={venues} />);
    drag(40);
    expect(api.swipe).not.toHaveBeenCalled();
    expect(useDeckStore.getState().index).toBe(0);
    expect(screen.getByText("Café Berlage")).toBeInTheDocument();
  });

  // §5.C "Deste" — kalan kart ≤ 2 ve hiç beğeni yoksa TEK kalibrasyon notu.
  it("kalan ≤2 kart ve hiç beğeni yokken kalibrasyon notu çıkar", () => {
    useDeckStore.setState({ slug: "s", index: 1, liked: {}, listMode: false, sending: false });
    render(<VenueDeck venues={venues} />);
    expect(
      screen.getByText("hiç beğenmedin — kimse ortak beğenmezse sonuç boş kalır"),
    ).toBeInTheDocument();
  });

  it("en az bir beğeni varsa kalibrasyon notu çıkmaz", () => {
    useDeckStore.setState({ slug: "s", index: 1, liked: { a: true }, listMode: false, sending: false });
    render(<VenueDeck venues={venues} />);
    expect(
      screen.queryByText("hiç beğenmedin — kimse ortak beğenmezse sonuç boş kalır"),
    ).not.toBeInTheDocument();
  });

  it("kalan kart >2 iken beğeni olmasa bile kalibrasyon notu çıkmaz", () => {
    render(<VenueDeck venues={venues} />); // index 0 → remaining 3
    expect(
      screen.queryByText("hiç beğenmedin — kimse ortak beğenmezse sonuç boş kalır"),
    ).not.toBeInTheDocument();
  });
});
