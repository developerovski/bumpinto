/* Artboard W3e — host "Mekanları bul"a bastığı andan liste gelene kadar. Durum tabanlı DEĞİL:
   sunucu SUGGESTING'i tek işlemde geçiyor (DeckFlow.findVenues), ekran istemcinin bekleyen
   çağrısına bağlıdır. */
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { HandNote, Page } from "../atoms";
import SessionHeader from "../molecules/SessionHeader";
import VenueRowSkeleton from "../molecules/VenueRowSkeleton";

export default function VenuesLoading(props: { name?: string }) {
  const { t } = useTranslation();
  return (
    // Liste gelince VenuesPage AYNI sözleşmeyi kullanır (kod incelemesi #9): SessionHeader
    // varsayılan (h2) + `Page wide` — başlık/kap ölçüsü liste gelirken atlamasın.
    <Page wide>
      <SessionHeader title={props.name} meta={t("venues.searching")} />
      <div role="status" aria-busy="true" className="flex flex-col items-center gap-1.5 py-1">
        <h2 className="text-center">{t("venues.searchingTitle")}</h2>
        {/* Artboard `.cp` — ortalı, 13px. `Lead` sol-dayalı + 16px kalırdı; yeni prop yerine
            düz `<p>` (kod incelemesi #8). */}
        <p className="max-w-[30ch] text-center text-[0.8125rem] text-ink2">{t("venues.searchingCopy")}</p>
      </div>
      {/* Kart padding:0 taşır, satırlar `.dv` ayracıyla ayrılır — ilk satırın üstünde yok
          (kod incelemesi #10). */}
      <div className="flex flex-col rounded-card border border-line bg-card shadow-sh1">
        {[0, 1, 2, 3].map((i) => (
          <Fragment key={i}>
            {i > 0 && <div className="mx-3.5 h-px bg-line" />}
            <VenueRowSkeleton />
          </Fragment>
        ))}
      </div>
      <HandNote center>{t("venues.searchingHand")}</HandNote>
    </Page>
  );
}
