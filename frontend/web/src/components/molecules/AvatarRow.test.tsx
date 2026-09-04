import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AvatarRow from "./AvatarRow";

const person = (id: string, displayName: string, extra: Record<string, unknown> = {}) =>
  ({ id, displayName, host: false, hasLocation: true, deckDone: false, manual: false, ...extra });

describe("AvatarRow", () => {
  it("her avatar adını ve çevrimiçilik durumunu yazıyla söyler", () => {
    render(
      <AvatarRow
        people={[
          person("h", "Mehmet", { online: true }),
          person("a", "Ayşe", { online: false }),
        ] as never}
      />,
    );
    expect(screen.getAllByText("Mehmet · çevrimiçi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ayşe · çevrimdışı").length).toBeGreaterThan(0);
  });

  it("`online` alanı yoksa kimse çevrimdışı gösterilmez (bilgi yok ≠ yok)", () => {
    render(<AvatarRow people={[person("h", "Mehmet")] as never} />);
    expect(screen.queryByText(/çevrimdışı/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Mehmet · çevrimiçi").length).toBeGreaterThan(0);
  });

  it("elle eklenen nokta (SOLO) çevrimdışı damgalanmaz — soketi hiç olmaz", () => {
    render(<AvatarRow people={[person("m", "Kerem", { manual: true, online: false })] as never} />);
    expect(screen.queryByText(/çevrimdışı/)).not.toBeInTheDocument();
  });
});
