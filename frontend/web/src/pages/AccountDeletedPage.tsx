/* Artboard W18 · Hesap silindi — akışın son ekranı; hiçbir uç çağrılmaz. */
import { useTranslation } from "react-i18next";
import { HandNote, Heading, Lead, LinkButton, Page } from "../components/atoms";
import MapMark from "../components/molecules/MapMark";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
import OneZone from "../components/molecules/OneZone";
import PlainShell from "../components/organisms/PlainShell";

export default function AccountDeletedPage() {
  const { t } = useTranslation();
  return (
    <PlainShell>
      <Page center>
        {/* `MobileCta`nın `mt-auto`su boş alanı yutup sayfanın `justify-center`ını etkisiz
            bırakırdı; kalan alanı alan bu kap içeriği ortalar, CTA dipte kalır (ErrorPage ile
            aynı desen). */}
        <div className="flex flex-1 flex-col justify-center">
          <OneZone>
            {/* Artboard 5486: veda ekranının iğnesi SÖNÜK (`.mk-pin` ink3, gölgesiz) — marka
                gradyanı ve kırmızı gölge bu ekranda kutlama gibi okunuyordu. */}
            <MapMark muted />
            {/* Artboard 5488: başlık 26px — bu ekranda `display` (34/46px) fazla yüksek sesli. */}
            <Heading size="md" center>{t("del.doneTitle")}</Heading>
            <Lead>{t("del.doneCopy")}</Lead>
            <HandNote>{t("del.doneHand")}</HandNote>
            {/* Artboard 5492-5494: "Kapat" 390'da `.cta` bölgesinde TAM GENİŞLİK; masaüstünde
                (artboard'ı yok) akışta içerik genişliğinde kalır. */}
            <DesktopOnly><LinkButton href="/" kind="white" size="fit">{t("common.close")}</LinkButton></DesktopOnly>
          </OneZone>
        </div>
        <MobileCta>
          <LinkButton href="/" kind="white">{t("common.close")}</LinkButton>
        </MobileCta>
      </Page>
    </PlainShell>
  );
}
