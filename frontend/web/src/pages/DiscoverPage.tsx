/* Kaynak: Keşfet POC artboard P1 (1280) · P1m (390) · P1b (boş hafta) · P1c (Şimdi boş). */
import { RANGES, activityListLabel, inRange, sortPlans, type ActivityType } from "@bumpinto/shared";
import { MapPin, Plus, ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Button, ErrorText, HandNote, Highlight, LinkButton, Overline, Page } from "../components/atoms";
import MapMark from "../components/molecules/MapMark";
import MobileCta from "../components/molecules/MobileCta";
import PlanCard from "../components/molecules/PlanCard";
import Segmented from "../components/molecules/Segmented";
import { ACTIVITY_ICONS } from "../lib/activity";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useNow } from "../lib/useNow";
import { useAuthStore } from "../store/authStore";
import { ALL_ACTIVITIES, useDiscoverStore } from "../store/discoverStore";

const CHIP =
  "inline-flex flex-none min-h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] " +
  "px-3 text-[0.8125rem] font-semibold lg:min-h-11 lg:px-4 lg:text-[0.90625rem]";

/** Konum ~1 km'ye yuvarlanır: dakika hesabı kesin konum istemez (spec — yuvarlanmış konumdan). */
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Artboard `.pl` iskeleti — kart geometrisi yüklenince atlamasın. */
function PlanCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card shadow-sh1">
      <span className="block h-24 bg-sand motion-safe:animate-pulse lg:h-[7.375rem]" />
      <div className="flex flex-col gap-2.5 px-3.5 pt-3 pb-3.5">
        <span className="block h-[1.0625rem] w-[70%] rounded-[0.625rem] bg-sand motion-safe:animate-pulse" />
        <span className="block h-[0.8125rem] w-[50%] rounded-[0.625rem] bg-sand motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const me = useAuthStore((s) => s.me);
  const { plans, filter, range, loaded, error, load, toggle, selectAll, setRange } = useDiscoverStore();
  const now = useNow();
  // Artboard P1m/P1c: 390'da aralık rayı 3'lü ("Hepsi" yok); 1280'de 4'lü.
  const desktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    // Spec §11.2: Keşfet her açılışta "Bu hafta" ile açılır — Şimdi bir süzgeçtir, kalıcı sekme değil.
    setRange("week");
    // Konum PROFİL VARSAYILANINDAN: sayfa açılışında tarayıcı izni istemek ve ters geocode ile
    // ek istek atmak Keşfet için gereksiz (etiket hiç çizilmez). Yoksa dakika satırı düşer.
    const home = me?.defaultLocation;
    void load(home ? { lat: round2(home.lat), lng: round2(home.lng), travelMode: me?.defaultTravelMode } : null);
    // yalnız ilk mount — süzgeç değişimleri store'dan yeniden sorar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Çip sırası İLK yüklemede donar: seçili türler önde (artboard P1), sonra kanonik sıra. Her
     tıklamada yeniden sıralamak çipi parmağın altından kaçırırdı. */
  const [order, setOrder] = useState<ActivityType[] | null>(null);
  useEffect(() => {
    if (loaded && !order) setOrder([...filter, ...ALL_ACTIVITIES.filter((a) => !filter.includes(a))]);
  }, [loaded, order, filter]);
  const chips = order ?? ALL_ACTIVITIES;

  const visible = sortPlans(plans.filter((p) => inRange(p, range, now)), now);
  const overline = t("discover.overline", {
    range: t(`discover.range.${range}`).toLocaleLowerCase(lang),
    count: visible.length,
  });
  const single = filter.length === 1 ? filter[0] : null;
  const openHref = single ? `/sessions/new?open=1&activity=${single}` : "/sessions/new?open=1";

  const hereCta = (size: "md" | "fit") => (
    <LinkButton href="/sessions/new?now=1" kind="white" size={size}>
      <MapPin size={18} aria-hidden />
      {t("discover.here")}
    </LinkButton>
  );
  const openCta = (size: "md" | "fit") => (
    <LinkButton href={openHref} size={size}>
      <Plus size={18} aria-hidden />
      {t("discover.open")}
    </LinkButton>
  );

  const emptyWeek = () => {
    const r = range === "now" ? "week" : range;
    // 3+ tür adı başlığı okunmaz kılar — o durumda türsüz başlık.
    const label = filter.length > 0 && filter.length <= 2 ? activityListLabel(filter, t, lang).toLocaleLowerCase(lang) : null;
    return (
      <>
        <h2 className="text-[1.75rem]">
          {label ? t(`discover.emptyTitle.${r}`, { activity: label }) : t(`discover.emptyTitlePlain.${r}`)}
        </h2>
        <p className="max-w-[30ch] text-[0.9375rem] leading-normal text-ink2">{t("discover.emptyLead")}</p>
        <HandNote center>{t("discover.emptyHand")}</HandNote>
        <div className="w-full max-w-[16.25rem]">
          <LinkButton href={openHref}>
            <Plus size={18} aria-hidden />
            {single ? t("discover.openFor", { activity: t(`activity.${single}`) }) : t("discover.open")}
          </LinkButton>
        </div>
        {filter.length < ALL_ACTIVITIES.length && (
          <Button type="button" kind="ghost" size="sm" onClick={selectAll}>
            {t("discover.otherTypes")}
          </Button>
        )}
      </>
    );
  };

  const emptyNow = () => (
    <>
      <h2 className="text-[1.75rem]">{t("discover.emptyNowTitle")}</h2>
      <p className="max-w-[30ch] text-[0.9375rem] leading-normal text-ink2">{t("discover.emptyNowLead")}</p>
      <HandNote center>{t("discover.emptyNowHand")}</HandNote>
      <div className="w-full max-w-[16.25rem]">
        <LinkButton href="/sessions/new?now=1">
          <MapPin size={18} aria-hidden />
          {t("discover.here")}
        </LinkButton>
      </div>
      <Button type="button" kind="ghost" size="sm" onClick={() => setRange("week")}>
        {t("discover.backToWeek")}
      </Button>
    </>
  );

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2">
          <div className="hidden lg:block">
            <Overline>{overline}</Overline>
          </div>
          {/* Artboard P1m'de başlık yok (üst çubuk "Keşfet" der) — başlık 390'da yalnız ekran okuyucuya. */}
          <h1 className="sr-only lg:not-sr-only lg:text-[2.5rem]">
            <Trans i18nKey="discover.title" components={[<Highlight key="0" />]} />
          </h1>
          <p className="hidden max-w-[52ch] text-base leading-normal text-ink2 lg:block">{t("discover.lead")}</p>
        </div>
        <div className="hidden gap-2.5 lg:flex">
          {hereCta("fit")}
          {openCta("fit")}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div
          role="group"
          aria-label={t("discover.filterAria")}
          className="-mx-[1.125rem] flex gap-2 overflow-x-auto px-[1.125rem] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
        >
          {chips.map((a) => {
            const I = ACTIVITY_ICONS[a];
            const on = filter.includes(a);
            return (
              <button key={a} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(a)}
                className={`${CHIP} ${on ? "border-flame-deep bg-flame-wash text-flame-deep" : "border-line2 bg-card text-ink2"}`}>
                {I && <I size={18} aria-hidden />}
                {t(`activity.${a}`)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-none items-center justify-between gap-3">
          <div className="lg:hidden">
            <Overline>{overline}</Overline>
          </div>
          <Segmented
            ariaLabel={t("discover.rangeAria")}
            value={range}
            onChange={setRange}
            options={(desktop ? RANGES : RANGES.filter((r) => r !== "all")).map((r) => ({
              value: r,
              label: t(`discover.range.${r}`),
            }))}
          />
        </div>
      </div>

      {!loaded ? (
        <div role="status" aria-busy="true">
          <div aria-hidden className="grid gap-[1.125rem] lg:grid-cols-3">
            <PlanCardSkeleton />
            <PlanCardSkeleton />
            <PlanCardSkeleton />
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-3">
          <ErrorText>{t("discover.errLoad")}</ErrorText>
          <Button type="button" kind="white" size="sm" onClick={() => void load()}>{t("common.retry")}</Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-[1.125rem] pt-9 pb-5 text-center">
          <MapMark />
          {range === "now" ? emptyNow() : emptyWeek()}
        </div>
      ) : (
        <>
          <div className="grid gap-[0.9375rem] lg:grid-cols-3 lg:gap-[1.125rem]">
            {visible.map((p) => (
              <PlanCard key={p.slug} plan={p} now={now} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <HandNote size="sm">{t("discover.hand")}</HandNote>
            <p className="m-0 flex items-center gap-1.5 text-[0.6875rem] tracking-[0.02em] text-ink2 lg:ml-auto">
              <ShieldCheck size={14} aria-hidden />
              {t("discover.trust")}
            </p>
          </div>
        </>
      )}

      {/* Artboard P1b/P1c: boş hâllerde alt CTA şeridi YOK — çağrı boş kartın içinde. */}
      {loaded && !error && visible.length > 0 && (
        <MobileCta>
          <div className="flex gap-2.5">
            <div className="min-w-0 flex-1">{hereCta("md")}</div>
            <div className="min-w-0 flex-1">{openCta("md")}</div>
          </div>
        </MobileCta>
      )}
    </Page>
  );
}
