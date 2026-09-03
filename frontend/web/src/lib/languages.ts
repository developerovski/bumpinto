/* LangMenu ve ProfilePrefs (dil radyo grubu) paylaşır. Bileşen dosyasından değer export
   etmek Fast Refresh sınırını bozduğu için ayrı modül. */
export const LANGUAGES = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
] as const;
