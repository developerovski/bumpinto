/* Artboard W19 · Destek — RequireAuth YOK (Play destek e-postası + Apple Support URL herkese
   açık olmalı).
   İletişim bloğu ad + e-posta ile SINIRLI (kullanıcı kararı, 2026-09-07): telefon/adres
   yayımlanmaz. Planın dayandığı DSA m.30 pazaryerleri içindir, bize uygulanmaz — atıf kalktı.
   AB'de dağıtımda tacir adı/adresi/telefonu zaten App Store ve Play listeleme sayfasında
   görünür; burada tekrarlanmasının bir kazancı yok. */
import { EnvelopeSimple } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { LinkButton, Note, Overline, Page } from "../components/atoms";
import FaqItem from "../components/molecules/FaqItem";
import LegalBlocks from "../components/molecules/LegalBlocks";
import PageHeader from "../components/molecules/PageHeader";
import ReaderZone from "../components/molecules/ReaderZone";

const FAQ = ["1", "2", "3", "4"] as const;

export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader title={t("legal.support")} />
      <ReaderZone>
        <Note card>{t("support.cardTitle")} — {t("support.cardHint")}</Note>
        <LinkButton href="mailto:hello@bumpinto.app" size="fit">
          <EnvelopeSimple size={18} aria-hidden />
          {t("support.email")}
        </LinkButton>
        <Overline>{t("support.faqTitle")}</Overline>
        {FAQ.map((n) => <FaqItem key={n} question={t(`support.q${n}`)} answer={t(`support.a${n}`)} />)}
        <Overline>{t("support.merchant")}</Overline>
        <LegalBlocks blocks={[
          { table: [
            [t("support.mName"), "BumpInto (Mehmet Şerefoğlu)"],
            [t("support.mEmail"), "hello@bumpinto.app"],
          ] },
          { link: ["", t("support.deleteLink"), "/account/delete"] },
        ]} />
      </ReaderZone>
    </Page>
  );
}
