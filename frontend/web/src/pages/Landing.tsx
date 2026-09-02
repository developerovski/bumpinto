import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { HandNote, Heading, Highlight, Note, Page } from "../components/atoms";
import GoogleSignIn from "../components/molecules/GoogleSignIn";
import MapMark from "../components/molecules/MapMark";
import PolaroidFan from "../components/molecules/PolaroidFan";
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
    <Page center>
      <TwoZone centerY rightLgOnly
        left={<>
          <MapMark />
          <Heading><Trans i18nKey="landing.title" components={[<Highlight key="0" />, <br key="1" />]} /></Heading>
          <Note>{t("landing.copy")}</Note>
          <HandNote>{t("landing.hand")}</HandNote>
          <GoogleSignIn />
          <Note><Trans i18nKey="landing.terms" components={[<a key="0" href="/terms" />]} /></Note>
        </>}
        right={<><PolaroidFan /><StepList /></>}
      />
    </Page>
  );
}
