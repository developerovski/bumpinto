# Mağaza varlıkları

Bu dizin **ikili varlıklar** içindir (ikon, ekran görüntüsü, feature graphic). Kod yok.
Yükleme sırası ve kabul kapıları: [`docs/store/RELEASE-CHECKLIST.md`](../../../docs/store/RELEASE-CHECKLIST.md).

## Envanter

| Varlık | Ölçü / biçim | Yer |
|---|---|---|
| iOS uygulama ikonu | 1024×1024 PNG, saydamlık **yok**, köşe yuvarlama **yok** | `ios/icon-1024.png` |
| Play uygulama ikonu | 512×512 32-bit PNG | `android/icon-512.png` |
| Play feature graphic | 1024×500 PNG/JPG, metin güvenli alanda | `android/feature-1024x500.png` |
| iPhone 6.9" ekran görüntüleri | 1320×2868, 3–6 adet (en fazla 10) | `ios/6.9/01..06.png` |
| iPad 13" (iPad desteklenirse) | 2064×2752 | `ios/13/` |
| Android telefon ekran görüntüleri | 1080×2340, 2–8 adet | `android/phone/` |

`app.config.ts` `supportsTablet: false` diyor — iPad varlıkları **yalnız** bu bayrak açılırsa gerekir.

## Ekran görüntüsü sırası

Ürün tezi **grup uzlaşması**: adalet, birlikte karar, ortak an. Puan/rozet/aciliyet vurgusu yok.

1. **O2 Giriş** — "Ortada buluşalım."
2. **P6 Lobi** — kimler var, kim hazır (presence)
3. **P11 Mekanlar** — yol çubuğu, herkes için adil süre
4. **P14 Deste** — kaydırarak oylama
5. **P20 Karar** — kesişim kazandı
6. **P25 Sesli sohbet** — buluşma anı

## Üretim notu

Ekran görüntüleri **gerçek cihazdan** alınır (dev build), artboard ekran görüntüsü kullanılmaz:
mağaza incelemesi uygulamadaki ekranla birebir örtüşme arar.
