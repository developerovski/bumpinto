import { X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { venueLink } from "../../lib/venueLink";
import { LinkButton, Overline } from "../atoms";
import VenueMeta from "./VenueMeta";
import VenueThumb from "./VenueThumb";

/** Haritadaki seçili mekan kartı (artboard `.popcard`). UI review 2026-09-03: 52px küçük resim
    kartın yarısını kaplayan boşlukla birlikte okunmuyordu — fotoğraf artık tam genişlik afiş,
    metin altında tek sütun akıyor ve dokunmatikte kartı kapatmak için bir düğme var. */
export default function VenuePopCard(props: {
  venue: VenueDto;
  tint: number;
  travel: TravelInfo;
  action?: ReactNode;
  /** SessionView.midpointLabel — semt bununla AYNIYSA meta satırında tekrar edilmez (§4.9). */
  midpointLabel?: string;
  /** Dokunmatikte kart seçimle açılır ve açık kalır; masaüstünde hover bırakınca zaten kapanır. */
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const v = props.venue;
  const link = venueLink(v);

  return (
    <div className="absolute left-4 top-4 z-[5] flex w-[19.5rem] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-[1.25rem] border border-line bg-white shadow-sh2">
      <div className="relative">
        <VenueThumb venue={v} tint={props.tint} className="h-[8.5rem] w-full" monogramSize={44} />
        {props.onClose && (
          <button
            type="button"
            onClick={props.onClose}
            aria-label={t("common.close")}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-[rgba(255,255,255,0.92)] text-ink shadow-sh1 backdrop-blur"
          >
            <X size={16} weight="bold" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3.5">
        {v.category && <Overline>{v.category}</Overline>}
        <h3 className="font-head text-[1.0625rem] font-bold leading-tight">{v.name}</h3>
        <VenueMeta venue={v} travel={props.travel} midpointLabel={props.midpointLabel} />
        {v.hoursToday && (
          <span className="text-[0.75rem] text-ink3">{t("venue.hoursToday", { hours: v.hoursToday })}</span>
        )}
        {/* Bağlantı `action` yuvasına GİRMEZ: orası onay durumunda SelectionCard ile dolu ve
            dış çıkış "Kilitle" ile birincillik yarışına girmemeli — ghost, kendi satırında. */}
        {link && (
          <LinkButton href={link} target="_blank" rel="noreferrer" kind="ghost" size="fit">
            {t("venue.openInMaps")}
          </LinkButton>
        )}
        {props.action}
      </div>
    </div>
  );
}
