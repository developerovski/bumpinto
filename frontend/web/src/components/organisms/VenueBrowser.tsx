import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { Button, HandNote, Note } from "../atoms";
import Segmented from "../molecules/Segmented";
import VenueRow from "../molecules/VenueRow";
import VenuePopCard from "../molecules/VenuePopCard";
import MapView from "./MapView";

export type BrowserMode = "host" | "guest" | "solo";

/** Mekan listesi ↔ harita gövdesi (Mekanlar ekranı) — sayfa/routing bir sonraki görevde. */
export default function VenueBrowser(props: {
  venues: VenueDto[];
  participants: ParticipantDto[];
  midpoint: { lat: number; lng: number } | null;
  radiusKm: number | null;
  mode: BrowserMode;
  travelLabels: Record<string, string>;
  onPick: (venueId: string) => void;
  tint?: number;
  pinLabels?: Record<string, string>;
  initialTab?: "list" | "map";
}) {
  const { t } = useTranslation();
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<"list" | "map">(props.initialTab ?? "list");
  const tint = props.tint ?? 0;
  // Geç gelen veriden sonra da seçim korunur — kullanıcı seçmediyse ilk mekana düşer.
  const selected = sel ?? props.venues[0]?.id ?? null;

  const pickBtn = (id: string, primary: boolean) =>
    props.mode === "guest" ? null : (
      <Button type="button" kind={primary ? "flame" : "white"} size="fit" onClick={() => props.onPick(id)}>
        {t("venues.pick")}
      </Button>
    );

  const selectedVenue = props.venues.find((v) => v.id === selected);

  return (
    <div>
      <div className="mb-3 flex justify-end lg:hidden">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "list", label: t("venues.list") },
            { value: "map", label: t("venues.map") },
          ]}
          ariaLabel={t("venues.view")}
        />
      </div>
      <div className="lg:grid lg:grid-cols-[42fr_58fr] lg:gap-10 lg:items-start">
        <div className={`${tab === "list" ? "flex" : "hidden lg:flex"} flex-col gap-1.5`}>
          {props.venues.map((v) => (
            <VenueRow
              key={v.id}
              venue={v}
              selected={v.id === selected}
              tint={tint}
              travelLabels={props.travelLabels}
              onHover={() => setSel(v.id ?? null)}
              onSelect={() => setSel(v.id ?? null)}
              action={v.id ? pickBtn(v.id, props.mode === "solo" && v.id === selected) : undefined}
            />
          ))}
          {props.mode === "solo" ? (
            <HandNote>{t("venues.soloHand")}</HandNote>
          ) : (
            <Note>{t("venues.everyoneSees")}</Note>
          )}
        </div>
        <div className={`relative ${tab === "map" ? "" : "hidden"} lg:block`}>
          <MapView
            participants={props.participants}
            venues={props.venues}
            midpoint={props.midpoint}
            radiusKm={props.radiusKm}
            selectedVenueId={selected}
            onSelectVenue={setSel}
            pinLabels={props.pinLabels}
            tint={tint}
            heightClass="h-[35rem]"
          />
          {selectedVenue && (
            <VenuePopCard
              venue={selectedVenue}
              tint={tint}
              travelLabels={props.travelLabels}
              action={selectedVenue.id ? pickBtn(selectedVenue.id, props.mode === "solo") : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
