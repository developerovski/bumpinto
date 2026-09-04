import { useTranslation } from "react-i18next";
import { Heading, LinkButton, Note, Page } from "../components/atoms";
import MapMark from "../components/molecules/MapMark";
import OneZone from "../components/molecules/OneZone";

type Kind = "notFound" | "expired" | "lost" | "decided";

/**
 * Artboard W10 · tek bölge, ortalanmış.
 *
 * `decided` bir HATA değil: karara bağlanmış bir buluşmanın linkine giren kişiye aynı düzen,
 * farklı dil. Önceden ona katılım formu gösteriliyordu ve gönderince 409 alıyordu — çıkmaz
 * sokak (K-W12). Nerede buluşulduğu burada YAZMAZ: davet linki yayılmış olabilir, karar
 * yalnızca oturumun üyelerine açıktır.
 */
export default function ErrorPage({ kind }: { kind: Kind }) {
  const { t } = useTranslation();
  const copy: Record<Kind, { title: string; body: string; hint: string | null }> = {
    notFound: { title: t("error.hmm"), body: t("session.notFound"), hint: t("error.notFoundHint") },
    expired: { title: t("error.hmm"), body: t("session.expired"), hint: t("error.expiredHint") },
    lost: { title: t("error.lostTitle"), body: t("error.lostCopy"), hint: null },
    decided: { title: t("session.decidedTitle"), body: t("session.decided"), hint: t("session.decidedHint") },
  };
  const { title, body, hint } = copy[kind];
  return (
    <Page center>
      <OneZone>
        <MapMark muted />
        <Heading center>{title}</Heading>
        <Note center>{body}</Note>
        {hint && <Note center>{hint}</Note>}
        <LinkButton href="/" kind="white" size="fit">{t("error.home")}</LinkButton>
      </OneZone>
    </Page>
  );
}
