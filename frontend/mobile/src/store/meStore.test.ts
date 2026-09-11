import { api } from "../lib/api";
import { useMeStore } from "./meStore";

jest.mock("../lib/api", () => ({
  api: { updateMe: jest.fn(async (body: unknown) => body) },
}));

/* K-M46: `PUT /api/me` tam değişimdir — yalnız `{ language }` gönderilseydi sunucu varsayılan
   konumu, etkinliği ve ulaşım türünü silerdi. Gövde mevcut `me`'yi taşır, patch yalnız
   değişeni ezer; `interests` gönderilmez (sunucu null'da korur). */
test("update: tek alan değişse de gövde diğer tercihleri taşır", async () => {
  useMeStore.setState({
    me: {
      displayName: "Mehmet",
      defaultLocation: { lat: 51.44, lng: 5.47, label: "Eindhoven" },
      defaultActivity: "COFFEE",
      language: "tr",
      defaultTravelMode: "BIKE",
      interests: ["HIKE"],
    },
  });

  await expect(useMeStore.getState().update({ language: "nl" })).resolves.toBe(true);

  expect(api.updateMe).toHaveBeenCalledWith({
    displayName: "Mehmet",
    defaultLocation: { lat: 51.44, lng: 5.47, label: "Eindhoven" },
    defaultActivity: "COFFEE",
    language: "nl",
    defaultTravelMode: "BIKE",
  });
});
