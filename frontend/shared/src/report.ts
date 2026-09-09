/**
 * "Bildir" TEK bir düğme ama İKİ yazma: önce rapor, sonra engel. İkincisi patlarsa rapor
 * ZATEN gitmiştir — tek bir "gönderilemedi" mesajı kullanıcıyı yeniden denemeye iter ve
 * sunucuda MÜKERRER rapor açar (K-W33).
 *
 * Hangi adımın düştüğü burada belirlenir; metni her istemci kendi yüzeyine göre seçer (web
 * toast, mobil hata satırı). Sıralama kural, sunum değil — iki uygulamada yaşamamalı.
 */
export type ReportOutcome = "done" | "reportFailed" | "blockFailed";

export async function reportThenBlock(
  report: () => Promise<unknown>,
  block: () => Promise<unknown>,
): Promise<ReportOutcome> {
  try {
    await report();
  } catch {
    // Rapor gitmedi: engel de DENENMEZ. Aksi halde "engellendi ama bildirilmedi" gibi üçüncü
    // bir yarı-durum daha çıkardı ve kullanıcı hangisinin tuttuğunu bilemezdi.
    return "reportFailed";
  }
  try {
    await block();
  } catch {
    return "blockFailed";
  }
  return "done";
}
