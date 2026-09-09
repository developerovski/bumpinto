/* Takvim mantığı `@bumpinto/shared/ics`e taşındı (M-9:T5) — web ve mobil AYNI `.ics`i üretir.
   Bu dosya yerinde bir shim: mevcut içe aktarımlar (`MeetTimeDialog`) değişmeden çalışır. */
export {
  buildIcs,
  defaultMeetAt,
  endOf,
  googleCalendarUrl,
  icsStamp,
  type CalendarEvent,
} from "@bumpinto/shared";
