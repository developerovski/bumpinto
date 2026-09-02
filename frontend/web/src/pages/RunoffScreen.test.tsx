import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSessionStore } from "../store/sessionStore";
import RunoffScreen from "./RunoffScreen";

const venues = [
  { id: "v1", name: "Sofra Cuisine", lat: 51.7, lng: 5.3, rating: 5, travelMinutes: {} },
  { id: "v2", name: "Abed food", lat: 51.7, lng: 5.31, rating: 4.9, travelMinutes: {} },
];
const mehmet = { id: "h", displayName: "Mehmet", host: true, hasLocation: true, manual: false };
const yildiz = { id: "y", displayName: "Yildiz", host: false, hasLocation: true, manual: false };

/** `viewer` sunucunun "sen kimsin" yanıtı; host bayrağı beraberlikte kararı kimin vereceğini belirler. */
function view(
  viewer: { participantId: string; host: boolean; runoffVoteVenueId?: string },
  votedIds: string[],
) {
  return {
    slug: "q4754zo7", activityType: "FOOD", sessionType: "GROUP", status: "RUNOFF",
    participants: [mehmet, yildiz], venues, runoffVenueIds: ["v1", "v2"],
    runoffVotedParticipantIds: votedIds, viewer,
  } as never;
}

describe("RunoffScreen", () => {
  it("herkes oy vermediyse normal bekleme durumu", () => {
    const v = view({ participantId: "h", host: true }, ["y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByRole("button", { name: "Seçimimi kilitle" })).toBeInTheDocument();
    expect(screen.queryByText("Berabere")).not.toBeInTheDocument();
  });

  /**
   * Beraberlik = "herkes oy verdi ama oturum hâlâ RUNOFF". Tek kazanan çıksaydı sunucu
   * DECIDED'a geçerdi, dolayısıyla bu koşul tam olarak beraberliktir. Host'a çıkış yolu
   * verilmezse oturum burada sonsuza kadar kilitli kalır.
   */
  it("beraberlikte host kararı verir", async () => {
    const pick = vi.fn().mockResolvedValue(undefined);
    const v = view({ participantId: "h", host: true }, ["h", "y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v, pick });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText("Berabere")).toBeInTheDocument();
    expect(screen.queryByText("Seçimin kilitli")).not.toBeInTheDocument();

    const decide = screen.getByRole("button", { name: "Kararı ver" });
    expect(decide).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]);
    fireEvent.click(decide);
    await waitFor(() => expect(pick).toHaveBeenCalledWith("v1"));
  });

  /**
   * Seçim yalnız useState'te yaşarsa sayfa yenilenince kaybolur: kişi "kilitli" yazısını
   * görür ama neyi kilitlediğini göremez. Sunucu kendi oyunu viewer'da geri döner.
   */
  it("yenileme sonrası kendi seçimi sunucudan geri gelir", () => {
    const v = view({ participantId: "y", host: false, runoffVoteVenueId: "v2" }, ["y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    const pressed = screen.getAllByRole("button", { pressed: true });
    expect(pressed.length).toBeGreaterThan(0);
    pressed.forEach((b) => expect(b).toHaveTextContent("Abed food"));
  });

  it("beraberlikte host olmayan bekler, karar butonu görmez", () => {
    const v = view({ participantId: "y", host: false }, ["h", "y"]);
    useSessionStore.setState({ slug: "q4754zo7", view: v });
    render(<RunoffScreen slug="q4754zo7" view={v} />);

    expect(screen.getByText("Berabere")).toBeInTheDocument();
    expect(screen.getByText(/Mehmet son kararı veriyor/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kararı ver" })).not.toBeInTheDocument();
  });
});
