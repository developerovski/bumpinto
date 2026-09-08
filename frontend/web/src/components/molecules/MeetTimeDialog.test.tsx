import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MeetTimeDialog from "./MeetTimeDialog";

const venue = { id: "v", name: "Café Berlage", address: "Kleine Berg 16, Eindhoven" };

describe("MeetTimeDialog", () => {
  it("saat sorar, indirme text/calendar üretir, Google linki aynı saati taşır", () => {
    const types: string[] = [];
    vi.stubGlobal("URL", {
      createObjectURL: (b: Blob) => {
        types.push(b.type);
        return "blob:x";
      },
      revokeObjectURL: vi.fn(),
    });
    render(
      <MeetTimeDialog
        venue={venue as never}
        sessionName="Cuma kahvesi"
        slug="x7k2m"
        decidedAt="2026-09-06T12:41:00Z"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Saat kaçta?" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Saat"), { target: { value: "19:30" } });
    expect(screen.getByRole("link", { name: "Google Calendar'da aç" }).getAttribute("href")).toContain("T1930");
    fireEvent.click(screen.getByRole("button", { name: "Takvim dosyası indir" }));
    expect(types[0]).toContain("text/calendar");
    vi.unstubAllGlobals();
  });
});
