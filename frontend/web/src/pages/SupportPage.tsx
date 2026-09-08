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
import SettingsCard from "../components/molecules/SettingsCard";

const FAQ = ["1", "2", "3", "4"] as const;

export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader title={t("legal.support")} size="reader" />
      <ReaderZone>
        {/* Artboard 5382–5383 / 5431–5432: kart içinde `.h3` başlık + ALTINDA `.mi` satırı.
            İkisi tek 13px paragrafta " — " ile birleşikken kartın hiyerarşisi yoktu. */}
        <div className="flex flex-col gap-1 rounded-card border border-line bg-card p-[1.375rem] shadow-sh1">
          <h3>{t("support.cardTitle")}</h3>
          <Note>{t("support.cardHint")}</Note>
        </div>
        <Overline>{t("support.faqTitle")}</Overline>
        {/* Artboard 5390/5440: dört soru AYRI kartlar değil, tek kartın ayraçlı satırlarıdır. */}
        <SettingsCard label={t("support.faqTitle")}>
          {FAQ.map((n) => <FaqItem key={n} question={t(`support.q${n}`)} answer={t(`support.a${n}`)} />)}
        </SettingsCard>
        <Overline>{t("support.contact")}</Overline>
        <LegalBlocks blocks={[
          /* Tek e-posta, tek yer: ayrı bir "E-posta gönder" butonu aynı adresi ikinci kez
             gösteriyordu. Tablo hücresi tıklanamadığı için satır `link` bloğu olarak basılır. */
          { link: [`${t("support.mEmail")}: `, "hello@bumpinto.app", "mailto:hello@bumpinto.app"] },
        ]} />
        {/* Artboard 5412-5414: silme bağlantısı KENDİ beyaz kartında durur (`.card` + `.mi`) —
            düz paragraf olarak iletişim metnine karışıyordu. */}
        <div className="rounded-card border border-line bg-card p-[1rem_1.125rem] shadow-sh1">
          <LegalBlocks blocks={[{ link: ["", t("support.deleteLink"), "/account/delete"] }]} />
        </div>
      </ReaderZone>
    </Page>
  );
}
