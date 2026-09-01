import { Badge } from "@bumpinto/web";

/** Beş ton — üründe anlam taşırlar: grass = hazır, amber = bekliyor,
    flame = yol süresi, violet = ortak nokta, neutral = rol etiketi. */
export function Tones() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="grass">Hazır</Badge>
      <Badge tone="amber">Bekliyor</Badge>
      <Badge tone="flame">Sana 12 dk</Badge>
      <Badge tone="violet">Ortak nokta</Badge>
      <Badge tone="neutral">Kuran</Badge>
    </div>
  );
}

/** W2 · katılımcı satırının sağ ucu — kuran rozeti + konum durumu. */
export function WaitingRow() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone="neutral">Kuran</Badge>
      <Badge tone="grass">Hazır</Badge>
      <Badge tone="amber">Bekliyor</Badge>
    </div>
  );
}

/** W3 · mekan kartındaki yol süreleri — `md`, tam metin ("{{who}} {{min}} dk"). */
export function TravelMedium() {
  return (
    <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
      <Badge tone="flame">Sana 12 dk</Badge>
      <Badge tone="flame">Arkadaşın 9 dk</Badge>
    </div>
  );
}

/** 07 Runoff satır kartı · `sm` (11px) — kısaltılmış metin ("{{who}} {{min}}′"). */
export function TravelSmall() {
  return (
    <div className="flex flex-wrap items-center gap-[0.3125rem] tabular-nums">
      <Badge size="sm">Sen 12′</Badge>
      <Badge size="sm">Arkadaşın 9′</Badge>
    </div>
  );
}
