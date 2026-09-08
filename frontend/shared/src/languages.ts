/* Desteklenen üç dil — web dil menüsü/profil radyo grubu ve mobil dil alt sayfası paylaşır.
   Etiketler ÇEVRİLMEZ: her dil kendi adıyla yazılır. */
export const LANGUAGES = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
