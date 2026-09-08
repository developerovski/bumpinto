import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ShareButton from "./ShareButton";

describe("ShareButton — dosya modu", () => {
  it("dosya üretilemezse metin paylaşımına düşer", async () => {
    const getFile = vi.fn().mockResolvedValue(null);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, canShare: () => false });
    render(<ShareButton mode="file" getFile={getFile} text="metin" url="https://x/y" label="Kartı paylaş" />);
    fireEvent.click(screen.getByRole("button", { name: /Kartı paylaş/ }));
    await waitFor(() => expect(getFile).toHaveBeenCalled());
    await waitFor(() => expect(share).toHaveBeenCalledWith({ text: "metin", url: "https://x/y" }));
    vi.unstubAllGlobals();
  });

  it("getFile reddedilirse (async reject) metin paylaşımına düşer ve buton tekrar etkinleşir", async () => {
    const getFile = vi.fn().mockRejectedValue(new Error("boom"));
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, canShare: () => false });
    render(<ShareButton mode="file" getFile={getFile} text="metin" url="https://x/y" label="Kartı paylaş" />);
    const btn = screen.getByRole("button", { name: /Kartı paylaş|Kart hazırlanıyor/ });
    fireEvent.click(btn);
    await waitFor(() => expect(getFile).toHaveBeenCalled());
    await waitFor(() => expect(share).toHaveBeenCalledWith({ text: "metin", url: "https://x/y" }));
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
    vi.unstubAllGlobals();
  });

  it("getFile senkron fırlatırsa metin paylaşımına düşer ve buton tekrar etkinleşir", async () => {
    const getFile = vi.fn(() => {
      throw new Error("sync boom");
    });
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, canShare: () => false });
    render(<ShareButton mode="file" getFile={getFile} text="metin" url="https://x/y" label="Kartı paylaş" />);
    const btn = screen.getByRole("button", { name: /Kartı paylaş|Kart hazırlanıyor/ });
    fireEvent.click(btn);
    await waitFor(() => expect(getFile).toHaveBeenCalled());
    await waitFor(() => expect(share).toHaveBeenCalledWith({ text: "metin", url: "https://x/y" }));
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
    vi.unstubAllGlobals();
  });
});
