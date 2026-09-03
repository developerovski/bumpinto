/* Kaynak: ui.css .a-pol* / .a-pho* / .a-row-card* / .a-row-thumb* / .a-pick* / DS v2 */
import type { CSSProperties } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import Attribution from "./Attribution";
import FairnessBadge from "./FairnessBadge";
import FitLine from "./FitLine";
import TravelChips from "./TravelChips";
import { formatRating } from "./VenueMeta";

/** Mekan kartı — iki artboard sunumu, tek bileşen:
    · "polaroid" (varsayılan) → Web W3/W4 `.pol`; deste, liste ve sonuç ekranları.
    · "row" → Mobil `07 Runoff` `.card`; 74px küçük görsel + seçim dairesi. */

// Artboard .pA/.pB/.pC/.pD — fotoğrafsız kartın üç katmanlı ambient gradyanı.
export const PHOTO_CLASSES = [
  "bg-[image:radial-gradient(130%_100%_at_18%_8%,#ffd9a8_0%,transparent_62%),radial-gradient(110%_85%_at_88%_90%,#ff9e6b_0%,transparent_58%),linear-gradient(165deg,#f9c08a_0%,#e8794f_100%)]",
  "bg-[image:radial-gradient(130%_100%_at_80%_6%,#b8f0d8_0%,transparent_60%),radial-gradient(110%_85%_at_12%_92%,#4fc79a_0%,transparent_55%),linear-gradient(165deg,#8fddbb_0%,#2f9e71_100%)]",
  "bg-[image:radial-gradient(130%_100%_at_22%_10%,#d9c8ff_0%,transparent_60%),radial-gradient(110%_85%_at_85%_88%,#a47cff_0%,transparent_55%),linear-gradient(165deg,#c1a8f5_0%,#7c4dff_100%)]",
  "bg-[image:radial-gradient(130%_100%_at_20%_10%,#fff0b8_0%,transparent_60%),radial-gradient(110%_85%_at_85%_90%,#ffc24a_0%,transparent_55%),linear-gradient(165deg,#ffe08a_0%,#f2a93b_100%)]",
];

// .pho-mono — punto dışındaki tüm değerler tüm varyantlarda ortak (PolaroidFan da kullanır).
export const PHOTO_MONO =
  "absolute left-1/2 top-[44%] transform-[translate(-50%,-50%)_rotate(-4deg)] " +
  "font-head font-extrabold text-[rgba(255,255,255,0.5)]";

// ui.css .a-pol-body(8px) + .a-pol--winner .a-pol-body(10px) — W4 kazanan kartı daha ferah.
const BODY_GAPS = { sm: "gap-2", md: "gap-2.5" };

// .pick — seçim dairesi; seçilide gradyan dolgu + beyaz tik.
const PICK_BASE = "h-[1.625rem] w-[1.625rem] flex-none rounded-full border-[1.5px]";
const PICK = `${PICK_BASE} border-line-in`;
const PICK_ON = `${PICK_BASE} flex items-center justify-center border-transparent bg-[image:var(--grad)]`;

// Artboard: "Café Berlage" → "cb".
export function monogram(name: string | undefined): string {
  return (name ?? "")
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toLowerCase();
}

export default function VenueCard(props: {
  venue: VenueDto;
  /** Artboard .pol-ph varsayılanı 264px; W4 sonuç kartı 150px, liste modu 120px. */
  photoHeight?: number;
  /** Yığındaki arka kartlar (artboard d2/d3): yalnız fotoğraf alanı, metin yok. */
  photoOnly?: boolean;
  /** Artboard W4: başlık sayfanın h1'i — kart gövdesinde tekrar edilmez. */
  hideTitle?: boolean;
  /** Gövde boşluğu: `sm` deste/liste (8px), `md` W4 kazanan kartı (10px). */
  bodyGap?: keyof typeof BODY_GAPS;
  /** Artboard 07 Runoff finalist kartı. */
  variant?: "polaroid" | "row";
  /** 07 Runoff: seçili finalist — flame kenarlık + tikli daire. */
  selected?: boolean;
  /** `useTravelLabels` çıktısı (labels + selfId TEK nesne) — TravelChips/FairnessBadge'e aynen geçer. */
  travel?: TravelInfo;
  /** Gradyan başlangıç ofseti (ör. aktivite grubuna göre GROUP_TINT) — deckOrder ile toplanır. */
  tint?: 0 | 1 | 2 | 3;
  /** SessionView.activityType — verilmezse uyum satırı hiç çizilmez (§4.6). */
  activity?: string;
  /** Destedeki TÜM kategoriler — `FitLine`'ın çeşitlilik denetimine geçilir. */
  categories?: string[];
  /** SessionView.midpointLabel — semt bununla AYNIYSA meta satırında tekrar edilmez (§4.9). */
  midpointLabel?: string;
  /** Kart altında sağlayıcı atfı — varsayılan `true`. Liste modu (`VenueCheckRow`) `false` geçer:
      12 satır × 2 satır atıf yerine listenin altında TEK birleşik atıf (reviewer bulgusu). */
  attribution?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const { t } = useTranslation();
  const v = props.venue;
  const travel = props.travel ?? { labels: {} };
  const photoClass = PHOTO_CLASSES[((props.tint ?? 0) + (v.deckOrder ?? 0)) % PHOTO_CLASSES.length];
  const mono = monogram(v.name);
  // Tek yüklem: boş photoUrl da "fotoğraf yok" sayılır — gradyan/monogram ile
  // "foto · Places" rozeti bu sayede karşılıklı dışlayıcı kalır.
  const hasPhoto = v.photoUrl != null && v.photoUrl !== "";
  // Foto CSS arka planı değil <img>: sağlayıcı bağlantısı ölürse (Google referansı
  // dönerse, FSQ CDN'i 404 verirse) onError ile gradyan + monograma düşebiliyoruz —
  // arka plan olsaydı geriye bomboş beyaz bir kutu kalırdı.
  // <img> ise draggable=false + pointer-events-none: tarayıcının yerel resim sürüklemesi
  // (hayalet görsel) SwipeCard'ın pointer olaylarını iptal ediyor, kart kaydırılamıyordu.
  const [broken, setBroken] = useState(false);
  const showPhoto = hasPhoto && !broken;
  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  const hasMeta = v.rating != null || hasPrice;
  // Semt YALNIZ orta nokta şehrinden farklıysa gösterilir — aynıysa tekrar (§4.9).
  const locality = v.locality && v.locality !== props.midpointLabel ? v.locality : null;

  // Artboard 07 Runoff: iki finalist ters yönde eğik duruyor (-2° / +2°).
  if (props.variant === "row") {
    const tilt =
      (v.deckOrder ?? 0) % 2 === 0 ? "transform-[rotate(-2deg)]" : "transform-[rotate(2deg)]";
    return (
      <div
        className={[
          "rounded-card bg-card p-[0.875rem]",
          props.selected
            ? "border-[1.5px] border-flame-deep shadow-sh2"
            : "border border-line shadow-sh1",
          props.className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={props.style}
      >
        <div className="flex items-center gap-[0.875rem]">
          <div
            className={[
              "relative flex h-[4.625rem] w-[4.625rem] flex-none items-end",
              "overflow-hidden rounded-2xl",
              tilt,
              photoClass,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {showPhoto ? (
              <img
                src={v.photoUrl}
                alt=""
                loading="lazy"
                onError={() => setBroken(true)}
                className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
                draggable={false}
              />
            ) : (
              <span className={`${PHOTO_MONO} text-[1.375rem]`} aria-hidden>
                {mono}
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <h3>{v.name}</h3>
            {/* Artboard `Liste modu 390` `.row.wr` — puan/fiyat satırı + tek adalet rozeti. */}
            <div className="flex flex-wrap items-center gap-2">
              {hasMeta && (
                <span className="text-[0.75rem] text-ink2">
                  {v.rating != null && `★ ${v.rating}`}
                  {v.rating != null && hasPrice && " · "}
                  {hasPrice && "€".repeat(v.priceLevel!)}
                </span>
              )}
              <FairnessBadge venue={v} travel={travel} />
            </div>
            <TravelChips venue={v} travel={travel} size="sm" />
          </div>
          <span className={props.selected ? PICK_ON : PICK} aria-hidden>
            {props.selected && (
              <i className="mb-0.5 block h-[0.3125rem] w-[0.5625rem] border-b-2 border-l-2 border-b-white border-l-white transform-[rotate(-45deg)]" />
            )}
          </span>
        </div>
      </div>
    );
  }

  // 07 Runoff finalist kartı: seçim burada da mümkün — flame kenarlık + tikli daire.
  const isPick = props.selected !== undefined;
  return (
    <div
      className={[
        "relative flex w-full flex-col rounded-3xl bg-white p-2.5",
        props.selected ? "border-[1.5px] border-flame-deep shadow-sh2" : "border border-line",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={props.style}
    >
      <div
        className={`relative flex items-end overflow-hidden rounded-2xl ${photoClass}`}
        style={{ height: props.photoOnly ? "100%" : `${(props.photoHeight ?? 264) / 16}rem` }}
      >
        {showPhoto && (
          <img
            src={v.photoUrl}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        )}
        {/* Arka kartlar (d2/d3) artboard'da çıplak gradyan — içinde hiçbir şey yok.
            DS kuralı: fotoğraf yoksa ambient gradyan + monogram — asla çizgili kutu.
            Sağlayıcı atfı artık kart altında (`Attribution`) — foto üstü rozet YOK (§4.9). */}
        {!props.photoOnly && !showPhoto && (
          <span className={`${PHOTO_MONO} text-[2.25rem]`} aria-hidden>
            {mono}
          </span>
        )}
      </div>
      {!props.photoOnly && (
        <div className={`flex flex-col ${BODY_GAPS[props.bodyGap ?? "sm"]} px-2 pt-3 pb-2`}>
          <div className="flex items-start justify-between gap-2">
            <div className={`flex flex-1 flex-col ${BODY_GAPS[props.bodyGap ?? "sm"]}`}>
              {!props.hideTitle && <h2 className="text-[1.25rem]">{v.name}</h2>}
              {props.activity && (
                <FitLine venue={v} activity={props.activity} categories={props.categories ?? []} />
              )}
              {(hasMeta || locality) && (
                <div className="flex flex-wrap items-center gap-[0.4375rem] text-[0.8125rem] leading-[1.45] text-ink2">
                  {v.rating != null && (
                    <strong className="font-bold text-ink">★ {formatRating(v.rating)}</strong>
                  )}
                  {hasPrice && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{"€".repeat(v.priceLevel!)}</span>
                    </>
                  )}
                  {locality && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{locality}</span>
                    </>
                  )}
                </div>
              )}
              {v.hoursToday && (
                <span className="text-[0.75rem] text-ink2">
                  {t("venue.hoursToday", { hours: v.hoursToday })}
                </span>
              )}
            </div>
            {isPick && (
              <span className={props.selected ? PICK_ON : PICK} aria-hidden>
                {props.selected && (
                  <i className="mb-0.5 block h-[0.3125rem] w-[0.5625rem] border-b-2 border-l-2 border-b-white border-l-white transform-[rotate(-45deg)]" />
                )}
              </span>
            )}
          </div>
          {/* Badge (`../atoms/Badge`) zaten inline-flex — sarmalayıcı div rozet null iken
              boş kalıp `flex-col gap-*`'in boşluğunu yerdi (SOLO / travelMinutes yok). */}
          <FairnessBadge venue={v} travel={travel} />
          <TravelChips venue={v} travel={travel} />
          {(props.attribution ?? true) && <Attribution provider={v.provider} />}
        </div>
      )}
    </div>
  );
}
