/** Yakınsama açılışı ≤1,5 s YALNIZ canlı DECIDED geçişinde, oturum+mekan başına BİR KEZ
    (karar dokümanı §5.C). Sayfa yenilemede tekrar oynamaz; reduced-motion'da hiç oynamaz. */
export function claimReveal(slug: string, venueId: string): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  const key = `bumpinto:reveal:${slug}:${venueId}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return false; // özel pencere / storage kapalı → statik
  }
}
