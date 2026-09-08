#!/usr/bin/env node
/* `pnpm dev:mobile` — platformu ve cihazı sorar, dev build'i o cihazda başlatır.

   Neden ayrı script: `expo run:ios` ile `run:android` AYRI komutlar (CNG yerel dizin derler),
   `expo start` tek başına yetmez — Expo Go kaldırıldı, dev build zorunlu (plan38 §Tech Stack).
   Bayraksız `expo run:ios` ayrıca Mac'e eşlenmiş FİZİKSEL iPhone'u kendiliğinden seçiyor;
   hedef burada açıkça sorulur.

   Soruları atlamak için: `pnpm dev:mobile ios` (cihazı sorar) ·
   `pnpm dev:mobile ios "iPhone 17"` (adı/UDID'si eşleşen cihazı seçer, hiç sormaz).
   TTY yoksa (CI, ajan) soru sorulmaz; açık simülatör/emülatör varsa o, yoksa listenin ilki. */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const MOBILE = "frontend/mobile";
const PLATFORMS = { i: "ios", ios: "ios", a: "android", android: "android" };

const platform = process.argv[2]
  ? PLATFORMS[process.argv[2].trim().toLowerCase()]
  : await askPlatform();

if (!platform) {
  console.error("dev:mobile: platform 'ios' ya da 'android' olmalı");
  process.exit(1);
}

// iOS yalnız macOS'ta derlenir; Windows/Linux'ta hata Xcode'dan gelmeden burada söylenir.
if (platform === "ios" && process.platform !== "darwin") {
  console.error("dev:mobile: iOS derlemesi yalnız macOS'ta çalışır (Xcode gerekir).");
  process.exit(1);
}

/* Gradle SDK'yı ya ANDROID_HOME/ANDROID_SDK_ROOT'tan ya da android/local.properties'ten bulur.
   İkisi de yoksa hata Gradle'dan "SDK location not found" diye şifreli gelir — burada açık söylenir.
   Not: bu değişkenler `.zshrc`'de tanımlı olabilir ama `.zshrc` yalnız ETKİLEŞİMLİ kabukta
   okunur; script bir CI adımından ya da ajandan koşuyorsa dışarıdan verilmesi gerekir. */
const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (platform === "android" && !sdkRoot && !existsSync(`${MOBILE}/android/local.properties`)) {
  console.error("dev:mobile: ANDROID_HOME / ANDROID_SDK_ROOT tanımlı değil, local.properties de yok.");
  console.error("  Örnek: ANDROID_HOME=$HOME/Library/Android/sdk pnpm dev:mobile android");
  process.exit(1);
}

const devices = platform === "ios" ? listIosDevices() : listAndroidDevices();
if (devices.length === 0) {
  console.error(
    platform === "ios"
      ? "dev:mobile: kullanılabilir iPhone yok (Xcode > Settings > Platforms'tan simülatör kur)."
      : "dev:mobile: kullanılabilir Android cihaz/emülatör yok (Android Studio > Device Manager).",
  );
  process.exit(1);
}

const device = process.argv[3] ? matchDevice(devices, process.argv[3]) : await askDevice(devices);
if (!device) process.exit(1);

if (platform === "ios") assertIosCanBuild(device);

console.log(`dev:mobile: ${device.label}`);
const child = spawn("pnpm", ["exec", "expo", `run:${platform}`, "--device", device.value], {
  stdio: "inherit",
  cwd: MOBILE,
});
child.on("exit", (code) => process.exit(code ?? 0));

// ——— cihaz listeleri ———

/** Simülatörler (açık olan başa) + Mac'e eşli fiziksel iPhone'lar. */
function listIosDevices() {
  const sims = Object.entries(JSON.parse(sh("xcrun", ["simctl", "list", "devices", "available", "--json"])).devices)
    // Runtime anahtarı "…SimRuntime.iOS-26-1"; sürüm sırası JSON'da garanti DEĞİL, elle sıralanır.
    .map(([runtime, list]) => [/iOS-(\d+)-(\d+)/.exec(runtime), list])
    .filter(([m]) => m)
    .sort(([a], [b]) => Number(b[1]) * 1000 + Number(b[2]) - (Number(a[1]) * 1000 + Number(a[2])))
    .flatMap(([m, list]) =>
      list
        .filter((d) => d.name.startsWith("iPhone"))
        .map((d) => ({
          label: `${d.name} — simülatör (iOS ${m[1]}.${m[2]})${d.state === "Booted" ? " · açık" : ""}`,
          value: d.udid,
          simulator: true,
          booted: d.state === "Booted",
        })),
    );

  // Açık simülatör başa, sonra kalan simülatörler, en sonda fiziksel cihazlar.
  return [...sims.filter((d) => d.booted), ...sims.filter((d) => !d.booted), ...physicalIos()];
}

/** `xctrace` fiziksel cihazları "Ad (iOS sürümü) (UDID)" diye yazar; Mac satırında sürüm
    parantezi YOKTUR — iki parantezli satır şartı Mac'i doğal olarak eler. */
function physicalIos() {
  const out = sh("xcrun", ["xctrace", "list", "devices"], true);
  const body = out.split("== Simulators ==")[0];
  return body
    .split("\n")
    .map((line) => /^(.+) \(([\d.]+)\) \(([0-9A-Fa-f-]{8,})\)\s*$/.exec(line.trim()))
    .filter(Boolean)
    .map((m) => ({
      label: `${m[1]} — FİZİKSEL cihaz (iOS ${m[2]})`,
      value: m[3],
      simulator: false,
      booted: false,
    }));
}

/** Koşan cihaz/emülatörler (adb) + henüz açılmamış AVD'ler. */
function listAndroidDevices() {
  const adb = `${sdkRoot}/platform-tools/adb`;
  const running = sh(adb, ["devices", "-l"], true)
    .split("\n")
    .slice(1)
    .map((line) => /^(\S+)\s+device\b(.*)$/.exec(line))
    .filter(Boolean)
    .map((m) => ({
      label: `${/model:(\S+)/.exec(m[2])?.[1] ?? m[1]} — ${m[1].startsWith("emulator-") ? "emülatör · açık" : "FİZİKSEL cihaz"}`,
      value: m[1],
      booted: true,
    }));

  const avds = sh(`${sdkRoot}/emulator/emulator`, ["-list-avds"], true)
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && !s.includes(" "))
    // Açık emülatörün AVD adı listede yine görünür; iki kez sunmamak için koşanlar varsa elenir.
    .filter((name) => !running.some((r) => r.label.includes(name)))
    .map((name) => ({ label: `${name} — emülatör (kapalı, açılacak)`, value: name, booted: false }));

  return [...running, ...avds];
}

// ——— seçim ———

function matchDevice(list, query) {
  const q = query.trim().toLowerCase();
  const hit = list.find((d) => d.value.toLowerCase() === q || d.label.toLowerCase().includes(q));
  if (!hit) {
    console.error(`dev:mobile: "${query}" ile eşleşen cihaz yok. Seçenekler:`);
    list.forEach((d) => console.error(`  - ${d.label}`));
  }
  return hit;
}

async function askDevice(list) {
  if (list.length === 1 || !process.stdin.isTTY) return list[0];
  console.log("Cihaz:");
  list.forEach((d, i) => console.log(`  ${i + 1}) ${d.label}`));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (await rl.question(`Numara [1]: `)).trim();
      if (!answer) return list[0];
      const n = Number(answer);
      if (Number.isInteger(n) && n >= 1 && n <= list.length) return list[n - 1];
      console.error(`  1–${list.length} arası bir numara yaz.`);
    }
  } catch (err) {
    return cancelled(err);
  } finally {
    rl.close();
  }
}

async function askPlatform() {
  if (!process.stdin.isTTY) {
    console.error("dev:mobile: etkileşimsiz kabuk — platformu ver: pnpm dev:mobile ios|android");
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    // Yanlış cevapta çıkmak yerine tekrar sorulur: kullanıcı komutu baştan yazmasın.
    for (;;) {
      const answer = (await rl.question("Hangi platform? [i]os / [a]ndroid: ")).trim().toLowerCase();
      if (PLATFORMS[answer]) return PLATFORMS[answer];
      console.error("  'i' ya da 'a' yaz (ios / android).");
    }
  } catch (err) {
    return cancelled(err);
  } finally {
    rl.close();
  }
}

/** Ctrl+D readline'da ABORT_ERR fırlatır; yığın izi basmak yerine sessizce çıkılır. */
function cancelled(err) {
  if (err?.code !== "ABORT_ERR") throw err;
  console.error("\ndev:mobile: iptal edildi.");
  process.exit(130);
}

// ——— iOS imza ön kontrolü ———

/**
 * Expo, `associated-domains` ya da `applesignin` entitlement'ı varsa SİMÜLATÖR derlemesinde
 * bile imza ister (`simulatorCodeSigning.js`). Bizde `app.config.ts` Universal Links için
 * `associatedDomains` veriyor → entitlement her zaman üretiliyor.
 *
 * Expo'nun bu durumdaki hatası "…build onto physical iOS devices" diyor ve simülatör seçmiş
 * kullanıcıyı yanlış yere bakmaya itiyor; gerçek sebep burada söylenir.
 */
function assertIosCanBuild(device) {
  const identities = sh("security", ["find-identity", "-v", "-p", "codesigning"], true);
  if (!/\b0 valid identities found\b/.test(identities)) return;

  const needsSigning = !device.simulator || entitlementsRequireSigning();
  if (!needsSigning) return;

  console.error("dev:mobile: Xcode'da geçerli kod imzalama kimliği yok (0 valid identities).");
  if (device.simulator) {
    console.error("  Simülatör seçtin ama app.config.ts `associatedDomains` (Universal Links)");
    console.error("  tanımlıyor; Expo bu entitlement'ta simülatörde de imza istiyor.");
    console.error("  Yerel geliştirme için entitlement'ı düşür (https açılışı gider,");
    console.error("  `bumpinto://` şeması kalır):");
    console.error("    BUMPINTO_DEV_NO_APPLINKS=1 pnpm dev:mobile ios");
  }
  console.error("  Kalıcı çözüm: Apple Developer Program (ücretli) — ÜCRETSİZ hesap");
  console.error("  Associated Domains'i ve Sign in with Apple'ı desteklemez, M-5 için zaten gerekli.");
  process.exit(1);
}

/** Üretilmiş entitlements dosyasında imza gerektiren anahtarlar var mı. */
function entitlementsRequireSigning() {
  const dir = `${MOBILE}/ios`;
  if (!existsSync(dir)) return true; // prebuild henüz koşmadı; config zaten associatedDomains veriyor
  for (const sub of readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    for (const file of readdirSync(`${dir}/${sub.name}`).filter((f) => f.endsWith(".entitlements"))) {
      const xml = readFileSync(`${dir}/${sub.name}/${file}`, "utf8");
      if (/associated-domains|applesignin/.test(xml)) return true;
    }
  }
  return false;
}

/** Kısa komut çalıştırıcı; `soft` ise hata yerine boş dize döner (cihaz listeleri eksik olabilir). */
function sh(cmd, args, soft = false) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    if (soft) return "";
    throw new Error(`dev:mobile: '${cmd}' çalıştırılamadı`);
  }
}
