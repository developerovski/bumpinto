/* Kaynak: ui.css .a-ov(--flame) / .a-pol--winner (+ .a-pol-body gap) / Karar 1280 */
import { useTranslation } from "react-i18next";
import type { VenueDto as Venue } from "@bumpinto/shared";
import { roundedMidpointMeters } from "../../lib/geo";
import type { DecisionKind } from "../../lib/serverEnums";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Heading, Highlight, LinkButton, Note, Sticker } from "../atoms";
import Attribution from "./Attribution";
import VenueCard from "./VenueCard";

const OVERLINE = "m-0 text-[0.6875rem] font-bold tracking-[0.11em] text-flame-deep uppercase";
// Artboard W4: .pol style="transform:rotate(-1.4deg);box-shadow:var(--sh2)".
const WINNER = "transform-[rotate(-1.4deg)] shadow-sh2";

function hhmm(iso: string, locale: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Artboard Karar 1280 · kazanan bloğu: üst başlık + vurgulu ad + meta satırı (YALNIZ mesafe —
    adres WhyHere'in YER ekseninde) + çıkartmalı kart + inline harita bağlantısı. Harita YOK
    (§4.7) — yalnız `placeLink`/`mapsUrl`/hesaplanan yol tarifi bağlantısı. API oy birliğini
    kanıtlayamaz (voteTally boşluğu tekil sonuç için de force-decision için de olur) — bu yüzden
    çıkartma her zaman "herkes beğendi" DEĞİL: `decisionKind` + `likeCounts` (B-7:T2)
    UNANIMOUS'ta "N/M beğendi!" (artboard), aksi hâlde "Karar verildi!"/"Karar verildi · HH:mm".
    Çıkartma sayıyı gösterirken saat meta satırına taşınır — ikisi aynı çıkartmayı paylaşamaz. */
export default function WinnerCard(props: {
  venue: Venue;
  travel?: TravelInfo;
  decisionKind?: DecisionKind;
  decidedAt?: string;
  /** Orta nokta — meta satırındaki "Herkesin ortasına ~X m" için (WhyHere ile AYNI kaynak). */
  midpoint?: { lat?: number; lng?: number } | null;
  /** UNANIMOUS çıkartması: kazananı beğenen kişi / toplam oy verebilecek kişi. */
  likeCount?: number;
  voterCount?: number;
  /** RUNOFF eyebrow'u: kazanan/ikinci oy sayısı ("Oylamayla 2–1"). */
  tally?: { top: number; second: number };
  /** PARTIAL eyebrow'u: karardan önce bitirmemiş kişi(ler) — `Intl.ListFormat` ile birleşik ad.
      Boş/undefined ise (isim yoksa) varsayılan "Ortak nokta" başlığına düşülür. */
  names?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  // Artboard: "Café <span class=hl-m>Berlage!</span>" — son sözcük ünlemle vurgulu.
  const words = (props.venue.name ?? "").trim().split(" ");
  const last = words.pop() ?? "";
  const head = words.join(" ");

  const eyebrow =
    props.decisionKind === "UNANIMOUS"
      ? t("result.eyebrowUnanimous")
      : props.decisionKind === "RUNOFF" && props.tally
        ? t("result.eyebrowRunoff", { a: props.tally.top, b: props.tally.second })
        : props.decisionKind === "PARTIAL" && props.names
          ? t("result.eyebrowPartial", { names: props.names })
          : t("result.overline");

  const time = props.decidedAt ? hhmm(props.decidedAt, locale) : null;
  const isLikedSticker =
    props.decisionKind === "UNANIMOUS" && props.likeCount != null && !!props.voterCount;
  const stickerText = isLikedSticker
    ? t("result.likedSticker", { n: props.likeCount, total: props.voterCount })
    : time
      ? t("result.decidedAtSticker", { time })
      : t("result.sticker");

  // Meta satırı — YALNIZ mesafe (geo.roundedMidpointMeters, WhyHere'in YER ekseniyle AYNI
  // kaynak). Adres burada tekrar EDİLMEZ — WhyHere'in YER ekseni adresin TEK sahibi
  // (code-review düzeltmesi: iki yerde aynı adres metni çift render oluyordu).
  const rounded = roundedMidpointMeters(props.midpoint, props.venue);
  const metaLine =
    rounded == null ? null : rounded < 100 ? t("result.midpointExact") : t("result.midpointMeters", { m: rounded });

  // "Yol tarifi al" kalktı (§4.7 harita politikası) — tek bağlantı, tek href kaynağı.
  // href yoksa buton HİÇ render edilmez (ölü href="#" düzelir).
  const href =
    props.venue.placeLink ??
    props.venue.mapsUrl ??
    (props.venue.lat != null && props.venue.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${props.venue.lat},${props.venue.lng}`
      : null);

  return (
    <>
      <div className="flex flex-col items-center gap-1.5">
        <p className={OVERLINE}>{eyebrow}</p>
        <Heading center>
          {head && `${head} `}
          <Highlight>{last}!</Highlight>
        </Heading>
        {metaLine && <Note center>{metaLine}</Note>}
        {/* Çıkartma "N/M beğendi!" iken saat için ayrı bir satır — ikisi aynı çıkartmayı
            paylaşamaz. */}
        {isLikedSticker && time && <Note center>{t("result.decidedAtSticker", { time })}</Note>}
      </div>
      <div className="relative">
        {/* Artboard: .stk style="position:absolute;right:10px;top:-14px;z-index:3" */}
        <span className="absolute -top-[0.875rem] right-2.5 z-3 flex">
          <Sticker>{stickerText}</Sticker>
        </span>
        <VenueCard
          venue={props.venue}
          photoHeight={150}
          hideTitle
          bodyGap="md"
          travel={props.travel}
          className={WINNER}
          attribution={false}
        />
      </div>
      {href && (
        // Artboard `.btn.b-gh.fit` — inline ghost bağlantı, tam genişlik pill DEĞİL.
        // `self-center`: üst kolon `items-center` DEĞİL (TwoZone stretch varsayılanı) —
        // ezmeyen tek ek, `size="fit"`in genişliğini korur.
        <LinkButton
          href={href}
          target="_blank"
          rel="noreferrer"
          kind="ghost"
          size="fit"
          className="self-center"
        >
          {t("result.openInMaps")}
        </LinkButton>
      )}
      <Attribution provider={props.venue.provider} center />
    </>
  );
}
