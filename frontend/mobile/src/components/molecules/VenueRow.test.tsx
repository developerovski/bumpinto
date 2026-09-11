import { render, screen } from "@testing-library/react-native";

import VenueRow from "./VenueRow";

/* Artboard P11 `.f-lk`: meta satırı ★ puan · fiyat · saat · semt sırasını kurar ve EKSİK
   parçayı ATLAR — "★ —" ya da boş bir ayraç basılmaz. "Neyle bilinir" (`tagline`) meta'nın
   parçası değil, altındaki AYRI satırdır (R-M8). */
const travel = { labels: {}, self: undefined } as never;

const venue = (over: Record<string, unknown> = {}) =>
  ({
    id: "v1",
    name: "Café Berlage",
    rating: 4.6,
    priceLevel: 2,
    category: "espresso bar",
    locality: "Eindhoven",
    hoursToday: "08:00–18:00",
    tagline: "Sakin, oturmalı, iyi filtre kahve",
    taglineSource: "FSQ",
    photoUrl: "https://cdn/x.jpg",
    travel: [
      { participantId: "m", minutes: 25, estimated: true },
      { participantId: "k", minutes: 35, estimated: true },
    ],
    ...over,
  }) as never;

test("meta satırı puan · fiyat · saat · semt sırasını kurar, tagline ayrı satır", async () => {
  await render(<VenueRow venue={venue()} travel={travel} />);
  expect(screen.getByText("★ 4,6 · €€ · Bugün 08:00–18:00 · Eindhoven")).toBeTruthy();
  expect(screen.getByText("Sakin, oturmalı, iyi filtre kahve")).toBeTruthy();
});

test("alan yoksa parça atlanır, tagline satırı hiç çizilmez", async () => {
  await render(
    <VenueRow
      venue={venue({ hoursToday: undefined, tagline: undefined, taglineSource: undefined, priceLevel: undefined })}
      travel={travel}
    />,
  );
  expect(screen.getByText("★ 4,6 · Eindhoven")).toBeTruthy();
  expect(screen.queryByText(/Sakin/)).toBeNull();
});

/* Semt orta nokta etiketiyle AYNIYSA tekrarlanmaz (§4.9) — "Eindhoven · Eindhoven" olmaz. */
test("semt orta nokta etiketiyle aynıysa meta'da tekrarlanmaz", async () => {
  await render(<VenueRow venue={venue()} travel={travel} midpointLabel="Eindhoven" />);
  expect(screen.getByText("★ 4,6 · €€ · Bugün 08:00–18:00")).toBeTruthy();
});
