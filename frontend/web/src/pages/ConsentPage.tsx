/* Artboard W13b / W16 sağ panel · KVKK m.5/1 · GDPR Art. 6(1)(a) açık rıza. Üç anahtar yerelde
   tutulur, "Kaydet" hepsini birlikte yazar (PUT /api/me/consents); başarısızlıkta sunucudaki
   değerlere dönülür — yarım kalmış rıza ekranda asla durmaz. */
import { ChartLine, MapPin, Microphone, Scroll as ScrollIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ErrorText, LinkButton, Page, Toggle } from "../components/atoms";
import LegalBlocks, { LegalMeta } from "../components/molecules/LegalBlocks";
import PageHeader from "../components/molecules/PageHeader";
import ReaderZone from "../components/molecules/ReaderZone";
import SettingRow from "../components/molecules/SettingRow";
import SettingsCard from "../components/molecules/SettingsCard";
import { consentsOf, useAuthStore } from "../store/authStore";

const ICON = 18;
type Key = "location" | "microphone" | "analytics";

export default function ConsentPage() {
  const { t, i18n } = useTranslation();
  const me = useAuthStore((s) => s.me);
  const saveConsents = useAuthStore((s) => s.saveConsents);
  const server = consentsOf(me);
  const [draft, setDraft] = useState(server);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;

  const stamp = me.consents?.updatedAt;
  const granted = stamp
    ? t("consent.granted", {
        date: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        }).format(new Date(stamp)),
        version: me.consents?.version ?? "1.0",
      })
    : t("consent.never");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveConsents(draft);
    } catch {
      setDraft(server); // geri al
      setError(t("consent.errSave"));
    } finally {
      setBusy(false);
    }
  }

  const row = (key: Key, icon: ReactNode) => (
    <SettingRow
      icon={icon}
      label={t(`consent.${key}`)}
      hint={t(`consent.${key}Hint`)}
      aside={<Toggle checked={draft[key]} label={t(`consent.${key}`)} disabled={busy}
        onChange={(next) => setDraft({ ...draft, [key]: next })} />}
    />
  );

  return (
    <Page>
      <PageHeader title={t("consent.title")} size="reader" />
      <ReaderZone>
        <LegalBlocks blocks={[{ p: t("consent.intro"), muted: true }]} />
        <SettingsCard label={t("consent.title")}>
          {row("location", <MapPin size={ICON} />)}
          {row("microphone", <Microphone size={ICON} />)}
          {row("analytics", <ChartLine size={ICON} />)}
        </SettingsCard>
        <LegalMeta>{granted}</LegalMeta>
        {/* Artboard 4906/5090: bu not KALICI bilgidir — konum anahtarı AÇIKKEN de basılır.
            Yalnız kapalıyken göstermek, kullanıcıya kapatmanın sonucunu KAPATMADAN ÖNCE
            söylemiyordu; rızanın "bilgilendirilmiş" olması tam da bunu gerektirir. */}
        <LegalBlocks blocks={[{ p: t("consent.locationOff"), muted: true }]} />
        <LinkButton href="/data-rights" kind="ghost" size="fit-sm">
          <ScrollIcon size={ICON} aria-hidden />
          {t("consent.readDataRights")}
        </LinkButton>
      </ReaderZone>
      {/* Artboard 4910–4912: `Kaydet` kaydırma alanının DIŞINDA, `.cta` bölgesinde tam genişlik.
          Uzun rıza metninde buton akışın sonunda kalıp ekran dışına düşüyordu. Tek düğüm
          basılır (mobil/masaüstü kopyası DEĞİL): `mt-auto` mobilde sayfa dibine iter, ≥1024'te
          okuma sütunuyla aynı genişlikte kalır (5091'de de tam genişlik `b-fl`). */}
      <div className="mt-auto flex flex-col gap-3 pt-1 lg:mx-auto lg:mt-4 lg:w-full lg:max-w-[44rem]">
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="button" disabled={busy} onClick={() => void save()}>{t("common.save")}</Button>
      </div>
    </Page>
  );
}
