import { render, screen } from "@testing-library/react-native";

import { api } from "../lib/api";
import { tap } from "../testUtils/interact";
import RunoffScreen from "./RunoffScreen";

/**
 * P18 — finalistler arası tek seçim.
 *
 * Dakikalar `travel[]`ten okunur (K-B26: `travelMinutes` DEĞİL) — plan42'nin taslak
 * parçacığı eski alanı kullanıyordu, sözleşme değişmez kuralı gereği gerçek alana çevrildi.
 *
 * TEST BAŞINA TEK `render` (RNTL 14); `render` Promise döndürür.
 */

jest.mock("../lib/api", () => ({ api: { runoffVote: jest.fn(async () => undefined) } }));

const venue = (id: string, name: string, minutes: Record<string, number>) => ({
  id,
  name,
  travel: Object.entries(minutes).map(([participantId, m]) => ({ participantId, minutes: m })),
});

const base = {
  slug: "x7k2m",
  status: "RUNOFF",
  runoffVenueIds: ["a", "b"],
  venues: [
    venue("a", "Café Berlage", { m: 25, k: 35 }),
    venue("b", "Koffie Top Hundred", { m: 30, k: 35 }),
  ],
  participants: [
    { id: "m", displayName: "Mehmet", hasLocation: true },
    { id: "k", displayName: "Kerem", hasLocation: true },
  ],
  runoffVotedParticipantIds: [],
  viewer: { participantId: "m" },
};

beforeEach(() => jest.clearAllMocks());

/* Seçim İKİ ADIM: karta dokunmak seçer, CTA kilitler. Plan42'nin taslak parçacığı tek
   dokunuşta oy gönderiyordu; ama runoff oyu GERİ ALINAMAZ ve artboard'ın (web ile aynı)
   "Seçimimi kilitle" düğmesi vardır — yanlışlıkla değen bir parmak tek oyu harcayamamalı.
   Testin niyeti (doğru `venueId` sunucuya gider) korundu. */
test("oy verilir", async () => {
  await render(<RunoffScreen view={base as never} />);

  await tap("Café Berlage");
  await tap("Seçimimi kilitle");

  expect(api.runoffVote).toHaveBeenCalledWith("x7k2m", { venueId: "a" });
});

test("oy verdikten sonra kilit kartı ve sayaç görünür", async () => {
  await render(
    <RunoffScreen
      view={
        {
          ...base,
          runoffVotedParticipantIds: ["m"],
          viewer: { participantId: "m", runoffVoteVenueId: "a" },
        } as never
      }
    />,
  );

  expect(screen.getByText("Seçimin kilitli")).toBeTruthy();
  expect(screen.getByText("1 / 2 kilitledi")).toBeTruthy();
});
