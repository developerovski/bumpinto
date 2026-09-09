/* Karar ekranının aksiyon şeridi (artboard W8 2565–2571 / 2643–2650): TEK satır —
   `Yol tarifi al` (flame) · `Takvime ekle` · `Kartı paylaş` · `Google Maps'te aç` (ghost) ·
   atıf çipi. 390'da yol tarifi ekranın dibindeki `.cta`ya taşınır (`ResultScreen` → `MobileCta`),
   bu yüzden buradaki flame düğme `DesktopOnly`dir; metin paylaşımı ("Gruba paylaş") 1280'de HİÇ
   yok, 390'da oturum başlığının yanındaki ikon (rapor I · P2-7, P2-B1, P1-B1).

   Offscreen `ShareCard`, "Kartı paylaş" ilk tıklanana kadar MOUNT edilmez (`cardReady`): görünmez
   olsa da metni gerçek DOM'a basar (adres, dakikalar, "Ortak nokta" vb.) ve `getByText` bunu
   `aria-hidden`e bakmadan eşleştirir — kalıcı mount, ResultScreen'in kendi görünür metniyle
   birebir aynı dizeleri ikiye katlayıp mevcut testleri (`getAllByText` uzunluk 1 varsayımları)
   kırardı. `getFile` render'dan SONRA `toBlob` çağırabilsin diye mount'u tetikleyip bir
   `requestAnimationFrame` bekler (shareCard.ts başlığına bkz.). */
import { CalendarPlus, MapPin, NavigationArrow } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView, VenueDto } from "@bumpinto/shared";
import { attributionProviders } from "@bumpinto/shared";
import { probePhoto, renderShareCard } from "../../lib/shareCard";
import { venueLink, websiteLink } from "../../lib/venueLink";
import { Button, LinkButton } from "../atoms";
import Attribution from "./Attribution";
import MeetTimeDialog from "./MeetTimeDialog";
import { DesktopOnly } from "./MobileCta";
import ShareButton from "./ShareButton";
import ShareCard from "./ShareCard";

/* Artboard 2644: 390'da iki beyaz düğme satırı EŞİT paylaşır (`flex:1;min-height:44px`, 14px);
   1280'de ikisi de içerik genişliğinde `.btn.fit` (52px/16px) olur. Ölçü ezmesi `max-lg:` ile —
   `size="fit"`in eksiz `min-h`/`text` sınıflarını varyantlı sınıf her zaman yener. */
const PAIR = "flex-1 max-lg:min-h-[2.75rem] max-lg:px-4 max-lg:text-[0.875rem] lg:flex-none";

export default function ResultActions(props: {
  view: SessionView;
  venue: VenueDto;
  shareText: string;
  shareUrl: string;
}) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const slug = props.view.slug ?? "";
  // Tek href kaynağı (`venueLink` başlığı: HER ZAMAN koordinat tabanlı yol tarifi). href yoksa
  // düğme HİÇ render edilmez (ölü href="#" olmaz).
  const href = venueLink(props.venue);
  const site = websiteLink(props.venue);

  async function getFile() {
    setCardReady(true);
    setPhoto(await probePhoto(props.venue.photoUrl));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const node = cardRef.current;
    if (!node) return null;
    const blob = await renderShareCard(node);
    return blob ? { blob, fileName: t("share.fileName", { slug }) } : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 lg:gap-3">
      {href && (
        // 390'da aynı düğme `MobileCta` içinde basılır — iki kopya aynı anda görünmez.
        <DesktopOnly>
          <LinkButton href={href} target="_blank" rel="noreferrer" kind="flame" size="fit">
            <NavigationArrow size={18} aria-hidden />
            {t("result.directions")}
          </LinkButton>
        </DesktopOnly>
      )}
      <Button type="button" kind="white" size="fit" className={PAIR} onClick={() => setCalendar(true)}>
        <CalendarPlus size={18} aria-hidden />
        {t("calendar.add")}
      </Button>
      <ShareButton
        mode="file"
        getFile={getFile}
        text={props.shareText}
        url={props.shareUrl}
        label={t("share.card")}
        size="fit"
        className={PAIR}
      />
      {href && (
        // Artboard `.btn.b-gh.fit` — inline ghost bağlantı, tam genişlik pill DEĞİL.
        <LinkButton href={href} target="_blank" rel="noreferrer" kind="ghost" size="fit">
          <MapPin size={18} aria-hidden />
          {t("venue.openInMaps")}
        </LinkButton>
      )}
      {site && (
        <a
          href={site}
          target="_blank"
          rel="noreferrer"
          className="text-[0.75rem] text-ink2 underline underline-offset-2 hover:text-ink"
        >
          {t("venue.website")}
        </a>
      )}
      {/* Artboard `.f-attr` — atıf düğmelerle AYNI satırda, yatay çip. */}
      <Attribution providers={attributionProviders([props.venue])} row />
      {cardReady && (
        <ShareCard nodeRef={cardRef} venue={props.venue} participants={props.view.participants ?? []} photo={photo} />
      )}
      {calendar && (
        <MeetTimeDialog
          venue={props.venue}
          sessionName={props.view.name}
          slug={slug}
          decidedAt={props.view.decidedAt}
          onClose={() => setCalendar(false)}
        />
      )}
    </div>
  );
}
