import { render, screen } from "@testing-library/react-native";

import { useDeckStore } from "../store/deckStore";
import DeckDoneScreen from "./DeckDoneScreen";

/**
 * P15 — deste bitti. İki dal: hiç beğeni yoksa uyarı + "yine de gönder", varsa beğenilenler
 * listesi + gönder.
 *
 * TEST BAŞINA TEK `render` (RNTL 14); `render` Promise döndürür — `await` şart.
 */

jest.mock("../lib/api", () => ({
  api: { swipe: jest.fn(async () => undefined), deckDone: jest.fn(async () => undefined) },
}));

const venue = { id: "a", name: "Café Berlage" };

const view = (venues: unknown[]) =>
  ({
    slug: "x7k2m",
    name: "Cuma kahvesi",
    status: "SWIPING",
    venues,
    participants: [{ id: "m", displayName: "Mehmet", hasLocation: true }],
    viewer: { participantId: "m" },
  }) as never;

beforeEach(() => {
  useDeckStore.setState({ slug: "x7k2m", venues: [], index: 0, liked: [], history: [], sent: false });
});

test("0 beğenide 'yine de gönder' seçeneği çıkar", async () => {
  await render(<DeckDoneScreen view={view([])} />);

  expect(screen.getByRole("button", { name: "Yine de gönder" })).toBeTruthy();
  expect(screen.getByText(/Hiç beğeni seçmedin/)).toBeTruthy();
});

test("beğenilenler listelenir ve gönder CTA'sı çıkar", async () => {
  useDeckStore.setState({ venues: [venue] as never, liked: ["a"] });
  await render(<DeckDoneScreen view={view([venue])} />);

  expect(screen.getByText("Café Berlage")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Beğenilerimi gönder" })).toBeTruthy();
});
