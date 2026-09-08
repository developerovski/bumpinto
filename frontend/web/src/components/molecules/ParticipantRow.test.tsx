import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({ api: { getSession: vi.fn(), preview: vi.fn() } }));
vi.mock("../../store/liveChannel", () => ({
  liveChannel: { subscribe: vi.fn(() => vi.fn()), publish: vi.fn(), open: vi.fn() },
}));

import { useVoiceStore } from "../../store/voiceStore";
import ParticipantRow from "./ParticipantRow";

const ayse = (extra: Record<string, unknown> = {}) =>
  ({ id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false,
    locationLabel: "Someren", ...extra });

describe("ParticipantRow — ses", () => {
  beforeEach(() => useVoiceStore.setState({ peers: {}, selfSpeaking: false }));

  it("sesli sohbetteki katılımcı mikrofon ikonuyla işaretlenir", () => {
    render(<ParticipantRow participant={ayse({ inVoice: true }) as never} index={0} />);
    expect(screen.getByText("sesli sohbette")).toBeInTheDocument();
  });

  it("sesde olmayan katılımcıda ikon ve halka yok", () => {
    render(<ParticipantRow participant={ayse() as never} index={0} />);
    expect(screen.queryByText("sesli sohbette")).not.toBeInTheDocument();
    expect(screen.queryByText("konuşuyor")).not.toBeInTheDocument();
  });

  it("konuşan peer halka ve yazıyla belli olur; kendi satırı selfSpeaking'e bakar", () => {
    useVoiceStore.setState({ peers: { a: { state: "connected", speaking: true } }, selfSpeaking: true });
    const { rerender } = render(<ParticipantRow participant={ayse({ inVoice: true }) as never} index={0} />);
    expect(screen.getByText("konuşuyor")).toBeInTheDocument();

    useVoiceStore.setState({ peers: {}, selfSpeaking: true });
    rerender(<ParticipantRow participant={ayse({ inVoice: true }) as never} index={0} isSelf />);
    expect(screen.getByText("konuşuyor")).toBeInTheDocument();
  });
});

describe("ParticipantRow — presence 2.0", () => {
  it("çevrimiçide nokta; çevrimdışıda lastSeenAt varsa saat, yoksa yalnız 'çevrimdışı'", () => {
    const { rerender } = render(<ParticipantRow participant={ayse({ online: true }) as never} index={0} />);
    expect(screen.getByTestId("online-dot")).toBeInTheDocument();
    rerender(<ParticipantRow index={0}
      participant={ayse({ online: false, lastSeenAt: "2026-09-06T10:38:00Z" }) as never} />);
    expect(screen.queryByTestId("online-dot")).not.toBeInTheDocument();
    expect(screen.getByText(/Son görülen · /)).toBeInTheDocument();
    rerender(<ParticipantRow participant={ayse({ online: false }) as never} index={0} />);
    expect(screen.getByText("çevrimdışı")).toBeInTheDocument();
    expect(screen.queryByText(/Son görülen/)).not.toBeInTheDocument();
  });
  it("konum yok: linkOpenedAt varsa 'Linki açtı' + nabız, yoksa eski metin", () => {
    const w = { hasLocation: false, locationLabel: undefined };
    const { container, rerender } = render(<ParticipantRow index={0}
      participant={ayse({ ...w, linkOpenedAt: "2026-09-06T10:30:00Z" }) as never} />);
    expect(screen.getByText("Linki açtı · konum bekleniyor…")).toBeInTheDocument();
    expect(container.querySelector(".c-pulse")).not.toBeNull();
    rerender(<ParticipantRow participant={ayse(w) as never} index={0} />);
    expect(screen.getByText("Konum bekleniyor…")).toBeInTheDocument();
  });
  it("'…' yalnız onOptions varken, kendi satırı ve engelli satır dışında çıkar", () => {
    const onOptions = vi.fn();
    const label = { name: "Ayşe · seçenekler" };
    const { rerender } = render(<ParticipantRow participant={ayse() as never} index={0} onOptions={onOptions} />);
    fireEvent.click(screen.getByRole("button", label));
    expect(onOptions).toHaveBeenCalledTimes(1);
    rerender(<ParticipantRow participant={ayse() as never} index={0} isSelf onOptions={onOptions} />);
    expect(screen.queryByRole("button", label)).not.toBeInTheDocument();
    rerender(<ParticipantRow participant={ayse({ blocked: true }) as never} index={0} onOptions={onOptions} />);
    expect(screen.queryByRole("button", label)).not.toBeInTheDocument();
    expect(screen.getByText("engellendi")).toBeInTheDocument();
  });
});

/** Artboard W3d (4020/4113) — çapalı oturumda konum ŞART DEĞİL: satır bekleyen gibi değil
    hazır gibi görünür. Rol rozeti ("Kuran") durum rozetini gizlemez (artboard W3 1107–1108). */
describe("ParticipantRow — çapalı oturum", () => {
  it("konumsuz katılımcı 'gerekmiyor' der, yeşil Hazır rozeti alır, nabız atmaz", () => {
    const w = { hasLocation: false, locationLabel: undefined };
    const { container, rerender } = render(
      <ParticipantRow participant={ayse(w) as never} index={0} anchored isSelf />,
    );
    expect(screen.getByText("Konum vermedin · gerekmiyor")).toBeInTheDocument();
    expect(screen.getByText("Hazır")).toBeInTheDocument();
    expect(container.querySelector(".c-pulse")).toBeNull();

    // Başkasının satırında ikinci tekil şahıs YANLIŞ olur.
    rerender(<ParticipantRow participant={ayse(w) as never} index={0} anchored />);
    expect(screen.getByText("Konum vermedi · gerekmiyor")).toBeInTheDocument();
  });

  it("çapa yokken konumsuz satır aynen bekliyor kalır", () => {
    const w = { hasLocation: false, locationLabel: undefined };
    const { container } = render(<ParticipantRow participant={ayse(w) as never} index={0} isSelf />);
    expect(screen.getByText("Konum bekleniyor…")).toBeInTheDocument();
    expect(screen.getByText("Bekliyor")).toBeInTheDocument();
    expect(container.querySelector(".c-pulse")).not.toBeNull();
  });

  it("kuran satırında rol ve durum rozeti birlikte basılır", () => {
    render(<ParticipantRow participant={ayse({ host: true }) as never} index={0} />);
    expect(screen.getByText("Kuran")).toBeInTheDocument();
    expect(screen.getByText("Hazır")).toBeInTheDocument();
  });
});
