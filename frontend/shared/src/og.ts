/**
 * B-15 `GET /og/{slug}.png` (§2). Uç **`/api` altında değildir**; taban, uygulamanın web
 * kökü (`webBase`) ya da API kökü olabilir — çağıran hangisini kullanacağını bilir.
 */
export function ogImageUrl(base: string, slug: string): string | null {
  if (!base || !slug) return null;
  return `${base.replace(/\/+$/, "")}/og/${slug}.png`;
}
