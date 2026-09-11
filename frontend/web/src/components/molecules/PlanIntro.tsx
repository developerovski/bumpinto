/* Kaynak: Keşfet POC artboard P2 (zamanlı, APPROVAL) / P2a (süren, OPEN) — üye olmayanın plan detayı. */
import {
  GROUP_TINT,
  activityListLabel,
  formatDuration,
  groupOf,
  meetAtOptions,
  monogram,
  remainingMinutes,
  type SessionPreview,
} from "@bumpinto/shared";
import { CalendarBlank, Check, CheckCircle, Lightning, MapPin, ShieldCheck } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Avatar, Badge, Overline, Sticker } from "../atoms";
import { PHOTO_CLASSES, PHOTO_MONO } from "./photoStyles";

/** `.kv` satırı — 22px ikon sütunu + kalın satır ve isteğe bağlı alt satır. */
function KvRow({ icon, main, sub }: { icon: ReactNode; main: string; sub?: string }) {
  return (
    <>
      <span className="mt-px text-flame-deep">{icon}</span>
      <span className="flex flex-col gap-0.5">
        <b className="font-bold">{main}</b>
        {sub && <span className="text-[0.78125rem] text-ink2">{sub}</span>}
      </span>
    </>
  );
}

/** YALNIZ kamu önizlemesini okur: semt, dakika ve kesin nokta `SessionPreview`'da YOK — olmayan
    alan çizilmez (artboard'daki "Stratum civarı" / "sana ~20 dk" satırları bu yüzden basılmaz).
    Süren plan kararı sunucunun `openPlan.inProgress`'i; kalan süre istemci saatinden. */
export default function PlanIntro({ preview, now, interests }: {
  preview: SessionPreview;
  now: Date;
  /** Görüntüleyenin profil ilgi alanları — "ilgi alanına uyuyor" satırı yalnız kesişim varsa. */
  interests?: readonly string[];
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const plan = preview.openPlan ?? {};
  const open = plan.joinPolicy === "OPEN";
  const live = plan.inProgress === true && !!plan.openUntil;
  const approved = plan.approvedSeats ?? 0;
  const capacity = plan.capacity ?? 0;
  const free = Math.max(0, capacity - approved);
  const activities = preview.activityTypes ?? [];
  const first = activities[0];
  const tint = PHOTO_CLASSES[GROUP_TINT[groupOf(first ?? "COFFEE")]];
  const fits = activities.filter((a) => interests?.includes(a));
  const meetAt = plan.meetAt ? new Date(plan.meetAt) : null;
  // Host önce: kanonik kişi sırası (kişi rengi dizini) host'la başlar.
  const people = [...(preview.participants ?? [])].sort((a, b) => Number(!!b.host) - Number(!!a.host));

  return (
    <div className="flex flex-col gap-3.5">
      <div className={`relative h-[9.375rem] overflow-hidden rounded-[1.25rem] ${tint}`}>
        <span className={`${PHOTO_MONO} text-[3rem]`} aria-hidden>{monogram(preview.name)}</span>
        {first && (
          /* Artboard `.pho-tag` %35 zemin + %85 beyaz açık gradyan köşesinde ~2.5:1 kontrast veriyordu; etiket
             gerçek içerik (planın türü) — WCAG 1.4.3 için zemin koyulaştırıldı. */
          <span className="absolute top-2.5 right-2.5 rounded-full bg-[rgba(39,32,59,0.62)] px-2 py-[3px] font-mono text-[0.625rem] text-white">
            {t(`activity.${first}`).toLocaleLowerCase(lang)}
          </span>
        )}
        {(live || plan.confirmed) && (
          <span className="absolute bottom-3 left-3">
            {live ? (
              <Sticker amber>
                <Lightning size={13} weight="fill" aria-hidden />
                {t("discover.nowSticker", { approved, capacity })}
              </Sticker>
            ) : (
              <Sticker>{t("plan.confirmedSticker", { approved, capacity })}</Sticker>
            )}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[1.625rem] lg:text-display-lg">{preview.name}</h1>
        {fits.length > 0 && (
          <p className="m-0 inline-flex items-center gap-1.5 text-[0.78125rem] font-semibold text-grass">
            <CheckCircle size={14} aria-hidden />
            {t("plan.fit", { activity: activityListLabel(fits, t, lang).toLocaleLowerCase(lang) })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-[1.375rem_1fr] items-start gap-x-2.5 gap-y-2 text-[0.875rem]">
        {live && plan.openUntil ? (
          <KvRow
            icon={<Lightning size={18} aria-hidden />}
            main={t("discover.inProgress", { time: formatDuration(remainingMinutes(plan.openUntil, now), t) })}
            sub={meetAt ? t("plan.startedAt", { time: new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(meetAt) }) : undefined}
          />
        ) : (
          meetAt && (
            <KvRow
              icon={<CalendarBlank size={18} aria-hidden />}
              main={new Intl.DateTimeFormat(lang, meetAtOptions(meetAt, now, "long")).format(meetAt)}
            />
          )
        )}
        <KvRow icon={<MapPin size={18} aria-hidden />} main={t(open ? "plan.exactLaterOpen" : "plan.exactLater")} />
      </div>

      <div className="flex flex-col gap-2.5 rounded-card border border-line bg-card px-3.5 py-3 shadow-sh1">
        <Overline>{t("plan.who")}</Overline>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {people.map((p, i) => (
            <li key={`${p.displayName}-${i}`} className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-2.5 text-[0.875rem]">
              <Avatar name={p.displayName ?? "?"} index={i} ring={p.host} size="xs" />
              <span className="min-w-0 truncate">{p.host ? t("plan.hostRow", { name: p.displayName ?? "" }) : p.displayName}</span>
              {p.host ? (
                <Badge tone="grass">{t("plan.host")}</Badge>
              ) : (
                <Badge tone="grass"><Check size={13} weight="bold" aria-hidden /></Badge>
              )}
            </li>
          ))}
          {free > 0 && (
            <li className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-2.5 text-[0.875rem]">
              <Avatar name="?" waiting size="xs" />
              <span className="text-[0.75rem] text-ink2">{t("plan.seatFree", { count: free })}</span>
            </li>
          )}
        </ul>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-[#bfe5cf] bg-grass-wash px-3.5 py-3">
        <ShieldCheck size={18} aria-hidden className="mt-px flex-none text-grass" />
        <p className="m-0 text-[0.8125rem] leading-[1.45] text-ink">
          <Trans i18nKey={open ? "plan.safetyOpen" : "plan.safety"} components={[<b key="0" className="font-bold" />]} />
        </p>
      </div>
    </div>
  );
}
