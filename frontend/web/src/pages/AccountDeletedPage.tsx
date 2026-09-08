/* Artboard W18 · Hesap silindi — akışın son ekranı; hiçbir uç çağrılmaz. */
import { useTranslation } from "react-i18next";
import { HandNote, Heading, Lead, LinkButton, Page } from "../components/atoms";
import MapMark from "../components/molecules/MapMark";
import OneZone from "../components/molecules/OneZone";
import PlainShell from "../components/organisms/PlainShell";

export default function AccountDeletedPage() {
  const { t } = useTranslation();
  return (
    <PlainShell>
      <Page center>
        <OneZone>
          {/* Artboard 5486: veda ekranının iğnesi SÖNÜK (`.mk-pin` ink3, gölgesiz) — marka
              gradyanı ve kırmızı gölge bu ekranda kutlama gibi okunuyordu. */}
          <MapMark muted />
          <Heading>{t("del.doneTitle")}</Heading>
          <Lead>{t("del.doneCopy")}</Lead>
          <HandNote>{t("del.doneHand")}</HandNote>
          <LinkButton href="/" kind="white" size="fit">{t("common.close")}</LinkButton>
        </OneZone>
      </Page>
    </PlainShell>
  );
}
