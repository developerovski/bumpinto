# M-9 cihaz kontrol listesi (dev build, iOS + Android)

M-9'un altı yüzeyi jest'te **doğrulanamaz**: `react-native-view-shot` gerçek bir çizim
yüzeyi ister, `expo-camera` gerçek bir kamera, `expo-sharing` sistemin paylaşım sayfasını,
takvim ise cihazdaki takvim uygulamasını. Jest ikizleri yalnız YÜZEY taklididir — bu
satırlar dev build'de elle işaretlenir.

> **Durum (2026-09-09, M-9 kapanışı):** Android emülatöründe (`bumpinto-api35`, `prebuild --clean`
> sonrası yeni dev build) koşulan satırlar **[x]**; koşulamayanların gerekçesi satırın altında.
> **iOS hiç koşulmadı** (bu makinede iOS dev build kurulmadı) → INDEX **K-M43**.
> QR'ın uygulamanın KENDİ tarayıcısıyla okunması → INDEX **K-M42** (kullanıcı elle test edecek).
>
> **iOS derlendi, kuruldu ve açıldı** (simülatör iPhone 17 / iOS 26.1, Xcode 26.6):
> `expo run:ios` BUILD SUCCESSFUL, uygulama simülatöre kuruldu, giriş ekranı çizildi.
> KURULU bundle'ın `Info.plist`'i: `NSSupportsLiveActivities = true`, kamera purpose string'i,
> `ITSAppUsesNonExemptEncryption = false`; `PlugIns/` **yok** (widget target üretilmedi — doğru).
> Açık kalan: M-9 yüzeylerinin iOS ÇALIŞMA ANI (paylaşım UTI'leri, `.ics` içe aktarma,
> kamera diyaloğu, `DateTimePicker display="compact"`) → **K-M43**.

## 1 · Sonuç kartı görseli (P20 "Kartı paylaş")

- [x] Üretilen PNG **1080×1920** — cihazın önbelleğinden çekilip ölçüldü
      (`cache/ReactNative-snapshot-image*.png` → `1080 x 1920`, 1.05 MB).
- [x] **Fotolu** mekanda metin taşmıyor (ad, adres, kişi satırları, altbilgi yerinde).
- [ ] **Fotosuz** (gradyan + monogram) mekan — yerel `open` sağlayıcısı `photoUrl` DÖNMÜYOR,
      bu yüzden fotolu durum için veritabanına elle bir foto konuldu; gradyan dalı cihazda
      görülmedi (birim testi var: `ShareCardImage.test.tsx`).
- [ ] Uçak modunda foto yüklenemeyince gradyana düşüyor ve kart **yine üretiliyor**.
- [ ] Kart adı iki satırı aşan mekanda kırpılıyor, taşmıyor (`numberOfLines={2}`).

## 2 · Paylaşım sayfası

- [x] Sistem paylaşım sayfası **kart önizlemesiyle** açıldı; hedefler: Quick Share, Google,
      Print, Drive, Maps (emülatörde WhatsApp kurulu değil).
- [ ] Vazgeçince **ikinci bir sayfa AÇILMIYOR** (`shareCard` → `"failed"`).
- [ ] Görsel üretilemediğinde metin paylaşımı açılıyor ve `share.cardFailed` şeridi çıkıyor.

## 3 · Takvim

- [x] `.ics` cihazda üretildi (`cache/bumpinto-<slug>.ics`) ve paylaşım sayfası açıldı
      ("Sharing 1 file · bumpinto-f9w530y8.ics").
- [x] Dosya biçimi doğru: CRLF satır sonları, `VTIMEZONE` YOK, `PRODID:-//BumpInto//App//TR`,
      `X-WR-TIMEZONE:Europe/Amsterdam`, `DTEND` = başlangıç + 90 dk.
- [ ] `.ics` iOS Takvim ve Google Takvim'de AÇILIYOR (dosya doğru ama içe aktarma denenmedi).
- [x] Saat, alt sayfada seçilen saatle **birebir** aynı: 11:00 PM seçildi →
      `DTSTART:20260909T210000Z` (= 23:00 Europe/Amsterdam, CEST +2). Saat dilimi çevrimi doğru.
- [ ] Yaz saati sınırında (`Europe/Amsterdam`, Mart/Ekim) bir kez daha denendi.
- [x] Takvim izni **istenmedi** (`expo-calendar` yok — sistem paylaşımı yeterli).

## 4 · QR

- [x] Lobi QR'ı doğru içeriği taşıyor: ekran görüntüsündeki kod makineyle çözüldü →
      `https://bumpinto.app/j/f9w530y8` (oturumun gerçek davet linki). Üçüncü taraf bir kamera
      bunu okuduğunda App Link `/j/<slug>`i açar (derin link yolu `02-deeplink.yaml`de).
- [ ] **Uygulamanın kendi tarayıcısı gerçek bir QR'ı okuyup oturuma sokuyor** — K-M42.
      Emülatörde doğrulanamadı: sanal sahne kamerası başsız olarak poster'a nişanlanamıyor.
      Doğrulanan kısım: kamera izni alınıyor, `CameraView` CANLI önizleme çiziyor
      (sanal sahne göründü), ön-bilgilendirme şeridi önizlemenin üstünde duruyor.
- [ ] Okunan QR ile oturuma girildikten sonra tarayıcı **ikinci kez tetiklenmiyor**
      (`handled` kapısı).

## 5 · Kamera izni

- [x] `code.scanDisclosure` satırı görünüyor ("The camera opens only to read the invite QR
      code; nothing is stored or sent.") — izin verilmeden önce gövdede, verildikten sonra
      önizlemenin üstündeki şeritte.
- [ ] Reddedince Ayarlar yolu ve "elle yazarak da katılabilirsin" cümlesi çıkıyor.
- [x] Manifest'te `CAMERA` VAR, `READ/WRITE_EXTERNAL_STORAGE` YOK — kurulu uygulamanın
      `dumpsys package` çıktısıyla doğrulandı (K-M40).

## 6 · Dürt

- [x] Host dürtünce **gönderen** cihazda yeşil `Nudged Ayse` şeridi çıkıyor ve sunucu kabul
      ediyor (204; `ForbiddenException` loglanmadı).
- [ ] **Hedef cihazda** bildirim şeridi + haptik — ikinci bir istemci gerekiyor, koşulmadı.
      Üretici artık bağlı (`useSessionLive` → `emitSessionEvent`), tüketici birim testli.
- [x] Dürttükten sonra düğme **pasifleşiyor** (60 sn istemci soğuması) — ekran görüntüsünde
      soluk "Nudge Ayse".
- [ ] Davetli görünümünde düğme yerine `presence.hostOnly` satırı var (birim testli, cihazda
      davetli oturumu açılmadı).
- [ ] İki cihaz gerekir: dürten (host) ve dürtülen. Tek cihazla yalnız **gönderen** taraf
      doğrulanır — alıcı tarafı için ikinci bir istemci (web) aynı oturumda açık olmalı.

## 7 · Mekan kartı 2.0

- [x] `expo-image` **gerçek fotoğrafı** çiziyor — sonuç ekranındaki `ResultCard`'da ve ekran
      dışı `ShareCardImage` düğümünde aynı foto yüklendi (ağdan, önbellekli).
- [x] `presence.lastSeen` gerçek veride yerelleştirilmiş saat basıyor ("Last seen · 11:44 PM");
      damgası olmayan katılımcıda yalnız "offline" kalıyor (uydurma saat yok).
- [ ] `tagline` + `hoursToday` meta satırı cihazda GÖRÜLMEDİ (mekan listesi ekranına
      gidilmedi; yerel `open` sağlayıcısı `tagline` döndürüyor, birim testi var).

## ÖNEMLİ — cihazda bulunan kusur (M-9 dışı)

Listeden açılan bir oturumda **katılımcı jetonu yok** ve dürt sunucudan `403
participant token required` alıyor. M-9 bunu yaratmadı, yalnız ilk gösteren yüzey oldu;
aynı boşluk `swipe`/`deck-done`/`location`/`force-decision` için de geçerli.
Ayrıntı ve düzeltme yönü: INDEX **K-M39**.
