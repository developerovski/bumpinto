/* Takvim ("Takvime ekle", W8 `.rc` / P20): sunucuda kayıtlı bir buluşma saati YOK — kullanıcı
   bir saat seçer (web `MeetTimeDialog`, mobil `(sheets)/meet-time`), bu dosya seçilen saatten
   `.ics` metni ve Google Calendar linki üretir. Web'den PAYLAŞILAN'a taşındı (M-9:T5): takvim
   metninin iki kopyası olsaydı iki platform farklı `.ics` üretirdi; web'de yerinde bir shim
   kaldı. `icsStamp` HER ZAMAN `getUTC*` okur (Date her zaman mutlak an taşır, hangi yerel
   saatten kurulduğu önemsiz) — `MeetTimeDialog` kullanıcının GERÇEK yerel saatinden (`new Date(y,
   m-1, d, h, min)`) bir Date kurar, bu fonksiyon onu doğru UTC damgaya çevirir. Test ortamı
   `vite.config.ts`teki `test.env.TZ=UTC` ile sabitlenmiştir — üretimde bu dosya herhangi bir saat
   diliminde doğru çalışır, yalnız testler makineden makineye değişmesin diye UTC'ye sabitlenir. */
export type CalendarEvent = {
  uid: string;
  start: Date;
  durationMinutes: number;
  title: string;
  location: string;
  url: string;
  timeZone: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function icsStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

const esc = (value: string) => value.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");

export const endOf = (e: CalendarEvent): Date => new Date(e.start.getTime() + e.durationMinutes * 60_000);

export function buildIcs(e: CalendarEvent): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BumpInto//App//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${e.timeZone}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(e.start)}`,
    `DTEND:${icsStamp(endOf(e))}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `URL:${e.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Sorgu dizesi elle (`URLSearchParams`) kurulur — `new URL(...)` KULLANILMAZ: bu fonksiyon
    `MeetTimeDialog`ın ilk render'ında çağrılır ve o bileşenin testi `vi.stubGlobal("URL", {...})`
    ile global `URL`u yalnız `createObjectURL`/`revokeObjectURL` taşıyan düz bir nesneyle değiştirir
    (indirme akışı için) — `new URL(...)` orada "URL is not a constructor" ile patlardı.
    `URLSearchParams` o stub'dan etkilenmeyen ayrı bir global olduğundan güvenli. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${icsStamp(e.start)}/${icsStamp(endOf(e))}`,
    location: e.location,
    details: e.url,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const HOUR_MS = 60 * 60_000;

/** Varsayılan buluşma saati: karardan (ya da şimdiden) 1 saat sonrasının bir SONRAKİ tam saate
    yuvarlanması (12:41 → +1s → 13:41 → yukarı yuvarla → 14:00). Epoch aritmetiği kasıtlı: yerel
    saat dilimi bileşenlerine (`setHours` vb.) dokunmak tam saat olmayan ofsetli bölgelerde
    (ör. Hindistan +5:30) kaymaya yol açardı — `Math.ceil` üzerinden mutlak zaman damgasında
    çalışmak bundan bağımsız kalır. */
export function defaultMeetAt(decidedAt?: string): Date {
  const base = decidedAt ? new Date(decidedAt) : new Date();
  const start = Number.isNaN(base.getTime()) ? Date.now() : base.getTime();
  const ceiled = Math.ceil(start / HOUR_MS) * HOUR_MS;
  return new Date(ceiled + HOUR_MS);
}
