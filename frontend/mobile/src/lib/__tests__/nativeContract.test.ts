import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as permissions from "../permissions";

/**
 * Yerel modül SÖZLEŞMESİ (untested-seam kuralı): izin çağrılarımız gerçek paket yüzeyine
 * dayanmalı. Expo bir fonksiyonu yeniden adlandırırsa test BURADA kırılır; düzeltme
 * `permissions.ts`'te olur, ekranlar değişmez.
 *
 * Yüzey, paketin TİP BİLDİRİMİNDEN okunur — `expo-audio` jest-expo altında içe aktarılamaz
 * (yerel modül sınıfı yok, açılışta patlar; `jest.setup.ts` bu yüzden ikizini kurar).
 * Bildirim dosyası paketin YAYIMLADIĞI sözleşmedir, ikizimizin değil.
 */
const ROOT = join(__dirname, "..", "..", "..", "..", "..", "node_modules");
const decl = (pkg: string, file: string) => readFileSync(join(ROOT, pkg, file), "utf8");

test("expo-location yüzeyi beklediğimiz gibi", () => {
  const d = decl("expo-location", "build/Location.d.ts");
  expect(d).toContain("getForegroundPermissionsAsync");
  expect(d).toContain("requestForegroundPermissionsAsync");
});

test("expo-audio kayıt izni yüzeyi beklediğimiz gibi", () => {
  const d = decl("expo-audio", "build/ExpoAudio.d.ts");
  expect(d).toContain("getRecordingPermissionsAsync");
  expect(d).toContain("requestRecordingPermissionsAsync");
});

test("expo-apple-authentication yüzeyi beklediğimiz gibi", () => {
  // `index.d.ts` yalnız yeniden dışa aktarır; imzalar bu iki dosyada.
  const api = decl("expo-apple-authentication", "build/AppleAuthentication.d.ts");
  expect(api).toContain("isAvailableAsync");
  expect(api).toContain("signInAsync");
  const types = decl("expo-apple-authentication", "build/AppleAuthentication.types.d.ts");
  expect(types).toContain("AppleAuthenticationScope");
  expect(types).toContain("identityToken");
});

test("arka plan konum API'si HİÇ kullanılmıyor (uyumluluk §6)", () => {
  expect(Object.keys(permissions).join(",")).not.toMatch(/Background/i);
  const source = readFileSync(join(__dirname, "..", "permissions.ts"), "utf8");
  expect(source).not.toMatch(/Background(Permissions|Location|Update)/);
});

test("izin modülü yalnız beklenen izinleri biliyor: konum, mikrofon, bluetooth", () => {
  expect(Object.keys(permissions).sort()).toEqual([
    "openAppSettings",
    /* Bluetooth 2026-09-09'da eklendi (M-6, kullanıcı kararı): sesli sohbette kulaklığa
       yönlendirme için. EN İYİ ÇABA — reddedilirse ses telefondan çıkar, akış bozulmaz. */
    "requestBluetoothConnect",
    "requestLocationWhenInUse",
    "requestMicrophone",
  ]);
});
