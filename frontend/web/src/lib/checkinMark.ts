/* "Buluştunuz mu?" cevabı sunucuda "cevaplandı" bayrağı taşımıyor (SessionView'da yok) — soru bir
   daha sorulmasın diye yerel işaret. Gizli pencere / engellenmiş depolama: okuma "cevaplanmadı",
   yazma sessiz (soru bir sonraki açılışta yine gelir; sunucu upsert olduğu için zararsız). */
const key = (slug: string) => `bumpinto.checkin.${slug}`;

export function wasAnswered(slug: string): boolean {
  try {
    return localStorage.getItem(key(slug)) === "1";
  } catch {
    return false;
  }
}

export function markAnswered(slug: string): void {
  try {
    localStorage.setItem(key(slug), "1");
  } catch {
    // depolama kapalı — bilinçli olarak yutulur
  }
}
