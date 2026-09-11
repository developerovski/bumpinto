/* Kaynak: Keşfet POC artboard P1 (1280) / P1m (390) `.pl` — açık plan kartı. */
import {
  GROUP_TINT,
  formatDuration,
  meetAtOptions,
  groupOf,
  isInProgress,
  monogram,
  remainingMinutes,
  type PlanCardDto,
} from "@bumpinto/shared";
import { CalendarBlank, Lightning } from "@phosphor-icons/react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Avatar, Sticker } from "../atoms";
import { PHOTO_CLASSES, PHOTO_MONO } from "./photoStyles";
import SeatDots from "./SeatDots";

/** Kart kesin konum TAŞIMAZ: yalnız sunucunun kaba semti (`locality`) ve yuvarlanmış konumdan
    dakika. Olmayan alan çizilmez (host'un alt satırı, fotoğraf — API'de yok). */
export default function PlanCard({ plan, now }: { plan: PlanCardDto; now: Date }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const live = isInProgress(plan, now);
  const approved = plan.approvedSeats ?? 0;
  const capacity = plan.capacity ?? 0;
  const first = plan.activityTypes?.[0];
  const tint = PHOTO_CLASSES[GROUP_TINT[groupOf(first ?? "COFFEE")]];
  const when = plan.meetAt
    ? new Intl.DateTimeFormat(lang, meetAtOptions(new Date(plan.meetAt), now, "short")).format(new Date(plan.meetAt))
    : null;
  return (
    <Link
      to={`/j/${plan.slug}`}
      className="flex flex-col overflow-hidden rounded-[1.25rem] border border-line bg-card text-ink no-underline shadow-sh1"
    >
      <div className={`relative flex h-24 items-end px-3 py-2.5 lg:h-[7.375rem] ${tint}`}>
        <span className={`${PHOTO_MONO} text-[2.25rem]`} aria-hidden>{monogram(plan.name)}</span>
        {(live || plan.confirmed) && (
          <span className="absolute top-2.5 right-2.5">
            {live ? (
              <Sticker amber>
                <Lightning size={13} weight="fill" aria-hidden />
                {t("discover.nowSticker", { approved, capacity })}
              </Sticker>
            ) : (
              <Sticker>{t("discover.confirmed", { approved, capacity })}</Sticker>
            )}
          </span>
        )}
        {/* Artboard P1: tür rozeti yalnız 1280 kartında; 390 fotoğrafı rozetsiz. */}
        {first && (
          <span className="relative hidden rounded-full bg-white/90 px-[0.6875rem] py-[0.28125rem] text-[0.75rem] font-bold text-ink2 lg:inline-flex">
            {t(`activity.${first}`)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-[0.5625rem] px-3.5 pt-3 pb-3.5">
        <h3 className="m-0 text-[1.0625rem] leading-[1.2]">{plan.name}</h3>
        <p className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8125rem] text-ink2">
          {live && plan.openUntil ? (
            <>
              <Lightning size={14} aria-hidden className="hidden lg:inline" />
              <span className="inline-flex items-center gap-[0.3125rem] font-bold text-amber-ink">
                <i className="inline-block h-2 w-2 flex-none rounded-full bg-amber-ink" aria-hidden />
                {t("discover.nowLabel")}
              </span>
              <span aria-hidden>·</span>
              <b className="font-bold text-ink">
                {t("discover.remaining", { time: formatDuration(remainingMinutes(plan.openUntil, now), t) })}
              </b>
            </>
          ) : (
            when && (
              <>
                <CalendarBlank size={14} aria-hidden className="hidden lg:inline" />
                <b className="font-bold text-ink">{when}</b>
              </>
            )
          )}
          {plan.locality && (
            <>
              <span aria-hidden>·</span>
              <span>{plan.locality}</span>
            </>
          )}
          {plan.minutes != null && (
            <>
              <span aria-hidden>·</span>
              <b className="font-bold text-ink">{t("discover.minutes", { minutes: plan.minutes })}</b>
              {plan.travelMode && (
                <span className="hidden lg:inline">{t(`travelMode.${plan.travelMode}.by`)}</span>
              )}
            </>
          )}
        </p>
        <div className="flex items-center justify-between gap-2.5">
          <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-ink2">
            <Avatar name={plan.hostDisplayName ?? "?"} index={0} ring size="xs" />
            <span className="truncate">
              <Trans i18nKey="discover.hostedBy" values={{ name: plan.hostDisplayName ?? "" }}
                components={[<b key="0" className="font-bold text-ink" />]} />
            </span>
          </span>
          <SeatDots approved={approved} capacity={capacity} />
        </div>
      </div>
    </Link>
  );
}
