/**
 * Sesli sohbet dock'u için YER TUTUCU — hiçbir şey çizmez.
 *
 * Gerçek dock M-6'da (R-M10, plan40) buraya gelir; yeri CTA'nın üstüdür
 * (`native.css` `.dock { bottom: 104 }`). Ekranlar onu ŞİMDİDEN mount eder ki M-6 tek
 * dosyada bitsin ve dock'un görünürlük kuralları (SOLO / süresi dolmuş oturum) beş ayrı
 * ekrana dağılmasın.
 */
export default function VoiceDockSlot(_p: { slug?: string }) {
  return null;
}
