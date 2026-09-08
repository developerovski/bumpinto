/* Bir kişi = bir renk. Renk, kişinin O ANKİ LİSTEDEKİ sırasından değil, oturumun katılımcı
   listesindeki KANONİK sırasından çıkar (`SessionView.participants`, sunucuda joinedAt+id ile
   kararlı sıralı). Aynı kişi böylece avatar yığınında, harita pininde, roster satırında ve yol
   çubuğu noktasında AYNI rengi taşır — web'de de mobilde de.

   Neden burada: palet ve kanonik dizin TEK dosyada durur. Eskiden iki dosyada kopyaydı ve her
   çağıran kendi `map((p, i) => …)` sayacını geçiyordu; FİLTRELENMİŞ listelerde bu sayaç kanonik
   sıradan kayıyor, aynı kişi ekran değiştirince renk değiştiriyordu. Mobil (M-4) aynı paleti
   ikinci kez yazmasın diye modül `frontend/shared`'a alındı (2026-09-08 kullanıcı kararı);
   web `lib/personColor.ts` shim'i CSS gradyan dizesini bu çiftlerden üretir.

   Sınır: artboard dört avatar rengi tanımlıyor (`.avA`–`.avD`, tasarım 190-193). Beşinci
   katılımcıdan sonra renkler başa döner ve iki kişi aynı rengi paylaşabilir; o noktada ayırt
   edici yeniden ad olur (satırlarda tam ad, noktada `title`, ekran okuyucuda sr-only liste). */

/** Artboard `.avA` / `.avB` / `.avC` / `.avD` (190-193) — sıra ANLAMLIDIR, kanonik dizin bu
    diziye modulo ile düşer. İstemci renk çiftini kendi motoruna basar: web CSS
    `linear-gradient`, mobil `expo-linear-gradient`. */
export const PERSON_TINTS: readonly (readonly [string, string])[] = [
  ["#fd3e6b", "#d91e52"],
  ["#18b26b", "#0b7a44"],
  ["#7c4dff", "#5a2fd0"],
  ["#ffb020", "#e08900"],
];

/** Kanonik dizinden renk çifti. Negatif/eksik dizin ilk renge düşer (çağıran `findIndex` -1 dönebilir). */
export function personTint(index: number | undefined): readonly [string, string] {
  const i = index == null || index < 0 ? 0 : index;
  return PERSON_TINTS[i % PERSON_TINTS.length];
}

/** Kanonik listeden `id → dizin` haritası. Id'siz katılımcı (önizlemedeki anonim satırlar,
    SOLO'da elle eklenen noktalar) haritaya girmez — renkleri sıraya göre kalır. */
export function personIndexMap(participants: readonly { id?: string }[] | undefined | null) {
  const map: Record<string, number> = {};
  (participants ?? []).forEach((p, i) => {
    if (p.id) map[p.id] = i;
  });
  return map;
}

/** Tek bir kişinin kanonik dizini — liste elde ama harita kurmaya değmeyen çağıranlar için. */
export function personIndexOf(
  participants: readonly { id?: string }[] | undefined | null,
  id: string | undefined | null,
): number {
  if (!id) return 0;
  const i = (participants ?? []).findIndex((p) => p.id === id);
  return i < 0 ? 0 : i;
}
