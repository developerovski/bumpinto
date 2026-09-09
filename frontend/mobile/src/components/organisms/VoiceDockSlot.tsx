/**
 * Sesli sohbet dock'unun ekranlardaki YER TUTUCUSU — hiçbir şey çizmez.
 *
 * Dock'un kendisi oturum durum YÖNLENDİRİCİSİNDE (`app/s/[slug].tsx`) bir kez mount edilir,
 * ekranın KARDEŞİ olarak. Sebebi 2026-09-09'da emülatörde görüldü: bu slot beş ekranda da
 * `ScrollView`in İÇİNDE duruyor ve `position: absolute` orada görünüm alanına değil KAYDIRMA
 * İÇERİĞİNE tutunuyor — dock listenin dibine düşüyor, CTA'nın üstünde yüzmüyordu.
 *
 * Slot yine de duruyor: mesh ekran geçişlerinde ayakta kalır (spec §7) ve ekranlar dock'un
 * kapladığı alanı kendi alt boşluklarıyla ayırmayı sürdürür.
 */
export default function VoiceDockSlot(_p: { slug?: string }) {
  return null;
}
