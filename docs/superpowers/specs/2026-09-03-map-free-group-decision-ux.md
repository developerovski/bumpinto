# Haritasız değerlendirme ve grup uzlaşması — değerlendirme ve karar önerisi

Tarih: 2026-09-03 · Durum: **kullanıcı kararı bekliyor** (§7) · İz: B-7 (backend) + W-6 (web)
Girdi: 34 ajanlık araştırma/denetim koşusu (artboard denetimi, DS envanteri, veri-maliyet tablosu,
6 açıdan rakip araştırması, 3 tasarımcı paneli, ekran başına fizibilite + UX + **ürün tezi** şüphecileri,
tamamlanma eleştirmeni). Ham çıktılar oturum scratchpad'inde; bu doküman **elenmiş** sonuçtur.

## 0. Tez ve sonuç

**Ürün:** farklı konumlardaki bir arkadaş grubu, orta noktada (ya da belirlenen bir noktada), ilgi
alanlarına uyan bir mekanda **uzlaşır**. Kaydırma yalnız oylama mekaniğidir. Ölçüt dört sorudur:
(a) herkese **adil** mi, (b) ortak **ilgiye** uyuyor mu, (c) **uzlaşma** hızlı ve sürtünmesiz mi,
(d) birlikte varılan **an** hissediliyor mu. Harita bu dördünün hiçbirini vermez; yalnız "nerede"
sorusunu cevaplar ve pahalıdır.

**Sonuç:** bugünkü ekranlar (a)'yı yarım (kişi başı dakika var, türetilmiş adalet yok), (b)'yi hiç
(kart "ne tür bir yer" demiyor), (c)'yi kısmen (bekleme hâlleri ölü, host tek arıza noktası), (d)'yi
yalnız Karar'da karşılıyor. Haritanın tek türetilemeyen bilgisi **kasaba/semt kelimesi**; gerisi
kişi başı dakikadan üretilebilir. Yol: harita 390'da hiçbir ekranda varsayılan yüklenmez, her mekan
yüzeyine aynı adalet satırı + tek rozet + uyum satırı gelir, bekleme hâlleri uzlaşma durumunu
gösterir. Yeni harici veri **yalnız** zaten ödenen Foursquare çağrısına eklenen alanlardır.

## 1. Bugünkü durum (artboard + kod denetimi)

| Bulgu | Kanıt | Etki |
|---|---|---|
| Kart her ekranda aynı üç sinyal: foto/monogram, ★ · €€, kişi başı dk | VenueCard/VenueMeta; mock puanlar 4.1–4.6 | Kahve destesinde 12 kart "aynı kart, farklı sayı" okunuyor; ★ ayırt etmiyor |
| Artboard'lar olmayan veriye yaslanıyor: "Açık", şehir, sokak adresi, "Eindhoven civarı" | Deste/Runoff/Karar 1280+390, mobil 06/08 | Kodda **render edilmiyor** (VenueCard yalnız ★·€+chips); tasarım ürünü değil mock'u anlatıyor |
| Harita-tek bilgi: orta nokta kasabası, yarıçap büyüklüğü, "kimin tarafında", kümelenme | Mekanlar/Lobi/Karar; mekan pini yalnız puan gösteriyor | Harita konum indeksi; değerlendirme yüzeyi değil |
| Maps JS, 390 Mekanlar'da Liste sekmesinde bile yükleniyor; davetli harita-önce açılıyor | `VenueBrowser.tsx` MapView her sekmede mount + CSS hidden; `VenuesPage.tsx` guest `initialTab="map"` | Her 390 görüntülemesi = 1 Dynamic Maps yüklemesi, sıfır bilgi |
| Lobi 390 harita şeridi (110px) Maps yüklüyor; Bekle 390 zaten haritasız | `LobbyPage.tsx` MapView `lgOnly` yok; `WaitingRoom.tsx` var | Kazanç yalnız host Lobi'si |
| **Gizlilik sızıntısı:** viewer dışı katılımcıların travelMinutes'ı **tam** koordinattan hesaplanıyor | `SessionViewAssembler.java:35` `p.location()`; `approxLocation` 2 ondalık | 6–20 mekana 1 dk çözünürlükte dakika ~1 km yuvarlamayı trilaterasyonla boşa çıkarabilir (simüle edilmedi) |
| RUNOFF'ta sunucu kim→ne oy haritasını herkese gönderiyor | `SessionQueries.java:70` `runoffVotes` | "kim neyi seçti, sonuçta belli olur" vaadi API'de tutmuyor |
| Seyahat kopyası üç biçimde: "Sen 34 dk" / "Sen 34′" / "Sana 28′" | `deck.travel`/`travelShort`/`travelSelfTo` | Tek bileşen yok; 390 artboard'larında 3. katılımcı düşüyor |
| Gönderdikten sonraki durum yok; "Beğenilerimi gönder" tekrar basılabiliyor | `deckStore.finish()` yalnız `sending` çeviriyor | Bekleme tam burada başlıyor, DeckProgressNote ise yalnız aktif destede |
| Bekle kopyası rev-1 akışını anlatıyor ("buradan kaydıracaksın"); sıradaki aşama BROWSING | `waiting.copy` | Beklenti kırılıyor (audit §3 zaten açık) |
| Karar: "Yol tarifi al" `mapsUrl` boşken `href="#"`; davetli 390 yalnız kendi yolunu görüyor | `WinnerCard.tsx`; Karar 390 artboard | FSQ oturumunda buton ölü; adalet kanıtı davetliye yok |
| Eğlence yalnız Deste/Deste bitti/Runoff/Karar'da; Mekanlar, Lobi, Bekle düz | artboard'lar | Kullanıcı en çok bu üç ekranda **bekliyor** |

## 2. Veri gerçeği (resmi dokümanlardan doğrulandı)

- **Google faturası maskedeki en yüksek katmana göre.** Bugünkü maske (`rating`, `priceLevel`) her
  Nearby Search çağrısını **Enterprise** yapıyor: 1.000 ücretsiz/ay, sonra $35/1000. Spec'in
  varsaydığı Pro 5.000 değil. Aynı katmandaki alanlar (`userRatingCount`, `primaryTypeDisplayName`,
  `businessStatus`, `shortFormattedAddress`, saatler) **marjinal $0**.
- **Foursquare araması zaten Premium** (rating/price/photos). `categories`, `location.locality/
  neighborhood`, `hours`, `hours_popular`, `popularity`, `tastes` eklemek **marjinal $0**. Yoğunluk
  ("19:00'da kalabalık mı") yalnız FSQ'da var; Google hiçbir SKU'da vermiyor.
- **Foto:** Google Place Photo 1.000 ücretsiz/ay, sonra $7/1000 — oturum başına en büyük kalem.
  FSQ CDN fotoğrafında görsel başına ücret yok. Onaylı carousel spec'i "30 gün cache" varsayıyor;
  Google Service Terms'te yalnız place ID süresiz ve lat/lng 30 gün açık; diğer içerik "geçici"
  istisnaya bağlı — **doğrulanmadı, hukuki okuma gerekir**.
- **Politika:** haritasız gösterim serbest; Google içeriğinin yanında Google logosu ya da
  "Google Maps" metni zorunlu; FSQ verisi olan her ekranda "Powered by Foursquare"; Nominatim
  için "© OpenStreetMap contributors" (bugün `locationLabel` için zaten borç) + User-Agent + 1
  istek/sn + önbellek → **istemciden backend'e taşınmalı**. Sağlayıcı puanları karıştırılmaz
  (FSQ 0–10→0–5 ölçekleme "misrepresent" riski; kartta sağlayıcı işareti gerekir).
- **Şimdi hayır:** Google Atmosphere alanları (editorialSummary, goodForGroups, outdoorSeating —
  $40/1000, NL doluluğu ölçülmemiş), OSRM (altyapı işi; "~30 dk" yuvarlama + "tahmini" notu
  haversine'i dürüst kılar), FSQ Pro ücretsiz kota çelişkisi (docs 500/ay vs fiyat sayfası 10k).

## 3. Rakipler: ne yapıyorlar, biz neyi daha iyi yaparız

- **Orta nokta uygulamaları** (Whatshalfway — kategorinin tek kitleli ürünü, 681 puan/4,7★;
  MeetWays, Halfway, Halfway Place, Midway, Midpointr, Mappr, Where to Meet, Somewhere in the
  Middle, Meedol, LYNQpoint): hepsi harita-önce; adalet **vaat ediliyor, gösterilmiyor** (yalnız
  Mappr kişi başı dakika basıyor, o da mekana değil orta noktaya); kategori "işte mekanlar"da
  bitiyor, **karar mekanizması yok**. Şikayetler: kategori dışı sonuç ("restoran yerine dükkân"),
  puana/uzaklığa sıralama isteği, kişi başı tek dokunuş yol tarifi, 2'den fazla kişi. Link ile
  hesapsız katılım artık standart. Bir rakip açılış saatlerini paywall'a koymuş.
  **Biz:** mekan başına herkesin dakikası + türetilmiş "fark" + tam uzlaşma akışı
  (deste → kesişim → runoff → karar). Kimsede yok.
- **Grup karar / "restoran Tinder'ı" uygulamaları** (Munchi Match, Dinder, Dinn'r, DineFinder,
  BiteSwipe, Tonight's Bite, Food Match, Where2Eat; WhatsApp/iMessage anketleri, Partiful):
  tek mekanik "herkes sağa kaydırınca ilkinde dur"; "eşleşme yok" ve "biri hiç bitirmedi"
  tanımsız; asıl sıkıntı kaydırma değil **bekleme** (BiteSwipe trivia ekledi); açık sayım
  bandwagon yaratıyor (WhatsApp), gizli-sonra-açılış doğru (iMessage Poll). Kategori
  dağıtımdan kaybediyor: hepsi kurulum istiyor, 2–11 puanla ölü. **Biz:** web link-katılım, tam
  deste → kesişim, runoff kapatıcısı, gizli oy. Bu bir avantaj, kopyalanacak şey değil.
- **Kart tasarımı** (Airbnb, Yelp, Google Maps Gemini kartları, Beli, Infatuation, Resy, Apple
  Guides, OpenTable, Baymard/NN/g): kendine yeten kartın anatomisi — 1 foto, ad, **tek** hak
  edilmiş rozet, 3 parçalı istatistik satırı, **tek** insan cümlesi; 4,3–4,7 arası ★ gürültü;
  bağı sosyal kanıt kırar; slotlar her kartta aynı yerde (Baymard: sitelerin %64'ü bunda düşüyor);
  liste ne beğendiğini hatırlamalı; "açık/yoğun" ipucu bar/gece için şart, kahve/yürüyüş için değil.
- **Adalet görselleştirme** (NN/g, Baymard, Booth, Uber): uzunluk ve konum ön-dikkatli; ibre/
  terazi kötü; **farkı yazdır**, kullanıcı çıkarma yapmaz; aralık yalancı hassasiyetten iyi
  ("~30 dk"); kardinal yön çipleri çoğu kişi için okunmaz, ilişkisel kelime ("Ayşe'ye yakın")
  herkes için çalışır.
- **Oyunlaştırma ve bekleme** (Tinder, Hinge, Kahoot, Jackbox, Blend, Wrapped, Herd Mentality,
  Gas; Duolingo/BeReal karşı örnek; Among Us, Pokémon GO, Doodle, Calendly, Splitwise):
  heyecan = **saklanan-sonra-eşzamanlı açılış**, grup düzeyinde ve **bir kez**; geciken kişiye
  **adıyla** "herkes seni bekliyor"; yalnız pozitifler; suçluluk/zorla süre yok; uzlaşma yarışma
  değil (podium yok); host tek arıza noktası en çok şikayet edilen şey; tıkanma **yapıyla**
  çözülür (eşikle başla, kısmi sonuçla devam, kişinin okuduğu kanaldan dürt).

## 4. Tasarım kararları (çelişkiler burada kapatıldı)

1. **Adalet metriği:** birincil **en uzun yol** (minimax — en mağduru en az mağdur eden), ikincil
   **fark** (max−min). Ekranda yazılan sayı "fark"; sıralama ve rozet minimax + fark.
2. **Tek rozet, tek kural, tek bileşen:** fark ≤ 10 dk → `Herkese ~aynı` (grass); bir kişi grup
   medyanını ≥ 10 dk aşıyorsa → `{{ad}} için uzak` / `Senin için uzak` (neutral); aksi hâlde rozet
   yok. Meta satırında **Badge**, foto üstünde değil, Sticker değil. Ad ek almaz (tr/en/nl güvenli).
3. **TravelChips:** herkes görünür (3. kişi asla düşmez), en uzun önce, "Sen" kalın, ~5 dk
   yuvarlama, "~" öneki, sonda `fark N dk`, renk yok, en uzunda ▲. Tek i18n anahtarı. Beş
   yüzeyde (satır, deste kartı, Beğendiklerin, finalist, kazanan) aynı.
4. **Gizlilik:** herkes için (viewer dahil) dakika **yuvarlanmış** konumdan hesaplanır + 5 dk
   yuvarlama. Tek kod yolu; viewer'a hassas dakika vermenin değeri yok.
5. **Sıra (kullanıcı kararı 2026-09-03, revize): deste ve liste ADALET ÖNCELİKLİ.** Birincil **en uzun
   yol** artan, ikincil **fark** artan; 5 dk bantları içinde `Random(session.id)` ile karışık, herkese
   aynı sıra (spec §4 "Karıştır" kuralı buna göre güncellenir). Listede Segmented `Herkese adil · Puan`
   (varsayılan adil). Karar motoru beraberliği spec'teki gibi puanla kırar. Kıstas: en uzun yol küçük =
   kimse mağdur değil; fark küçük = herkese eşit; toplam yol bilerek yok (yükü tek kişiye yığar).
   Örnek: A 30/25/35 → en uzun 35, fark 10 → "Herkese ~aynı"; B 10/15/50 → "Kerem için uzak";
   C 40/40/40 → eşit ama A'dan az adil. HandNote destede: "önce herkese en adil olanlar".
5b. **Ulaşım türü (kullanıcı kararı 2026-09-03):** her katılımcı `travelMode ∈ {WALK, BIKE, EBIKE,
   TRANSIT, CAR}` verir (varsayılan CAR; elle konumlar ve geç katılanlar da CAR). Dakika = kuş uçuşu
   × 1,3 ÷ mod hızı — yürüyüş 5, bisiklet 16, e-bisiklet 24, toplu taşıma ~20 (bekleme dahil, en
   zayıf tahmin), araba 72 km/sa; OSRM gelince araba/bisiklet/yaya gerçek olur. **Orta nokta da
   kayar:** `GeoMath.centroid` hıza ters ağırlıklı (ağırlık = 1/hız); iki kişide eşit süre noktasını
   tam verir, çok kişide yaklaşık. Yarıçap kuralı değişmez. Şeffaflık: roster satırında ulaşım ikonu
   (Phosphor PersonSimpleWalk / Bicycle / Lightning+Bicycle / Train / Car) + `Someren · ~25 dk`;
   orta nokta kartında tek not "Orta nokta Ahmet'e yakın: bisikletle geliyor". Giriş noktaları: Katıl
   formu segmented "Nasıl geliyorsun?", Yeni oturum kendi konumu ve Bireysel konum listesi, Bekle
   "Konum ve ulaşım", Profil varsayılan tercih (`/api/me`). Adalet sayıları, rozet, TravelChips
   değişmez; dakikalar sunucudan mod-uyumlu gelir. Gizlilik: başkalarının dakikası yine yuvarlanmış
   konumdan. M-1/M-2 parite notu düşülür.
6. **Uyum satırı:** ad altında sağlayıcı kategorisi: `Kahve için: espresso bar`; aktivitenin
   beklenen kümesi dışındaysa amber `Kahve değil: fırın`. Yalnız destede ≥ 2 farklı kategori
   varsa görünür (aynı türden 12 kartta gizli). Kategori yoksa satır yok.
7. **Harita politikası:** 390'da hiçbir ekranda varsayılan harita yok (Mekanlar'da ghost
   "Haritada gör" yükler). 1280: Mekanlar sekme/ghost arkasında tembel, Lobi ghost arkasında,
   Karar ve Bekle'de **yok** (Karar: adres satırı + "Google Maps'te aç" + atıf).
8. **Dil sözlüğü:** "kazanan", "eşleşme", "match", "favorin" hiçbir ekranda yok; "Ortak nokta",
   "Herkes için", "Karar verildi". Kutlanan tek an grubun **birlikte** vardığı andır (Karar,
   runoff sonucu); "Deste bitti" bireysel an, kutlama yok. Geciken kişiye tek, adlı, pozitif not;
   sayaç, "geç" etiketi, suçluluk yok.
9. **Kart anatomisi (390):** foto/monogram → ad → uyum satırı → `★ 4.6 · €€ · Best` (semt, orta
   nokta şehrinden farklıysa) → rozet → TravelChips. Alta sağlayıcı atıf satırı. "Açık" durumu
   **gösterilmez** (buluşma saati yok); veri gelince `Bugün 08–22` metni.

## 5. İş paketleri

### A. Backend ön koşul — B-7 (`2026-09-03-plan15-backend-fairness-travelmode.md`, migration V5)
1. `SessionViewAssembler`: dakika `approx(p.location())`'dan + 5 dk yuvarlama; mekan başına
   `{maxMin, spreadMin}` adalet util'i (tek kaynak: chips, rozet, sıra).
2. `SessionView.decisionKind ∈ {UNANIMOUS, SINGLE_LIKE, RUNOFF, FORCED, PARTIAL}` + `decidedAt`
   + `runoffReason ∈ {INTERSECTION, FALLBACK}`; `likeCounts` yalnız DECIDED sonrası (B-7 adayı zaten).
3. RUNOFF'ta `runoffVotes` → `votedParticipantIds`; `voteTally` yalnız DECIDED ya da herkes oy
   verdiyse. Kesişim runoff'unda finalist tavanı 4. Karar motoru beraberliği spec'teki gibi **puanla**
   kırar (§4.5; adalet yalnız sıralamayı belirler). Ek alanlar: `ParticipantDto.midpointMinutes`
   (yuvarlanmış konumdan ağırlıklı orta noktaya, moda göre, 5 dk) ve `VenueDto.locality`.
4. `midpointLabel`: `ReverseGeocodePort` + Nominatim adapter (User-Agent, `approx(midpoint)`
   anahtarlı Caffeine cache); istemci Nominatim'i bırakır.
5. `VenueDto.provider` + `category` + `address` + `hours` + `placeLink`: Google `primaryTypeDisplayName`,
   `businessStatus`, `shortFormattedAddress`, `userRatingCount` (bugünkü Enterprise maskeye aynı katman,
   $0); `placeLink` API'siz Maps URL (place ID süresiz saklanabilir). `businessStatus` ile kapalı mekan
   sessizce elenir. **Açılış maliyet modeli (kullanıcı kararı 2026-09-03):** Google bütçeli — Nearby
   1.000/ay ve Place Photo 1.000 görsel/ay sert tavan (orkestratör `BUDGET`; aşınca foto → monogram);
   Foursquare isteğinden Premium alanlar (`rating`, `price`, `photos`) çıkar, çağrı Pro'ya iner
   (`categories`, `location`, `website` kalır); harita yok. Adresi kaldırmak Google katmanını
   düşürmez — katmanı `rating`/`priceLevel` belirler. OSM sağlayıcısı (B-4 / K-B19) sonra: bütçe
   bitince taban + Google taksonomisinde olmayan türler; OSM kalite sıralaması veremez (puan ve
   popülerlik yok), OSM destesinde kart "puan yok" der.
6. `mapsUrl` yoksa `https://www.google.com/maps/dir/?api=1&destination=lat,lng`.
7. `Participant.travelMode` (V5 kolon, varsayılan CAR) + `JoinRequest`/points/`/api/me` alanı +
   `TravelEstimate(mode)` + hıza ters ağırlıklı `GeoMath.centroid` + `ParticipantDto.travelMode`;
   `deckOrder` adalet öncelikli (en uzun yol → fark → 5 dk bant içi `Random(session.id)`). Testler:
   mod başına dakika, iki kişide eşit-süre özelliği, sıra determinizmi.
8. Clarity/GA4 üç olay: "Haritada gör" dokunuşu, Maps JS yüklemesi, aşama geçişi — **ölçmeden
   harita tasarrufu iddia edilemez** (bugün sıfır veri).

### B. Hızlı kazanımlar — W-6a (`2026-09-03-plan16-web-fairness-mapfree.md`; $0, çoğu A'dan bağımsız)
0. Katıl formu / Yeni oturum / Bireysel konumlar / Bekle: segmented "Nasıl geliyorsun?" (4 seçenek + e-bisiklet);
   roster satırında ulaşım ikonu; orta nokta notu "… Ahmet'e yakın: bisikletle geliyor"; Profil varsayılanı.
1. `VenueBrowser`: MapView yalnız `tab==='map'` (390) iken mount + `React.lazy`; davetli
   `initialTab='list'`; grup satırından ve pop karttan "Bunu seç" kalkar (SOLO'da kalır);
   Segmented `Herkese adil · Puan`.
2. `LobbyPage` MapView `lgOnly`; 1280'de "Haritayı aç" ghost.
3. TravelChips bileşeni (§4.3) + adalet rozeti (§4.2) — A.1 gelene kadar istemci hesabı.
4. Bekle kopyası: "Mekanlar geliyor — önce liste, sonra oylama. Sayfayı kapatma yeter."
   (K-W3 kapanır; onay senin).
5. FinishedCard: `sent` durumu, tek sticker, başlık `{{count}} mekan beğendin`; DeckProgressNote
   buraya taşınır (kişi satırları: story-ring = bitti); "Bekleyenleri dürt" (navigator.share,
   hazır metin: "Kahve için 12 mekan hazır, seni bekliyoruz: link"); host için
   `{{adlar}} olmadan devam et` → mevcut `forceDecision(null)` (koşul: host ∧ ≥1 bitiren ∧ ≥1
   bitirmeyen; sayaç yok).
6. Aktif destede gecikene tek HandNote: `{{ad}}, herkes seni bekliyor — {{n}} kart kaldı`;
   390 başlığa `· {{n}} beğeni`.
7. Runoff: kart altına `toplam ~84 dk · fark ~12 dk`, karar verici fark amber-wash; başlık
   2/≥3 finalist dalı; 390 kilitli çelişkisi ("3/3 seçti" ama "bekliyoruz") düzelir.
8. Karar: 1280 haritası kalkar; TravelList herkes için (davetli dahil), km yok, `~dk`;
   `mapsUrl` fallback; paylaşım metni viewer-bağımsız.
9. Atıf: footer "© OpenStreetMap contributors"; kart altı "Google Maps" / "Powered by
   Foursquare" (A.5 `provider` ile; gelene kadar oturum sağlayıcısı).

### C. Ekran paketi — W-6b (aynı plan, A sonrası) + Claude Design güncellemesi; mobil paritesi M-3 (`2026-09-03-plan17-mobile-fairness-mapfree.md`)
- **Lobi/Bekle:** harita şeridi yerine orta nokta kartı (`.c-mark` + `Eindhoven civarı · ≤ 9 km ·
  herkes ~25–35 dk`), roster satırında `{{şehir}} · ~{{dk}} dk`, "Kahve için buluşuyoruz" aktivite
  şeridi + "orta nokta çevresinde kahve mekanları aranacak" vaadi, 4 adımlı stepper (Konumlar →
  Mekanlar → Oylama → Karar), gizlilik satırı, geliş animasyonu (`appear` + Bekliyor→Hazır).
- **Mekanlar:** semt kelimesi (`locality`), uyum satırı, konumsuz katılımcı notu, SOLO'da "Bunu seç" →
  inline onay kartı (artboard `Mekanlar bireysel 390`). TravelRange (≥ 4 kişi) **alınmadı** (YAGNI; chip'ler sarar).
- **Deste:** uyum satırı; son iki kartta kalibrasyon notu (0 beğeni → "kimse ortak beğenmezse
  sonuç boş kalır"); Beğendiklerin'de herkesin chip'i + rozet + minimax sıra; "foto · Places"
  yerine gerçek atıf.
- **Deste bitti:** 0 beğeniyle gönderme uyarısı ("Listeye dön" birincil); DecisionEngine sırası
  görünür ("Herkese adil" rozeti finalist ve kazananda).
- **Runoff:** overline `KAHVE · 3 KİŞİ · ORTA NOKTA ÇEVRESİ`; kopya nedene göre (INTERSECTION /
  FALLBACK: "Henüz ortak nokta yok — en çok beğenilen 3 mekan finalde"); sayım sunucu-kapılı,
  herkes kilitleyince count-up (320 ms, reduced-motion'da yok); RunoffTie'a ikinci buton
  "Adil olana bırak" (min fark → min toplam → puan → SecureRandom); kilit sonrası "Hatırlatma
  gönder".
- **Karar v2:** "Neden burası?" üç eksen — ADALET `Herkes ~20–35 dk · en uzun yol Kerem` /
  UYUM `Kahve için · espresso bar` / YER `Kleine Berg 16, Eindhoven merkez`; eyebrow
  `decisionKind`'a göre (`HEPİNİZ AYNI YERİ BEĞENDİ` yalnız UNANIMOUS; `Oylamayla 2–1`;
  `{{adlar}} olmadan`); `Herkesin ortasına ~600 m`; HandNote `Kerem en uzaktan geliyor — ~15 dk
  önce çıkarsa herkes aynı anda varır`; "Yedek plan" satırı (runoff ikincisi); yakınsama açılışı
  ≤ 1,5 s yalnız canlı DECIDED geçişinde (sessionStorage ile bir kez).
- **Artboard'lar (2026-09-03 gece, Claude Design'a YÜKLENDİ, kullanıcı onayı bekliyor):** 27 mevcut
  artboard yeniden çizildi (verisiz "Açık"/şehir/adres kalktı, yeni anatomi, harita politikası), 6 yeni:
  `Mekanlar grup 390 host` (K-M1), `Deste bitti 390`, `Gönderildi 1280`, `Gönderildi 390`,
  `Runoff 1280 kilitli`, `Karar 1280 oylama`; DS v2'ye §11 "Adalet dili". FALLBACK runoff varyantı
  çizilmedi (kopya planda). Yerel yedek: oturum scratchpad'i `design/web.html` (orijinal).

## 6. Bilerek yapılmayanlar (tez süzgeci)

Gizli tahmin oyunu (uzlaşmayı bozar: tahminini tutturmak isteyen destede o mekanı beğenip
gerisini geçer) · çift "uyum" yüzdesi (birim grup, çift değil) · "Buluştunuz mu?" (24 saatlik
oturum ömrüyle çalışmaz) · Tinder tarzı tam ekran "match" ve isimli kalpler (flört taklidi;
oybirliği dışı yollarda yokluk ifşası) · rastgele çark · sürükle-sırala / "Favorim" (bireysel
tercih grup kararını değiştirmez, spec §4'e dokunur) · "ortaya X km" tokenı (adaleti geometriye
indirger; yalnız sıralama anahtarı) · yön/pusula çipi · statik harita görseli (hâlâ Google
haritası, 110px'te okunmaz) · "Hazırım" ile otomatik SWIPING geçişi (normal durumda gereksiz;
sinyal olarak kalabilir) · Wrapped tarzı 3 kartlık özet · podium/kazanan dili · Deste yarı yol
kutlaması · her kaydırmada eşleşme.

## 7. Senin kararın gereken konular

1. **Karar verildi (2026-09-03, revize): deste ve liste adalet öncelikli** (§4.5); spec §4 "Karıştır" tanımı güncellenecek.
2. **"Belli bir nokta" modu** (host orta nokta yerine bir katılımcının yanını ya da bir adresi
   çapa seçer; süreler yine kişi başı, "adil" rozetleri kapanır): B-7'ye alan olarak girsin,
   UI W-6b sonunda mı, tamamen sonraya mı? *Önerim: alanlar B-7'de, UI W-6b'nin son maddesi.*
3. **Karar verildi (2026-09-03): ulaşım türü alınır** (§4.5b) — mod hızları + hıza ters ağırlıklı orta nokta; B-7 ve W-6a kapsamına girer.
4. **Google maskesi:** olduğu gibi kalsın (Enterprise, aynı katman alanları $0) mı, rating/price
   FSQ'dan alınıp Google Pro'ya (5k ücretsiz) mi düşürülsün? *Önerim: önce oturum hacmini ölç
   (A.7); 1.000 oturum/ay altında fark yok.*
5. **Foto carousel spec'i:** "30 gün cache" varsayımı doğrulanmadı; Google fotoğrafı oturum başına
   en büyük kalem. *Önerim: spec'i FSQ-CDN-önce yeniden yaz, Google fotoğrafı yalnız çevrilen
   kartta; hukuki okuma senin.*
6. **Bekle kopyası** (B.4) ve dil sözlüğü (§4.8) onayı.
7. **PARTIAL'ın Runoff'a düşmesi (B-7 uygulama notu, 2026-09-03):** host "olmadan devam et" dediğinde
   kısmi değerlendirme doğrudan karara varırsa `decisionKind = PARTIAL`; ama Runoff'a düşerse sonuç
   `RUNOFF` olarak yazılır, "kimler olmadan" bilgisi kaybolur. Web şimdilik `participants[].deckDone`
   üzerinden türetir. *Önerim: B-8 adayı — `Session.partial=true` bayrağı ya da `PARTIAL_RUNOFF`.*

## 8. Doğrulanmamış varsayımlar

Google içerik önbellek kuralı (24 saatlik snapshot "geçici" istisnaya giriyor mu) · FSQ atıf ve
önbellek sayfaları (404 döndü) ve Pro kota (500 vs 10k) · FSQ `attributes` anahtar adları ve NL
doluluğu · trilaterasyon riski (simüle edilmedi; A.1 zaten kapatır) · Dynamic Maps'in gizli
konteynerde de faturalandığı (kod okuması, konsol teyidi yok) · kullanım varsayımları (grup
boyutu, 390 payı, SOLO payı, karar→buluşma aralığı) — hiç veri yok, A.7 bunun için.

## 9. Kaynaklar (seçilmiş)

Google Places pricing/data-fields/policies: developers.google.com/maps/documentation/places/web-service/{data-fields,policies,usage-and-billing} · developers.google.com/maps/billing-and-pricing/pricing · Service Terms: cloud.google.com/maps-platform/terms/maps-service-terms · Foursquare: docs.foursquare.com/fsq-developers-places/reference/{response-fields,place-search} · foursquare.com/pricing · Nominatim usage policy: operations.osmfoundation.org/policies/nominatim · Whatshalfway (App Store id1642536395) · Mappr midpoint finder: mappr.co/midpoint-finder · Halfway Place (App Store id6755778463) · Munchi Match (id6759400488) · Dinn'r (id6761495565) · BiteSwipe (id6751428045) · Airbnb Guest Favorite: news.airbnb.com/airbnb-2023-winter-release · Baymard list-item design: baymard.com/blog/list-item-design-ecommerce · NN/g preattentive attributes: nngroup.com/articles/dashboards-preattentive · Jackbox "Jack Principles" · Kahoot lobby docs · Hinge "We Met" (TechCrunch 2018) · Duolingo streak-creep (thedecisionlab.com) · Partiful reminders help center · Spotify Jam/Blend newsroom.
