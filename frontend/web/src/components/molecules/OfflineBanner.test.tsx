import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OfflineBanner from "./OfflineBanner";

describe("OfflineBanner", () => {
  it("çevrimiçiyken hiç çizilmez", () => {
    const { container } = render(<OfflineBanner online lastOnlineAt={null} onRetry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("çevrimdışında başlık ve saatli ipucu basar", () => {
    render(<OfflineBanner online={false} lastOnlineAt={Date.parse("2026-09-06T12:38:00Z")} onRetry={vi.fn()} />);
    expect(screen.getByText("Bağlantı yok")).toBeInTheDocument();
    expect(screen.getByText(/Son görülen hali gösteriliyor ·/)).toBeInTheDocument();
  });

  it("saat bilinmiyorsa yalnız başlık; 'Tekrar dene' geri çağrıyı çalıştırır", () => {
    const retry = vi.fn();
    render(<OfflineBanner online={false} lastOnlineAt={null} onRetry={retry} />);
    expect(screen.queryByText(/Son görülen hali/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("retrying iken 'Tekrar dene' kilitlenir", () => {
    render(<OfflineBanner online={false} lastOnlineAt={null} onRetry={vi.fn()} retrying />);
    expect(screen.getByRole("button", { name: "Tekrar dene" })).toBeDisabled();
  });
});
