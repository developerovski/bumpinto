import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import ShareCard from "./ShareCard";

const participants: ParticipantDto[] = [
  { id: "a", displayName: "Ayşe" },
  { id: "k", displayName: "Kerem" },
];

describe("ShareCard", () => {
  it("adalet verisi (travel[]) yoksa alt bilgi satırı yanıltıcı ~0–0 dk göstermez, tamamen düşer", () => {
    const venue: VenueDto = { id: "v1", name: "Kafe X" }; // travel[] yok — örn. solo oturum
    const ref = createRef<HTMLDivElement>();
    render(<ShareCard nodeRef={ref} venue={venue} participants={participants} photo={null} />);
    const footer = screen.getByTestId("share-card-footer");
    expect(footer.children).toHaveLength(1);
    expect(screen.getByText("BumpInto")).toBeInTheDocument();
  });

  it("adalet verisi varsa alt bilgi satırı gerçek dakikalarla çizilir", () => {
    const venue: VenueDto = {
      id: "v1",
      name: "Kafe X",
      travel: [
        { participantId: "a", minutes: 20 },
        { participantId: "k", minutes: 30 },
      ],
    };
    const ref = createRef<HTMLDivElement>();
    render(<ShareCard nodeRef={ref} venue={venue} participants={participants} photo={null} />);
    const footer = screen.getByTestId("share-card-footer");
    expect(footer.children).toHaveLength(2);
    expect(screen.getByText("Ayşe")).toBeInTheDocument();
    expect(screen.getByText("Kerem")).toBeInTheDocument();
  });
});
