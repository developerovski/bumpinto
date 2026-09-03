# Web Paritesi — Web = Tam Ürün: Tasarım

Tarih: 2026-09-01 · Durum: kullanıcı onaylı tasarım (spec incelemesi bekliyor) · Revizyon 2 (harita + oturum tipi)
Kapsam: web uygulamasının ürün rolü, bilgi mimarisi, masaüstü yerleşimi, dil seçici, oturum tipleri
(Grup / Bireysel), harita katmanı ve bunların gerektirdiği API eklemeleri. Mobil davranışı yalnız
"parite" gereği değişir (§9). Bu spec, `2026-08-31-bumpinto-mvp-design.md` §2 ve §10'u günceller.

## 1. Karar günlüğü (2026-09-01, kullanıcı ile)

| Karar | Seçim | Not |
|---|---|---|
| Web'in rolü | **Web ve mobil tüm fonksiyonları eşit destekler** | Host oturumu web'de de kurar/yönetir |
| Masaüstü yerleşimi (≥1024) | **Uyarlanabilir iki bölge** | Üst çubuk + 58/42 bölge; mobilde tek sütun |
| 15 etkinlik türünün seçimi | **Kategori grupları + SVG ikon** | Yeme-içme · Hareket · Kültür · Eğlence; M-1 bulgu #1, #4, #5, #6 kapanır |
| Varsayılan dil | **en** | Spec §1 "ilk pazar Hollanda". Bugünkü `fallbackLng: "tr"` değişir |
| Apple girişi | **MVP dışı** | Backend yalnız Google. Landing ve mobil 01'den kaldırılır |
| Ortak nokta (06) + Karar (08) | **Web'de tek Karar ekranı** | Kesişim 1 ise kutlama başlığı + "3/3 beğendi!" |
| "Gruba paylaş" | **Metin + link** | Görsel paylaşım kartı MVP'de çizilmez |
| **Oturum tipi** | **Host Yeni buluşma'da seçer: Grup / Bireysel** | Grup: linkle katılım, deste. Bireysel: elle konum, deste yok, haritadan seçim |
| **Harita** | **Gerçek harita: Google Maps** (web Maps JS API, mobil react-native-maps Google sağlayıcısı) | Google Maps Platform şartları Places içeriğini Google dışı haritayla yasaklar; haritasız kullanım serbest. Foursquare mekanları aynı haritada gösterilir. Önceki "soyut illüstrasyon" kararı iptal |
| **Mekanlar durumu + Karıştır** | **Deste açılmadan önce herkes mekanları harita ve listede görür; host "Karıştır" deyince deste açılır** | Kaydırma kaybolmaz, başlangıcı değişir. Karıştır deste sırasını herkes için aynı rastgele sıraya sokar |
| Kaydırma aşamasında harita | **Yok** | Deste + Liste bugünkü gibi; harita Mekanlar, Lobi, Katıl, Bekle ve Karar'da |
| Bireysel karar | **"Bunu seç" → mevcut force-decision** | Runoff yok |
| Grup'ta doğrudan seçim | **Host, Mekanlar ekranında da bir mekanı doğrudan seçebilir** | Küçük gruplar için kısayol; endpoint zaten var |
| Gizlilik | **Katılımcı konumu ~1 km yuvarlanmış gösterilir** | Sunucu tam koordinatı yalnız hesap için tutar. Katıl notu güncellenir |
| Bireysel → Grup dönüşümü | **MVP dışı** | Bireysel oturuma sonradan link atılmaz |

## 2. Kapsam

**İçinde:** web bilgi mimarisi ve rotalar; uygulama kabuğu; oturum tipi seçimi; Mekanlar durumu
(harita + liste); harita katmanı ve pin dili; 12 ekran + durumlar için 1280 ve 390 artboard çiftleri;
dil seçici; etkinlik seçici + ikon seti + grup tint'leri; API eklemeleri listesi.

**Dışında:** kod (W-3, B-5, M-1 düzeltme planlarında); harita üzerinde rota çizimi; canlı konum
takibi; seyahat süresi eşitlemeli orta nokta; görsel paylaşım kartı; Apple girişi; push bildirim;
Bireysel → Grup dönüşümü; mobil ekranların yeniden çizimi (yalnız §9'daki noktasal düzeltmeler).

## 3. Rotalar, oturum tipleri ve durum akışı

| Rota | Kimlik | Görünüm |
|---|---|---|
| `/` | çıkış yapılmış | **Landing** (mobil 01'in hero kopyası + "Google ile devam et") |
| `/` | giriş yapılmış | `/sessions`'a yönlendirir |
| `/sessions` | giriş gerekli | **Oturumlar**: açık + geçmiş; boş durum |
| `/sessions/new` | giriş gerekli | **Yeni oturum**: tip seçimi Grup / Bireysel |
| `/profile` | giriş gerekli | **Profil** |
| `/j/:slug` | herkes | **Tek oturum rotası.** Görünüm tip, rol ve duruma göre |
| eşleşmeyen | herkes | **404** |

Durum akışı (`SessionStatus`): `COLLECTING → SUGGESTING → BROWSING → SWIPING → RUNOFF → DECIDED`.
`BROWSING` yenidir ("Mekanlar"): deste hazır, herkes harita ve listede görür, oy yok.

| Durum | Grup · host | Grup · davetli (katılmamış / katılmış) | Bireysel · host |
|---|---|---|---|
| COLLECTING / SUGGESTING | Lobi | Katıl / Bekle | Yeni oturum (konumlar) → "Mekanları bul" |
| BROWSING | **Mekanlar**: liste + harita, CTA "Karıştır ve kaydır", karttan "Bunu seç" | Katıl / **Mekanlar** (salt okunur, "host karıştırınca deste açılır") | **Mekanlar**: liste + harita, karttan "Bunu seç" |
| SWIPING | Deste (+ Liste) | Katıl (geç katılım) / Deste | — |
| RUNOFF | Runoff | Katıl / Runoff | — |
| DECIDED | Karar | Karar (salt okunur, viral blok) | Karar |
| süresi dolmuş / bulunamadı | Hata | Hata | Hata |

Rol çözümü: `SessionView.participants[].host` + kişinin kendi katılımcı kimliği. Host'un katılımcı
token'ı zaten oturum kurarken çerezle teslim ediliyor (`SessionController.create`).

**Karıştır (shuffle):** yalnız host, `BROWSING → SWIPING`; `Venue.deckOrder` herkes için aynı
sıraya yeniden yazılır, `deckReady` olayı yayınlanır. **Sıra (rev 3, 2026-09-03): adalet öncelikli** —
en uzun yol artan, fark artan, 5 dk bantları içinde `Random(session.id)`; liste de aynı sırayı
kullanır (Segmented "Herkese adil · Puan"). Tanım: `2026-09-03-map-free-group-decision-ux.md` §4.5.

**Bireysel oturum:** `sessionType = SOLO`. Host kendi konumu + elle eklediği konumlarla ("Ayşe ·
Someren") ≥2 nokta sağlar; elle konumlar `manual=true` katılımcıdır (token yok, kaydırmaz). Davet
linki üretilmez, Lobi yok. Mekanlar ekranında "Bunu seç" → `force-decision` → Karar.

## 4. Uygulama kabuğu

- **Üst çubuk** (her ekranda, 64px): solda wordmark, sağda giriş yapmışsa "Oturumlar", dil menüsü
  (`TR ▾`), avatar menüsü (Profil, Çıkış yap). Anonim davetli yalnız wordmark + dil. Alt gezinme yok.
- **İçerik**: `max-width 1120px`, yatay boşluk 24px (mobil) / 48px (≥1024).
- **İki bölge** (≥1024): `grid-template-columns: 58fr 42fr`, boşluk 40px; harita ağırlıklı ekranlarda
  (Mekanlar) bölgeler **42/58** olur, harita sağda ve daha geniş. Hata ve boş durumlar tek bölge,
  ortalanmış, `max-width 34rem`.
- **Kırılımlar**: 390 (mobil), 768 (tablet: tek sütun), 1280 (masaüstü artboard).
- **Tipografi**: display 46px (≥1024) / 34px (mobil); başlık 24/21; gövde 16.
- DS v2 kuralları aynen geçerli; iki bölge tek ekran sayılır.

### 4b. Harita katmanı (tüm platformlarda aynı dil)

- **Stil:** Google Maps, tek stil JSON: paper tonları, POI etiketleri kapalı, yalnız yol ve yerleşim.
  Mockup'larda harita yer tutucudur ("Google Maps · gerçek döşeme" etiketi); gerçek döşeme kodda.
- **Pinler:** katılımcı = story-ring'li avatar pini (~1 km yuvarlanmış); elle konum = kesik çizgili
  avatar pini; orta nokta = alev pin + kesikli yarıçap halkası; mekan = puan etiketli beyaz rozet pin,
  seçili/beğenili = alev dolgu. Bir pin seçiliyken üstünde mekan kartı açılır (fotoğraf, ad, puan, yol
  süreleri, eylem).
- **Liste ↔ harita:** listede karta gelince pin büyür, pine tıklayınca kart listede öne çıkar.
- **Mobil:** Mekanlar ekranı tam ekran harita + altta yatay kaydırılan kart şeridi; "Liste / Harita"
  anahtarı üstte; host CTA'sı alt çubukta sabit.
- Rota çizimi yok; "Yol tarifi al" Google Maps'e açar.

## 5. Ekran envanteri

Artboard kimlikleri `W0…W11`; her biri `1280` ve `390` çifti. `data-screen-label` değeri
"`<ad> 1280`" / "`<ad> 390`" (planlar bloğu bu öznitelikten bulur).

| ID | Ekran | Sol bölge (≥1024) | Sağ bölge (≥1024) | Durumlar | Kaynak |
|---|---|---|---|---|---|
| W0 | Landing | Hero kopya, "Google ile devam et", koşul notu | Polaroid deste illüstrasyonu + 3 adım | — | mobil 01 |
| W1 | Oturumlar | Açık oturum kartları | Geçmiş buluşmalar; üstte "Yeni buluşma kur" | boş durum | mobil 02 |
| W2 | Yeni oturum | **Tip seçimi Grup / Bireysel**, etkinlik grupları, isim; Bireysel'de "Konumlar" listesi + "Konum ekle" | **Canlı harita**: pinler + orta nokta; Grup'ta davetlinin göreceği önizleme | 1280 = Bireysel, 390 = Grup | mobil 03 |
| W3 | Lobi (Grup host) | Davet linki kartı + katılımcı listesi | **Harita** (katılımcı pinleri, orta nokta) + "Mekanları bul" | <2 konum: CTA kapalı | mobil 04 |
| W3b | Mekanlar (Grup) | Mekan kartları (puan sırası); host'ta karttan "Bunu seç" | **Harita** (mekan + katılımcı pinleri, seçili pin kartı); host CTA "Karıştır ve kaydır" | davetli: salt okunur + "host karıştırınca deste açılır" | yeni |
| W3c | Mekanlar (Bireysel) | Mekan kartları, her kartta "Bunu seç" | **Harita** + elle pinler | seçim → Karar | yeni |
| W4 | Katıl (davetli) | Davet başlığı + form; **konum otomatik dolmuş** | "Kimler var" + **harita** (kendi pini düşer) | 390 = izin reddi + adres; hata kopyaları | eski W1 |
| W5 | Bekle (davetli) | Katıldın kartı + katılımcılar | **Harita** + "Deste hazırlanıyor" + "Konumumu değiştir" | güncelleme hatası | eski W2 |
| W6 | Deste | Polaroid yığını, 3 aksiyon, klavye ipuçları | "Beğendiklerin", ilerleme, "Hepsini gör" | Deste bitti; liste modu | eski W3 |
| W7 | Runoff | Finalistler yan yana polaroid | "2/3 seçti", "Seçimimi kilitle", kilitli hâl | kilitli | mobil 07 |
| W8 | Karar | Kazanan polaroid, adres, "Yol tarifi al" | Herkesin yol süresi, **harita** (kazanan pin + katılımcılar), "Gruba paylaş", viral blok | kesişim-1 kutlaması; davetli salt okunur | mobil 06+08, eski W4 |
| W9 | Profil | Kimlik + istatistik | Tercihler: konum, etkinlik, dil; veri notu; "Çıkış yap" | — | mobil 09 |
| W10 | Hata | Tek bölge | — | bulunamadı / süresi dolmuş / 404 | yeni |
| W11 | Dil varyantları | W4 ve W2'nin **EN** ve **NL** hâlleri | — | — | en/nl onayı |

Notlar:
- W6 "Deste bitti" ve "liste modu" sol bölgeyi değiştirir; sağ bölge sabit kalır.
- W8 viral blok: davetli için "Buluşma kur" → `/`; host için "Yeni buluşma kur" → `/sessions/new`.
- Katıl gizlilik notu: "Konumun bu buluşma için kullanılır ve gruba haritada yaklaşık gösterilir."

## 6. Dil (i18n)

- Üst çubukta **TR / EN / NL** menüsü, her ekranda, anonim dahil.
- Giriş yapmış kullanıcı: tercih **sunucuda** (`/api/me.language`). Anonim davetli: `?lng=` URL
  parametresi; storage'a yazılmaz.
- Algılama sırası: `querystring` → sunucu tercihi (giriş varsa) → `navigator` → **fallback en**.
- `<html lang>` ve `<title>` seçime göre güncellenir.
- Onay artefaktı: W11 (Katıl ve Yeni oturum EN/NL). en/nl JSON'larındaki `_status` işareti bu
  artboard'lar onaylanınca düşer.

## 7. Etkinlik seçici, ikon seti, tint'ler

| Grup | Türler (`ActivityType`) | Tint |
|---|---|---|
| Yeme-içme | COFFEE Kahve · FOOD Yemek · BAR Bar | `pA` sıcak turuncu |
| Hareket | WALK Yürüyüş · HIKE Doğa yürüyüşü · SWIM Yüzme · FITNESS Fitness · ADVENTURE Macera | `pB` yeşil |
| Kültür | CINEMA Sinema · MUSEUM Müze · ART Sanat | `pC` mor |
| Eğlence | ACTIVITY **Bowling** · GAMES Oyun · THEME_PARK Tema parkı · NIGHTLIFE Gece hayatı | `pD` güneş (yeni) |

- Chip: 44px, ikon 18px Phosphor regular; masaüstünde gruplar 2 sütun, mobilde alt alta; "+n" yok.
- İkon seti DS v2'de (§09). Emoji yasağı sürer.
- Fotoğrafsız deste kartı gradyanı oturumun grubuna göre; aynı destede `pA/pB/pC/pD` sırayla döner.
- Profil "Varsayılan etkinlik": aynı gruplu seçici açılır panelde.

## 8. API bağımlılıkları (B-5 planına girer)

| # | Ekleme | Kullanan |
|---|---|---|
| 1 | `GET /api/sessions` — hostu ben olan oturumlar: açık + geçmiş (slug, name, activityType, sessionType, status, createdAt, participantCount, decidedVenueName) | W1 |
| 2 | `GET/PUT /api/me` — displayName, email, defaultLocation{lat,lng,label}, defaultActivity, language; istatistikler | W9, kabuk, dil |
| 3 | `POST /api/auth/logout` — `bumpinto_at` çerezini siler | kabuk |
| 4 | `CreateSessionRequest.sessionType` (GROUP / SOLO); `SessionView.sessionType` | W2, rota mantığı |
| 5 | `SessionStatus.BROWSING`; `findVenues` `SWIPING` yerine `BROWSING`'de biter | W3b, W3c |
| 6 | `POST /api/sessions/{slug}/shuffle` — host; `BROWSING → SWIPING`; `deckOrder` rastgele; `deckReady` | W3b |
| 7 | `POST/DELETE /api/sessions/{slug}/points` — host; `{label, lat, lng}` → `manual=true` katılımcı; karar motoru popülasyonundan hariç, orta nokta hesabına dahil | W2 (Bireysel), W3c |
| 8 | `ParticipantDto.approxLocation{lat,lng}` (2 ondalık) + `locationLabel` (şehir) + `manual` | W2–W5, W8 haritaları |
| 9 | `SessionView.midpoint{lat,lng}` + `radiusKm` — konumu olan ≥2 nokta varsa | W2–W5 |
| 10 | Google Maps anahtarları: web (HTTP referrer kısıtlı, Maps JS), Android/iOS (react-native-maps) | tüm harita ekranları |

Mevcut ve yeterli: web host girişi (`X-Client: web` → HttpOnly `bumpinto_at`), oturum kurma,
`find-venues`, `force-decision` ("Bunu seç" bunu kullanır), swipe/undo/deck-done/runoff-votes,
`voteTally`, `VenueDto.lat/lng` (mekan pinleri).

Gizlilik: #8 yuvarlanmış koordinattır; tam koordinat sunucuda yalnız orta nokta/yarıçap için.

## 9. Plan etkileri

- **W-3 (yeni):** kabuk + rotalar + oturum tipi + host akışı + Mekanlar ekranı (Maps JS, liste↔pin
  senkronu) + responsive iki bölge + dil menüsü + fallback en + `<html lang>`.
- **B-5 (yeni):** §8'in 10 kalemi; `DecisionEngine` popülasyonu `manual` hariç; Bireysel'de
  `force-decision` tek kişiyle çalışır.
- **M-1 (düzeltme):** cihaz-yerel oturum listesi yerine `GET /api/sessions`; Profil `/api/me`'den;
  01'den Apple çıkar; 03'e tip seçimi + gruplu chip; yeni Mekanlar ekranı (react-native-maps);
  Lobi/Karar haritaları gerçek; "Aktivite" → "Bowling"; grup tint'leri.
- **Ana spec:** §2 adım 1 ve §10 güncellendi (yapıldı); §2'ye Mekanlar durumu + Bireysel tip eklenir.
- **INDEX:** W-3 ve B-5 satırları; W-3 bağımlılığı görev bazında `B-5:T…`.

## 10. Teslimat (Claude Design)

- `719fcd5f-…/Web Ekranlar v2.dc.html` **üstüne yazılır**: W0–W11 çiftleri + W3b/W3c.
- `b536b3aa-…/Design System v2.dc.html`: 06 Kabuk, 07 Yerleşim, 08 Etkinlik seçici, 09 İkon seti
  (yapıldı) + **10 Harita dili** (pinler, stil kuralı, ToS notu).
- Eski "Web Ekranlar.dc.html" ve mobil dosyalar dokunulmaz; mobil düzeltmeleri M-1'de.

## 11. Açık konular

- Landing'in pazarlama derinliği: MVP'de hero + 3 adım.
- `GET /api/sessions` geçmiş sınırı ve B-3 silme ilişkisi: silinen oturum listeden düşer.
- Tablet (768) için ayrı artboard yok; tek sütun + geniş boşluk kuralı yeterli.
- Google Maps kotası: SKU başına aylık 10.000 ücretsiz çağrı (Essentials, Mart 2025 modeli); harita
  yüklemesi oturum başına 1 kabul edildi, izleme I-1 yayın kontrol listesine girer.

Kaynaklar: Google Maps Platform Terms (cloud.google.com/maps-platform/terms), Service Specific Terms
(…/maps-service-terms), Pricing (mapsplatform.google.com/pricing).
