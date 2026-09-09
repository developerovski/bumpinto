/* Kaynak: ui.css .a-pol* / .a-pho* / .a-row-card* / .a-row-thumb* / .a-pick* / DS v2 */
import { PHOTO_CLASSES, PHOTO_MONO } from "./photoStyles";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { attributionProviders, fairnessOf } from "@bumpinto/shared";
import { formatRating } from "../../lib/format";
import { monogram } from "../../lib/monogram";
import { fairnessLine } from "../../lib/travelText";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { taglineOf } from "../../lib/venueText";
import { Badge } from "../atoms";
import Attribution from "./Attribution";
import ActivityBadge from "./ActivityBadge";
import FitLine from "./FitLine";
import RangeBar from "./RangeBar";
import TravelBars from "./TravelBars";

/** Mekan kartı — iki artboard sunumu, tek bileşen:
    · "polaroid" (varsayılan) → Web W3/W4 `.pol`; deste, liste ve sonuç ekranları.
    · "row" → Mobil `07 Runoff` `.card`; 74px küçük görsel + seçim dairesi. */


// ui.css .a-pol-body(8px) + .a-pol--winner .a-pol-body(10px) — W4 kazanan kartı daha ferah.
const BODY_GAPS = { sm: "gap-2", md: "gap-2.5" };

/* Aynı kart iki AYRI yüzeyde yaşıyor: artboard `.pol` (deste yığını — yarıçap 24, iç boşluk 10)
   ve `.card` (W7 finalist kartı, 2377 — yarıçap 22, iç boşluk 12). Tek prop, çünkü ikisi
   BİRLİKTE değişir; `className` ile eklenselerdi hangi `rounded-*`/`p-*` kazanacağını kaynak
   sırası değil Tailwind'in çıktı sırası belirlerdi (Page.tsx'teki aynı uyarı). */
const SURFACES = { polaroid: "rounded-3xl p-2.5", card: "rounded-card p-3" };

// .pick — seçim dairesi; seçilide gradyan dolgu + beyaz tik.
const PICK_BASE = "h-[1.625rem] w-[1.625rem] flex-none rounded-full border-[1.5px]";
const PICK = `${PICK_BASE} border-line-in`;
const PICK_ON = `${PICK_BASE} flex items-center justify-center border-transparent bg-[image:var(--grad)]`;

export default function VenueCard(props: {
  venue: VenueDto;
  /** Artboard .pol-ph varsayılanı 264px; W4 sonuç kartı 150px, liste modu 120px. */
  photoHeight?: number;
  /** Fotoğraf yüksekliği kırılma noktasına göre değişiyorsa (deste: 390'da 210px, 1280'de 240px —
      artboard 2111 / 2005). Verilirse `photoHeight` satır-içi ölçüsü BASILMAZ: medya sorgusu
      `style` ile yazılamaz. */
  photoClassName?: string;
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
  /** `useTravelLabels` çıktısı (labels + selfId TEK nesne) — RangeBar/TravelBars'a aynen geçer. */
  travel?: TravelInfo;
  /** Gradyan başlangıç ofseti (ör. aktivite grubuna göre GROUP_TINT) — deckOrder ile toplanır. */
  tint?: 0 | 1 | 2 | 3;
  /** Karışık deste (>1 ilgi alanı): kart kendi alanının rozetini de basar. */
  mixedDeck?: boolean;
  /** Destedeki TÜM kategoriler — `FitLine`'ın çeşitlilik denetimine geçilir. */
  categories?: string[];
  /** SessionView.midpointLabel — semt bununla AYNIYSA meta satırında tekrar edilmez (§4.9). */
  midpointLabel?: string;
  /** Kart altında sağlayıcı atfı — varsayılan `true`. Liste modu (`VenueCheckRow`) `false` geçer:
      12 satır × 2 satır atıf yerine listenin altında TEK birleşik atıf (reviewer bulgusu). */
  attribution?: boolean;
  /** Kart gövdesinde `.tb` yol çubukları — varsayılan `true` (deste/liste DEĞİŞMEZ). `WinnerCard`
      `false` geçer: W8 karar artboard'ında `.tb` yalnız sağdaki "Herkesin yolu" kartında TEK kez
      basılır, sol kazanan kartı kişi başı yolu `.rc-ppl` avatar satırlarıyla taşır. */
  travelBars?: boolean;
  /** Kart gövdesindeki yol sunumu — `bars` (`.tb` kişi başı çubuk, varsayılan), `range` (`.rg`
      bant + baş harf noktaları; W7 finalist kartı) ya da `none`. `travelBars={false}` ile aynı
      anlamda `none` verir; ikisi birden verilirse `travelWidget` kazanır. */
  travelWidget?: "bars" | "range" | "none";
  /** Artboard `.f-dim` — kilitlenmiş runoff'ta kaybeden finalist. */
  dim?: boolean;
  /** Kart yüzeyi — `polaroid` (varsayılan, artboard `.pol` 24/10) ya da `card` (artboard
      `.card` 22/12; W7 finalist kartı). Yalnız yarıçap + iç boşluk değişir. */
  surface?: keyof typeof SURFACES;
  /** `variant="row"` — berabere 390 sıkı geometrisi (artboard 4361-4364). */
  compact?: boolean;
  /** Kart GÖVDESİNİN sonuna eklenen satır — W7'de `.f-trail` (2389/2405) kartın İÇİNDE,
      altında kardeş bir öğe olarak DEĞİL. */
  footer?: ReactNode;
  /** Beraberlikte finalist başına oy sayısı (artboard 4368/4383 `.bg g-ne` "1 oy"). Verilirse
      seçim dairesinin YERİNE basılır: oylama bittiğinde daire artık bir şey ifade etmiyor. */
  voteCount?: number;
  /** Başlık düzeyi: deste/liste `h2` (20px, varsayılan), W7 finalist kartı `.h3` (17px). */
  titleLevel?: "h2" | "h3";
  /** Artboard 2013/2119 — başlık satırının SAĞINDA adalet rozeti (`.bg g-gr` "Herkese ~aynı").
      Yalnız deste kartı basar (opt-in): rozet basılınca `.tb` alt satırı lead'i tekrar etmez,
      yalnız olguyu yazar (artboard 2023 "fark 10 dk · en uzun yol Kerem"). */
  fairnessBadge?: boolean;
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
  const tagline = taglineOf(v);
  const widget = props.travelWidget ?? (props.travelBars === false ? "none" : "bars");
  // .f-dim — kaybeden finalist: soluk + doygunluğu düşük.
  const dim = props.dim ? "opacity-[0.48] saturate-[0.55]" : null;
  // Adalet rozeti: `fairnessLine` ile TEK kaynak — rozet metni ve `.tb`/`.rg` alt satırındaki
  // kalın baş cümle aynı hesaptan çıkar, bu yüzden ikisi asla çelişemez.
  const fairness = props.fairnessBadge ? fairnessOf(v) : null;
  const fLine = fairness ? fairnessLine(fairness, travel, t) : null;
  const badgeLead = fLine?.lead ?? null;

  // Seçim dairesi ile "N oy" rozeti AYNI slotu paylaşır (artboard 4368: oylama bitince daire
  // rozete dönüşür) — iki varyant da aynı ikiliyi bastığından tek yerde kurulur.
  const voteBadge =
    props.voteCount != null ? (
      <Badge tone="neutral">{t("runoff.voteCount", { count: props.voteCount })}</Badge>
    ) : null;
  const pickCircle = (
    <span className={props.selected ? PICK_ON : PICK} aria-hidden>
      {props.selected && (
        <i className="mb-0.5 block h-[0.3125rem] w-[0.5625rem] border-b-2 border-l-2 border-b-white border-l-white transform-[rotate(-45deg)]" />
      )}
    </span>
  );

  // Artboard 2459/2474: iki finalist ters yönde eğik duruyor (∓2.2°).
  // Berabere 390'ı (4361-4364) AYNI satırı daha sıkı çizer: kart dolgusu 12/14, foto 56px /
  // yarıçap 14, eğim YOK — iki kart birden ekrana sığmak zorunda.
  if (props.variant === "row") {
    const compact = props.compact === true;
    const tilt = compact
      ? null
      : (v.deckOrder ?? 0) % 2 === 0
        ? "transform-[rotate(-2.2deg)]"
        : "transform-[rotate(2.2deg)]";
    return (
      <div
        className={[
          // Artboard 2458: padding 12px, satırlar arası 8px (berabere 4361: 12/14).
          `flex flex-col gap-2 rounded-card bg-card ${compact ? "p-[0.75rem_0.875rem]" : "p-3"}`,
          dim,
          props.selected
            ? "border-[1.5px] border-flame-deep shadow-sh2"
            : "border border-line shadow-sh1",
          props.className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={props.style}
      >
        <div className={`flex items-center ${compact ? "gap-3" : "gap-[0.875rem]"}`}>
          <div
            className={[
              // Artboard 2459: 70x70 / yarıçap 16 — berabere 4363: 56x56 / yarıçap 14.
              compact
                ? "relative flex h-14 w-14 flex-none items-end overflow-hidden rounded-[0.875rem]"
                : "relative flex h-[4.375rem] w-[4.375rem] flex-none items-end overflow-hidden rounded-2xl",
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
          <div className="flex flex-1 flex-col gap-[0.1875rem]">
            <h3>{v.name}</h3>
            {/* Artboard `Liste modu 390` `.row.wr` — puan/fiyat satırı + tek adalet rozeti.
                Karışık destede aktivite rozeti de burada: mobil birinci sınıf artboard,
                iki finalist yan yanayken hangisinin hangi alan olduğu yazmalı. */}
            <div className="flex flex-wrap items-center gap-2">
              {props.mixedDeck && v.activityType && (
                <ActivityBadge activity={v.activityType} />
              )}
              {hasMeta && (
                <span className="text-[0.75rem] text-ink2">
                  {v.rating != null && `★ ${formatRating(v.rating, v.ratingScale)}`}
                  {v.rating != null && hasPrice && " · "}
                  {hasPrice && "€".repeat(v.priceLevel!)}
                </span>
              )}
            </div>
          </div>
          {voteBadge ?? pickCircle}
        </div>
        {/* Artboard 2466-2470: `.rg` + `.rg-g` kartın TAMAMINI kaplar — metin sütununun içinde
            değil. Dar sütunda bant ~100px'e sıkışıyor, baş harf noktaları üst üste biniyordu. */}
        {widget !== "none" && <RangeBar venue={v} travel={travel} />}
        {props.footer}
      </div>
    );
  }

  // 07 Runoff finalist kartı: seçim burada da mümkün — flame kenarlık + tikli daire.
  const isPick = props.selected !== undefined;
  return (
    <div
      className={[
        `relative flex w-full flex-col bg-white ${SURFACES[props.surface ?? "polaroid"]}`,
        dim,
        props.selected ? "border-[1.5px] border-flame-deep shadow-sh2" : "border border-line",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={props.style}
    >
      <div
        className={[
          "relative flex items-end overflow-hidden rounded-2xl",
          photoClass,
          props.photoOnly ? null : props.photoClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          props.photoOnly
            ? { height: "100%" }
            : props.photoClassName
              ? undefined
              : { height: `${(props.photoHeight ?? 264) / 16}rem` }
        }
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
              {!props.hideTitle &&
                (props.titleLevel === "h3" ? <h3>{v.name}</h3> : <h2 className="text-[1.25rem]">{v.name}</h2>)}
              {props.mixedDeck && v.activityType && (
                <div className="flex"><ActivityBadge activity={v.activityType} /></div>
              )}
              <FitLine venue={v} categories={props.categories ?? []} />
              {/* Artboard 2015: TEK meta satırı — "★ 4.6 · €€ · Bugün 08:00–18:00" (12px, ink2).
                  Saat eskiden ayrı satırdı; artboard'da aynı `.mi` satırının parçası. */}
              {(hasMeta || locality || v.hoursToday) && (
                <div className="flex flex-wrap items-center gap-[0.4375rem] text-[0.75rem] leading-[1.45] text-ink2">
                  {v.rating != null && (
                    <strong className="font-bold text-ink">★ {formatRating(v.rating, v.ratingScale)}</strong>
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
                  {v.hoursToday && (
                    <>
                      {(hasMeta || locality) && <span aria-hidden>·</span>}
                      <span>{t("venue.hoursToday", { hours: v.hoursToday })}</span>
                    </>
                  )}
                </div>
              )}
              {tagline && <span className="text-[0.75rem] text-ink2">{tagline}</span>}
            </div>
            {badgeLead && (
              <Badge tone={fLine?.leadTone === "amber" ? "amber" : "grass"}>{badgeLead}</Badge>
            )}
            {voteBadge ?? (isPick && pickCircle)}
          </div>
          {widget === "bars" && <TravelBars venue={v} travel={travel} hideLead={!!badgeLead} />}
          {widget === "range" && <RangeBar venue={v} travel={travel} />}
          {props.footer}
          {(props.attribution ?? true) && <Attribution providers={attributionProviders([v])} />}
        </div>
      )}
    </div>
  );
}
