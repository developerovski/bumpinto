import { useState } from "react";
import { ShieldCheck, ChartLine, DownloadSimple, Trash } from "@phosphor-icons/react";
import { SettingsCard, SettingRow, Toggle } from "@bumpinto/web";

/* AccountPage.tsx'in gerçek dört satır türü — hepsi `SettingsCard` içinde `<li>` olarak
   render olduğu için burada da öyle sarmalandı (çıplak `<li>` gerçek görünümü YANILTIR:
   `divide-y` ayracı ve kart kenarlığı yalnız `SettingsCard` içinde oluşur). */
const ICON = 18;
const WRAP = { width: "26rem" } as const;

/** `to` — bağlantı satırı, sağda ok. AccountPage "Gizlilik politikası" satırının birebiri. */
export function Baglanti() {
  return (
    <div style={WRAP}>
      <SettingsCard label="Yasal">
        <SettingRow icon={<ShieldCheck size={ICON} />} label="Gizlilik politikası" to="/privacy" />
      </SettingsCard>
    </div>
  );
}

/** `aside` — sağda `Toggle`, ok YOK (aside verilince caret düşer). AccountPage "Analitik" satırı,
    gerçek `useState` ile kontrollü. */
export function AnahtarliSatir() {
  const [on, setOn] = useState(true);
  return (
    <div style={WRAP}>
      <SettingsCard label="Veri">
        <SettingRow
          icon={<ChartLine size={ICON} />}
          label="Analitik"
          hint="Uygulamayı nasıl kullandığını anlamamıza yardım eder"
          aside={<Toggle checked={on} label="Analitik" onChange={setOn} />}
        />
      </SettingsCard>
    </div>
  );
}

/** `onClick` + `disabled` — eylem satırı, indirme sürerken (AccountPage `busy`) devre dışı. */
export function EylemMesgul() {
  return (
    <div style={WRAP}>
      <SettingsCard label="Veri">
        <SettingRow
          icon={<DownloadSimple size={ICON} />}
          label="Verilerimi indir"
          hint="JSON olarak indirilir"
          disabled
          onClick={() => {}}
        />
      </SettingsCard>
    </div>
  );
}

/** `danger` — tehlikeli bölge satırı, ikon + etiket kırmızı. AccountPage "Hesabı sil" satırı. */
export function Tehlikeli() {
  return (
    <div style={WRAP}>
      <SettingsCard danger label="Tehlikeli bölge">
        <SettingRow danger icon={<Trash size={ICON} />} label="Hesabı sil" hint="Bu işlem geri alınamaz" to="/account/delete" />
      </SettingsCard>
    </div>
  );
}
