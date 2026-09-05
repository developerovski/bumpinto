import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MapPicker from "./MapPicker";

vi.mock("../../lib/maps", () => ({
  mapsConfigured: () => false,
  loadMaps: vi.fn(),
  MAP_ID: "test-map",
}));

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
});
