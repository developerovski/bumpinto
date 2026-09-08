import { SourceRow } from "@bumpinto/web";

/* Barrel'da var ama HENÜZ hiçbir sayfaya bağlanmamış (grep: yalnız kendi kaynak dosyası
   eşleşiyor) — bu yüzden gerçek bir kompozisyon kaynağı yok. İçerik privacy.ts'in gerçek
   sağlayıcı listesinden kuruldu: "Google Places, Foursquare ve OpenStreetMap/Nominatim'e
   sorgu göndeririz" (bkz. content/legal/privacy.ts, "Kimlerle paylaşıyoruz"). Muhtemel
   kullanım yeri: bir "Hakkında / Atıflar" listesi (component.tsx'in kendi yorumu: "W17 ·
   atıf satırı"). Satır tek başına anlamsız — gerçek gibi bir liste içinde gösteriliyor. */
const LIST = { display: "flex", flexDirection: "column", width: "26rem" } as const;

/** Dış bağlantılı + lisans etiketi — harita verisi atfı, gerçek uygulamanın OSM/Nominatim
    kullanımına karşılık gelir. `aside` lisans kısaltmasını taşıyor. */
export function HaritaAtfi() {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-card border border-line bg-card p-0 shadow-sh1" style={LIST}>
      <SourceRow
        label="OpenStreetMap katkıda bulunanları"
        hint="Harita verisi ve adres çözümleme (Nominatim)"
        href="https://www.openstreetmap.org/copyright"
        aside="ODbL"
      />
      <SourceRow label="Foursquare" hint="Mekan bilgisi, saat ve puanlar" aside="API" />
      <SourceRow label="Google Places" hint="Mekan arama ve doğrulama" />
    </ul>
  );
}
