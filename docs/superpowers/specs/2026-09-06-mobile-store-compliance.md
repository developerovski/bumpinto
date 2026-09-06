# Mobil mağaza uyumluluğu — App Store + Google Play + KVKK/GDPR (2026-09-06)

Kaynak: tek turlu web araştırması (2026-09-06). Kural numaraları ve tarihler yayın öncesi
resmi sayfalardan yeniden teyit edilir; `[BELİRSİZ]` işaretli maddeler doğrulanamadı.
Bu doküman **M izinin** (Expo/React Native) bağlayıcı uyumluluk listesidir; tasarım karşılıkları
Claude Design `719fcd5f-…` → `Mobil Onboarding, İzinler ve Yasal.dc.html` içindedir.

## 0. Ürün gerçekleri (beyanların dayanağı)

| Veri | Toplanıyor mu | Paylaşılıyor mu | Amaç |
|---|---|---|---|
| Google/Apple kimliği, ad, e-posta | Evet (host) | Hayır | Hesap, oturum listesi |
| Görünen ad (davetli) | Evet | Oturumdakilerle | Roster |
| Hassas konum | Evet, yalnız uygulama açıkken | Oturumdakilere ~1 km yuvarlanmış; Google Places/Foursquare/Nominatim'e sorgu olarak | Orta nokta, mekan arama, ters geocode |
| Ulaşım türü | Evet | Oturumdakilerle | Yol süresi |
| Ses (mikrofon) | Yalnız sesli sohbette, kaydedilmez, P2P (WebRTC) | Sohbettekilere | Sesli sohbet |
| Oturum geçmişi | Evet | Hayır | Profil istatistiği; 24 s kapanır, 30 gün silinir |
| Analitik (Clarity/GA4) | Web'de evet; mobilde **karar bekliyor** | Microsoft/Google | Ürün analitiği |
| Reklam / satın alma / takip (ATT) | Yok | — | — |

**Karar (bu doküman):** mobilde Clarity/GA4 **açılışta rıza olmadan yüklenmez**; Ayarlar → "Kullanım
verisi paylaş" anahtarı (varsayılan kapalı, AB/TR) ile açılır. Bu sayede ATT gerekmez, GDPR/KVKK
açık rıza kuralı tek anahtarla karşılanır, Data safety formu "opsiyonel" beyan edebilir.

## 1. Zorunlu ekranlar / UI (her iki mağaza)

| # | Ekran / durum | Gerekçe | Artboard |
|---|---|---|---|
| L1 | Giriş: **Google + Apple** eşit ağırlıkta, altında Gizlilik · Şartlar linkleri | Apple 4.8 (Google varsa eşdeğer alternatif), 5.1.1 | O2 |
| L2 | **Konum ön-bilgilendirme** (prominent disclosure) → sistem izni. Metin: veri türü + amaç + "yalnız uygulama açıkken" + "~1 km yuvarlanır" | Play "Prominent disclosure", Apple 5.1.5 + NSLocationWhenInUseUsageDescription | O3, O4 (iOS), O5 (Android) |
| L3 | Konum **reddedildi / yaklaşık** durumu: adres yazma yolu + "Ayarlar'a git" | Apple (konum kapalıyken çalışmalı), Play (ayarlar derin bağlantısı) | O6 |
| L4 | **Mikrofon ön-bilgilendirme** — yalnız "Sesli sohbete katıl" anında, alt sayfa | Play prominent disclosure (özellik anında), NSMicrophoneUsageDescription | O7 |
| L5 | Mikrofon reddedildi: `voice.micDenied` + Ayarlar'a git; oylama akışı bozulmaz | Apple/Play | P25 (dock hata durumu, ürün dosyası) |
| L6 | **Hesap ve veriler** ekranı: Gizlilik · Şartlar · KVKK aydınlatma · Açık rıza · Atıflar · Destek · Kullanım verisi anahtarı · Hesabı sil | Apple 5.1.1, Play User Data, KVKK | O8 |
| L7 | **Gizlilik politikası** okuyucu ekranı (+ harici link) | Apple 5.1.1, Play | O9 |
| L8 | **Kullanım şartları / EULA** — UGC sıfır tolerans maddesi dahil | Apple 1.2, 5.1.1 | O10 |
| L9 | **KVKK aydınlatma metni** (TR) — açık rıza metninden AYRI ekran | KVKK 2026/347 ilke kararı | O11 |
| L10 | **Açık rıza** (KVKK) — konum/mikrofon/analitik için anahtarlı ayrı ekran | KVKK m.5/1 | O12 |
| L11 | **Atıflar ve lisanslar**: Google (logo), "Powered by Foursquare", "© OpenStreetMap contributors" + ODbL, açık kaynak listesi | Google Places ToS, Foursquare attribution, OSMF Nominatim policy | O13 |
| L12 | **Destek ve iletişim**: e-posta, web, tacir (DSA) bilgisi: adres/telefon/e-posta | Apple DSA trader, Play iletişim bilgisi | O14 |
| L13 | **Hesabı sil** 3 adım: ne silinir / ne kalır → yazılı onay → silindi. Apple girişi varsa token iptali arka planda | Apple 5.1.1(v), Play hesap silme | O15, O16, O17 |
| L14 | Hesap silme **web linki** (`bumpinto.app/account/delete`) — uygulama kurulu değilken | Play Data safety formu zorunlu alanı | W18 (web v3) · K-B28 |
| L15 | **Bildir / Engelle** (katılımcı satırına uzun basma → sayfa) + bildirim onayı | Apple 1.2 UGC (canlı sesli sohbet + görünen ad) | O18, O19 |
| L16 | Oturum mekan kartlarında görünür atıf satırı (Google / Foursquare / OSM) | Google/FSQ her ekran kuralı | ürün dosyasında |

## 2. Meta veri / form işleri (ekran değil)

**Apple App Store Connect**
- App Privacy (nutrition label): Location (precise), Contact Info (name, email), Identifiers (user id), User Content (görünen ad, oturum adı, ses — "not stored"), Usage Data (yalnız anahtar açıksa). Hepsi "Linked to you", "Used for tracking = No".
- `PrivacyInfo.xcprivacy`: uygulama + SDK'lar (Google Sign-In, react-native-webrtc, expo-location, Clarity/GA4 varsa). Required Reason API beyanları.
- Purpose string'ler (Info.plist):
  - `NSLocationWhenInUseUsageDescription`: "Herkese adil orta noktayı hesaplamak için konumunu kullanırız. Yalnız uygulama açıkken; arkadaşlarına ~1 km yuvarlanmış gösterilir."
  - `NSMicrophoneUsageDescription`: "Buluşmadaki arkadaşlarınla sesli konuşabilmen için mikrofon gerekir. Ses kaydedilmez."
- `ITSAppUsesNonExemptEncryption = false` (OS TLS + standart WebRTC).
- Age rating anketi (2026 sürümü: 13+/16+/18+, "sosyal medya yeteneği" sorusu → Hayır).
- AB DSA tacir bilgisi (adres/telefon/e-posta) — girilmezse AB mağazalarından düşer.
- Review notları + demo hesap (giriş duvarı) + davet linki senaryosu.
- Sign in with Apple: Services ID, hesap silmede `revoke` çağrısı.

**Google Play Console**
- Data safety formu (tablo §0 ile birebir), hesap silme web linki, gizlilik politikası URL'si.
- IARC anketi; hedef kitle 13+ (Families değil).
- Target API 36 (31 Ağu 2026 sonrası); 16 KB page size (WebRTC native modülü kontrol).
- Yeni bireysel hesap ise kapalı test: 12 tester × 14 gün. Org hesabı ise D-U-N-S.
- Destek e-postası; feature graphic 1024×500; ikon 512×512; ekran görüntüsü 2–8.
- Android 16 edge-to-edge zorunlu → tüm ekranlar safe-area insets ile; predictive back.

**Mağaza görselleri (ortak)**
- iPhone 6.9" 1320×2868 (1–10), iPad 13" 2064×2752 (varsa); Android telefon 1080×2340 önerilen.
- Kısa açıklama 80 (Play) / alt başlık 30 (Apple); anahtar kelime 100 (Apple); açıklama 4000.

## 3. İzinlerin akıştaki yeri (tasarım kararı)

- Açılışta **hiçbir izin istenmez**. Konum izni yalnız "Sen neredesin?" alanına dokununca (Yeni buluşma / Katıl); önce O3 ön-ekranı, sonra sistem diyaloğu.
- Mikrofon yalnız "Sesli sohbete katıl" düğmesinde; önce O7 alt sayfası.
- Bildirim izni: **bu sürümde yok** (push altyapısı yok). Live Activity (iOS) / Live Update (Android 16) bildirim izni istemez; sonraki iz.
- Analitik rızası: onboarding'de sorulmaz; Ayarlar'da anahtar (varsayılan kapalı).

## 4. Açık konular (kullanıcı kararı)

1. Apple girişi backend'de yok (web parity dokümanı "kaldırıldı" demişti). App Store için **geri gelmesi şart** → B izine K-görevi: Apple id doğrulama + hesap birleştirme (aynı e-posta).
2. Hesap silme ucu backend'de yok → B izine K-görevi (`DELETE /api/me` + 30 gün grace mi anında mı: öneri anında, oturum kayıtları anonimleştirilir).
3. Bildir/engelle backend'i yok → B izine K-görevi (rapor kaydı + engel listesi; sesli sohbette engellenen kişi P2P eşleşmesine alınmaz).
4. Tacir bilgisi: gerçek kişi mi şirket mi? Adres/telefon mağazada görünür olacak.
5. Analitik: mobilde Clarity/GA4 gerçekten gerekli mi? Kapalı başlatma önerisi kabul edilirse Consent Mode entegrasyonu gerekir.

## 5. Web karşılıkları (2026-09-06 gece, Web Ekranlar v3'e eklendi)

| Web rotası | Artboard | Neden web'de de şart |
|---|---|---|
| `/account` | W13 (1280 + 390) | Apple 5.1.1: gizlilik/şartlar erişimi; Play: hesap yönetimi |
| `/privacy`, `/terms`, `/kvkk` (+ `/attributions`) | W14, W15, W16, W17 | Her iki mağaza meta verisinde **herkese açık URL** ister; anonim erişim |
| `/account/delete` | W18 (1280 + 390 ×3) | Play Data safety formundaki "hesap silme URL'si": uygulama kurulu olmadan çalışmalı; kimlik doğrulama Google/Apple ile |
| `/support` | W19 | Play destek e-postası; Apple Support URL; DSA tacir bilgisi |
| Bildir / engelle | W20 | Apple 1.2 UGC; web'de aynı katılımcı satırı uzun basma/menü |

## 6. Mağazaların kullanıcıya dönük isteklerinin tam listesi (BumpInto kapsamı)

Uygulama içinde görünmesi gerekenler: giriş alternatifi (Apple), gizlilik politikası linki, kullanım
şartları/EULA (UGC sıfır tolerans), hesap silme akışı, izin ön-bilgilendirmeleri (konum, mikrofon),
izin reddi kurtarma yolları, destek/iletişim, üçüncü taraf veri atıfları, bildir/engelle, KVKK
aydınlatma + açık rıza (TR), analitik rızası (AB). Uygulama içinde **gerekmeyen** ama sorulan: yaş kapısı
(13+ hedef kitle, çocuk içeriği yok → gerekmez), ATT (takip yok → gerekmez), abonelik/ödeme şartları
(satın alma yok), bildirim izni (push yok), arka plan konum (yok), kamera/fotoğraf (yok).
Mağaza tarafı (kullanıcı görmez, formda beyan): App Privacy / Data safety, PrivacyInfo.xcprivacy,
IARC/age rating, export compliance, tacir bilgisi, demo hesap + review notu, ekran görüntüleri/ikon/
feature graphic, kategori, kapalı test (Play yeni bireysel hesap), target API 36 + 16 KB page size.
