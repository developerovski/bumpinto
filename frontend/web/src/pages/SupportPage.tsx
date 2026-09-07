/* Artboard W19 · Destek — RequireAuth YOK (Play destek e-postası + Apple Support URL herkese
   açık olmalı).
   İletişim YALNIZ e-posta (kullanıcı kararı, 2026-09-07): ad, telefon ve adres yayımlanmaz —
   destek ve iş birliği için e-posta yeterli. Planın dayandığı DSA m.30 pazaryerleri içindir,
   bize uygulanmaz; atıf kalktı. AB'de dağıtımda tacir adı/adresi zaten App Store ve Play
   listeleme sayfasında görünür, burada tekrarlanmasının kazancı yok. */
import { useTranslation } from "react-i18next";
import { Note, Overline, Page } from "../components/atoms";
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
        <Overline>{t("support.faqTitle")}</Overline>
        {FAQ.map((n) => <FaqItem key={n} question={t(`support.q${n}`)} answer={t(`support.a${n}`)} />)}
        <Overline>{t("support.contact")}</Overline>
        <LegalBlocks blocks={[
          /* Tek e-posta, tek yer: ayrı bir "E-posta gönder" butonu aynı adresi ikinci kez
             gösteriyordu. Tablo hücresi tıklanamadığı için satır `link` bloğu olarak basılır. */
          { link: [`${t("support.mEmail")}: `, "hello@bumpinto.app", "mailto:hello@bumpinto.app"] },
          { link: ["", t("support.deleteLink"), "/account/delete"] },
        ]} />
      </ReaderZone>
    </Page>
  );
}
