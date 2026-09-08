import { LegalBlocks } from "@bumpinto/web";

/* content/legal/privacy.ts ve dataRights.ts'in GERÇEK Türkçe metninden kesitler — üretilmiş
   Lorem değil. `ReaderZone`'un ölçüsü tekrarlandı (42rem, bkz. ReaderZone.tsx; barrel'dan
   export edilmediği için LegalPage/SupportPage'in gerçek sarmalayıcı genişliği burada
   elle kuruldu). Beş blok türünün hepsi iki hücreye dağıtıldı: h/table/p/link burada,
   note/ul SourceRow'un kardeşi VeriHaklariOzeti'nde. */
const READER = { width: "42rem" } as const;

/** privacy.ts'in gerçek gövdesi — başlık, tablo, paragraf, bağlantı blokları. */
export function GizlilikOzeti() {
  return (
    <div style={READER}>
      <LegalBlocks
        blocks={[
          { h: "Neyi topluyoruz" },
          { table: [
            ["Hesap", "Ad, e-posta, Google/Apple kimliği"],
            ["Konum", "Yalnız uygulama açıkken · ~1 km yuvarlanarak paylaşılır"],
            ["Ses", "Kaydedilmez; cihazlar arası doğrudan (P2P) akar"],
          ] },
          { h: "Kimlerle paylaşıyoruz" },
          { p: "Konumun ve görünen adın yalnızca aynı oturumdaki kişilerle paylaşılır. Mekan aramak için Google Places, Foursquare ve OpenStreetMap/Nominatim'e sorgu göndeririz; bu sorgularda kimliğin yer almaz." },
          { link: ["Sorun mu var: ", "hello@bumpinto.app", "mailto:hello@bumpinto.app"] },
        ]}
      />
    </div>
  );
}

/** dataRights.ts'in gerçek gövdesi — amber not, başlık, madde listesi. */
export function VeriHaklariOzeti() {
  return (
    <div style={READER}>
      <LegalBlocks
        blocks={[
          { note: "Bu metin aydınlatma amaçlıdır; açık rıza tercihlerin ayrı ekranda (Hesap → Açık rıza)." },
          { h: "İlgili kişinin hakları" },
          { ul: [
            "İşlenip işlenmediğini öğrenme",
            "Eksik/yanlış işlenmişse düzeltilmesini isteme",
            "Silinmesini veya yok edilmesini isteme",
          ] },
        ]}
      />
    </div>
  );
}
