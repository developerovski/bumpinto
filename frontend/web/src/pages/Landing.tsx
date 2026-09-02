import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { HandNote, Heading, Highlight, Lead, Page } from "../components/atoms";
import Confetti from "../components/molecules/Confetti";
import MapMark from "../components/molecules/MapMark";
import PolaroidFan from "../components/molecules/PolaroidFan";
import SignInBlock from "../components/molecules/SignInBlock";
import StepList from "../components/molecules/StepList";
import TwoZone from "../components/molecules/TwoZone";
import { useAuthStore } from "../store/authStore";

/** Artboard W0 · Landing — çıkış yapılmış kök; giriş burada. */
export default function Landing() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();
  useEffect(() => { if (status === "signed") navigate("/sessions", { replace: true }); }, [status, navigate]);
  return (
    <Page variant="landing" center>
      <Confetti variant="landing" />
      <TwoZone centerY rightLgOnly leftGap="md" rightGap="lg"
        left={<>
          <MapMark />
          <Heading size="hero"><Trans i18nKey="landing.title" components={[<Highlight key="0" />, <br key="1" />]} /></Heading>
          <Lead>{t("landing.copy")}</Lead>
          <HandNote>{t("landing.hand")}</HandNote>
          <SignInBlock />
        </>}
        right={<><PolaroidFan /><StepList /></>}
      />
    </Page>
  );
}
