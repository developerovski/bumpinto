/* Artboard W3e — host "Mekanları bul"a bastığı andan liste gelene kadar. Durum tabanlı DEĞİL:
   sunucu SUGGESTING'i tek işlemde geçiyor (DeckFlow.findVenues), ekran istemcinin bekleyen
   çağrısına bağlıdır. */
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { sessionActivities } from "../../lib/activity";
import { useConfigStore } from "../../store/configStore";
import { Button, HandNote, Page } from "../atoms";
import MidpointCard from "../molecules/MidpointCard";
import MobileCta from "../molecules/MobileCta";
import SessionHeader from "../molecules/SessionHeader";
import VenueRowSkeleton from "../molecules/VenueRowSkeleton";

export default function VenuesLoading(props: { name?: string; view?: SessionView }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const view = props.view;
  const config = useConfigStore((s) => s.config);

  // Artboard 4291: "Çevredeki KAHVE mekanları aranıyor" — oturumun TEK ilgi alanı varsa adı
  // geçer. Karışık destede alan adı seçilemez, genel başlığa düşülür (uydurma yok).
  const activities = view ? sessionActivities(view) : [];
  const title =
    activities.length === 1
      ? t("venues.searchingTitleFor", {
          activity: t(`activity.${activities[0]}`).toLocaleLowerCase(locale),
        })
      : t("venues.searchingTitle");

  // Artboard 4292: "Google ve Foursquare'den 3 kişinin yoluna göre sıralanıyor." Sağlayıcı adları
  // config'ten gelir (spec §11 — sağlayıcı başına kod dalı yok); kimliğin okunur adı i18n'de
  // yoksa cümle kurulmaz ve genel kopya basılır — var olmayan bir kaynak adı uydurulmaz.
  const sourceIds = (config?.sources ?? []).map((s) => s.id).filter((id): id is string => !!id);
  const named = sourceIds.every((id) => i18n.exists(`source.${id}`));
  const people = view?.participants?.length ?? 0;
  const copy =
    sourceIds.length > 0 && named && people > 0
      ? t("venues.searchingCopyFrom", {
          sources: new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
            sourceIds.map((id) => t(`source.${id}`)),
          ),
          count: people,
        })
      : t("venues.searchingCopy");

  return (
    // Liste gelince VenuesPage AYNI sözleşmeyi kullanır (kod incelemesi #9): SessionHeader
    // varsayılan (h2) + `Page wide` — başlık/kap ölçüsü liste gelirken atlamasın.
    <Page wide>
      <SessionHeader title={props.name ?? view?.name} meta={t("venues.searching")} />
      {/* Artboard `.f-mid` — beklerken ekranda duran TEK gerçek bilgi: orta nokta. */}
      {view && <MidpointCard view={view} />}
      <div role="status" aria-busy="true" className="flex flex-col items-center gap-1.5 py-1">
        <h2 className="text-center">{title}</h2>
        {/* Artboard `.cp` — ortalı, 13px. `Lead` sol-dayalı + 16px kalırdı; yeni prop yerine
            düz `<p>` (kod incelemesi #8). */}
        <p className="max-w-[30ch] text-center text-[0.8125rem] text-ink2">{copy}</p>
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
      {/* Artboard 4337: devre dışı `.cta` — liste gelince düğme yerinde belirir, düzen atlamaz. */}
      <MobileCta fade>
        <Button type="button" disabled>
          {t("venues.shuffle")}
        </Button>
      </MobileCta>
    </Page>
  );
}
