/* Kaynak: artboard W8 · Karar 1280 (2515–2598) / 390 (2599–2666) / oylama (3736–3819) — imza
   sonuç kartı `.rc` (CSS 508–516). `.rc` deste kartı (`VenueCard` `.pol`) DEĞİLDİR: kişi başı
   yol satırlarını (`.rc-ppl`) ve wordmark'lı adalet altbilgisini (`.rc-ft`) taşır, buna karşılık
   saat/tagline/atıf satırlarını taşımaz. Bu yüzden gövde `VenueCard` prop'uyla değil BURADA
   kurulur — iki kart aynı bileşene sığmıyor (rapor I · P1-1). */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto as Venue } from "@bumpinto/shared";
import { fairnessOf } from "@bumpinto/shared";
import { formatRating, providerMark } from "../../lib/format";
import { roundedMidpointMeters } from "../../lib/geo";
import { monogram } from "../../lib/monogram";
import type { DecisionKind } from "../../lib/serverEnums";
import { MODE_ICON, MODE_LABEL_KEY } from "../../lib/travelMode";
import { personIndexOf } from "../../lib/personColor";
import { fairnessLine } from "../../lib/travelText";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Avatar, Badge, Heading, Highlight, Note, Overline, Sticker, Wordmark } from "../atoms";
import { PHOTO_CLASSES, PHOTO_MONO } from "./photoStyles";

/* Artboard 2539: `.rc` + `max-width:460px` + `transform:rotate(-1.2deg)`. Yarıçap `.rc`
   (CSS 508) 22px = `rounded-card`; iç boşluk 10/10/12; satır arası 9px; gölge `sh2`. */
const CARD =
  "relative flex w-full flex-col gap-[0.5625rem] rounded-card border border-line bg-white " +
  "p-[0.625rem_0.625rem_0.75rem] shadow-sh2 transform-[rotate(-1.2deg)] lg:max-w-[28.75rem]";

/* `.rc-ppl .r` — 28px avatar sütunu + ad + dakika. Avatar atomunun en küçük ölçüsü `xs` (29px);
   tasarımdaki 26px'lik ara ölçü atomda yok, sütun 29px'e açıldı (1px'lik sapma bilinçli —
   atom dosyaları bu görevde değişmiyor). */
const PERSON_ROW = "grid grid-cols-[1.8125rem_1fr_auto] items-center gap-2 text-[0.8125rem]";

function hhmm(iso: string, locale: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Artboard Karar · kazanan bloğu: üstlük + vurgulu ad + `★ · €€` + mesafe/adres satırı, altında
    iki çıkartmalı `.rc` kartı. Harita YOK (§4.7) — yol tarifi/maps bağlantısı aksiyon şeridinde
    (`ResultActions`). API oy birliğini kanıtlayamaz (voteTally boşluğu tekil sonuç için de
    force-decision için de olur) — bu yüzden SOL (sarı) çıkartma `decisionKind`e göre seçilir
    (B-7:T2): UNANIMOUS → "N/M beğendi!", RUNOFF → "Oylamayla 2–1", PARTIAL → "Kerem olmadan",
    aksi hâlde çıkartma basılmaz. SAĞ (beyaz) çıkartma her zaman kararın kendisidir
    ("Karar verildi · 12:41"). */
export default function WinnerCard(props: {
  venue: Venue;
  travel?: TravelInfo;
  /** `.rc-ppl` satırlarının ulaşım türü ikonu + avatar sırası için — `travel.labels` adları verir,
      tür/sıra katılımcı listesinden gelir. */
  participants?: ParticipantDto[];
  decisionKind?: DecisionKind;
  decidedAt?: string;
  /** Orta nokta — meta satırındaki "Herkesin ortasına ~X m" için (WhyHere ile AYNI kaynak). */
  midpoint?: { lat?: number; lng?: number } | null;
  /** UNANIMOUS çıkartması: kazananı beğenen kişi / toplam oy verebilecek kişi. */
  likeCount?: number;
  voterCount?: number;
  /** RUNOFF: kazanan/ikinci oy sayısı ("Oylamayla 2–1"). */
  tally?: { top: number; second: number };
  /** PARTIAL: karardan önce bitirmemiş kişi(ler) — `Intl.ListFormat` ile birleşik ad.
      Boş/undefined ise (isim yoksa) sol çıkartma hiç basılmaz. */
  names?: string;
  /** `SessionView.midpointLabel` — semt bununla AYNIYSA kart meta satırında tekrar edilmez (§4.9). */
  midpointLabel?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const v = props.venue;
  const travel = props.travel ?? { labels: {} };
  const participants = props.participants ?? [];
  // Artboard: "Café <span class=hl-m>Berlage!</span>" — son sözcük ünlemle vurgulu.
  const words = (v.name ?? "").trim().split(" ");
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
  // Sol çıkartma (artboard 2540 sarı `.stk` / 3761 "Oylamayla 2–1"). Üstlük anahtarları v3'te
  // "Ortak nokta · " önekini taşıyor (rapor I · P2-1); çıkartma o öneki TAŞIMAZ, bu yüzden
  // kısa kardeş anahtarlar (`runoffSticker`/`partialSticker`) ayrı yaşıyor.
  const leftSticker =
    props.decisionKind === "UNANIMOUS" && props.likeCount != null && props.voterCount
      ? t("result.likedSticker", { n: props.likeCount, total: props.voterCount })
      : props.decisionKind === "RUNOFF" && props.tally
        ? t("result.runoffSticker", { a: props.tally.top, b: props.tally.second })
        : props.decisionKind === "PARTIAL" && props.names
          ? t("result.partialSticker", { names: props.names })
          : null;
  // Sağ çıkartma (artboard 2541 beyaz `.stk.w`): saat varsa saatli, yoksa sade "Karar verildi!".
  const rightSticker = time ? t("result.decidedAtSticker", { time }) : t("result.sticker");

  // Meta satırı — mesafe (geo.roundedMidpointMeters, WhyHere'in YER ekseniyle AYNI kaynak) +
  // adres (artboard 2538: "Herkesin ortasına ~600 m · Kleine Berg 16, Eindhoven merkez").
  const rounded = roundedMidpointMeters(props.midpoint, v);
  const metaLine = [
    rounded == null ? null : rounded < 100 ? t("result.midpointExact") : t("result.midpointMeters", { m: rounded }),
    v.address,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  // Artboard 2537 `.cp` 14px: "★ 4.6 · €€" — puan/fiyat başlığın altında, kartın içinde DEĞİL.
  const scoreLine = [
    v.rating != null ? `★ ${formatRating(v.rating, v.ratingScale)}` : null,
    hasPrice ? "€".repeat(v.priceLevel!) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Kart içi meta satırı (artboard 2544 `.mi`): puan + sağlayıcı işareti (spec §11) + fiyat +
  // semt. Adres burada TEKRAR EDİLMEZ — başlığın altındaki satır ve WhyHere'in YER ekseni onu
  // zaten iki kez yazıyor, üçüncüsü aynı ekranda aynı cümledir.
  const mark = providerMark(v.provider);
  const locality = v.locality && v.locality !== props.midpointLabel ? v.locality : null;
  const cardMeta = [
    v.rating != null ? `★ ${formatRating(v.rating, v.ratingScale)}` : null,
    v.rating != null && mark ? mark : null,
    hasPrice ? "€".repeat(v.priceLevel!) : null,
    locality,
  ]
    .filter(Boolean)
    .join(" · ");

  const [broken, setBroken] = useState(false);
  const showPhoto = v.photoUrl != null && v.photoUrl !== "" && !broken;
  const photoClass = PHOTO_CLASSES[(v.deckOrder ?? 0) % PHOTO_CLASSES.length];

  const f = fairnessOf(v);
  // Adalet rozeti (artboard 2545 `.bg.g-gr` "Herkese ~aynı"). Ton `fairnessLine`den gelir —
  // renk ile cümle TEK kaynaktan eşleşir (RangeBar A3/A4 kuralı); lead yoksa rozet basılmaz.
  const line = f ? fairnessLine(f, travel, t) : null;
  // Kendi satırın en üstte; kalanlar `fairnessOf` sırasında (en uzun yol önce) — TravelBars ile
  // AYNI kural, iki yüzey aynı sırayı gösterir.
  const rows = f
    ? [...f.entries].sort((a, b) => Number(b.id === travel.selfId) - Number(a.id === travel.selfId))
    : [];

  return (
    <>
      {/* 390 ortalı (artboard 2615), 1280 sola yaslı (2534–2538). Hizalama KAPTA: `text-align`
          kalıtımla h1/p'ye iner, atomlara `center` prop'u geçmeye gerek kalmaz. */}
      <div className="flex flex-col items-center gap-1.5 text-center lg:items-start lg:text-left">
        <Overline tone="flame">{eyebrow}</Overline>
        {/* Artboard 2617: Karar 390 başlığı 30px. */}
        <Heading size="compact">
          {head && `${head} `}
          <Highlight>{last}!</Highlight>
        </Heading>
        {/* `.cp` ezmesi 14px — `Note` 13/12px veriyor, ara ölçü atomda yok. */}
        {scoreLine && <p className="text-[0.875rem] leading-[1.45] text-ink2">{scoreLine}</p>}
        {metaLine && <Note small>{metaLine}</Note>}
      </div>
      <div className={CARD}>
        {/* Artboard 2540–2541: sol sarı `left:10px;top:-13px`, sağ beyaz `right:10px;top:-13px`. */}
        {leftSticker && (
          <span className="absolute -top-[0.8125rem] left-2.5 z-3 flex">
            <Sticker>{leftSticker}</Sticker>
          </span>
        )}
        <span className="absolute -top-[0.8125rem] right-2.5 z-3 flex">
          <Sticker white>{rightSticker}</Sticker>
        </span>
        {/* `.rc-ph` — 14px yarıçap, 150px yükseklik. Foto CSS zemini değil <img>: sağlayıcı
            bağlantısı ölürse gradyan + monograma düşebiliyoruz (VenueCard ile aynı kural). */}
        <div className={`relative flex h-[9.375rem] items-end overflow-hidden rounded-[0.875rem] ${photoClass}`}>
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
            <span className={`${PHOTO_MONO} text-[2.125rem]`} aria-hidden>
              {monogram(v.name)}
            </span>
          )}
        </div>
        {(cardMeta || line?.lead) && (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="min-w-0 truncate text-[0.75rem] text-ink2">{cardMeta}</span>
            {line?.lead && (
              <Badge tone={line.leadTone === "amber" ? "amber" : "grass"}>{line.lead}</Badge>
            )}
          </div>
        )}
        {rows.length > 0 && (
          <div className="flex flex-col gap-1.5 px-1">
            {rows.map((e) => {
              const p = participants.find((x) => x.id === e.id);
              const mode = p?.travelMode;
              // Ulaşım türü YOKSA ikon basılmaz — sunucu varsayılanı (CAR) burada uydurulmaz.
              const icons = mode ? MODE_ICON[mode] : [];
              const label = travel.labels[e.id] ?? t("travel.friend");
              const self = travel.selfId != null && e.id === travel.selfId;
              const index = personIndexOf(participants, e.id);
              return (
                <div key={e.id} className={PERSON_ROW}>
                  <Avatar name={label} index={index} size="xs" />
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={`truncate ${self ? "font-bold text-ink" : "text-ink"}`}>{label}</span>
                    {icons.length > 0 && (
                      // `.f-mode` — 14px glif; çift glifli mod (EBIKE) ikinci glifi 9px
                      // (artboard 2632). Sıra `MODE_ICON` dizisinden, `ParticipantRow` ile aynı.
                      <span className="inline-flex flex-none items-center gap-1 text-ink2">
                        {icons.map((Icon, i) => (
                          <Icon key={i} size={icons.length > 1 && i === 0 ? 9 : 14} aria-hidden />
                        ))}
                        {mode && <span className="sr-only">{t(MODE_LABEL_KEY[mode].name)}</span>}
                      </span>
                    )}
                  </span>
                  <span className="text-right font-bold text-ink tabular-nums">
                    {t("travel.min", { min: e.minutes })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {/* `.rc-ft` — kesikli üst çizgi + wordmark + adalet cümlesi. Veri yoksa (`f` null, ör.
            solo oturum) "~0–0 dk · 0 dk fark" yazmak "herkes tam eşit" ile ayırt edilemez bir
            yalan söyler; satır tümüyle düşer (ShareCard'daki kuralın aynısı). */}
        {f && (
          <div className="mt-0.5 flex items-center justify-between border-t border-dashed border-line2 px-1 pt-1">
            <Wordmark />
            <span className="text-[0.71875rem] text-ink2">
              {t("share.cardFooter", { min: f.min, max: f.max, spread: f.spread })}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
