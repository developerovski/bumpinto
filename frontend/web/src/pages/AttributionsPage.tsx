/* Artboard W17 · Atıflar ve lisanslar (5149–5229) — RequireAuth YOK: çerçevede avatar yok
   (5152–5155), atıf yükümlülüğü girişten bağımsızdır ve mağaza listelemesi bu URL'yi anonim
   erişilebilir ister.
   "Mekan ve harita verisi" bölümü VERİ-GÜDÜMLÜ: satırlar `/api/config.sources[]`ten gelir,
   sağlayıcı başına kod dalı YOKTUR (Attribution.tsx ile aynı sözleşme). Uç bilmediğimiz bir
   kaynak döndürürse ad olarak id basılır, açıklama basılmaz — uydurma metin yok. Config hiç
   gelmediyse bölüm hiç basılmaz: yanlış/eksik atıf basmaktansa hiç basma (Attribution.tsx:15).
   "Açık kaynak" listesi statiktir ve BU paketin bağımlılıklarıdır (`web/package.json` + üç
   yazı tipi); mobil bağımlılıklar (Expo, react-native-webrtc) mobil uygulamanın listesindedir. */
import { useTranslation } from "react-i18next";
import { Overline, Page } from "../components/atoms";
import LegalBlocks from "../components/molecules/LegalBlocks";
import PageHeader from "../components/molecules/PageHeader";
import ReaderZone from "../components/molecules/ReaderZone";
import SettingsCard from "../components/molecules/SettingsCard";
import SourceRow from "../components/molecules/SourceRow";
import { useConfigStore } from "../store/configStore";

/** [kütüphane, lisans] — lisans kısaltmaları özel addır, çevrilmez. */
const OPEN_SOURCE: [string, string][] = [
  ["React", "MIT"],
  ["Vite", "MIT"],
  ["Phosphor Icons", "MIT"],
  ["Bricolage Grotesque", "OFL 1.1"],
  ["Figtree", "OFL 1.1"],
  ["Caveat", "OFL 1.1"],
];

export default function AttributionsPage() {
  const { t } = useTranslation();
  // `load` BURADA çağrılmaz: config'i açılışta main.tsx bir kez ister ve SPA girişi her URL
  // için çalışır — derin bağlantı da dahil (Attribution.tsx ile aynı okuma deseni).
  const config = useConfigStore((s) => s.config);
  const sources = config?.sources ?? [];

  return (
    <Page>
      <PageHeader title={t("attribution.pageTitle")} size="reader" />
      <ReaderZone>
        {sources.length > 0 && (
          <>
            <Overline>{t("attribution.mapData")}</Overline>
            <SettingsCard label={t("attribution.mapData")}>
              {sources.map((s) => (
                <SourceRow
                  key={s.id}
                  label={t(`attribution.name.${s.id}`, { defaultValue: s.id })}
                  hint={t(`attribution.desc.${s.id}`, { defaultValue: "" }) || undefined}
                  href={s.attributionUrl}
                  aside={t(s.attributionKey)}
                />
              ))}
            </SettingsCard>
            <LegalBlocks blocks={[{ p: t("attribution.everywhere"), muted: true }]} />
          </>
        )}
        <Overline>{t("attribution.openSource")}</Overline>
        <SettingsCard label={t("attribution.openSource")}>
          {OPEN_SOURCE.map(([name, license]) => (
            <SourceRow key={name} label={name} aside={license} />
          ))}
        </SettingsCard>
      </ReaderZone>
    </Page>
  );
}
