const { withDangerousMod, withXcodeProject, IOSConfig } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Apple Privacy Manifest (`PrivacyInfo.xcprivacy`) — 2024'ten beri ZORUNLU.
 *
 * İçerik uyumluluk dokümanı §2'deki App Privacy tablosunun makine okunur hâlidir:
 * mağaza formu ile manifesto ayrışırsa inceleme reddi gelir, tek kaynak burasıdır.
 *
 * Dosyayı yalnız DİSKE yazmak yetmez — Xcode "Resources" fazına eklenmezse .ipa'ya girmez;
 * bu yüzden `withDangerousMod` (yaz) + `withXcodeProject` (kaydet) birlikte koşar.
 */
const FN = "NSPrivacyCollectedDataTypePurposeAppFunctionality";
const AN = "NSPrivacyCollectedDataTypePurposeAnalytics";

// [tür, hesaba bağlı mı, amaç]
const COLLECTED = [
  ["PreciseLocation", true, FN],
  ["EmailAddress", true, FN],
  ["Name", true, FN],
  ["UserID", true, FN],
  // Ses KAYDEDİLMEZ; yalnız P2P akar — hesaba bağlanmaz.
  ["AudioData", false, FN],
  ["ProductInteraction", false, AN],
];

// Required Reason API'leri: sebep kodları Apple'ın belgelenmiş listesinden.
const APIS = [
  ["UserDefaults", "CA92.1"],
  ["FileTimestamp", "C617.1"],
  ["SystemBootTime", "35F9.1"],
  ["DiskSpace", "E174.1"],
];

const collectedEntry = ([type, linked, purpose]) => `    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataType${type}</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><${linked}/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key><array><string>${purpose}</string></array>
    </dict>`;

const apiEntry = ([category, reason]) => `    <dict>
      <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategory${category}</string>
      <key>NSPrivacyAccessedAPITypeReasons</key><array><string>${reason}</string></array>
    </dict>`;

function buildPrivacyInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
${COLLECTED.map(collectedEntry).join("\n")}
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
${APIS.map(apiEntry).join("\n")}
  </array>
</dict>
</plist>
`;
}

const withPrivacyInfo = (config) =>
  withXcodeProject(
    withDangerousMod(config, [
      "ios",
      (cfg) => {
        const dir = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "PrivacyInfo.xcprivacy"), buildPrivacyInfoPlist());
        return cfg;
      },
    ]),
    (cfg) => {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: `${cfg.modRequest.projectName}/PrivacyInfo.xcprivacy`,
        groupName: cfg.modRequest.projectName,
        project: cfg.modResults,
        isBuildFile: true,
      });
      return cfg;
    },
  );

module.exports = withPrivacyInfo;
module.exports.buildPrivacyInfoPlist = buildPrivacyInfoPlist;
