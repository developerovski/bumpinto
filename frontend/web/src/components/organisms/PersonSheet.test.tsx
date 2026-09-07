import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../lib/api", () => ({
  api: { report: vi.fn(), blockParticipant: vi.fn(), nudge: vi.fn(), getSession: vi.fn(), preview: vi.fn() },
}));
vi.mock("../../store/liveChannel", () => ({
  liveChannel: { subscribe: vi.fn(() => vi.fn()), publish: vi.fn(), open: vi.fn() },
}));
import { api } from "../../lib/api";
import { useSocialStore } from "../../store/socialStore";
import { useVoiceStore } from "../../store/voiceStore";
import PersonSheet from "./PersonSheet";

const kerem = {
  id: "k", displayName: "Kerem", host: false, hasLocation: true, deckDone: false,
  manual: false, locationLabel: "Helmond",
};

const sheet = (onClose = vi.fn()) =>
  ({ onClose, ...render(<PersonSheet slug="x" participant={kerem as never} onClose={onClose} />) });

describe("PersonSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVoiceStore.setState({ mutedPeers: {} });
    useSocialStore.setState({ busy: false });
  });

  it("menü üç eylemi + kişinin yerini gösterir; Escape ve Vazgeç kapatır", () => {
    const { onClose } = sheet();
    expect(screen.getByRole("dialog", { name: "Kerem" })).toBeInTheDocument();
    expect(screen.getByText("Helmond · bu buluşmada")).toBeInTheDocument();
    for (const label of [/Bildir/, /Engelle/, /Sesli sohbette sustur/])
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("Bildir → sebep seçimi → Gönder socialStore.report'u çağırır ve panel kapanır", async () => {
    const report = vi.fn().mockResolvedValue(undefined);
    useSocialStore.setState({ report } as never);
    const { onClose } = sheet();
    fireEvent.click(screen.getByRole("button", { name: /Bildir/ }));
    expect(screen.getByText("Bildirim ekibimize gider; 24 saat içinde bakılır. Kerem bunu görmez."))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Sahte / spam" }));
    fireEvent.click(screen.getByRole("button", { name: "Gönder" }));
    expect(report).toHaveBeenCalledWith("x", "k", "Kerem", "SPAM", undefined);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("Engelle store'a gider; Sustur yereldir (hiçbir uç çağrılmaz)", async () => {
    const block = vi.fn().mockResolvedValue(undefined);
    useSocialStore.setState({ block } as never);
    const { onClose, unmount } = sheet();
    fireEvent.click(screen.getByRole("button", { name: /Engelle/ }));
    expect(block).toHaveBeenCalledWith("k", "Kerem");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    unmount();
    sheet();
    fireEvent.click(screen.getByRole("button", { name: /Sesli sohbette sustur/ }));
    expect(useVoiceStore.getState().mutedPeers.k).toBe(true);
    expect(api.report).not.toHaveBeenCalled();
    expect(api.blockParticipant).not.toHaveBeenCalled();
  });
});
