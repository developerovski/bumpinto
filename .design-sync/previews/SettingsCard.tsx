import { ShieldCheck, FileText, Scroll, ToggleRight, Trash } from "@phosphor-icons/react";
import { SettingsCard, SettingRow } from "@bumpinto/web";

/* AccountPage.tsx'in gerçek iki grubu: "Yasal" (4 satır, düz) ve "Tehlikeli bölge"
   (1 satır, `danger`). Kartın kendisi yalnız kap + `divide-y` ayracı; asıl içerik satırlarda. */
const ICON = 18;
const WRAP = { width: "26rem" } as const;

/** Düz grup — AccountPage "Yasal" bölümünün birebiri: 4 bağlantı satırı, tek ayraç rengi. */
export function YasalGrubu() {
  return (
    <div style={WRAP}>
      <SettingsCard label="Yasal">
        <SettingRow icon={<ShieldCheck size={ICON} />} label="Gizlilik politikası" to="/privacy" />
        <SettingRow icon={<FileText size={ICON} />} label="Kullanım şartları" to="/terms" />
        <SettingRow icon={<Scroll size={ICON} />} label="Veri hakların" to="/data-rights" />
        <SettingRow icon={<ToggleRight size={ICON} />} label="Açık rıza" to="/account/consent" />
      </SettingsCard>
    </div>
  );
}

/** `danger` — kenarlık ve satır rengi kırmızıya döner; AccountPage "Tehlikeli bölge". */
export function TehlikeliGrup() {
  return (
    <div style={WRAP}>
      <SettingsCard danger label="Tehlikeli bölge">
        <SettingRow danger icon={<Trash size={ICON} />} label="Hesabı sil" hint="Bu işlem geri alınamaz" to="/account/delete" />
      </SettingsCard>
    </div>
  );
}
