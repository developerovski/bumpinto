import { router, type Href } from "expo-router";

/**
 * "Geri / Kapat" — geçmiş YOKSA yedek rotaya düşer.
 *
 * `router.back()` TEK BAŞINA bir çıkmaz sokaktır: bir ekrana geçmiş yığını olmadan
 * girilebiliyorsa (derin link, Android'in arka plandaki uygulamayı öldürüp URL'i geri
 * yüklemesi, geliştirmede Metro yeniden yüklemesi) navigatör `GO_BACK` eylemini işleyemez,
 * kullanıcı ekranda KİLİTLİ kalır. 2026-09-08'de emülatörde görüldü: dil alt sayfası açıkken
 * gelen bir yeniden yükleme sonrası geri düğmesi ve sistem geri hareketi hiçbir şey yapmıyordu.
 *
 * Çıkışsız ekran bırakmak ayrıca mağaza reddi sebebidir (K-M23 ile aynı sınıf).
 *
 * KURAL: `app/` altında ÇIPLAK `router.back()` yazılmaz — `src/__tests__/backExit.test.ts`
 * bunu korur. Her ekran nereye düşeceğini KENDİ bilir; yedek uydurulmaz, ekranın mantıksal
 * ebeveyni verilir.
 */
export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
