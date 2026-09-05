import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ParticipantDto, SessionView, VenueDto } from "@bumpinto/shared";
import { useDeckStore } from "../store/deckStore";
import DeckScreen from "./DeckScreen";

vi.mock("../lib/api", () => ({
  api: { swipe: vi.fn(), undoSwipe: vi.fn(), deckDone: vi.fn(), forceDecision: vi.fn() },
}));

const mehmet: ParticipantDto = {
  id: "me", displayName: "Mehmet", host: true, hasLocation: true, manual: false, deckDone: false,
};
const ayse: ParticipantDto = {
  id: "a", displayName: "Ayşe", host: false, hasLocation: true, manual: false, deckDone: true,
};
const kerem: ParticipantDto = {
  id: "k", displayName: "Kerem", host: false, hasLocation: true, manual: false, deckDone: true,
};

const venues: VenueDto[] = Array.from({ length: 12 }, (_, i) => ({ id: `v${i}`, name: `Yer ${i}`, deckOrder: i }));

/** `SessionView`'in tüm alanları opsiyoneldir — test görünümünü tipli kurar, `as never` gerekmez. */
function buildView(overrides: Partial<SessionView> = {}): SessionView {
  return {
    slug: "x",
    activityTypes: ["FOOD"],
    sessionType: "GROUP",
    status: "SWIPING",
    name: "Kahve",
    participants: [mehmet, ayse, kerem],
    venues,
    viewer: { participantId: "me", host: true },
    ...overrides,
  };
}

describe("DeckScreen — geciken not", () => {
  it("aktif destede geciken kişiye tek, adlı, pozitif not gösterir", () => {
    useDeckStore.setState({ slug: "x", index: 9, liked: {}, listMode: false, sending: false, sent: false });
    render(<DeckScreen slug="x" view={buildView()} />);
    expect(screen.getByText("Mehmet, herkes seni bekliyor — 3 kart kaldı")).toBeInTheDocument();
  });
});

describe("DeckScreen — yeniden yükleme sonrası sunucu gerçeği", () => {
  it("yerel sent=false ama sunucu selfDone=true ise bekleme lobisi görünür, gönder butonu yok", () => {
    // Reload: deckStore.start() index/sent'i sıfırlar, ama katılımcı kaydı sunucuda kalıcıdır.
    useDeckStore.setState({ slug: "x", index: 0, liked: {}, listMode: false, sending: false, sent: false });
    const view = buildView({ participants: [{ ...mehmet, deckDone: true }, ayse, kerem] });
    render(<DeckScreen slug="x" view={view} />);
    expect(screen.queryByRole("button", { name: "Beğenilerimi gönder" })).not.toBeInTheDocument();
    expect(screen.getByText("Beğenilerin gönderildi")).toBeInTheDocument();
  });
});

// BLOCKER fix: VenueDeck `midpointLabel`i görünümden alır; uyum satırı MEKÂNIN kendi alanından (§4.9).
describe("DeckScreen — kart anatomisi canlı destede kablolu (§4.9)", () => {
  it("uyum satırını gösterir; semt orta nokta etiketiyle AYNIYSA meta satırında tekrar edilmez", () => {
    useDeckStore.setState({ slug: "x", index: 0, liked: {}, listMode: false, sending: false, sent: false });
    const view = buildView({
      activityTypes: ["COFFEE"],
      midpointLabel: "Eindhoven",
      venues: [
        { id: "v0", name: "Café Berlage", deckOrder: 0, category: "Espresso bar", locality: "Eindhoven", activityType: "COFFEE" },
        { id: "v1", name: "Bakkerij Bart", deckOrder: 1, category: "Fırın", activityType: "COFFEE" },
      ],
    });
    render(<DeckScreen slug="x" view={view} />);
    expect(screen.getByText("Kahve için: espresso bar")).toBeInTheDocument();
    expect(screen.queryByText("Eindhoven")).not.toBeInTheDocument();
  });
});
