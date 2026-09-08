const { buildPrivacyInfoPlist } = require("../withPrivacyInfo");

const xml = buildPrivacyInfoPlist();

describe("PrivacyInfo.xcprivacy", () => {
  it("takip yapmadığını beyan eder", () => {
    expect(xml).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  });

  it("toplanan veri türlerini ve Required Reason sebeplerini sayar", () => {
    for (const t of [
      "PreciseLocation",
      "EmailAddress",
      "Name",
      "UserID",
      "AudioData",
      "ProductInteraction",
    ]) {
      expect(xml).toContain(`NSPrivacyCollectedDataType${t}`);
    }
    for (const r of ["CA92.1", "C617.1", "35F9.1", "E174.1"]) expect(xml).toContain(r);
  });

  it("ses verisi kaydedilmediği için 'linked' değildir", () => {
    const audio = xml.split("NSPrivacyCollectedDataTypeAudioData")[1].slice(0, 400);
    expect(audio).toMatch(/NSPrivacyCollectedDataTypeLinked<\/key>\s*<false\/>/);
  });
});
