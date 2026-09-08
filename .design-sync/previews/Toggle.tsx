import { useState } from "react";
import { Toggle } from "@bumpinto/web";

/* AccountPage/ConsentPage'in gerçek kullanımı: `role="switch"`, etiket her zaman `SettingRow`
   içinde `aside` olarak geçiyor (bkz. AccountPage.tsx "account.analytics",
   ConsentPage.tsx "consent.location"). Burada atomun kendisi izole ediliyor;
   `SettingRow`/`SettingsCard` preview'ları aynı ikiliyi gerçek satır içinde gösteriyor. */
const ROW = { display: "flex", alignItems: "center", gap: "0.75rem", width: "18rem" } as const;
const LABEL = { fontSize: "0.875rem", color: "var(--color-ink)" } as const;

/** Açık — gerçek tıklamayla değil, `useState` ile kontrollü (ekran görüntüsü statik olduğu
    için tek bir kare yeterli; bileşenin kendisi controlled). Analitik izni açık örneği. */
export function Acik() {
  const [checked, setChecked] = useState(true);
  return (
    <div style={ROW}>
      <Toggle checked={checked} label="Analitik" onChange={setChecked} />
      <span style={LABEL}>Analitik</span>
    </div>
  );
}

/** Kapalı — konum izni kapalı örneği (ConsentPage'in "consent.location" satırı). */
export function Kapali() {
  const [checked, setChecked] = useState(false);
  return (
    <div style={ROW}>
      <Toggle checked={checked} label="Konum" onChange={setChecked} />
      <span style={LABEL}>Konum</span>
    </div>
  );
}

/** Devre dışı — `disabled:opacity-45`, kaydetme sürerken (ConsentPage `busy`) tıklanamaz. */
export function DevreDisi() {
  return (
    <div style={ROW}>
      <Toggle checked disabled label="Mikrofon" onChange={() => {}} />
      <span style={LABEL}>Mikrofon</span>
    </div>
  );
}
