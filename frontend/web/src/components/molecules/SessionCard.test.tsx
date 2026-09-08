import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { SessionSummaryDto } from "@bumpinto/shared";
import SessionCard from "./SessionCard";

const base: SessionSummaryDto = {
  slug: "x7k2m",
  name: "Cuma kahvesi",
  activityTypes: ["COFFEE"],
  sessionType: "GROUP",
  status: "COLLECTING",
  participantCount: 3,
  readyCount: 1,
};

function card(row: SessionSummaryDto) {
  return render(
    <MemoryRouter>
      <SessionCard row={row} />
    </MemoryRouter>,
  );
}

/* Artboard W1 (701-712): ilerleme çubuğunun ALTINDA [avatar yığını + durum metni | CTA].
   Yığın `participants[]`ten gelir — sayıdan avatar TÜRETİLMEZ (baş harfler oradan çıkmaz). */
describe("SessionCard — avatar yığını", () => {
  it("participants[] geldiğinde baş harfleri basar; hazır olmayan kesik çizgili avatar olur", () => {
    card({
      ...base,
      participants: [
        { displayName: "Mehmet", ready: true, host: true },
        { displayName: "Ayşe", ready: true, host: false },
        { displayName: "Kerem", ready: false, host: false },
      ],
    });
    // Yığın süsleme (aria-hidden); adlar ekran okuyucuya sr-only listeyle verilir.
    expect(screen.getByText("Mehmet, Ayşe, Kerem")).toBeInTheDocument();
    const initials = screen.getAllByText(/^[MAK]$/);
    expect(initials).toHaveLength(3);
    // `waiting` avatarı: kesik çizgili kenar + sand zemin (Avatar atomu).
    const kerem = initials[2];
    expect(kerem.className).toContain("border-dashed");
    expect(initials[0].className).not.toContain("border-dashed");
  });

  it("alan yoksa (eski sunucu) yığın hiç basılmaz — sayıdan avatar uydurulmaz", () => {
    card(base);
    expect(screen.queryByText(/^[A-Z]$/)).not.toBeInTheDocument();
    // Durum metni ve CTA yerinde kalır.
    expect(screen.getByText(/1\/3 hazır/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lobiye git/ })).toBeInTheDocument();
  });

  it("çevrimdışıyken CTA bağlantı değil devre dışı düğmedir", () => {
    render(
      <MemoryRouter>
        <SessionCard row={base} disabled />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lobiye git/ })).toBeDisabled();
  });

  it("SWIPING kartı 'Deste açık!' çıkartmasını ve deste CTA'sını taşır", () => {
    const { container } = card({ ...base, status: "SWIPING", doneCount: 2, readyCount: 3 });
    expect(screen.getByText("Deste açık!")).toBeInTheDocument();
    expect(screen.getByText(/2\/3 bitirdi/)).toBeInTheDocument();
    expect(within(container).getByRole("link").textContent).toContain("Desteye git");
  });
});
