import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SessionView } from "@bumpinto/shared";
import MidpointCard, { nearestParticipant } from "./MidpointCard";

const base = {
  slug: "x7k2m",
  name: "Cuma kahvesi",
  activityType: "COFFEE",
  sessionType: "GROUP",
  status: "COLLECTING",
  midpoint: { lat: 51.5, lng: 5.5 },
  radiusKm: 8.7,
  viewer: { participantId: "h", host: true },
} as const;

// `view`: en yakın katılımcı arabayla (CAR) — yan not YOK.
const carNear = { id: "car1", displayName: "Kerem", host: true, hasLocation: true, manual: false, approxLocation: { lat: 51.501, lng: 5.501 }, midpointMinutes: 25, travelMode: "CAR" as const };
const bikeFar = { id: "bike1", displayName: "Ahmet", host: false, hasLocation: true, manual: false, approxLocation: { lat: 51.6, lng: 5.9 }, midpointMinutes: 35, travelMode: "BIKE" as const };
const view = { ...base, participants: [carNear, bikeFar] } as unknown as SessionView;

// `bikeView`: en yakın katılımcı bisikletle (BIKE) — yan not VAR, ada ek YOK.
const carFar = { id: "car1", displayName: "Kerem", host: true, hasLocation: true, manual: false, approxLocation: { lat: 51.6, lng: 5.9 }, midpointMinutes: 35, travelMode: "CAR" as const };
const bikeNear = { id: "bike1", displayName: "Ahmet", host: false, hasLocation: true, manual: false, approxLocation: { lat: 51.501, lng: 5.501 }, midpointMinutes: 25, travelMode: "BIKE" as const };
const bikeView = { ...base, participants: [carFar, bikeNear] } as unknown as SessionView;

describe("MidpointCard", () => {
  it("orta nokta kartı: overline, yarıçap ve herkesin aralığı", () => {
    render(<MidpointCard view={view} />);
    expect(screen.getAllByText("Orta nokta")).toHaveLength(2); // overline + başlık
    expect(screen.getByText("≤ 9 km · herkes ~25–35 dk")).toBeInTheDocument();
  });

  it("midpointLabel yoksa başlık 'Orta nokta'; varsa '{{label}} civarı'", () => {
    render(<MidpointCard view={view} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Orta nokta");
    render(<MidpointCard view={{ ...view, midpointLabel: "Eindhoven" }} />);
    expect(screen.getByRole("heading", { name: "Eindhoven civarı" })).toBeInTheDocument();
  });

  it("ulaşım türü notu ada ek getirmez", () => {
    render(<MidpointCard view={bikeView} />);
    expect(screen.getByText("Orta nokta Ahmet tarafında · bisikletle geliyor")).toBeInTheDocument();
  });

  it("CAR (varsayılan) modda yan not basılmaz", () => {
    render(<MidpointCard view={view} />);
    expect(screen.queryByText(/tarafında/)).not.toBeInTheDocument();
  });

  it("nearestParticipant orta noktaya en yakın katılımcıyı döner", () => {
    expect(nearestParticipant(view)?.id).toBe("car1");
    expect(nearestParticipant(bikeView)?.id).toBe("bike1");
  });

  it("kimsede midpointMinutes yoksa aralık gizlenir — yalnız yarıçap basılır", () => {
    const noMinutes = {
      ...base,
      participants: [
        { ...carNear, midpointMinutes: undefined },
        { ...bikeFar, midpointMinutes: undefined },
      ],
    } as unknown as SessionView;
    render(<MidpointCard view={noMinutes} />);
    expect(screen.getByText("≤ 9 km")).toBeInTheDocument();
    expect(screen.queryByText(/herkes ~/)).not.toBeInTheDocument();
  });
});
