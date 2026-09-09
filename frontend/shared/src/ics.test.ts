import { describe, expect, it } from "vitest";
import { buildIcs, defaultMeetAt, googleCalendarUrl } from "./ics";

const event = {
  uid: "x@bumpinto.app",
  start: new Date("2026-09-06T18:30:00Z"),
  durationMinutes: 90,
  title: "Café Berlage · Cuma kahvesi",
  location: "Kleine Berg 16, Eindhoven",
  url: "https://bumpinto.app/j/x7k2m",
  timeZone: "Europe/Amsterdam",
};

describe("ics", () => {
  it("UTC damgalı, CRLF'li geçerli VEVENT üretir", () => {
    const text = buildIcs(event);
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text).toContain("DTSTART:20260906T183000Z");
    expect(text).toContain("DTEND:20260906T200000Z");
    expect(text).toContain("X-WR-TIMEZONE:Europe/Amsterdam");
    expect(text).toContain("LOCATION:Kleine Berg 16\\, Eindhoven");
    expect(text.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  /* `VTIMEZONE` YAZILMAZ: damgalar mutlak UTC, `TZID` gereksiz — `X-WR-TIMEZONE` yalnız
     görüntüleyene ipucu. Mobil ve web AYNI metni üretir (M-9:T5 taşıması). */
  it("VTIMEZONE bloğu yazmaz ve varsayılan saat tam saate oturur", () => {
    expect(buildIcs(event)).not.toContain("BEGIN:VTIMEZONE");
    expect(defaultMeetAt("2026-09-06T12:41:00Z").getMinutes()).toBe(0);
    expect(defaultMeetAt("gecersiz").getMinutes()).toBe(0);
  });

  it("Google Calendar linki aynı aralığı taşır; varsayılan saat karar + 1 saat", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe("20260906T183000Z/20260906T200000Z");
    expect(url.searchParams.get("location")).toBe("Kleine Berg 16, Eindhoven");
    expect(defaultMeetAt("2026-09-06T12:41:00Z").toISOString()).toBe("2026-09-06T14:00:00.000Z");
  });
});
