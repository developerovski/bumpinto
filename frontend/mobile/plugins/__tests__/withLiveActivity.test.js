const withLiveActivity = require("../withLiveActivity");

/* Eklenti YALNIZ Info.plist anahtarını basar: widget target'ı, ActivityKit kodu ve push
   güncellemesi B-16'dadır (M-9 kapsam kilidi). Bu test o kilidi korur — eklenti başka bir
   şeye dokunmaya başlarsa kırılır. */
jest.mock("@expo/config-plugins", () => ({
  withInfoPlist: (config, mod) => mod({ ...config, modResults: config.modResults ?? {} }),
}));

test("NSSupportsLiveActivities yazılır, başka anahtara dokunulmaz", () => {
  const out = withLiveActivity({ modResults: { ITSAppUsesNonExemptEncryption: false } });
  expect(out.modResults.NSSupportsLiveActivities).toBe(true);
  expect(out.modResults.ITSAppUsesNonExemptEncryption).toBe(false);
  expect(Object.keys(out.modResults).sort()).toEqual([
    "ITSAppUsesNonExemptEncryption",
    "NSSupportsLiveActivities",
  ]);
});
