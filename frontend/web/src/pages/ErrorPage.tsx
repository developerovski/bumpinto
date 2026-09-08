import { useTranslation } from "react-i18next";
import { Heading, LinkButton, Note, Page } from "../components/atoms";
import MapMark from "../components/molecules/MapMark";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
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
  const home = (size: "fit" | "md") => (
    <LinkButton href="/" kind="white" size={size}>{t("error.home")}</LinkButton>
  );
  return (
    <Page center>
      {/* `MobileCta`nın `mt-auto`su boş alanı tümüyle yutar ve sayfanın `justify-center`ını
          etkisiz bırakırdı; kalan alanı alan bu kap içeriği ortalar, CTA dipte kalır. */}
      <div className="flex flex-1 flex-col justify-center">
        <OneZone>
          <MapMark muted />
          <Heading center>{title}</Heading>
          {/* Artboard hiyerarşisi: gövde `.bd.m2` 16px (1280'de 17px, 2879), ipucu `.mi` 12px.
              İkisi de Note (13px) olunca ayrım kayboluyordu. Satır uzunluğu artboard'ın
              max-width'i: 28ch (390) / 36ch (1280). */}
          <p className="max-w-[28ch] text-center text-base leading-normal text-ink2 lg:max-w-[36ch] lg:text-[1.0625rem]">
            {body}
          </p>
          {/* Artboard ipucu `.mi` 12px (2857/2884). */}
          {hint && <Note center small>{hint}</Note>}
          {/* 390'da CTA `.cta` içinde tam genişlik sayfanın dibindedir (2884-2886); 1280'de
              içerik genişliğinde ve bölgenin akışında (2857). */}
          <DesktopOnly>{home("fit")}</DesktopOnly>
        </OneZone>
      </div>
      <MobileCta>{home("md")}</MobileCta>
    </Page>
  );
}
