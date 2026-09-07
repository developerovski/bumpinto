/* W9 alt sayfa — "Takvime ekle" için saat sorar. Sunucuda kayıtlı bir buluşma saati YOK, o yüzden
   varsayılan `defaultMeetAt` yalnız bir ÖNERİ; kullanıcı tarih/saat alanlarını değiştirebilir.
   `<input type="date">`/`type="time">` alanlarındaki rakamlar kullanıcının GERÇEK yerel saatidir —
   `dateValue`/`timeValue`/`parsePicked` bilerek yerel bileşenler okur/yazar (`getFullYear` vb.,
   `Date.UTC` DEĞİL). Kullanıcı "19:30" yazdığında bunun anlamı KENDİ saat dilimindeki 19:30'dur;
   bu Date nesnesi `lib/ics.ts`teki `icsStamp`e girince (o her zaman `getUTC*` okur — bir Date
   zaten mutlak an taşır) doğru şekilde UTC'ye çevrilip damgalanır. Çok argümanlı yerel `new
   Date(y, m-1, d, h, min)` kurucusu, `new Date(\`${date}T${time}\`)` dize ayrıştırmasından
   tercih edilir (motor kaynaklı ayrıştırma tuhaflıklarına karşı daha güvenli). Bu dosyanın testi
   (`MeetTimeDialog.test.tsx`) `vite.config.ts`teki `test.env.TZ=UTC` sabitlemesine güvenir — test
   koşucusunun yerel saati gerçekten UTC olduğu için "19:30" girişi "T1930Z" damgasına dönüşür;
   üretim kodu farklı bir saat diliminde GERÇEKTEN farklı (doğru) bir UTC anına çevirir. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { buildIcs, defaultMeetAt, googleCalendarUrl, type CalendarEvent } from "../../lib/ics";
import { Button, LinkButton, Note, TextInput } from "../atoms";

const pad = (n: number) => String(n).padStart(2, "0");
const dateValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parsePicked(date: string, time: string): Date | null {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(h) || Number.isNaN(min)) return null;
  const picked = new Date(y, m - 1, d, h, min);
  return Number.isNaN(picked.getTime()) ? null : picked;
}

const SHEET =
  "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[26rem] flex-col gap-3.5 rounded-t-card " +
  "border border-line bg-card p-5 shadow-sh2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-card";

export default function MeetTimeDialog(props: {
  venue: VenueDto;
  sessionName?: string;
  slug: string;
  decidedAt?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const suggested = defaultMeetAt(props.decidedAt);
  const [date, setDate] = useState(dateValue(suggested));
  const [time, setTime] = useState(timeValue(suggested));
  const picked = parsePicked(date, time);
  const event: CalendarEvent = {
    uid: `${props.slug}-${props.venue.id ?? "venue"}@bumpinto.app`,
    start: picked ?? suggested,
    durationMinutes: 90,
    title: t("calendar.eventTitle", { venue: props.venue.name ?? "", session: props.sessionName ?? "" }),
    location: props.venue.address ?? props.venue.name ?? "",
    url: `${location.origin}/j/${props.slug}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  function download() {
    const href = URL.createObjectURL(new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `bumpinto-${props.slug}.ics`;
    link.click();
    URL.revokeObjectURL(href);
    props.onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/35" onClick={props.onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={t("calendar.title")} className={SHEET}>
        <h2>{t("calendar.title")}</h2>
        <Note>{t("calendar.hint")}</Note>
        <label className="flex flex-col gap-1 text-[0.8125rem] font-bold text-ink2">
          {t("calendar.date")}
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[0.8125rem] font-bold text-ink2">
          {t("calendar.time")}
          <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <Button type="button" onClick={download}>
          {t("calendar.download")}
        </Button>
        <LinkButton href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" kind="white">
          {t("calendar.google")}
        </LinkButton>
        <Button type="button" kind="ghost" onClick={props.onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </>
  );
}
