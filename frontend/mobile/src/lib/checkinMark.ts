import * as SecureStore from "expo-secure-store";

/*
 * "Buluştunuz mu?" cevabı sunucuda "cevaplandı" bayrağı taşımıyor (SessionView'da yok) — soru bir
 * daha sorulmasın diye CİHAZDA işaret (web `localStorage` karşılığı). SecureStore anahtarı yalnız
 * harf/rakam/`.`/`-`/`_` kabul eder; slug buna uyar. Okuma hatası "cevaplanmadı", yazma hatası
 * sessiz: soru bir sonraki açılışta yine gelir ve sunucu upsert olduğu için zararsız.
 */
const key = (slug: string) => `bumpinto.checkin.${slug}`;

export async function wasAnswered(slug: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(key(slug))) === "1";
  } catch {
    return false;
  }
}

export async function markAnswered(slug: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key(slug), "1");
  } catch {
    // depolama kapalı — bilinçli olarak yutulur
  }
}
