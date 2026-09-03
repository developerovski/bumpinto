import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ParticipantDto as Participant, SessionView as View } from "@bumpinto/shared";
import BackupPlan, { backupOf } from "./BackupPlan";

const p1: Participant = { id: "p1", displayName: "Mehmet", hasLocation: true, manual: false };
const p2: Participant = { id: "p2", displayName: "Ayşe", hasLocation: true, manual: false };
const p3: Participant = { id: "p3", displayName: "Kerem", hasLocation: true, manual: false };
const manual: Participant = { id: "m1", displayName: "Elle eklenen", hasLocation: true, manual: true };

const venues = [
  { id: "v1", name: "Café Berlage" },
  { id: "v2", name: "Koffie Top Hundred" },
  { id: "v3", name: "Third Wave" },
];

function buildView(overrides: Partial<View> = {}): View {
  return {
    venues,
    participants: [p1, p2, p3],
    ...overrides,
  } as View;
}

describe("backupOf", () => {
  it("voteTally varsa kazananı hariç en yüksek ikinciyi döner", () => {
    const view = buildView({ voteTally: { v1: 3, v2: 2, v3: 1 } });
    expect(backupOf(view, "v1")?.id).toBe("v2");
  });

  it("voteTally yoksa/tekse likeCounts'a düşer: ≥2 beğeni VE ≥3 oy verebilecek katılımcı şartı", () => {
    const view = buildView({ likeCounts: { v1: 5, v2: 2, v3: 1 } });
    expect(backupOf(view, "v1")?.id).toBe("v2"); // v3 yalnız 1 beğeni — eşiğin altında
  });

  it("votersOf < 3 ise (konumsuz/elle eklenen dışlanır) likeCounts hiç kullanılmaz", () => {
    const view = buildView({
      participants: [p1, p2, manual], // yalnız 2 gerçek oy verebilecek kişi
      likeCounts: { v1: 5, v2: 2 },
    });
    expect(backupOf(view, "v1")).toBeNull();
  });

  it("kazananı adayken hariç tutar", () => {
    const view = buildView({ voteTally: { v1: 5 } }); // tek girdi — Object.keys > 1 değil
    expect(backupOf(view, "v1")).toBeNull();
  });

  it("hiçbir kaynak yoksa null döner", () => {
    expect(backupOf(buildView(), "v1")).toBeNull();
  });

  it("sayı eşitliğinde venue.id'ye göre kararlı (herkes aynı ikincil mekanı görür)", () => {
    const view = buildView({ voteTally: { v2: 2, v3: 2 } });
    expect(backupOf(view, "v1")?.id).toBe("v2"); // "v2" < "v3"
  });

  it("BackupPlan bileşeni adı ve 'ikinci sırada' notunu gösterir", () => {
    render(<BackupPlan view={buildView({ voteTally: { v1: 3, v2: 2 } })} winnerId="v1" tint={0} />);
    expect(screen.getByText("Koffie Top Hundred")).toBeInTheDocument();
    expect(screen.getByText("ikinci sırada")).toBeInTheDocument();
  });

  it("yedek yoksa BackupPlan hiçbir şey render etmez", () => {
    const { container } = render(<BackupPlan view={buildView()} winnerId="v1" tint={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
