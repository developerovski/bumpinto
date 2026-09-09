#!/usr/bin/env node
/* react-native-webrtc'nin .aar'ındaki .so'ların ELF LOAD hizasını okur (NDK gerekmez):
   Android 15+ cihazlar 16 KB sayfa kullanır ve 4 KB hizalı bir .so YÜKLENMEZ — uygulama
   açılışta çöker. WebRTC bu planın tek yeni yerel kütüphanesi, o yüzden kapı burada. */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* `react-native-webrtc` yerel ikiliyi VENDORLAMAZ: `android/build.gradle` onu Maven'den çeker
   (`org.jitsi:webrtc:124.+`). Yani .aar node_modules'te değil GRADLE ÖNBELLEĞİNDE oluşur ve bu
   kapı ancak bir kez bağımlılık çözümünden (prebuild + gradle) SONRA koşabilir. */
const home = process.env.HOME ?? "";
const aar = execSync(
  `find ${home}/.gradle/caches/modules-2/files-2.1/org.jitsi -name '*.aar' 2>/dev/null | sort | tail -1`,
)
  .toString()
  .trim();

if (!aar || !existsSync(aar)) {
  console.error(
    "webrtc .aar bulunamadı — Maven'den gelir; önce `npx expo prebuild` + bir gradle çözümü koştur.",
  );
  process.exit(2);
}
console.log(`aar: ${aar}`);

const dir = mkdtempSync(join(tmpdir(), "rnwebrtc-"));
execSync(`unzip -o -q ${aar} 'jni/arm64-v8a/*' -d ${dir}`);

let bad = 0;
const soDir = join(dir, "jni/arm64-v8a");
for (const name of readdirSync(soDir)) {
  const buf = readFileSync(join(soDir, name));
  const phoff = Number(buf.readBigUInt64LE(0x20));
  const phentsize = buf.readUInt16LE(0x36);
  let min = Infinity;
  for (let i = 0; i < buf.readUInt16LE(0x38); i++) {
    const off = phoff + i * phentsize;
    // PT_LOAD = 1; p_align 64-bit ELF'te segment başlangıcından +48 baytta.
    if (buf.readUInt32LE(off) === 1) min = Math.min(min, Number(buf.readBigUInt64LE(off + 48)));
  }
  if (min < 0x4000) bad++;
  console.log(`${min >= 0x4000 ? "OK " : "BAD"} ${name} align=0x${min.toString(16)}`);
}

process.exit(bad ? 1 : 0);
