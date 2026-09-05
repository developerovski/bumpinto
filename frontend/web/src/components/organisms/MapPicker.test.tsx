import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MapPicker from "./MapPicker";

vi.mock("../../lib/maps", () => ({
  mapsConfigured: vi.fn(() => false),
  loadMaps: vi.fn(),
  trackMapInstance: vi.fn(),
  MAP_ID: "test-map",
}));

import { loadMaps, mapsConfigured } from "../../lib/maps";

describe("MapPicker", () => {
  it("Maps yapılandırılmamışsa harita yerine açıklama basar, çökmez", () => {
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Harita bu ortamda yapılandırılmadı.")).toBeInTheDocument();
  });

  it("iptal düğmesi onCancel çağırır", () => {
    const onCancel = vi.fn();
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(onCancel).toHaveBeenCalled();
  });

  /** Harita YUKLENEMEZSE onay dugmesi etkin kalmamali: bos bir kutunun ustunde "Burayi sec"
      kullaniciya HIC GORMEDIGI bir koordinati onaylatir ve oturum yanlis yerde kurulur. */
  it("harita yüklenemezse 'Burayı seç' kilitlenir", async () => {
    vi.mocked(mapsConfigured).mockReturnValue(true);
    vi.mocked(loadMaps).mockRejectedValueOnce(new Error("no key"));
    try {
      render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
      await vi.waitFor(() =>
        expect(screen.getByRole("button", { name: "Burayı seç" })).toBeDisabled());
    } finally {
      vi.mocked(mapsConfigured).mockReturnValue(false);
    }
  });
});
