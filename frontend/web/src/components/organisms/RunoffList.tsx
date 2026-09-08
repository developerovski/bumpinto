/* Kaynak: artboard W7 Runoff 1280 (2379-2410) / 390 kilitli (2455-2487) / 1280 kilitli
   (3656-3692) ve W7b Berabere (4362-4392 / 4425-4444). */
import type { VenueDto as Venue } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import Attribution from "../molecules/Attribution";
import RunoffTrailer from "../molecules/RunoffTrailer";
import VenueCard from "../molecules/VenueCard";

// .a-pick-btn — `all: unset` reset'i; görsel biçim tamamen kartta, odak halkası .a-btn ile aynı.
const PICK_BTN =
  "m-0 block cursor-pointer appearance-none rounded-card border-0 bg-transparent p-0 text-left " +
  "focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px] " +
  "disabled:cursor-default";

/** Artboard 07 Runoff — finalist kartları, yalnız seçim. HTTP/CTA/not RunoffStatus'ta;
    bu bileşen kilitlenmiş olsa bile (disabled) kartların kendisini gösterir. */
export default function RunoffList(props: {
  finalists: Venue[];
  choice: string | null;
  onChoose: (id: string) => void;
  disabled: boolean;
  travel?: TravelInfo;
  /** Oturum >1 ilgi alanı taşıyorsa finalist kartları kendi rozetlerini basar. */
  mixedDeck?: boolean;
  /** Beraberlik: seçim dairesinin yerini "N oy" rozeti alır ve kaybeden solukluğu UYGULANMAZ —
      oylama bitmiştir, kaybeden diye bir kart yoktur (artboard 4425-4444). Seçili kartın flame
      kenarlığı artboard'da yok ama BURADA korunur: "Kararı ben vereyim" bir finalist seçmeyi
      şart koşuyor, geri bildirim olmadan host neye tıkladığını göremez. */
  tie?: boolean;
  /** Sunucu-kapılı oy sayımı (B-7:T2) — yalnız beraberlikte dolu gelir. */
  tally?: Record<string, number>;
}) {
  // Kendi seçimini kilitleyen kişide seçilmeyen finalist geri çekilir. Artboard iki kırılma
  // noktasında AYRI değer kullanıyor: 1280 `.f-dim` (opacity .48 + saturate .55, 3671),
  // 390 düz opacity .75 (2473) — dar ekranda kart zaten küçük, .48 okunmuyor.
  const faded = (v: Venue) =>
    !props.tie && props.disabled && props.choice != null && props.choice !== v.id;
  // Atıf artboard'da kartın İÇİNDE değil, ızgaranın/listenin ALTINDA tek `.f-attrs` şerididir
  // (3688 / 2494). Lisans gereği mobilde de basılmalı — 390'da hiç yoktu (§2 P1).
  const providers = [...new Set(props.finalists.map((v) => v.provider).filter(Boolean))] as string[];

  return (
    <>
      <div className="hidden lg:block">
        <div className="grid grid-cols-2 gap-4">
          {props.finalists.map((v) => (
            <button
              key={v.id}
              type="button"
              className={PICK_BTN}
              aria-pressed={props.choice === v.id}
              disabled={props.disabled}
              onClick={() => props.onChoose(v.id!)}
            >
              <VenueCard
                venue={v}
                variant="polaroid"
                surface="card"
                photoHeight={150}
                titleLevel="h3"
                travelWidget="range"
                attribution={false}
                selected={props.choice === v.id}
                voteCount={props.tie ? (props.tally?.[v.id!] ?? 0) : undefined}
                dim={faded(v)}
                travel={props.travel}
                mixedDeck={props.mixedDeck}
                footer={<RunoffTrailer venue={v} all={props.finalists} />}
              />
            </button>
          ))}
        </div>
        <Attribution providers={providers} row />
      </div>
      <div className="flex flex-col gap-[0.5625rem] lg:hidden">
        {props.finalists.map((v) => (
          <button
            key={v.id}
            type="button"
            className={PICK_BTN}
            aria-pressed={props.choice === v.id}
            disabled={props.disabled}
            onClick={() => props.onChoose(v.id!)}
          >
            <VenueCard
              venue={v}
              mixedDeck={props.mixedDeck}
              variant="row"
              compact={props.tie}
              selected={props.choice === v.id}
              voteCount={props.tie ? (props.tally?.[v.id!] ?? 0) : undefined}
              className={faded(v) ? "opacity-75" : undefined}
              travel={props.travel}
              footer={<RunoffTrailer venue={v} all={props.finalists} />}
            />
          </button>
        ))}
        <Attribution providers={providers} row center />
      </div>
    </>
  );
}
