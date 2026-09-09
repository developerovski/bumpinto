import { dockStateOf } from "./dockState";

/** P25'in yedi hâli — dock'un TEK karar noktası. Ekran bu tabloyu çizer, kendi dalı yoktur. */
const base = { hasRoom: false, host: false, phase: "idle" as const, endedReason: null };

const cases: [string, object, string][] = [
  ["P25:1 kapalı + host", { host: true }, "closedHost"],
  ["kapalı + üye → dock YOK", {}, "hidden"],
  ["P25:2 açık + dışarıda", { hasRoom: true }, "open"],
  ["P25:3 bağlanıyor", { hasRoom: true, phase: "joining" }, "joining"],
  ["P25:4/5 içeride (sessiz aynı gövdenin varyantı)", { hasRoom: true, phase: "in" }, "in"],
  ["P25:6 hata", { hasRoom: true, phase: "error" }, "error"],
  ["P25:7 süre doldu · host", { host: true, endedReason: "TIME_LIMIT" }, "expired"],
  ["P25:7 süre doldu · üye", { endedReason: "TIME_LIMIT" }, "expired"],
  ["HOST kapanışı üyede dock'u kapatır", { endedReason: "HOST" }, "hidden"],
  ["EMPTY kapanışı host'ta başlat'a döner", { host: true, endedReason: "EMPTY" }, "closedHost"],
  ["bayat endsAt taze sebebi EZEMEZ", { hasRoom: true, endedReason: "TIME_LIMIT" }, "expired"],
];

describe("dockStateOf — P25", () => {
  it.each(cases)("%s", (_name, over, expected) => {
    expect(dockStateOf({ ...base, ...over } as never)).toBe(expected);
  });
});
