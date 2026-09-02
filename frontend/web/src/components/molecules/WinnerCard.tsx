/* Kaynak: ui.css .a-ov(--flame) / .a-pol--winner (+ .a-pol-body gap) / Karar 1280 */
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { Heading, Highlight, LinkButton, Sticker } from "../atoms";
import VenueCard from "./VenueCard";

const OVERLINE = "m-0 text-[0.6875rem] font-bold tracking-[0.11em] text-flame-deep uppercase";
// Artboard W4: .pol style="transform:rotate(-1.4deg);box-shadow:var(--sh2)".
const WINNER = "transform-[rotate(-1.4deg)] shadow-sh2";

/** Artboard Karar 1280 · kazanan bloğu: üst başlık + vurgulu ad + çıkartmalı kart + yol tarifi.
    API oy birliğini kanıtlayamaz (voteTally boşluğu tekil sonuç için de force-decision için de
    olur) — bu yüzden "herkes beğendi" kutlama yolu yok; başlık ve çıkartma her zaman sabit. */
export default function WinnerCard(props: {
  venue: VenueDto;
  travelLabels?: Record<string, string>;
}) {
  const { t } = useTranslation();
  // Artboard: "Café <span class=hl-m>Berlage!</span>" — son sözcük ünlemle vurgulu.
  const words = (props.venue.name ?? "").trim().split(" ");
  const last = words.pop() ?? "";
  const head = words.join(" ");

  return (
    <>
      <div className="flex flex-col items-center gap-1.5">
        <p className={OVERLINE}>{t("result.overline")}</p>
        <Heading center>
          {head && `${head} `}
          <Highlight>{last}!</Highlight>
        </Heading>
      </div>
      <div className="relative">
        {/* Artboard: .stk style="position:absolute;right:10px;top:-14px;z-index:3" */}
        <span className="absolute -top-[0.875rem] right-2.5 z-3 flex">
          <Sticker>{t("result.sticker")}</Sticker>
        </span>
        <VenueCard
          venue={props.venue}
          photoHeight={150}
          hideTitle
          bodyGap="md"
          travelLabels={props.travelLabels}
          className={WINNER}
        />
      </div>
      <LinkButton href={props.venue.mapsUrl ?? "#"} target="_blank" rel="noreferrer">
        {t("result.directions")}
      </LinkButton>
    </>
  );
}
