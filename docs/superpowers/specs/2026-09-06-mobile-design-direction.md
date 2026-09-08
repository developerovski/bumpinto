# Mobil tasarım yönü — rakip analizi, mevcut tasarım eleştirisi, kararlar (2026-09-06)

Amaç: M izine (Expo/RN) başlamadan önce mobil artboard setinin **neyi değiştireceğini** ve neyi
web'den aynen taşıyacağını sabitlemek. Kaynaklar: web v2 artboard'ları (`719fcd5f-…/Web Ekranlar
v2.dc.html`, 41 artboard), kod envanteri (2026-09-04..06 özellikleri), iki tek-turlu rakip
araştırması (doğrudan rakipler + komşu ürünler/etkileşim kalıpları), uyumluluk dokümanı
`2026-09-06-mobile-store-compliance.md`. Ürün tezi değişmez: **adalet → ilgi uyumu → uzlaşma →
ortak an**; restoran Tinder'ı değil.

## 1. Rakipler — kısa teardown

| Ürün | Ne yapıyor | İyi | Eksik (BumpInto'nun boşluğu) |
|---|---|---|---|
| WhatsHalfway (web+iOS, 4.7★/682) | 2+ adres → orta nokta + mekan listesi | Adressiz başlangıç, 30+ ülke, hız/mesafe seçeneği | Oylama yok, çok-modlu adalet yok; bisiklet/yürüyüş paywall'da |
| MeetWays (web) | 2 adres + tür → liste → tarif | Hesapsız, e-postayla paylaşım | 3+ kişi zayıf, tek karar verici |
| Halfway App (Sedier, iOS, yeni) | Adil nokta + mekan → RSVP/takvim → foto albümü | Adalet + hatırlama birleşimi; **en yakın rakip** | Swipe/oylama yok (browse); kanıtlanmış çekiş yok |
| MunchiMatch / BiteSwipe (iOS, yeni) | Oturum → kod/QR ile davet → swipe → ilk ortak eşleşme | Tie-breaker mini-oyun, "Nudges", bekleme trivia'sı, 6 haneli kod | Yalnız restoran; orta nokta/adalet yok; erken lider etkisi |
| Google Maps ortak listeler | Liste paylaş, herkes yer ekler | Kullanıcı tabanı | Tek yönlü senkron, oylama yok |
| Apple Maps Collaborative Guides | iCloud ile gerçek zamanlı ortak liste | Gerçek senkron | Yalnız Apple, karar katmanı yok |
| Swarm "Plans" | Arkadaşa plan at | — | **Kaldırıldı**: karar katmanı olmayan "plan at" tutmuyor |
| Partiful / Luma / Rallly (komşu) | Davet sayfası, hesapsız RSVP/oy, kapanış anı | Davetin kendisi eğlenceli; "kim geliyor" sosyal kanıt; net kapanış | Konum/adalet yok |

**Sonuç:** Kategori parçalı; hiçbir oyuncu *çok-modlu adalet + gizli oy + kesişim/runoff + "neden
burası" + isteğe bağlı ses* zincirini kapsamıyor. Sahiplenilecek üç fark: (1) çok-modlu adalet
hesabı, (2) gizli oy → kesişim → runoff → şeffaf gerekçe, (3) adalet + hafıza + gerekçe tek üründe.
İzlenecek rakip: Halfway App (Sedier).

## 2. Mevcut tasarımlar yeterli mi?

**Kısa cevap: kimlik ve akış doğru, mobil için yeterli değil.** Web v2 artboard'ları "mobil web"
çizimi; native uygulama için kabuk, izin akışları, bekleme anları ve son üç haftanın özellikleri
(presence, çapalı oturum, çoklu etkinlik, sesli sohbet, 100 km kuralı) hiç çizilmemiş.

**Güçlü (korunur):** kağıt + alev + Bricolage/Figtree/Caveat + çıkartma + eğik polaroid kimliği
şablon gibi durmuyor; adalet dili (Herkese ~aynı · fark 10 dk · en uzun yol Kerem) rakiplerde yok;
kopya sıcak ve somut; ekran başına tek CTA; adım şeridi.

**Zayıf (ölçülmüş):**
1. **Rozet çorbası** — mekan satırında 10–11px 5–6 rozet; 12px alt sınırının altında, mobilde
   taranmıyor.
2. **Kontrast** — üstlük rengi `ink3` kağıt üzerinde **2.50:1** (AA 4.5); amber rozet 3.96; pembe
   rozet metni 4.04. Üçü de düzeltilmeli.
3. **Foto boşluğu** — gradyan+monogram; "açık mı / kaça kadar" (`venue.hoursToday` var) çizilmemiş;
   karar mekânı hissettirmiyor.
4. **Karar anı zayıf** — yedi blok, 12px çıkartma; paylaşılan şey düz metin.
5. **Bekleme ekranları pasif** — Bekle/Gönderildi/Runoff-kilitli metin duvarı; canlı presence
   çizilmemiş; yapacak şey yok → uygulama kapanır.
6. **Kabuk web'den kalma** — wordmark + dil menüsü + avatar; native başlık/geri/sistem paylaşımı yok.
7. **Deste geri bildirimi yok** — sürüklerken damga, haptik, kart sayacı hiyerarşisi.
8. **Giriş ekranı mekaniği göstermiyor**.

## 3. Daha ilgi çekici — 8 iyileştirme (etki/maliyet)

Rakip araştırmasından ödünç alınan, adalet teziyle çelişmeyen kalemler. **Reddedilenler:** streak,
puan/rozet/liderlik, sahte aciliyet geri sayımı, erken oy ifşası, sonsuz keşif akışı, utandıran push.

| # | İyileştirme | Akış noktası | Neden | Maliyet |
|---|---|---|---|---|
| 1 | **Yol çubuğu** (rozet yerine kişi başı yatay mini-bar + fark; en uzun yol vurgulu) | Mekanlar, Deste, Liste, Runoff, Karar | Adalet tek bakışta; 12px+ metin; Rallly'nin "herkes kendi ETA'sını görür" netliği | S |
| 2 | **Canlı lobi**: avatar çevrimiçi noktası, gelen kişinin karta "düşmesi", link kartının paylaşımdan sonra küçülmesi, roster'ın büyümesi | Lobi, Bekle | Partiful sosyal kanıt + BeReal eşzamanlılık; presence backend'de zaten var | S–M |
| 3 | **Sonuç kartı** (imza): polaroid + herkesin avatarı ve dakikası + adalet satırı, görsel olarak paylaşılır; "Gruba paylaş" bunu gönderir | Karar | Spotify Wrapped "optimal distinctiveness"; viral yüzey; adaleti markalar | M |
| 4 | **Mekan kartı 2.0**: gerçek foto + "Bugün 08:00–18:00" + tek satır "neyle bilinir" (Google review summary / FSQ tips) | Deste, Mekanlar | Google vibe-check / Yelp "What's the Vibe": karar yorgunluğunu azaltır | M (veri) |
| 5 | **Deste hissi**: sürüklerken BEĞEN/GEÇ damgası, haptik, kart sayacı büyür, "Hepsini gör" ikincil | Deste | Fiziksel his; gamification değil | S |
| 6 | **Bekleme anı**: Bekle/Gönderildi'de "kimler nerede" canlı liste + tek dokunuş "dürt" + sesli sohbet daveti + iOS Live Activity / Android Live Update taslağı | Bekle, Gönderildi, Runoff | Uber/Android 16 kalıbı; beklemeyi katlanılır kılar | M (LA: L) |
| 7 | **Davet önizlemesi**: davet linki OG kartı (etkinlik, kimler var, "uygulama gerekmez") + oturum kodu/QR ikinci kanal | Lobi, Katıl | Partiful/Luma; BiteSwipe kodu (yüz yüze senaryo) | S (OG), M (kod) |
| 8 | **Giriş sahnesi**: 3 avatar → orta noktaya çekilen çizgi mikro-animasyonu, altında Google + Apple | Giriş | Mekaniği 2 saniyede anlatır; App Store 4.8 zaten Apple'ı gerektiriyor | S |

Kimlik yükseltmesi (araştırma §4): kağıt/çıkartma dili 2026'da "insan sıcaklığı" trendine oturuyor
**ama statik kalırsa eskiyecek** → çıkartmalar spring animasyonla gelir, foto gerçek, derinlik
(yumuşak gölge, hafif glass) sistem diliyle uyumlu; el yazısı yalnız vurgu notlarında.

## 4. Mobil kabuk kararları

- **Alt sekme çubuğu yok.** Giriş yapmış kullanıcı için iki üst düzey hedef var (Oturumlar, Profil);
  Oturumlar kök ekran, Profil sağ üst avatardan push. Oturum akışı stack içinde. (iOS HIG "tab bar"
  önerisi ≥3 hedef içindir; iki sekmeli çubuk boş kalır.)
- Native başlık: geri (chevron) + başlık; dil seçimi Profil'de (davetli için Katıl başlığında).
- Paylaşım: sistem paylaşım sayfası; "Kopyala" ikincil.
- Alt sayfalar (bottom sheet): harita seçici, sesli sohbet, bildir/engelle, konum-ulaşım değiştirme.
- Sesli sohbet dock'u: CTA'nın üstünde yüzen hap; durumları tek bileşen sayfasında.
- Harita: 390'da web kararı gibi — varsayılan yok, "Haritada gör" tam ekran alt sayfa açar.
- Android farkları not olarak: edge-to-edge, predictive back, Material izin diyaloğu (bir artboard).
- Erişilebilirlik düzeltmeleri **web'e de geri yazılır** (K-W adayı): üstlük `ink3→ink2`,
  rozet min 12px, amber/pembe rozet metni koyulaştırma.

## 5. Artboard envanteri

**Dosya A — `Mobil Ekranlar v3.dc.html`** (ürün akışı, 390×844 native çerçeve)
P0 Doküman + kararlar · P1 Oturumlar (dolu) · P2 Oturumlar (boş) · P3 Yeni buluşma (Grup, orta
noktada, 3 etkinlik) · P4 Yeni buluşma (Belli bir yerde) + harita seçici alt sayfası · P5 Bireysel
kurulum (Konumlar) · P6 Lobi host (canlı, link paylaşıldı, dock kapalı) · P7 Lobi çapalı · P8 Katıl
(davetli; host çevrimdışı notu) · P9 Katıl hata (çok uzak · konum reddi) · P10 Bekle (canlı + dock
açık) · P11 Mekanlar grup host (yol çubuğu) · P12 Mekanlar bireysel · P13 Mekanlar yükleniyor ·
P14 Deste (damga + foto noktaları) · P15 Deste bitti · P16 Liste modu · P17 Gönderildi · P18 Runoff
kilitli · P19 Runoff berabere (host) · P20 Karar (sonuç kartı) · P21 Sonuç kartı paylaşım ·
P22 Profil · P23 Hata (süresi dolmuş) · P24 Çevrimdışı/ağ yok · P25 Sesli sohbet dock durumları ·
P26 Live Activity taslağı (iOS/Android)

**Dosya B — `Mobil Onboarding, İzinler ve Yasal.dc.html`**
O1 Açılış · O2 Giriş (Google + Apple) · O3 Konum ön-bilgilendirme · O4 Sistem izni (iOS hassas
/ Android) · O5 Konum reddedildi · O6 Mikrofon ön-bilgilendirme (alt sayfa) · O7 Hesap ve veriler ·
O8 Gizlilik politikası · O9 Kullanım şartları · O10 KVKK aydınlatma · O11 Açık rıza · O12 Atıflar
ve lisanslar · O13 Destek ve iletişim · O14–O16 Hesabı sil (3 adım) · O17 Bildir / Engelle

## 6. Kullanıcı kararı bekleyenler

1. Yol çubuğu rozetlerin yerine geçsin mi (web'e de)? Öneri: evet.
2. Sonuç kartı imza öğesi olsun mu; paylaşım metin yerine görsel? Öneri: evet (metin fallback).
3. Alt sekme çubuğu yok kararı. Öneri: yok.
4. Oturum kodu/QR ikinci kanal bu sürümde mi? Öneri: çizilir, "sonraki iz" etiketiyle.
5. Live Activity: taslak çizilir, uygulama M-4+. Öneri: evet.
6. Mekan kartında "neyle bilinir" satırı veri kaynağı (Google review summary ücretli). Öneri: çizilir,
   veri gelene kadar gizli.

## 7. Durum (2026-09-06 akşam) ve yeni kopya anahtarları

Çizildi ve yüklendi: Claude Design `719fcd5f-…` → `Mobil Ekranlar v3.dc.html` (P0 doküman + onay
paneli + P1–P26) ve `Mobil Onboarding, İzinler ve Yasal.dc.html` (O0 doküman + O1–O19). Her artboard
390×844 native çerçeve; tümü yerel ve uzak render'da hatasız doğrulandı. Eski `Mobil Ekranlar v2`
silinmedi (onay sonrası eskir).

Artboard'larda tr.json'da karşılığı olmayan kopya (`ab-l` etiketinde "yeni kopya" ile işaretli; M-1'de
`shared` i18n'e eklenecek, EN/NL çevirisi tasarım onayı bekler):

| Anahtar önerisi | TR metin | Ekran |
|---|---|---|
| `newSession.midpointHint` | Herkesin konumundan adil orta nokta | P3 |
| `newSession.anchorOwnLocHint` | İstersen; çapalı buluşmada zorunlu değil | P4 |
| `sessions.joinCardTitle` | Bir davet linkin mi var? | P2 |
| `sessions.anchorSet` | buluşma yeri belli | P7 |
| `lobby.anchorNoLocation` / `lobby.anchorSoloHint` | Konum vermedin · gerekmiyor / Çapalı buluşmada tek başına da arayabilirsin. | P7 |
| `waiting.copyMobile` / `waiting.lockHint` | Önce liste, sonra oylama. Uygulamayı kapatsan da haber veririz. / Sayfayı kapatsan da olur; hazır olunca kilit ekranından görürsün. | P10 |
| `deck.nudgeName` | {{name}}'i dürt | P10, P17 |
| `runoff.tieDecideHost` | Kararı ben vereyim | P19 |
| `offline.title` / `offline.hint` | Bağlantı yok / Son görülen hali gösteriliyor · {{time}} | P24 |
| `voice.endedTimeLimitHint` | {{min}} dk sesli sohbet bitti | P25 |
| `perm.location.*`, `perm.mic.*` | O3, O4, O5, O6, O7 metinleri (purpose string'ler dahil) | O3–O7 |
| `account.*`, `legal.*`, `report.*` | O8–O19 tüm metinler (yasal metinler ayrı dosyada tutulur, çeviri değil yerelleştirme) | O8–O19 |

Hukuki metinler (O9–O11) taslaktır: KVKK m.5 dayanak ayrımı, m.11 hak listesi özeti, sorumluluk sınırı
ve uygulanacak hukuk maddeleri yayın öncesi hukukçu kontrolü ister.

## 8. Web senkronu (2026-09-06 gece)

Kullanıcı mobil v3'ü beğendi ve web'e senkron istedi → `Web Ekranlar v3.dc.html` (54 artboard) üretildi ve
yüklendi; v2 dosyası arşiv olarak duruyor. Yapılanlar: 55 rozet bloğu programatik olarak yol çubuğuna
çevrildi (1280 + 390), erişilebilirlik renkleri CSS'te, 8 mevcut 390 artboard'u mobil P3/P6/P10/P14/P17/
P18/P20/P22 ile birebir yeniden yazıldı, 10 mevcut 1280 artboard'u hedefli düzenlendi (presence + dock,
deste damgası/foto noktaları/kişi başı çubuk, sonuç kartı + takvim/kartı paylaş, mekan satırında saat +
"neyle bilinir", 3 etkinlik sınırı + "Nerede buluşulsun?"), 12 yeni artboard (çapalı yeni oturum, çapalı
lobi, katıl hata, mekanlar yükleniyor, runoff berabere, çevrimdışı, ses dock'u durumları; 1280 + 390).
Masaüstünde harita seçici alt sayfa değil sağ bölge panelidir; dock sağ altta yüzer.

**Bu adımla örtük olarak onaylanan kararlar (§6):** 1 (yol çubuğu web'e de), 2 (sonuç kartı), 6 (analitik
kapalı — web'de mevcut Clarity/GA4 rıza anahtarı W-12'ye düşer). Hâlâ açık: 3 (alt sekme yok — mobil
kabuk), 4 (oturum kodu/QR), 5 (Live Activity).

**Kod izi:** K-W14 (W-12 adayı) INDEX'te güncellendi; plan yazılmadı (kullanıcı isterse writing-plans).
