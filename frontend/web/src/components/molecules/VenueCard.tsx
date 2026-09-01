import type { CSSProperties } from "react";
import type { VenueDto } from "@bumpinto/shared";
import { Badge } from "../atoms";

/** Mekan kartı — iki artboard sunumu, tek bileşen:
    · "polaroid" (varsayılan) → Web W3/W4 `.pol`; deste, liste ve sonuç ekranları.
    · "row" → Mobil `07 Runoff` `.card`; 74px küçük görsel + seçim dairesi. */

// Artboard .pA/.pB/.pC — fotoğrafsız kartın ambient gradyanı (ui.css'te tanımlı).
const PHOTO_CLASSES = ["a-pho--a", "a-pho--b", "a-pho--c"];

export default function VenueCard(props: {
  venue: VenueDto;
  /** Artboard .pol-ph varsayılanı 264px; W4 sonuç kartı 150px, liste modu 120px. */
  photoHeight?: number;
  /** Yığındaki arka kartlar (artboard d2/d3): yalnız fotoğraf alanı, metin yok. */
  photoOnly?: boolean;
  /** Artboard W4: başlık sayfanın h1'i — kart gövdesinde tekrar edilmez. */
  hideTitle?: boolean;
  /** Artboard 07 Runoff finalist kartı. */
  variant?: "polaroid" | "row";
  /** 07 Runoff: seçili finalist — flame kenarlık + tikli daire. */
  selected?: boolean;
  /** Katılımcı id → etiket ("Sana", "Mehmet"). travelMinutes UUID ile anahtarlıdır. */
  travelLabels?: Record<string, string>;
  className?: string;
  style?: CSSProperties;
}) {
  const v = props.venue;
  const photoClass = PHOTO_CLASSES[(v.deckOrder ?? 0) % PHOTO_CLASSES.length];
  // Artboard: "Café Berlage" → "cb".
  const monogram = (v.name ?? "")
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toLowerCase();
  // Tek yüklem: boş photoUrl da "fotoğraf yok" sayılır — gradyan/monogram ile
  // "foto · Places" rozeti bu sayede karşılıklı dışlayıcı kalır.
  const hasPhoto = v.photoUrl != null && v.photoUrl !== "";
  const travel = Object.entries(v.travelMinutes ?? {});
  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  const hasMeta = v.rating != null || hasPrice;

  // Artboard 07 Runoff: iki finalist ters yönde eğik duruyor (-2° / +2°).
  if (props.variant === "row") {
    const tilt = (v.deckOrder ?? 0) % 2 === 0 ? "a-row-thumb--l" : "a-row-thumb--r";
    const cardClasses = ["a-card", "a-row-card"];
    if (props.selected) cardClasses.push("a-row-card--on");
    if (props.className) cardClasses.push(props.className);
    return (
      <div className={cardClasses.join(" ")} style={props.style}>
        <div className="row">
          <div
            className={hasPhoto ? `a-row-thumb ${tilt}` : `a-row-thumb ${tilt} ${photoClass}`}
            style={hasPhoto ? { background: `url(${v.photoUrl}) center/cover` } : undefined}
          >
            {!hasPhoto && (
              <span className="a-pho-mono" aria-hidden>
                {monogram}
              </span>
            )}
          </div>
          <div className="a-row-body">
            <h3>{v.name}</h3>
            {hasMeta && (
              // Artboard: tek satır .mi — "★ 4.6 · €€".
              <span className="a-mi">
                {v.rating != null && `★ ${v.rating}`}
                {v.rating != null && hasPrice && " · "}
                {hasPrice && "€".repeat(v.priceLevel!)}
              </span>
            )}
            {travel.length > 0 && (
              <div className="a-row-travel">
                {travel.map(([who, min]) => (
                  <Badge key={who}>
                    {props.travelLabels?.[who] ?? "Yol"} {min}′
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <span className={props.selected ? "a-pick a-pick--on" : "a-pick"} aria-hidden>
            {props.selected && <i />}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={props.className ? `a-pol ${props.className}` : "a-pol"} style={props.style}>
      <div
        className={hasPhoto ? "a-pol-ph" : `a-pol-ph ${photoClass}`}
        style={{
          height: props.photoOnly ? "100%" : (props.photoHeight ?? 264),
          ...(hasPhoto ? { background: `url(${v.photoUrl}) center/cover` } : null),
        }}
      >
        {/* Arka kartlar (d2/d3) artboard'da çıplak gradyan — içinde hiçbir şey yok.
            DS kuralı: fotoğraf yoksa ambient gradyan + monogram — asla çizgili kutu.
            Tasarım denetimi bulgusu (2026-09-01): rozet YALNIZ gerçek foto varken. */}
        {!props.photoOnly &&
          (hasPhoto ? (
            <span className="a-pho-tag">foto · Places</span>
          ) : (
            <span className="a-pho-mono" aria-hidden>
              {monogram}
            </span>
          ))}
      </div>
      {!props.photoOnly && (
        <div className="a-pol-body">
          {!props.hideTitle && <h2 className="a-pol-title">{v.name}</h2>}
          {hasMeta && (
            <div className="a-pol-meta">
              {v.rating != null && <strong>★ {v.rating}</strong>}
              {v.rating != null && hasPrice && <span aria-hidden>·</span>}
              {hasPrice && <span>{"€".repeat(v.priceLevel!)}</span>}
            </div>
          )}
          {travel.length > 0 && (
            <div className="a-pol-travel">
              {travel.map(([who, min]) => (
                <Badge key={who}>
                  {props.travelLabels?.[who] ?? "Yol"} {min} dk
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
