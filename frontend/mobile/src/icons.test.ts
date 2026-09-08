import { ACTIVITY_ICON, MODE_ICON } from "./icons";

const ACTIVITIES = [
  "COFFEE",
  "FOOD",
  "BAR",
  "WALK",
  "ACTIVITY",
  "SWIM",
  "HIKE",
  "FITNESS",
  "CINEMA",
  "MUSEUM",
  "ART",
  "NIGHTLIFE",
  "THEME_PARK",
  "ADVENTURE",
  "GAMES",
] as const;

test("15 etkinlik türünün hepsinde ikon var", () =>
  ACTIVITIES.forEach((a) => expect(ACTIVITY_ICON[a]).toBeDefined()));

test("EBIKE iki glifle temsil edilir (Phosphor'da e-bisiklet glifi yok)", () => {
  expect(MODE_ICON.EBIKE).toHaveLength(2);
  expect(MODE_ICON.CAR).toHaveLength(1);
});
