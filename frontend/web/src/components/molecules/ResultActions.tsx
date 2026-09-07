/* Karar ekranının aksiyon şeridi (W8/W9): takvime ekle + kart paylaş (PNG) + link paylaş (metin).
   Offscreen `ShareCard`, "Kartı paylaş" ilk tıklanana kadar MOUNT edilmez (`cardReady`): görünmez
   olsa da metni gerçek DOM'a basar (adres, dakikalar, "Ortak nokta" vb.) ve `getByText` bunu
   `aria-hidden`e bakmadan eşleştirir — kalıcı mount, ResultScreen'in kendi görünür metniyle
   birebir aynı dizeleri ikiye katlayıp mevcut testleri (`getAllByText` uzunluk 1 varsayımları)
   kırardı. `getFile` render'dan SONRA `toBlob` çağırabilsin diye mount'u tetikleyip bir
   `requestAnimationFrame` bekler (shareCard.ts başlığına bkz.). */
import { CalendarPlus } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView, VenueDto } from "@bumpinto/shared";
import { probePhoto, renderShareCard } from "../../lib/shareCard";
import { Button } from "../atoms";
import MeetTimeDialog from "./MeetTimeDialog";
import ShareButton from "./ShareButton";
import ShareCard from "./ShareCard";

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
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" kind="white" size="fit" onClick={() => setCalendar(true)}>
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
      />
      <ShareButton text={props.shareText} url={props.shareUrl} size="fit" />
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
