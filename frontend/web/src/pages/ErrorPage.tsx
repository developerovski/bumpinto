import { useTranslation } from "react-i18next";
import { Heading, LinkButton, Note, Page } from "../components/atoms";
import MapMark from "../components/molecules/MapMark";
import OneZone from "../components/molecules/OneZone";

type Kind = "notFound" | "expired" | "lost";

/** Artboard W10 · tek bölge, ortalanmış. */
export default function ErrorPage({ kind }: { kind: Kind }) {
  const { t } = useTranslation();
  const title = kind === "lost" ? t("error.lostTitle") : t("error.hmm");
  const copy = kind === "notFound" ? t("session.notFound") : kind === "expired" ? t("session.expired") : t("error.lostCopy");
  const hint = kind === "notFound" ? t("error.notFoundHint") : kind === "expired" ? t("error.expiredHint") : null;
  return (
    <Page center>
      <OneZone>
        <MapMark muted />
        <Heading center>{title}</Heading>
        <Note center>{copy}</Note>
        {hint && <Note center>{hint}</Note>}
        <LinkButton href="/" kind="white" size="fit">{t("error.home")}</LinkButton>
      </OneZone>
    </Page>
  );
}
