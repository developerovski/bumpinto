# Web Paritesi — Web = Tam Ürün: Tasarım

Tarih: 2026-09-01 · Durum: kullanıcı onaylı tasarım (spec incelemesi bekliyor)
Kapsam: web uygulamasının ürün rolü, bilgi mimarisi, masaüstü yerleşimi, dil seçici ve bunların
gerektirdiği API eklemeleri. Mobil davranışı yalnız "parite" gereği değişir (§9).
Bu spec, `2026-08-31-bumpinto-mvp-design.md` §2 ve §10'u günceller; oradaki "host mobilde kurar"
varsayımı kalkar.

## 1. Karar günlüğü (2026-09-01, kullanıcı ile)

| Karar | Seçim | Not |
|---|---|---|
| Web'in rolü | **Web ve mobil tüm fonksiyonları eşit destekler** | Host oturumu web'de de kurar/yönetir. "Web yalnız davetli tarafı" reddedildi |
| Masaüstü yerleşimi (≥1024) | **Uyarlanabilir iki bölge** | Alternatifler: genişleyen tek sütun, kalıcı kenar çubuğu. Üst çubuk + 58/42 bölge; mobilde tek sütun |
| 15 etkinlik türünün seçimi | **Kategori grupları + SVG ikon** | Yeme-içme · Hareket · Kültür · Eğlence. Mobil planı (M-1) bulgu #1'i kapatır; #4, #5, #6 aynı kararla kapanır |
| Varsayılan dil | **en** | Spec §1 "ilk pazar Hollanda, UI İngilizce başlar". Bugünkü `fallbackLng: "tr"` değişir |
| Apple girişi | **MVP dışı** | Backend yalnız Google. Landing ve mobil 01'den kaldırılır |
| Ortak nokta (06) + Karar (08) | **Web'de tek Karar ekranı** | Kesişim 1 ise kutlama başlığı + "3/3 beğendi!" çıkartması aynı ekranda |
| "Gruba paylaş" | **Metin + link** (Web Share API / kopyala) | Görsel paylaşım kartı MVP'de çizilmez |
| Lobi/Katıl'daki harita | **Soyut orta nokta illüstrasyonu** | Gerçek harita döşemesi MVP dışı; illüstrasyon API'nin vereceği orta nokta + şehir etiketleriyle çizilir |

## 2. Kapsam

**İçinde:** web bilgi mimarisi ve rotalar; uygulama kabuğu; 10 ekran + hata sayfaları için 1280 ve
390 artboard çiftleri; dil seçici; etkinlik seçici + ikon seti + grup tint'leri; bu tasarımın
varsaydığı API eklemelerinin listesi.

**Dışında:** kod (W-3, B-5, M-1 düzeltme planlarında); gerçek harita; görsel paylaşım kartı;
Apple girişi; push bildirim; mobil ekranların yeniden çizimi (yalnız §9'daki noktasal düzeltmeler).

## 3. Rotalar ve rol mantığı

| Rota | Kimlik | Görünüm |
|---|---|---|
| `/` | çıkış yapılmış | **Landing** (mobil 01'in hero kopyası + "Google ile devam et"). Ayrı giriş ekranı yok |
| `/` | giriş yapılmış | `/sessions`'a yönlendirir |
| `/sessions` | giriş gerekli | **Oturumlar**: açık + geçmiş; boş durum |
| `/sessions/new` | giriş gerekli | **Yeni oturum** |
| `/profile` | giriş gerekli | **Profil** |
| `/j/:slug` | herkes | **Tek oturum rotası.** Görünüm role ve duruma göre (aşağıda) |
| eşleşmeyen | herkes | **404** |

`/j/:slug` içindeki görünüm seçimi:

| Durum | Host | Davetli (katılmamış) | Davetli (katılmış) |
|---|---|---|---|
| COLLECTING / SUGGESTING | Lobi | Katıl | Bekle |
| SWIPING | Deste | Katıl (geç katılım) | Deste |
| RUNOFF | Runoff | Katıl | Runoff |
| DECIDED | Karar | Karar (salt okunur, viral blok) | Karar |
| süresi dolmuş / bulunamadı | Hata sayfası | Hata sayfası | Hata sayfası |

Rol çözümü: `SessionView.participants[].host` + kişinin kendi katılımcı kimliği. Host'un katılımcı
token'ı zaten oturum kurarken çerezle teslim ediliyor (`SessionController.create`); ek auth yok.

## 4. Uygulama kabuğu

- **Üst çubuk** (her ekranda, 64px): solda wordmark (Landing'e), sağda giriş yapmışsa
  "Oturumlar" bağlantısı, dil menüsü (`TR ▾`), avatar menüsü (Profil, Çıkış yap). Anonim davetli
  yalnız wordmark + dil menüsü görür. Alt gezinme yok; mobilde de üst çubuk.
- **İçerik**: `max-width 1120px`, yatay boşluk 24px (mobil) / 48px (≥1024).
- **İki bölge** (≥1024): `grid-template-columns: 58fr 42fr`, boşluk 40px. Sol bölge bağlam,
  sağ bölge eylem ya da tersi; her ekranda **tek** birincil CTA. Hata sayfaları ve Landing dışı
  boş durumlar tek bölge, ortalanmış, `max-width 34rem`.
- **Kırılımlar**: 390 (mobil), 768 (tablet: tek sütun, geniş boşluk), 1280 (masaüstü artboard).
- **Tipografi**: display 46px (≥1024) / 34px (mobil); başlık 21/17; gövde 16; DS v2 skalası.
- **Dönüklük bütçesi** ve diğer DS v2 kuralları aynen geçerli; iki bölge tek ekran sayılır
  (≤3 dönük öğe, ≤1 el yazısı notu).

## 5. Ekran envanteri

Artboard kimlikleri `W0…W11`; her biri `1280` ve `390` çifti. `data-screen-label` değeri
"`<ad> 1280`" / "`<ad> 390`" (planlar bloğu bu öznitelikten bulur).

| ID | Ekran | Sol bölge (≥1024) | Sağ bölge (≥1024) | Durumlar | Kaynak |
|---|---|---|---|---|---|
| W0 | Landing | Hero kopya, "Google ile devam et", koşul notu | Polaroid deste illüstrasyonu + 3 adım | — | mobil 01 |
| W1 | Oturumlar | Açık oturum kartları | Geçmiş buluşmalar; üstte "Yeni buluşma kur" | boş durum | mobil 02 |
| W2 | Yeni oturum | Form: gruplu chip'ler, isim, konum, "ben de kaydıracağım" | Canlı önizleme: davetlinin göreceği başlık kartı | konum hatası | mobil 03 |
| W3 | Lobi (host) | Davet linki kartı + katılımcı listesi | Orta nokta illüstrasyonu (şehir etiketli) + "Mekanları bul" | <2 konum: CTA kapalı + not | mobil 04 |
| W4 | Katıl (davetli) | Davet başlığı + form | "Kimler var" avatarları + orta nokta illüstrasyonu | konum alındı; 3 hata kopyası | eski W1 |
| W5 | Bekle (davetli) | Katıldın kartı + katılımcılar | "Deste hazırlanıyor" + "Konumumu değiştir" | güncelleme hatası | eski W2 |
| W6 | Deste | Polaroid yığını, 3 aksiyon, klavye ipuçları | "Beğendiklerin" (yalnız kendi beğenileri), ilerleme, "Hepsini gör" | Deste bitti; liste modu | eski W3 |
| W7 | Runoff | Finalistler yan yana polaroid | "2/3 seçti", "Seçimimi kilitle", kilitli hâl | kilitli | mobil 07 |
| W8 | Karar | Kazanan polaroid, adres, "Yol tarifi al" | Herkesin yol süresi, "Gruba paylaş", viral blok | kesişim-1 kutlaması; davetli salt okunur | mobil 06+08, eski W4 |
| W9 | Profil | Kimlik + istatistik | Tercihler: konum, etkinlik, dil; veri notu; "Çıkış yap" | — | mobil 09 |
| W10 | Hata | Tek bölge: illüstrasyon + kopya + "Ana sayfa" | — | bulunamadı / süresi dolmuş / 404 | yeni |
| W11 | Dil varyantları | W4 ve W2'nin **EN** ve **NL** hâlleri, 1280 + 390 | — | — | en/nl onayı için |

Notlar:
- W6 "Deste bitti" ve "liste modu" sol bölgeyi değiştirir; sağ bölge sabit kalır.
- W8 viral blok: davetli için "Buluşma kur" → `/` (Landing); host için "Yeni buluşma kur" →
  `/sessions/new`. Mevcut `href="/"` çıkmaz sayfa sorunu böyle kapanır.
- Mobil 06 (Ortak nokta) web'de ayrı ekran değildir; W8'in kesişim-1 hâlidir.

## 6. Dil (i18n)

- Üst çubukta **TR / EN / NL** menüsü, her ekranda, anonim dahil.
- Giriş yapmış kullanıcı: tercih **sunucuda** (`/api/me.language`), Profil'deki "Dil" satırı aynı
  kaynağı düzenler. Anonim davetli: `?lng=` URL parametresi; storage'a yazılmaz (mevcut kural).
- Algılama sırası: `querystring` → sunucu tercihi (giriş varsa) → `navigator` → **fallback en**.
- `<html lang>` ve `<title>` seçime göre güncellenir (a11y: ekran okuyucu telaffuzu).
- Onay artefaktı: W11 (Katıl ve Yeni oturum EN/NL). en/nl JSON'larındaki `_status` işareti bu
  artboard'lar onaylanınca düşer.

## 7. Etkinlik seçici, ikon seti, tint'ler

| Grup | Türler (`ActivityType`) | Tint |
|---|---|---|
| Yeme-içme | COFFEE Kahve · FOOD Yemek · BAR Bar | `pA` sıcak turuncu |
| Hareket | WALK Yürüyüş · HIKE Doğa yürüyüşü · SWIM Yüzme · FITNESS Fitness · ADVENTURE Macera | `pB` yeşil |
| Kültür | CINEMA Sinema · MUSEUM Müze · ART Sanat | `pC` mor |
| Eğlence | ACTIVITY **Bowling** · GAMES Oyun · THEME_PARK Tema parkı · NIGHTLIFE Gece hayatı | `pD` güneş (yeni) |

- Chip: 46px, ikon 18px Phosphor (regular), seçili = `flame-w` zemin + `flame-deep` sınır.
  Masaüstünde gruplar 2 sütun, mobilde 4 kısa blok; sarma serbest, "+n" yok.
- İkon seti DS v2'ye eklenir: 15 etkinlik + arayüz ikonları (globe, chevron, copy, undo, x,
  heart, check, map-pin, sign-out). Emoji yasağı sürer.
- Fotoğrafsız deste kartı gradyanı **oturumun etkinlik grubuna** göre seçilir, monogram kalır.
  Aynı deste içinde `pA/pB/pC/pD` sırayla döner (M-1 bulgu #3 kapanır).
- Profil "Varsayılan etkinlik": aynı gruplu seçici açılır panelde (M-1 bulgu #4).

## 8. API bağımlılıkları (B-5 planına girer)

| # | Ekleme | Kullanan ekran |
|---|---|---|
| 1 | `GET /api/sessions` — hostu ben olan oturumlar: açık + geçmiş (slug, name, activityType, status, createdAt, participantCount, decidedVenueName) | W1 |
| 2 | `GET/PUT /api/me` — displayName, email, defaultLocation{lat,lng,label}, defaultActivity, language; istatistikler (kurulan, görülen dost) | W9, kabuk, dil |
| 3 | `POST /api/auth/logout` — `bumpinto_at` çerezini siler | kabuk |
| 4 | `ParticipantDto.locationLabel` — şehir seviyesinde etiket (katılırken istemcinin verdiği/geocode ettiği ad; ters geocode yok) | W3, W4, W5, W8 |
| 5 | `SessionView.midpoint{lat,lng}` + `radiusKm` — COLLECTING'de ≥2 konum varsa hesaplanmış | W3, W4 illüstrasyonu |

Mevcut ve yeterli: web host girişi (`X-Client: web` → HttpOnly `bumpinto_at`), oturum kurma,
`find-venues`, `force-decision`, swipe/undo/deck-done/runoff-votes, `voteTally`.

Gizlilik notu: #4 yalnız şehir adıdır, koordinat paylaşılmaz; spec §6 "ad + konum" saklama
ilkesiyle uyumlu.

## 9. Plan etkileri

- **W-3 (yeni):** kabuk + rotalar + host akışı + responsive iki bölge + dil menüsü + fallback en +
  `<html lang>`; W6/W8 durumlarının artboard'a göre yeniden düzenlenmesi.
- **B-5 (yeni):** §8'in 5 kalemi.
- **M-1 (düzeltme, plan yürütülmeden):** cihaz-yerel oturum listesi yerine `GET /api/sessions`;
  Profil satırları `/api/me`'den; 01'den Apple girişi çıkar; 03 gruplu chip; "Aktivite" → "Bowling";
  grup tint'leri. M-1'in "karar gerekiyor" tablosundaki #1, #3, #4, #5, #6 bu spec ile kapanır;
  paylaşım kartı kararı §1.
- **Ana spec:** §2 adım 1 "host mobilde" → "host web'de ya da mobilde"; §10'a web ekran listesi.
- **INDEX:** W-3 ve B-5 satırları; W-3 bağımlılığı `B-5` (yalnız W1/W9/W3-illüstrasyon
  görevleri için `B-5:T…`, kalanı hemen koşabilir).

## 10. Teslimat (Claude Design)

- `719fcd5f-…/Web Ekranlar v2.dc.html` **üstüne yazılır** (ayrı sürüm açılmaz): W0–W11 çiftleri.
- `b536b3aa-…/Design System v2.dc.html`'e eklenir: üst çubuk (2 hâl), dil menüsü, gruplu chip
  seti, ikon seti, `pD` tint, iki bölge grid kuralı, masaüstü tip skalası.
- Eski "Web Ekranlar.dc.html" ve mobil dosyalar dokunulmaz; mobil düzeltmeleri M-1 yürütülürken
  §9'a göre yapılır.

## 11. Açık konular

- Landing'in pazarlama derinliği: MVP'de hero + 3 adım. SEO/landing genişletmesi ayrı iş.
- `GET /api/sessions` geçmiş sınırı (ör. son 20) ve 30 günlük silme (B-3) ile ilişkisi: silinen
  oturum listeden düşer; "Doldu / karar çıkmadı" etiketi `status` + `decidedVenueId`'den türetilir.
- Tablet (768) için ayrı artboard çizilmez; tek sütun + geniş boşluk kuralı yeterli kabul edildi.
