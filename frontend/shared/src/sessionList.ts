/**
 * Oturumlar ekranı — geçmiş buluşmalar kartının ilk açılışta gösterdiği satır sayısı (web + mobil).
 *
 * NEDEN sayfalama DEĞİL: sunucu geçmişi zaten 20 satırda keser (`pastTruncated`); en fazla dört
 * sayfalık bir liste için sayfa düğmeleri tıklama ekler, bilgi eklemez. Kart en yeni satırlarla
 * kısa açılır, kalanı yerinde "Tümünü göster" ile açılır.
 */
export const PAST_PREVIEW = 5;
