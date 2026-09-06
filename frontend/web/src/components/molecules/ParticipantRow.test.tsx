import { render, screen } from "@testing-library/react";
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
