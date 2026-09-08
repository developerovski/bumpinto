/* Artboard W13 · Hesap ve veriler — sol: Yasal / Veri / Hakkında / Tehlikeli bölge,
   sağ: kimlik kartı + saklama notu + çıkış. Play "hesap yönetimi" ve Apple 5.1.1
   gizlilik erişimi bu ekrandan sağlanır. */
import {
  ChartLine, DownloadSimple, FileText, Lifebuoy, MapTrifold, Scroll as ScrollIcon,
  ShieldCheck, SignOut, ToggleRight, Trash,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, ErrorText, Note, Overline, Page, Toggle } from "../components/atoms";
import IdentityCard from "../components/molecules/IdentityCard";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
import PageHeader from "../components/molecules/PageHeader";
import SettingRow from "../components/molecules/SettingRow";
import SettingsCard from "../components/molecules/SettingsCard";
import TwoZone from "../components/molecules/TwoZone";
import { api } from "../lib/api";
import { consentsOf, useAuthStore } from "../store/authStore";

const ICON = 18;

export default function AccountPage() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.me);
  const updatePrefs = useAuthStore((s) => s.updatePrefs);
  const saveConsents = useAuthStore((s) => s.saveConsents);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  // Anahtar iyimser çizilir; yazma düşerse `pending` bırakılır ve sunucu değeri geri gelir.
  const [pending, setPending] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  const analytics = pending ?? consentsOf(me).analytics;

  async function toggleAnalytics(next: boolean) {
    setPending(next);
    setError(null);
    try {
      await saveConsents({ analytics: next });
    } catch {
      setError(t("account.errConsent"));
    } finally {
      setPending(null);
    }
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const blob = await api.exportMyData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bumpinto-verilerim.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      setError(t(status === 429 ? "account.errExportRate" : "account.errExport"));
    } finally {
      setBusy(false);
    }
  }

  const logoutButton = (size: "fit" | "md") => (
    <Button type="button" kind="danger" size={size}
      onClick={() => void logout().catch(() => undefined).finally(() => navigate("/"))}>
      <SignOut size={ICON} aria-hidden />
      {t("profile.logout")}
    </Button>
  );

  return (
    <Page>
      <PageHeader title={t("account.title")} size="reader" />
      <TwoZone
        left={<>
          <Overline>{t("account.legal")}</Overline>
          <SettingsCard label={t("account.legal")}>
            <SettingRow icon={<ShieldCheck size={ICON} />} label={t("legal.privacy")} to="/privacy" />
            <SettingRow icon={<FileText size={ICON} />} label={t("legal.terms")} to="/terms" />
            <SettingRow icon={<ScrollIcon size={ICON} />} label={t("legal.dataRights")} to="/data-rights" />
            <SettingRow icon={<ToggleRight size={ICON} />} label={t("account.consent")} to="/account/consent" />
          </SettingsCard>
          <Overline>{t("account.data")}</Overline>
          <SettingsCard label={t("account.data")}>
            <SettingRow icon={<ChartLine size={ICON} />} label={t("account.analytics")} hint={t("account.analyticsHint")}
              aside={<Toggle checked={analytics} label={t("account.analytics")} onChange={(n) => void toggleAnalytics(n)} />} />
            <SettingRow icon={<DownloadSimple size={ICON} />} label={t("account.export")} hint={t("account.exportHint")}
              disabled={busy} onClick={() => void download()} />
          </SettingsCard>
          {error && <ErrorText>{error}</ErrorText>}
          <Overline>{t("account.about")}</Overline>
          <SettingsCard label={t("account.about")}>
            {/* Artboard 4762–4767: `Hakkında` kartı İKİ satır taşır, atıf satırı destekten ÖNCE.
                Sağlayıcı atfı yalnız veri ekranlarında değil kalıcı bir sayfada da bulunmalı
                (Google Haritalar Ek Hizmet Şartları / Foursquare / ODbL). */}
            <SettingRow icon={<MapTrifold size={ICON} />} label={t("account.attributions")} to="/attributions" />
            <SettingRow icon={<Lifebuoy size={ICON} />} label={t("account.support")} to="/support" />
          </SettingsCard>
          <Overline>{t("account.danger")}</Overline>
          <SettingsCard danger label={t("account.danger")}>
            <SettingRow danger icon={<Trash size={ICON} />} label={t("account.delete")}
              hint={t("account.deleteHint")} to="/account/delete" />
          </SettingsCard>
        </>}
        right={<>
          <IdentityCard me={me} onSaveName={(displayName) => updatePrefs({ displayName })} />
          <Note card>{t("profile.retention")}</Note>
          <DesktopOnly>{logoutButton("fit")}</DesktopOnly>
        </>}
      />
      <MobileCta>{logoutButton("md")}</MobileCta>
    </Page>
  );
}
