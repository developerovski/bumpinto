import { useEffect, useRef } from "react";
import { FaqItem } from "@bumpinto/web";

/* SupportPage.tsx'in gerçek FAQ listesinden ilk iki soru — `support.q1/a1`, `support.q2/a2`
   (bkz. i18n/locales/tr.json). `<details>` yerel bir öğe; "açık" hâli PROP değil, gerçek
   tıklamayla gösteriliyor (bkz. AcikSoru). */
const WRAP = { display: "flex", flexDirection: "column", gap: "0.625rem", width: "26rem" } as const;

/** Varsayılan — iki soru da kapalı, yalnız soru metni + kapalı ok görünür. */
export function Kapali() {
  return (
    <div style={WRAP}>
      <FaqItem
        question="Konumum neden yaklaşık gösteriliyor?"
        answer="Konumun ~1 km yuvarlanarak paylaşılır: orta noktayı adil hesaplamaya yeter, adresini ele vermez."
      />
      <FaqItem
        question="Arkadaşım linke tıklayınca ne görür?"
        answer="Buluşmanın adını, etkinliğini ve katılanların görünen adlarını. Uygulama indirmeden, hesapsız katılır."
      />
    </div>
  );
}

/** İlk soru gerçek tıklamayla açılmış — `<summary>`'ye `ref` + `useEffect` içinde `.click()`,
    markup taklit edilmiyor (NOTES §9 tekniği). İkinci soru kapalı kalarak karşılaştırma sağlıyor. */
export function AcikSoru() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("summary")?.click();
  }, []);
  return (
    <div ref={ref} style={WRAP}>
      <FaqItem
        question="Sesli sohbet kaydediliyor mu?"
        answer="Hayır. Ses cihazlar arasında doğrudan (P2P) akar ve hiçbir yere kaydedilmez."
      />
      <FaqItem
        question="Verilerimi nasıl silerim?"
        answer="Hesap ve veriler → Hesabı sil. Uygulama kurulu olmasa da bumpinto.app/account/delete adresinden yapabilirsin."
      />
    </div>
  );
}
