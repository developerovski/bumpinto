import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { HandNote, Heading, Highlight, Lead, Page } from "../components/atoms";
import Confetti from "../components/molecules/Confetti";
import MapMark from "../components/molecules/MapMark";
import MobileCta from "../components/molecules/MobileCta";
import PolaroidFan from "../components/molecules/PolaroidFan";
import SignInBlock from "../components/molecules/SignInBlock";
import StepList from "../components/molecules/StepList";
import TwoZone from "../components/molecules/TwoZone";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useAuthStore } from "../store/authStore";

/** Artboard W0 · Landing — çıkış yapılmış kök; giriş burada. */
export default function Landing() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();
  useEffect(() => { if (status === "signed") navigate("/sessions", { replace: true }); }, [status, navigate]);
  // Artboard 390 (659-673): `.scroll` yalnız işaret + başlık + metni dikeyde ortalar, giriş bloğu
  // AYRI bir `.cta` olarak ekranın DİBİNE yapışır; 1280'de (620-623) aynı blok sol bölgenin son
  // çocuğudur. İki ayrı flex kabı olduğu için salt CSS ile taşınamaz. SessionsPage'in
  // MobileCta/DesktopOnly çifti bloğu İKİ KEZ basar; burada olmaz: GIS her örnekte yeniden
  // `initialize` eder (son geri çağrı kazanır) ve giriş hatası gizli kopyada görünmez kalırdı.
  // Bu yüzden TEK örnek genişliğe göre yer değiştirir — LobbyPage/NewSessionPage ile aynı desen.
  const desktop = useMediaQuery("(min-width: 1024px)");
  return (
    <Page variant="landing" center>
      <Confetti variant="landing" />
      {/* `.scroll` karşılığı: kalan yüksekliği alır ve içeriği ortalar; böylece `.cta` sayfanın
          dibine inerken üst blok ekranın ortasında kalır (yalnız `mt-auto` olsaydı üst blok
          tepeye yapışırdı — otomatik marj boşluğu `justify-center`den ÖNCE yutar). */}
      <div className="flex flex-1 flex-col justify-center">
        <TwoZone centerY rightLgOnly leftGap="md" rightGap="lg"
          left={<>
            <MapMark />
            <Heading size="hero"><Trans i18nKey="landing.title" components={[<Highlight key="0" />, <br key="1" />]} /></Heading>
            <Lead>{t("landing.copy")}</Lead>
            <HandNote>{t("landing.hand")}</HandNote>
            {desktop && <SignInBlock />}
          </>}
          right={<><PolaroidFan /><StepList /></>}
        />
      </div>
      {!desktop && <MobileCta><SignInBlock /></MobileCta>}
    </Page>
  );
}
