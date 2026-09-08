/* Artboard W14/W15/W16 · yasal okuyucu — RequireAuth YOK, anonim erişilebilir (mağaza meta
   verisi herkese açık URL ister).
   Gövde ÜÇ DİLDE de tam yazılıdır (çeviri şeridi yok, 2026-09-07 kullanıcı düzeltmesi);
   `/data-rights`te rejim dile bağlıdır: TR = KVKK, EN/NL = GDPR. */
import { useTranslation } from "react-i18next";
import { Page } from "../components/atoms";
import LegalBlocks, { LegalMeta } from "../components/molecules/LegalBlocks";
import PageHeader from "../components/molecules/PageHeader";
import ReaderZone from "../components/molecules/ReaderZone";
import { LEGAL_DOCS, bodyFor, type LegalSlug } from "../content/legal";

export default function LegalPage({ slug }: { slug: LegalSlug }) {
  const { t, i18n } = useTranslation();
  const doc = LEGAL_DOCS[slug];
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(doc.updated));
  return (
    <Page>
      <PageHeader title={t(doc.titleKey)} size="reader" />
      <ReaderZone>
        <LegalMeta>{t("legal.updated", { date, version: doc.version })}</LegalMeta>
        <LegalBlocks blocks={bodyFor(doc.body, lang)} />
      </ReaderZone>
    </Page>
  );
}
