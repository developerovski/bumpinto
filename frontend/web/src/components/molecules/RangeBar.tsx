/* Artboard `.rg` (W3b/W6) — dar liste satırında TEK yol göstergesi: bant + baş harf noktaları +
   "25–35 dk", altında `.rg-g` adalet satırı. `TravelChips`in yerini alır: 3 kişide çipler satırı
   sarıyor ve rozetle aynı bilgiyi iki kez yazıyordu (v3 notları). */
import { useTranslation } from "react-i18next";
import { fairnessOf, type FairnessVenue } from "@bumpinto/shared";
import { fairnessLine, initialOf, type FairnessLine } from "../../lib/travelText";
import type { TravelInfo } from "../../lib/useTravelLabels";

// A1: zemin/metin rengi buradan çıkarıldı, koşullu dala taşındı (aşağıda `tone`) — sınıflar
// AYNI ANDA basılamaz, o yüzden DOT'ta paylaşılmayan hiçbir renk yok.
const DOT =
  "absolute top-1/2 -ml-[0.5625rem] flex h-[1.125rem] w-[1.125rem] -translate-y-1/2 items-center " +
  "justify-center rounded-full border-2 font-head text-[0.5625rem] font-extrabold shadow-sh1";

/** `.rg-g` satırı — `TravelBars` de aynısını basar, bu yüzden dışa açık (tek kopya). */
export function FairnessNote(props: { line: FairnessLine }) {
  const { lead, leadTone, rest } = props.line;
  if (!lead && rest.length === 0) return null;
  return (
    <span className="text-[0.75rem] text-ink2">
      {lead && (
        <strong className={leadTone === "amber" ? "font-bold text-amber-ink" : "font-bold text-ink"}>{lead}</strong>
      )}
      {lead && rest.length > 0 && " · "}
      {rest.join(" · ")}
    </span>
  );
}

/** İz uçlarında 15% pay — uç noktalar kırpılmasın (artboard 15%…85%). */
function pos(minutes: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.min(100, Math.max(0, 15 + (70 * (minutes - min)) / (max - min)));
}

export default function RangeBar(props: { venue: FairnessVenue & { name?: string }; travel: TravelInfo }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const f = fairnessOf(props.venue);
  if (!f || f.entries.length === 0) return null;
  const many = f.entries.length > 1;
  const line = fairnessLine(f, props.travel, t);
  const value = f.min === f.max
    ? t("travel.min", { min: f.max })
    : t("travel.range", { min: f.min, max: f.max });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-[1.375rem] items-center gap-2">
        <div className="relative h-1.5 flex-1 rounded-full bg-line2">
          {/* A6: herkes eşit dakikadaysa (f.min === f.max) 0 genişlikli bant çizilmez. */}
          {many && f.min !== f.max && (
            <span
              data-testid="range-span"
              // A3: bant rengi `line.leadTone`'dan gelir — `fairnessLine` ile TEK kaynak (A4: WCAG 1.4.1,
              // renk her zaman aynı tonda lead metniyle eşleşir).
              className={`absolute top-0 h-1.5 rounded-full ${line.leadTone === "amber" ? "bg-amber" : "bg-grass"}`}
              style={{
                left: `${pos(f.min, f.min, f.max)}%`,
                width: `${pos(f.max, f.min, f.max) - pos(f.min, f.min, f.max)}%`,
              }}
            />
          )}
          {f.entries.map((e) => {
            // A1: kenarlık/zemin/metin TEK dışlayıcı zincir — aynı utility'nin adayları Tailwind v4'te
            // alfabetik üretildiği için sınıflar aynı anda basılırsa kaynak sırası (ör. `border-grass`)
            // sessizce kazanır. Öncelik artboard'daki gibi: aykırı > kendin > diğer.
            const tone =
              e.id === f.outlierId
                ? "border-amber bg-white text-ink"
                : props.travel.selfId && e.id === props.travel.selfId
                  ? "border-flame-deep bg-flame-deep text-white"
                  : "border-grass bg-white text-ink";
            return (
              <span
                key={e.id}
                data-testid={`range-dot-${e.id}`}
                aria-hidden
                className={`${DOT} ${tone}`}
                style={{ left: `${pos(e.minutes, f.min, f.max)}%` }}
              >
                {initialOf(props.travel.labels[e.id] ?? t("travel.friend"), locale)}
              </span>
            );
          })}
        </div>
        <span className="min-w-[4rem] whitespace-nowrap text-right text-[0.78125rem] font-bold text-ink tabular-nums">
          {value}
        </span>
      </div>
      {/* Noktalar aria-hidden — kişi başı dakika ekran okuyucuya burada verilir. */}
      <ul className="sr-only" aria-label={t("travel.bars")}>
        {f.entries.map((e) => (
          <li key={e.id}>
            {`${props.travel.labels[e.id] ?? t("travel.friend")} ${t("travel.min", { min: e.minutes })}`}
          </li>
        ))}
      </ul>
      <FairnessNote line={line} />
    </div>
  );
}
