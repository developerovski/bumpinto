const { withInfoPlist } = require("@expo/config-plugins");

/**
 * Live Activity TASLAĞI: yalnız `NSSupportsLiveActivities` anahtarını yazar.
 *
 * Widget Extension target'ı ÜRETMEZ — onu B-16 ekleyecek. Anahtarın şimdiden bulunması, o iz
 * geldiğinde prebuild farkının tek dosyaya inmesini sağlar.
 *
 * SDK 57'de `expo-widgets` first-party geldi ve GERÇEK widget target'ının yolu odur — ama onu
 * kurmak B-16'nın işi. M-9'un kapsamı yalnız köprü olduğu için `expo-widgets` BİLEREK alınmadı
 * (gerekçe: INDEX M-9 satırı, sapma 8): hiçbir widget üretmeyen yarım bir yapılandırma prebuild'i
 * sebepsiz riske atardı.
 *
 * Android tarafında bu sürümde değişiklik YOKTUR.
 */
module.exports = function withLiveActivity(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    return cfg;
  });
};
