# Google Maps Platform maliyet raporu — 10.000 ziyaret/ay

Tarih: 2026-09-06. Kaynak: kod (`GooglePlacesVenueProvider`, `FoursquareVenueProvider`,
`ProviderOrchestrator`, `DeckFlow`, `MapView`/`MapPicker`, `lib/maps.ts`) + Google fiyat sayfası
(son güncelleme 2026-09-01) + Nearby Search (New) alan/SKU listesi + Foursquare fiyat duyurusu.

## 0. Karar özeti

1. **Google Cloud faturası = yalnız Maps Platform.** Dağıtım bare-metal K8s (plan 5), Cloud Run /
   Cloud SQL / Firebase yok. Google Sign-In (JWKS doğrulama) ve GA4 ücretsiz.
2. **10.000 ziyarette bugünkü kodun gerçek tüketimi ≈ $246/ay** (frenler kapalıyken). Kalemler:
   foto $154, harita $60, FSQ arama $22, Google arama $10. **Gemini'nin $15–20 tahmini yanlış**;
   sebepleri §5'te.
3. **Bugünkü varsayılan frenlerle (1.000/1.000) fatura ≈ $81** ama ürün bozuk: foto tavanı ~43.
   Google destesinden sonra doluyor (kalan %96 monogram), Google arama tavanı ayın son ~çeyreğinde
   Google'a-özgü 10 türü "mekan bulunamadı"ya düşürüyor. Harita yükünde fren hiç yok.
4. **Harita ve arama $0'a inebilir** (tek harita örneği + Google maskesini Pro'ya indirip Google'ı
   birinci yapmak). **Foto inemez:** foto = buluşma başına 6–14 sent; fatura foto kararıyla
   belirlenir. Seçenekler §4.C'de fiyat etiketiyle.
5. **Cloud Console kotası tek gerçek tavan.** Uygulama sayaçları pod yeniden başlayınca sıfırlanır
   ve replica başına çoğalır; sürpriz faturayı yalnız Console kotası + bütçe uyarısı keser.

## 1. Doğrulanmış fiyat listesi (0–100k hacim, ABD doları / 1.000 çağrı)

| SKU | Katman | Ücretsiz/ay | Fiyat | Bizde |
|---|---|---|---|---|
| Dynamic Maps (Maps JS map load) | Essentials | 10.000 | $7 | `MapView`/`MapPicker` her mount |
| Static Maps | Essentials | 10.000 | $2 | kullanılmıyor |
| Geocoding | Essentials | 10.000 | $5 | kullanılmıyor (Nominatim) |
| Nearby Search **Pro** | Pro | 5.000 | $32 | — (maske Enterprise'a çıkarıyor) |
| Nearby Search **Enterprise** | Enterprise | 1.000 | $35 | `searchNearby` (rating/priceLevel/userRatingCount/regularOpeningHours) |
| Place Details Photos (Place Photo) | **Enterprise** | **1.000** | $7 | `/media` çağrısı, mekan başına 1 |
| Foursquare Places Pro | — | 500 (fiyat sayfası 10.000 diyor; çelişki) | $15 | `places/search` |
| Foursquare Premium (photos/rating) | — | ? | ? | kaldırıldı (09-03 kararı) |

Alan → katman (Nearby Search New, resmi liste): **Pro** = id, displayName, location, photos,
googleMapsUri, shortFormattedAddress, addressComponents, businessStatus, primaryType, types.
**Enterprise** = rating, userRatingCount, priceLevel, regularOpeningHours, websiteUri, telefon.
**Enterprise + Atmosphere** ($40) = reviews, editorialSummary, goodForGroups, outdoorSeating…
Fatura maskedeki en yüksek katmana göre kesilir; `photos` referansı Pro'dur, Enterprise DEĞİL.

Ücretsiz kotalar SKU başına ayrı kovalardır ve Pasifik takvim ayında döner (kod bunu doğru
yapıyor). Kredi kartı tanımlı olmadan anahtar çalışmaz.

## 2. Varsayımlar (yeniden ölçeklemek için)

- **10.000 ziyaret/ay** = bir kullanıcının bir buluşma için uygulamayı açması. Ortalama **4
  kişi/buluşma → 2.500 buluşma/ay.** ("10.000 = buluşma" okunursa buluşma-güdümlü satırları 4'le çarp.)
- `find-venues` buluşma başına 1 kez; yarıçap genişletme ortalaması **1,3 arama/buluşma**
  (`SearchRadius.MAX_EXPANSIONS=3`, en fazla 4).
- Sağlayıcı payı: seçilen türlerin HEPSİ FSQ-eşlemeli (COFFEE/FOOD/BAR/WALK/ACTIVITY) ise FSQ, aksi
  hâlde Google → **%60 FSQ / %40 Google** varsayımı.
- Google destesi: `DECK_MAX=20` mekan, her biri için 1 foto isteği aramada peşin; genişletme
  turlarında aynı mekanlar yeniden çözülüyor → **~23 foto/Google buluşması**.
- Harita: masaüstü %50. Masaüstü ziyaret başına **~3,2 harita örneği** (Katıl → Bekle → Mekanlar;
  host: Yeni oturum → Lobi → Mekanlar; her sayfa `new google.maps.Map` = ayrı faturalanan yük —
  `lib/maps.ts` notu bunu ölçtü). Mobil 390: Katıl/Bekle `lgOnly`, Mekanlar ghost'a basınca → **0,5**.
- Ters/düz geocode Nominatim, $0.

## 3. 10.000 ziyarette aylık hacim ve fatura

| Kalem | Hacim/ay | Ücretsiz | Ücretli | Fatura |
|---|---|---|---|---|
| Nearby Search Enterprise | 2.500 × 0,4 × 1,3 = **1.300** | 1.000 | 300 | **$10,50** |
| Place Photo | 1.000 × 23 = **23.000** | 1.000 | 22.000 | **$154,00** |
| Dynamic Maps | 5.000 × 3,2 + 5.000 × 0,5 = **18.500** | 10.000 | 8.500 | **$59,50** |
| Foursquare Pro | 2.500 × 0,6 × 1,3 = **1.950** | 500 | 1.450 | **$21,75** |
| Google Sign-In, GA4, Nominatim | — | — | — | $0 |
| **Toplam (frenler kapalı)** | | | | **≈ $246** |

Bugünkü varsayılan frenlerle (`GOOGLE_MONTHLY_BUDGET=1000`, `GOOGLE_PHOTO_MONTHLY_BUDGET=1000`):
Google arama $0 (ama ~300 buluşma ayın sonunda sağlayıcısız — FSQ eşlemesi olmayan türlerde
`NoVenuesFoundException`), foto $0 (43. Google destesinden sonra monogram), harita $59,50
(fren yok), FSQ $21,75 → **≈ $81 + bozuk ürün.** Ve sayaçlar pod başına/yeniden başlatmada
sıfırlandığı için gerçek harcama bunun üstüne çıkabilir.

Birim maliyet (karar için asıl sayı): **Google destesi = 20 × $0,007 = 14 sent foto**;
Google araması = 3,5 sent (Enterprise) / 3,2 sent (Pro) / kotada $0; masaüstü ziyaret = 3 × 0,7 =
2,1 sent harita / tek örnekle kotada $0.

## 4. Öneri paketi

### A. Güvenlik ağı — kod yok, bugün (30 dk)

1. **Cloud Console → Quotas** (tek gerçek tavan; uygulama sayacı değil):
   - Places API (New) → *Nearby Search requests per day*: **40** (≈1.200/ay, Enterprise kotası
     civarı) — Pro'ya geçince **170** (≈5.000/ay).
   - Places API (New) → *Place Photo requests per day*: seçilen foto seçeneğine göre (§C).
   - Maps JavaScript API → *Map loads per day*: **330** (≈10.000/ay).
   Kota aşımında Google 429 döner; orkestratör bunu zaten `EXHAUSTED` olarak işliyor, `MapView`
   `failed` durumuna düşüyor (hata metni var).
2. **Billing → Budgets & alerts**: $5 bütçe, %50/%90/%100 e-posta. Uyarı harcamayı DURDURMAZ;
   durduran 1'deki kota.
3. **Anahtar kısıtları** (`GOOGLE_PLACES_API_KEY` bugün 403 veriyor — büyük ihtimalle bu):
   backend anahtarı → yalnız *Places API (New)* + küme egress IP'si; `VITE_GOOGLE_MAPS_KEY` →
   yalnız *Maps JavaScript API* + HTTP referrer (`bumpinto.*`, localhost). Anahtarlar zaten ayrı; iyi.

### B. Harita: $59,50 → $0 — W izi, 1 görev

- **Tek harita örneği:** `google.maps.Map` modül-tekil bir konteynerde bir kez kurulur, sayfalar
  arasında DOM'a yeniden ebeveynlenir (`MapView` bir portal olur). Faturalanan birim ÖRNEK'tir,
  pan/zoom değil → masaüstü ziyaret başına 3,2 → 1. Hacim 18.500 → 7.500 < 10.000. **$0.**
- Yedek/ek: Lobi ve Bekle'de mekan yok, yalnız pinler → **Static Maps** (`$2/1000`, AYRI 10.000
  kova). Dynamic yalnız Mekanlar + MapPicker'a kalır.
- Bilinen kusur (`MapView` yorumu, spec R3): `desktop` reaktif olduğu için 1024px eşiği geçilince
  ikinci örnek kuruluyor, eskisi yıkılmıyor. Tek-örnek tasarımı bunu da kapatır.

### C. Foto: ürün kararı, fiyat etiketiyle — B izi

Bugün foto aramada, 20 mekan için peşin, genişletme turlarında tekrar çözülüyor. Teknik düzeltme
(karardan bağımsız, hepsini yap):

1. Foto referansını (`photos[0].name`) `VenueCandidate`'te taşı; `/media` çağrısını sağlayıcıdan
   `DeckFlow`'a al ve **yalnız nihai kısa liste** için yap (tekilleştirme + puan + `DECK_MAX`
   sonrası). Genişletme tekrarları biter: 23 → 20.
2. **Place ID bazlı çapraz-oturum önbelleği** (Postgres, 30 gün = `venues.photo_url`'in zaten
   yaşadığı süre, plan 6 temizliğiyle aynı ömür). Aynı şehirde popüler kafeler tekrar eder; ~%35
   isabet varsayımı. Hukuki not: Place ID süresiz saklanabilir; foto URL'i için açık izin yok —
   bugünkü DB satırından fazla maruziyet YARATMAZ, ama karar dokümanı §2'deki "hukuki okuma" borcu
   duruyor.
3. **Tembel çözüm:** kart ilk kez görüntülenince `GET /api/venues/{id}/photo` → 302 CDN adresi
   (sunucu çözer, önbelleğe yazar). Desteyi bitirmeyen gruplar için ~%30 tasarruf.

Seçenekler (öneri paketi B+D uygulanmış, Google tüm aramalarda birinci → 2.500 Google destesi):

| Seçenek | Foto/buluşma | Hacim/ay | Fatura | Not |
|---|---|---|---|---|
| P0 Foto yok (monogram/tint) | 0 | 0 | **$0** | Ürün tezine aykırı sayılabilir |
| P1 Yalnız Karar ekranında kazanan | 1 | 2.500 | **$10,50** | Deste/liste monogram |
| P1b Runoff finalistleri + kazanan | ~3 | 7.500 | **$45** | |
| P2 Deste 12 kart, tembel + önbellek | 12 × 0,7 × 0,65 ≈ 5,5 | 13.650 | **$89** | `DECK_MAX` 20→12 ürün kararı |
| P2' Deste 20 kart, tembel + önbellek | ≈ 9,1 | 22.750 | **$152** | |
| P3 Bugünkü davranış (20 peşin) | 20 | 50.000 | **$343** | Google-birinci ile |

Aynı seçenekler bugünkü %60/%40 karışımıyla (FSQ destelerinde foto zaten yok): P2 ≈ $31, P2' ≈ $57.
Yani "Google'ı birinci yap" kararı aramayı $0'a indirirken foto hacmini 2,5 katlar; **arama ve
foto kararı birlikte verilmeli.**

Doğrulanacak alternatif (10 dk, tek curl): **Foursquare Premium** araması `photos`'u tüm
sonuçlar için TEK çağrıda döndürür. Premium fiyatı $140/1.000'in altındaysa (20 × $7) FSQ-eşlemeli
türlerde foto kaynağı FSQ olmalı; 09-03'te Premium alanlar "pahalı" diye çıkarılmıştı ama fiyat
ölçülmemişti. Google'dan foto = mekan başına ayrı çağrı; FSQ'da deste başına bir çağrı.

Gemini'nin Unsplash/Pexels önerisi: temsilî stok foto, gerçek mekan değil → ürün tezine aykırı,
önerilmez. Wikimedia: kafe/bar kapsaması yok.

### D. Arama: $32 → $0 — B izi, küçük

- **Google maskesini Pro'ya indir:** `rating`, `priceLevel`, `userRatingCount`,
  `regularOpeningHours` maskeden çıkar → 5.000 ücretsiz, sonrası $32. Bedel: Google destelerinde
  puan ve "bugün açık" satırı gider (FSQ destelerinde zaten yok); `DeckFlow` kalite kapısı
  (`canonicalOrder(rating)`) mesafeye/adalete düşer. Enterprise'da kalmanın 10k ziyaretteki bedeli
  Google-birinciyle **(3.250 − 1.000) × $35 = $79/ay**.
- **Sırayı maliyete göre kur:** bugün sabit FSQ → Google (09-06 kararı, FSQ "ücretsiz" sanısıyla).
  Gerçek: FSQ 500 ücretsiz + $15/1000; Google Pro 5.000 ücretsiz + $32/1000. ≤5.000 arama/ayda
  en ucuz sıra **Google Pro → FSQ**; ikisi de ücretliyken FSQ ($15) daha ucuz. Kural: "bu ay
  ücretsiz hakkı kalan önce; ikisi de ücretliyse birim fiyatı düşük önce". Oran kıyaslaması DEĞİL
  (o hata düzeltildi), iki sabit sayı. 10k ziyarette: 3.250 Nearby Pro < 5.000 → **$0**, FSQ ~0.
- Yan kazanım: 10 Google-özgü tür için FSQ eşlemesi yazmaya gerek kalmaz; tek taksonomi, `attribute`
  hep dolu, "FSQ oturumunda puan yok" tutarsızlığı biter.

### E. Sızıntı kapatma — küçük işler

1. **Sayaç pod başına** (`AtomicLong`, `AtomicReference<YearMonth>`): 2 replica = 2× bütçe,
   deploy = sıfırlanmış bütçe. Seçenek: sayacı Postgres'e taşı (`provider_usage(provider, month,
   calls)` + `UPDATE … RETURNING`), ya da uygulama tavanını "yumuşak" say ve gerçek tavan olarak
   A.1'e güven. Öneri: A.1 + sayacı log/teşhis için bırak.
2. **Başarısız `find-venues` yeniden denemesi:** boş sonuç 30 dk cache'lenmiyor (bilinçli), oturum
   COLLECTING'e dönüyor, host tekrar basıyor → her deneme 4 aramaya kadar. `NoVenuesFound` için
   merkez+tür anahtarına 10 dk'lık "boş" işareti koy; rate limit 3/dk zaten var ama ay bütçesini
   korumuyor.
3. **Nominatim istemciden** (`lib/geocode.ts`): tarayıcı User-Agent koyamaz, politika iletişim
   adresi ister; ölçekte engellenme riski. Backend'de `NominatimReverseGeocoder` + throttle zaten
   var → `geocode`/`reverseGeocode`'u aynı yoldan geçir, sonucu önbelleğe al. Google Geocoding'e
   geçmek gereksiz (10.000 ücretsiz ama 12.500 tahmini hacim → $12).
4. Cache anahtarı 3 ondalık (~110 m) + 0,1 km yarıçap: çapraz-oturum isabeti ~0. ~500 m ızgara +
   yarıçap kovası ile küçük kazanım; foto önbelleği (C.2) daha değerli.

## 5. Gemini hesabındaki hatalar

| Gemini | Doğrusu | Kaynak |
|---|---|---|
| Place Photo = Essentials, 10.000 ücretsiz | **Enterprise, 1.000 ücretsiz, $7/1000** | fiyat sayfası + SKU listesi |
| "`photos` alanı isteği Enterprise'a ($20) çıkarır" | `photos` Nearby Search'te **Pro** alanı; Enterprise'ı rating/priceLevel/saat tetikler; $20 Place Details fiyatı, biz Nearby Search kullanıyoruz ($32/$35) | Nearby Search (New) alan listesi |
| Street View Static 28.500 ücretsiz | Eski model; şimdi 10.000, $7/1000 | fiyat sayfası |
| "Resim URL'sini 30 gün cache'le" (ToS izni) | Place ID süresiz; foto URL/içerik için açık izin yok | karar dok. 09-03 §2 |
| "Tek resim çekiyorum" → 10.000 istek | Kod arama başına **20** foto çözüyor (+ genişletme tekrarı) | `resolvePhotos` |
| 10.000 trafik ≈ $15–20 | Gerçek sürücüler foto ×20 ve harita ×3 → ≈ $246 | §3 |
| Foursquare 10.000 ücretsiz Pro | Değişiklik duyurusu 500/ay diyor; fiyat sayfası 10.000; **doğrulanmadı** | FSQ duyurusu |

## 6. Yürütme sırası ve karar noktaları

| # | Adım | 10k ziyarette etki | İz / efor | Kullanıcı kararı |
|---|---|---|---|---|
| 1 | Console kota + bütçe uyarısı + anahtar kısıtı (§A) | sürpriz fatura 0; 403 muhtemelen çözülür | konsol, 30 dk | — |
| 2 | Tek harita örneği (§B) | −$59,50 | W, 1 görev | — |
| 3 | Foto: kısa listeye çöz + place-ID önbelleği + tembel (§C.1–3) | −$65…−$120 | B, 2 görev | **P0/P1/P1b/P2 ve `DECK_MAX`** |
| 4 | Maske Pro + maliyet sıralı orkestratör (§D) | −$32 → $0 arama | B, 1 görev | **puan/saat verisinden vazgeçmek; 09-06 sıra kararı tersine döner** |
| 5 | FSQ Premium fiyatını ölç (§C) | belki foto −%50 | curl, 10 dk | sonra |
| 6 | Sayaç/boş-işaret/Nominatim proxy (§E) | kaçak önleme | B+W, küçük | — |

Hedef tablo (2+3(P2)+4 uygulanmış, 10.000 ziyaret): harita $0, arama $0, FSQ $0, foto ≈ $89 →
**≈ $89/ay**; P1 seçilirse **≈ $11/ay**. 2.000 ziyaretin altında her seçenek ücretsiz kotada.

Kaynaklar: Google fiyat listesi (developers.google.com/maps/billing-and-pricing/pricing),
Nearby Search (New) alan listesi (…/places/web-service/nearby-search), SKU detayları
(…/billing-and-pricing/sku-details), Foursquare "pay as you go" duyurusu (foursquare.com/resources/blog).

---

## 7. 100.000 ziyaret/ay — minimum maliyet planı

Ek doğrulama (2026-09-06): Foursquare **Premium** (photos/tips uç noktaları) **$18,75/1.000, ücretsiz
katman YOK** (hacimle $11,25'e iner); Google **Text Search / Place Details "IDs Only" sınırsız
ücretsiz**; Street View Static $7/1k, 10.000 ücretsiz; Static Maps $2/1k, 10.000 ücretsiz; 100k–500k
kademesi: Dynamic Maps $5,60, Nearby Pro $25,60, Place Photo $5,60.

### 7.1 Ölçek yasası

100k ziyaret = 25.000 buluşma. İki tür kalem var:

- **Ziyaretle ölçeklenen** (her buluşmada ödenir): Nearby Search, harita yükü, oturum başına foto.
  1 sent × 25.000 = $250/ay. 100k'da bunların HEPSİ sıfırlanmalı.
- **Benzersiz mekanla ölçeklenen** (mekan başına bir kez, önbellek izin verdiği sürece): foto.
  Coğrafya yoğunlaştıkça doyar. Tek kalıcı maliyet burada.

Benzersiz mekan sayısı ölçülmedi; NL için 30 günde **10k / 30k / 60k** üç nokta veriliyor.

### 7.2 Google-tutarlı yapı (G) — §4 paketi 100k'ya ölçeklenince

| Kalem | Hacim | Fatura |
|---|---|---|
| Nearby Search Pro (Google birinci) | 32.500 − 5.000 | **$880** |
| Dynamic Maps, tek örnek | 75.000 − 10.000 | $455 |
| Dynamic Maps, masaüstünde de tıkla-aç (%30 açar) | 27.500 − 10.000 | **$123** |
| Foto P1 (yalnız kazanan) | 25.000 − 1.000 | $168 |
| Foto P2 (deste 12, tembel, önbellek) | 137.500 | $903 |
| **G-min (P1 + tıkla-aç harita)** | | **≈ $1.170** |
| **G-max (P2 + tek örnek harita)** | | **≈ $2.240** |

G'de arama buluşma başına zorunlu: Google içeriği oturumlar arası önbelleklenemez (yalnız place ID
süresiz, lat/lng 30 gün). $880 taban maliyettir; G 100k'da ucuzlamaz.

### 7.3 Optimum hibrit H* — en yüksek kalite, minimum maliyet (revize, ikinci araştırma turu)

İkinci turun bulguları (2026-09-06, aynı gün):

- **Foursquare PAYG önbellek şartı:** yalnız `fsq_place_id`, **foto ID** ve adres ID süresiz
  saklanabilir, **başka hiçbir şey** (ad, kategori, saat, puan, foto URL'i dâhil). Foto URL'i
  ID'den türetilemez → "benzersiz mekan başına bir kez öde" ekonomisi FSQ'da YOK; ekonomi çağrı
  başınadır. §7.3'ün ilk hâlindeki mekan-başına foto tablosu bu yüzden geçersiz.
- **FSQ Premium araması** (`places/search` + `photos,rating,price,popularity,hours` alanları):
  **tek çağrıda 50 adayın fotoğraf + puan + fiyat + popülerlik + saati**, $18,75/1.000 (hacimle
  $11,25), ücretsiz katman yok. Pro ile fark yalnız **$3,75/1.000**. 09-03'teki "Premium alanları
  çıkar, Pro'ya in" kararı Premium'un çok pahalı olduğu varsayımına dayanıyordu; değilmiş.
  Deste başına maliyet: Google Enterprise + 20 foto = 3,5 + 14 = **17,5 sent**; FSQ Premium =
  **1,9 sent** (hacimde 1,1). Dokuz kat fark, üstelik popülerlik ("19:00'da kalabalık mı") yalnız FSQ'da.
- FSQ verisi herhangi bir haritada gösterilebilir; şart "Powered by Foursquare" (`Attribution.tsx`
  zaten var). Google verisi kalmayınca Places ToS'un "non-Google map" engeli kalkar → MapLibre serbest.
- **Overture Places** (Meta + Microsoft + FSQ OS + PinMeTo; ~74M kayıt; CDLA-Permissive-2.0 /
  Apache 2.0): `confidence` (varlık olasılığı) ve işletme durumu taşır, aylık yayın, GeoParquet.
  Saklanabilir, $0. Plan 7'nin "Overpass" yerine bunun ithali olması gerekir.
- **OpenFreeMap:** OSM vektör tile + stiller, "harita görünümü ve istek sınırı yok", anahtar yok,
  ticari serbest, MIT, haftalık gezegen indirimi (kendi barındırma). SLA yok — yedek: Protomaps
  PMTiles NL çıkarımı (~1–2 GB) kendi nginx'te.

**Katmanlar:**

| Katman | Kaynak | Maliyet | Not |
|---|---|---|---|
| Arama + puan + popülerlik + saat + **foto** | **Foursquare Premium `places/search`**, deste başına TEK çağrı, `limit=50`, yarıçap ≤100 km | **$18,75/1k → $11,25** | Genişletme döngüsü neredeyse hiç çalışmaz (50 aday). FSQ eşlemesi 5 türden 15'e çıkarılır (24 haneli kimlikler, canlı istekle doğrulanır). |
| Kapsama yedeği | **Overture Places + OSM**, NL çıkarımı, PostGIS, aylık CronJob | $0 | FSQ'nun zayıf olduğu türler (yürüyüş alanı, park, havuz) ve boş dönen aramalar. Foto yok → Wikimedia/monogram. `confidence` + işletme durumu ile kapalı mekan elenir. |
| Landmark fotoları | Wikidata P18 / Commons, Overture-OSM `wikidata` etiketinden | $0, saklanabilir | Park, müze, sinema, tema parkı, hayvanat bahçesi. |
| Harita | **MapLibre GL JS + OpenFreeMap** (yedek: PMTiles kendi nginx'te) | $0 | `MapView`/`MapPicker` yeniden yazılır; Advanced Marker → MapLibre Marker, Map ID gider. |
| Geocode | **Photon** (komoot) NL indeksi kendi kümede ya da Nominatim backend proxy | $0 | Bugünkü istemci-Nominatim borcu kapanır. |
| Ulaşım süresi | **OSRM** NL (yaya/bisiklet/araba) — isteğe bağlı | $0, ~3–5 GB | Haversine×hız yerine gerçek rota; adalet metriği güçlenir. Transit için Valhalla+GTFS ayrı iş. |
| Kimlik | Google Sign-In | $0 | Tek kalan Google servisi; Maps anahtarları emekli. |

**Kalite karşılaştırması (deste başına):**

| | Puan | Foto | Saat | Popülerlik | Fiyat | Deste maliyeti |
|---|---|---|---|---|---|---|
| G: Google Enterprise + Place Photo | ✓ | ✓ (en iyi havuz) | ✓ | ✗ | ✓ | 17,5 sent |
| **H\*: FSQ Premium + Overture + MapLibre** | ✓ (0–10) | ✓ (kapsama ölçülecek) | ✓ | **✓** | ✓ | **1,9 sent** |
| O: yalnız Overture/OSM + Wikimedia | ✗ | ~%25 | kısmi | ✗ | ✗ | $0 |

**Fatura (bütün iyileştirmeler uygulanmış, sabit maliyet $0) — 2026-09-06 ikinci doğrulama:**
FSQ Premium kademeleri 0–100k $18,75 · 100k–500k $15 · 500k+ $11,25; 25.000 deste ilk kademede
kalır, indirim YOK (önceki "kademeyle $300–400" satırı düzeltildi). TripAdvisor eski Content API
31.08.2026'da kapandı; Terra API 1.000 ücretsiz/ay, kalite tamamlayıcısı, maliyet kolu değil.

| | 5k ziyaret (1.250 deste) | 10k ziyaret (2.500 deste) | 100k ziyaret (25.000 deste) |
|---|---|---|---|
| FSQ Premium, her deste | **$23** | **$47** | **$469** |
| FSQ Premium, tür yönlendirmeli (%70 ticari tür) | **$16** | **$33** | **$328** |
| Harita, geocode, POI tabanı, Wikimedia, TripAdvisor (≤1.000), Sign-In | $0 | $0 | $0 |
| Bugünkü kod (Google, frenler kapalı) — kıyas | $81 | $246 | $2.240 |
| Küme diski | +~30 GB (Nominatim 15, OSRM 5, PostGIS 2, tiles 2) | aynı | aynı |

Karşılaştırma: G-min $1.170 / G-max $2.240 (100k); 10k'da G paketi $89 (P2) idi. H* her ölçekte
ucuz → geçiş için eşik beklemeye gerek yok; tek büyük iş MapLibre yeniden yazımı.

Doğrulanan dış varsayımlar (2026-09-06, ikinci tur): Google "Places API results displayed on a map
must be shown on a Google Map" + yalnız place ID süresiz saklanır (politika sayfası); Maps URL'leri
anahtarsız, `travelmode=driving|walking|bicycling|two-wheeler|transit`; FSQ PAYG önbellek: yalnız
`fsq_place_id`, foto ID, adres ID süresiz, metadata 24 saat; FSQ Pro 500 ücretsiz (01.06.2026
duyurusu; fiyat sayfası hâlâ 10.000 diyor), Pro $15/$12/$9, Premium $18,75/$15/$11,25, Premium
ücretsiz katman yok, photos Premium; OpenFreeMap sınırsız/anahtarsız/ticari serbest/SLA yok;
Overture Places CDLA-Permissive-2.0 + Apache 2.0, `confidence` alanı var.

### 7.4 Değerlendirilip elenenler

- **Mekan başına FSQ foto önbelleği** (§7.3'ün ilk hâli): FSQ şartı foto URL'ini saklatmıyor. Elendi.
- **Google fotosu + kendi arama tabanı** (IDs Only → Details `photos` → medya, ≈1,2 sent/mekan):
  Google fotosunu MapLibre yanında göstermek ToS riski, önbellek gri; FSQ Premium tek çağrı daha
  ucuz ve temiz. Elendi.
- **Mapbox GL JS:** 50k yük/ay ücretsiz, sonra $5/1k, token zorunlu. MapLibre aynı motorun açık
  çatalı; gereksiz. **Overpass public API:** fair-use, üretim trafiği için değil; runtime'da
  Overpass yerine kendi PostGIS ithali doğru olan.
- **Mapillary:** sokağın fotosu, mekanın değil. **Unsplash/Pexels:** gerçek değil (kullanıcı kararı).
- **Street View Static:** yalnız G dünyasında anlamlı.
- **Kullanıcı fotoğrafı:** uzun vadede tek doyan $0 kaynak; ürün kalemi, sonra.

### 7.5 Benzer uygulamalar ve depolar

Birebir "FSQ Premium + Overture + MapLibre" yapan bir buluşma uygulaması bulunamadı; bileşenlerin
her biri ayrı ayrı kanıtlı:

- Buluşma-orta-nokta: **cszc/Meet-Halfway** (Django, eşit yol süresi, ama Google Directions/Distance
  Matrix/Places — klasik pahalı yığın), **kathdovi/meet-me-halfway** (şehir + uçuş), Mapscaping
  midpoint aracı (OSM + açık rota, kapalı kaynak), Midpointr / meetinthemiddle.site (kapalı).
- Açık POI + açık foto katmanının çalıştığının kanıtı: **Organic Maps / CoMaps** (OSM + Wikipedia),
  **OsmAnd** (OSM + Wikimedia + Mapillary). Hiçbiri ticari mekan fotoğrafı için açık kaynağa
  güvenmiyor — kafe/bar fotoğrafı için ücretli kaynak kaçınılmaz, bu bizim bulgumuzla tutarlı.
- Yığın depoları: `maplibre/maplibre-gl-js`, `hyperknot/openfreemap`, `protomaps/basemaps`,
  `komoot/photon`, `osm-search/Nominatim`, `Project-OSRM/osrm-backend`,
  `OvertureMaps/overturemaps-py` (+ DuckDB ile bölge çıkarımı), `osm2pgsql`.

### 7.6 Doğrulama ve yürütme

1. **Tek curl (10 dk):** FSQ Premium araması NL koordinatında
   `fields=fsq_place_id,name,latitude,longitude,categories,location,website,hours,rating,price,popularity,photos`
   → sonuçların yüzde kaçında foto var, `photos` nesnesinin biçimi (prefix/suffix), konsolda
   Premium sayacının 1 arttığı. Foto kapsaması %60'ın altındaysa Wikimedia + monogram payı büyür,
   fiyat değişmez.
2. **Hukuki okuma (aynı borç):** FSQ "başka hiçbir şey saklanmaz" vs `venues` tablosunun 30 günlük
   saklaması. Pratik yol: oturum kapanınca (DECIDED/EXPIRED) FSQ alanlarını `fsq_place_id` +
   foto ID'ye indirgeyen temizlik — plan 6'ya bir satır.
3. **B izi:** FSQ Premium alanları geri + 15 türe kategori eşlemesi (küçük); Google sağlayıcı bayrak
   arkasına; Overture NL ithali (plan 7 revize: GeoParquet → DuckDB → PostGIS, aylık CronJob);
   Photon proxy; orkestratörde aylık Premium bütçe sayacı Postgres'te.
4. **W izi:** `MapView`/`MapPicker` → MapLibre; OpenFreeMap stili; Foursquare + OSM + OpenFreeMap
   atıfları.
5. **I izi:** Photon (NL indeks), isteğe bağlı PMTiles + OSRM, Overture yenileme CronJob.
6. **Konsol:** Google Maps anahtarları kapatılır (Sign-In client id kalır); FSQ harcama uyarısı.

Sıra önerisi: 1 → 3 (FSQ Premium geri, tek görev, 10k'da bile $89 → $47) → 4 (MapLibre) → 3'ün
Overture kısmı → 5. Bugünkü kodla H*'ın yarısı (FSQ Premium) bir günlük iş; haritanın Google'da
kalması ToS'a takılmaz çünkü FSQ verisi Google haritada da gösterilebilir — yani MapLibre geçişi
ayrı sırada yapılabilir, yalnız harita $0'a inince biter.
