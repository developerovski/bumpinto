import * as Sharing from "expo-sharing";

import { shareIcs, writeIcsFile } from "./calendar";

const mock = (fn: unknown) => fn as jest.Mock;

const event = {
  uid: "x@bumpinto.app",
  start: new Date("2026-09-06T18:30:00Z"),
  durationMinutes: 90,
  title: "Café Berlage",
  location: "Kleine Berg 16",
  url: "https://bumpinto.app/j/x7k2m",
  timeZone: "Europe/Amsterdam",
};

beforeEach(() => jest.clearAllMocks());

test("ICS önbelleğe yazılır ve slug'la adlandırılır", () => {
  expect(writeIcsFile(event, "x7k2m")).toBe("file:///cache/bumpinto-x7k2m.ics");
});

test("paylaşım yoksa dosya HİÇ yazılmaz, 'unavailable' döner", async () => {
  mock(Sharing.isAvailableAsync).mockResolvedValue(false);
  expect(await shareIcs(event, "x7k2m", "Takvime ekle")).toBe("unavailable");
  expect(Sharing.shareAsync).not.toHaveBeenCalled();

  mock(Sharing.isAvailableAsync).mockResolvedValue(true);
  expect(await shareIcs(event, "x7k2m", "Takvime ekle")).toBe("shared");
  expect(Sharing.shareAsync).toHaveBeenCalledWith(
    "file:///cache/bumpinto-x7k2m.ics",
    expect.objectContaining({ mimeType: "text/calendar" }),
  );
});

/* Kullanıcı paylaşım sayfasından vazgeçerse ekran ÇÖKMEZ — sessizce geri döner. */
test("paylaşım sayfası hata verirse 'failed' döner", async () => {
  mock(Sharing.isAvailableAsync).mockResolvedValue(true);
  mock(Sharing.shareAsync).mockRejectedValue(new Error("cancel"));
  expect(await shareIcs(event, "x7k2m", "Takvime ekle")).toBe("failed");
});
