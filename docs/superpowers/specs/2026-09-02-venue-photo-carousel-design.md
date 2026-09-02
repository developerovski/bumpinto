# Mekan kartında çoklu fotoğraf — tasarım (2026-09-02)

**İz:** B (backend) + W (web). Yeni plan numarası INDEX'ten alınır (B-7 / W-6 sıradaki).
**Durum:** onaylı tasarım, plan yazılacak.

## 1. Amaç ve kısıtlar

Deste kartında mekanın birden fazla fotoğrafı gösterilir; kullanıcı kartın içinde fotoğraf
değiştirebilir. Kısıtlar:

- **Maliyet.** Google Places Photo SKU'su Enterprise katmanında: **ayda 1.000 ücretsiz**, sonra
  $7/1000 (Nearby Search Pro: 5.000 ücretsiz, $32/1000). Bugün mekan başına 1 foto çözülüyor →
  50 deste/ay bedava. Her ek foto deste kurulumunda ayrı ücretli çağrı olurdu.
- **Kalite.** Google fotoğrafları rastgele kullanıcı yüklemeleri; çok foto = çok çöp. Az ve seçici.
- **Politika.** Google Places politikası fotoğraf yazarının kredilendirilmesini zorunlu kılar
  ("author's avatar image, name, and profile link"; küçük görsellerde atlanabilir, büyük hâlde
  tam atıf şart). Bugünkü "photo · Places" etiketi yazar atfı değildir — bu iş atfı da getirir.
- **Önbellek.** Places içeriği için 30 günlük önbellek sınırı **hatırlanan** kuraldır (Maps
  Service Terms 3.2.3); madde metni bu oturumda çekilemedi. **Kullanıcı doğrular.** Place ID
  süresiz saklanabilir (politika sayfasından doğrulandı).
- Kart yatay sürüklemeyle kaydırılıyor (`SwipeCard`); fotoğraf değiştirme jesti bununla
  çakışmamalı. `SwipeCard` tıklamayı kullanmıyor (eşik altı bırakma = hiçbir şey).

## 2. Kararlar

| Karar | Seçim | Gerekçe |
|---|---|---|
| Kaç foto | Mekan başına **en fazla 3** | Kalite + maliyet; kullanıcıların çoğu 2–3'ten fazlasına bakmaz |
| Ne zaman çözülür | **Tembel:** idx 0 arama anında (bugünkü gibi), idx 1–2 yalnız tıklanınca | Yalnız bakılan foto ödenir; maliyet ≈ bugünkü |
| Nerede saklanır | **`place_photos`** tablosu, mekan bazlı (`provider, external_id`) | Aynı mekan başka oturumda çıkınca ilk foto dahil media çağrısı atlanır; `venues` değişmez |
| Etkileşim | **Dokunma bölgeleri + segment çubukları**, klavye ↑/↓ | Sürüklemeyle çakışmaz, buton yok, kart temiz |
| Yazar atfı | Kart fotoğrafında ad + profil bağlantısı | Politika gereği; veri arama yanıtında bedava |

## 3. Veri

Migration **V5** — `place_photos`:

```sql
create table place_photos (
    provider    text        not null,
    external_id text        not null,
    idx         smallint    not null,          -- 0..2, 0 = kartın ilk fotosu
    ref         text,                          -- google: places/{id}/photos/{ref}; fsq: null
    url         text,                          -- çözülmüş CDN adresi; tembel fotoda çözülene dek null
    resolved_at timestamptz,                   -- url'nin yazıldığı an; 30 günden eskiyse yenilenir
    author_name text,
    author_uri  text,
    width_px    int,
    height_px   int,
    primary key (provider, external_id, idx)
);
```

- **B-3 (veri saklama) planı V5 → V6'ya kayar.** INDEX B-3 satırı ve plan6 dosyasındaki
  "V5" notu güncellenir. (Flyway `outOfOrder` kapalı; sıra korunmalı.)
- `venues.photo_url` **kalır** ve idx 0'ın URL'sini taşımaya devam eder: mobil, karar kartı,
  geçmiş oturum listesi (`decidedVenuePhotoUrl`) kırılmaz.
- `place_photos` satırları oturumdan bağımsızdır; oturum silinince (B-3) silinmez. 30 günden
  eski `url`'ler ilk erişimde yenilenir; **`ref`** için yenileme yok — Google referansları da
  eskiyebilir, çözüm başarısız olursa foto düşer (bkz. §5).

## 4. Backend

### 4.1 Arama anında (deste kurulumu)

`GooglePlacesVenueProvider.search`:

1. `places.photos` içinden **en fazla 3** referans seçilir: önce `widthPx ≥ heightPx` olanlar
   (yatay, kart oranına uyar), yetmezse listenin başından tamamlanır. Her referansın
   `authorAttributions[0].displayName/uri`, `widthPx/heightPx` alınır.
2. Mekan için `place_photos` sorgulanır. idx 0 satırı var ve `url` var ve
   `resolved_at` ≥ şimdi − 30 gün → **media çağrısı yok**, URL oradan alınır. Değilse bugünkü
   paralel çözümleme (yalnız idx 0), sonuç satıra yazılır.
3. idx 1–2 satırları `ref` + yazar + boyutla yazılır (`url` null). Var olan satırlar ezilmez
   (upsert: `ref`/yazar güncellenir, `url`/`resolved_at` korunur).
4. `VenueCandidate.photoUrl` = idx 0 URL'si (bugünkü sözleşme, `Venue`/`venues.photo_url`
   buradan dolar). Foto sayısı `Venue`'ya girmez; DTO `place_photos` satırlarından üretilir.

`FoursquareVenueProvider.search`: `photos[0..2]` → `prefix + "original" + suffix` URL'leri
doğrudan bilinir; satırlar `url` dolu, `ref` null, `resolved_at` = şimdi yazılır. Yazar: FSQ
yanıtında yok, boş kalır.

Sorumluluk bölüşümü: **sağlayıcı okur, `DeckFlow` yazar.** Sağlayıcı önbellek isabetini
kendisi kontrol eder (`PlacePhotoStorePort.of(provider, externalId)` — çözümleme orada olduğu
için; adapter/out → domain port bağımlılığı ArchUnit'e uygun) ve `search` sonucunda
`VenueCandidate.photos: List<PhotoCandidate{idx, ref, url, authorName, authorUri, widthPx,
heightPx}>` döndürür. **`DeckFlow.findVenues`** mekanları kaydederken
`PlacePhotoStorePort.upsert(...)` ile satırları yazar (yalnız desteye giren mekanlar için —
elenen/kesilen adayların fotoları yazılmaz).

### 4.2 Tembel çözümleme ucu

`GET /api/sessions/{slug}/venues/{venueId}/photos/{idx}` → **302** CDN adresi, `Cache-Control:
public, max-age=3600`. **`SecurityConfig.PUBLIC_ENDPOINTS`'e eklenir**: çapraz kaynaklı `<img>`
SameSite=Lax çerezi taşımaz; `venueId` UUID, tahmin edilemez; `slug`+`venueId` eşleşmezse 404.

Uygulama servisi `VenuePhotos.urlFor(slug, venueId, idx)` (`application/deck`):

| Durum | Sonuç |
|---|---|
| oturum/mekan yok, `venueId` bu oturumda değil, `idx` ∉ 0..2 | 404 |
| satır yok | 404 |
| `url` var ve `resolved_at` taze (< 30 gün) | 302 |
| `url` yok ya da bayat, `ref` var | `PhotoResolverPort.resolve(provider, ref)` → başarılı: satırı güncelle, 302; boş: 404 |
| `url` yok, `ref` yok | 404 |

Portlar (`domain/port`):

- `PlacePhotoStorePort { List<PlacePhoto> of(provider, externalId); void upsert(List<PlacePhoto>); void markResolved(provider, externalId, idx, url, at) }`
- `PhotoResolverPort { Optional<String> resolve(String provider, String ref) }` —
  `ProviderOrchestrator` uygular: `provider` id'sine göre `QuotaAwareVenueProvider.resolvePhoto(ref)`
  çağırır (Google: mevcut media çağrısı `skipHttpRedirect=true`; FSQ: her zaman boş — ref
  üretmez). Google 429 → `QuotaExceededException` → orkestratör sağlayıcıyı `EXHAUSTED`
  işaretler (arama devresiyle aynı), servis 404 döner.

Domain modeli: `domain/venue/PlacePhoto(provider, externalId, idx, ref, url, resolvedAt,
authorName, authorUri, widthPx, heightPx)`; `isFresh(now)`.

### 4.3 API

`VenueDto`'ya eklenir (mevcut alanlar değişmez):

```
photoUrls:    string[]   // [0] = photoUrl (CDN), [1..] = "/api/sessions/{slug}/venues/{id}/photos/{n}" (göreli)
photoAuthors: {name: string, uri: string | null}[]   // photoUrls ile aynı uzunluk; bilinmeyen için null
```

Fotoğrafsız mekanda ikisi de boş dizi. `SessionViewAssembler` `place_photos` satır sayısından
üretir (oturum başına tek toplu sorgu: `PlacePhotoStorePort.ofAll(List<(provider, externalId)>)`).
`openapi.json` + `api-types.ts` yeniden üretilir. Mobil `photoUrl`'ü kullanmaya devam eder.

### 4.4 Gözlem ve kota

- Her media çağrısı INFO: `photo resolved google idx=2 place=<id> (lazy|eager)`; önbellek
  isabeti DEBUG.
- Google `BUDGET` sayacı foto çağrılarını **saymaz** (Photo ayrı SKU, 1.000/ay). Foto sayacı
  bu işte yok; B-7 "kota durumunu paylaşımlı depoya taşı" kalemine "Photo SKU sayacı" notu
  düşülür.

## 5. Frontend (web)

Yalnız deste kartı (`VenueCard` polaroid, `photoOnly` değil). `row` varyantı, `VenueThumb`,
liste satırı, karar kartı, geçmiş listesi **değişmez** (ilk foto).

- `photoUrls.length ≤ 1` → bugünkü görünüm, sıfır ek DOM.
- `> 1` → fotoğraf alanının **sol/sağ yarısı** dokunma bölgesi: önceki/sonraki, uçta durur
  (sarmaz). Üstte, `photoTag` etiketiyle aynı satırda **segment çubukları** (n adet, aktif
  olan `--grad` dolgulu; `Progress` atomunun renk/yükseklik token'ları). Klavye **↑/↓**
  `VenueDeck.onKey`'e eklenir (mevcut ←/→/⌫ ile aynı korumalar).
- Yalnız aktif fotoğrafın `<img>`'i DOM'da; tembel fotoğraf ilk gösterimde yüklenir
  (302 → CDN). `onError` → o indeks listeden düşer ve 0'a dönülür; idx 0 da düşerse
  gradyan + monogram (bugünkü davranış).
- Yazar atfı: fotoğrafın alt-sol köşesinde `photoAuthors[i].name`, `uri` varsa bağlantı
  (`target=_blank rel=noopener`), yarı saydam koyu kapsül (`photoTag` ile aynı stil).
  Bağlantıya pointer olayı **verilir** (tıklanabilir olmalı); `SwipeCard` bu elemandan
  başlayan `pointerdown`'ı sürükleme başlatmaz (`closest("a,button")` kontrolü).
- Göreli `/api/...` yollar `VITE_API_URL` ile mutlaklaştırılır (`lib/photo.ts` `photoSrc`
  geri gelir; preprod/prod'da API ayrı origin).
- Kart değişince indeks sıfırlanır — kart `key` zaten mekan id'si, `useState` yeter.
- Erişilebilirlik: dokunma bölgeleri `button` değil (jest çakışması), `aria-hidden`;
  segmentler `role=img aria-label="Fotoğraf 2 / 3"`; klavye zaten var.
- i18n: `deck.photoOf` ("Photo {{n}} of {{total}}"), `deck.photoBy` ("Photo: {{name}}") — tr/en/nl.

## 6. Hata durumları

| Durum | Davranış |
|---|---|
| Google media 404/expired ref | servis 404 → istemci fotoyu düşürür; satır dokunulmaz (bir sonraki deste kurulumunda `ref` yenilenir) |
| Google 429 | `QuotaExceededException` → orkestratör `EXHAUSTED`, servis 404; kart ilk fotoda kalır |
| `place_photos` yazımı başarısız | deste kurulumu **düşmez**: foto yardımcı veridir; WARN log, `photoUrls` boş/tek |
| Aynı mekan iki oturumda aynı anda | upsert, PK çakışması yok; `url` yazımı idempotent |

## 7. Test

**Backend**
- Google seçim: yatay tercih, 3 sınırı, `authorAttributions` eşlemesi, fotosuz mekan → boş liste.
- Önbellek isabeti: taze idx 0 satırı varken media çağrısı **yok** (MockClient `verifyAll`).
- `VenuePhotos`: tablo satırları (§4.2) — taze 302, bayat yeniden çözüp yazar, ref yok 404,
  yanlış oturum 404, resolver boş 404.
- Uç: kimliksiz 302 + `Location` + `Cache-Control`; `PUBLIC_ENDPOINTS` kapsamı (`WebSecuritySliceTest`).
- Orkestratör `resolve`: doğru sağlayıcıya yönlendirir, 429 → `EXHAUSTED`.
- `DeckFlow.findVenues`: `upsert` çağrılır; store hatası kurulumu düşürmez.
- Migration testi (mevcut `SchemaMigrationTest`) V5'i görür.

**Frontend**
- Tek foto: bölge/segment yok. Çoklu: dokunma ilerletir, uçta durur, segment aktifliği.
- `onError` fotoyu düşürür, 0'a döner; 0 da düşerse monogram.
- Dokunma bölgesi `pointerdown`'ı karta bırakır (sürükleme testi); atıf bağlantısı sürükleme
  başlatmaz.
- ↑/↓ klavye.
- `photoSrc`: göreli yol `VITE_API_URL` ile birleşir, mutlak dokunulmaz.

## 8. Kapsam dışı

- Tam ekran/büyütülmüş fotoğraf görüntüleyici.
- Mobil uygulama carousel'i (API alanı hazır; M izi).
- Foto SKU'su için orkestratör sayacı (B-7 kota kalemine not).
- FSQ dışı yeni sağlayıcıların foto modeli (TripAdvisor: kendi `photos` ucu, ayrı iş).
