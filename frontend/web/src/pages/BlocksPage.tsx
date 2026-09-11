/* K-W16 · Engellenen kişiler — /account/blocks. Artboard YOK: W13–W20 taraması (2026-09-11)
   yalnız engel EKLEMEYİ (W20) çiziyor. Yeni görsel dil icat edilmedi; W13'ün okuyucu başlığı
   ve `.card` satırları (SettingsCard/SettingRow) kullanılır. Onay diyaloğu yok: başarıda satır
   listeden düşer, hata satırların altında basılır. */
import { Prohibit } from "@phosphor-icons/react";
import type { BlockDto } from "@bumpinto/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ErrorText, Note, Page } from "../components/atoms";
import PageHeader from "../components/molecules/PageHeader";
import ReaderZone from "../components/molecules/ReaderZone";
import SettingRow from "../components/molecules/SettingRow";
import SettingsCard from "../components/molecules/SettingsCard";
import { api } from "../lib/api";

const ICON = 18;

export default function BlocksPage() {
  const { t, i18n } = useTranslation();
  const [blocks, setBlocks] = useState<BlockDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.listBlocks()
      .then((rows) => { if (live) setBlocks(rows); })
      .catch(() => { if (live) setError(t("blocks.errLoad")); });
    return () => { live = false; };
  }, [t]);

  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    day: "numeric", month: "short", year: "numeric",
  });

  async function unblock(id: string) {
    setRemoving(id);
    setError(null);
    try {
      await api.removeBlock(id);
      setBlocks((rows) => rows?.filter((b) => b.id !== id) ?? rows);
    } catch {
      setError(t("blocks.errRemove"));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Page>
      <PageHeader title={t("blocks.title")} size="reader" />
      <ReaderZone>
        {blocks === null ? (
          !error && <Note>{t("blocks.loading")}</Note>
        ) : blocks.length === 0 ? (
          <Note card>{t("blocks.empty")}</Note>
        ) : (
          <SettingsCard label={t("blocks.title")}>
            {blocks.map((b) => (
              <SettingRow
                key={b.id}
                icon={<Prohibit size={ICON} />}
                label={b.displayName ?? t("blocks.unnamed")}
                hint={b.createdAt ? t("blocks.since", { date: date.format(new Date(b.createdAt)) }) : undefined}
                aside={
                  <Button type="button" kind="white" size="xs" disabled={removing !== null}
                    onClick={() => { if (b.id) void unblock(b.id); }}>
                    {t("blocks.remove")}
                  </Button>
                }
              />
            ))}
          </SettingsCard>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </ReaderZone>
    </Page>
  );
}
