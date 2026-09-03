# BumpInto — Plan Index

Spec'ler: `docs/superpowers/specs/2026-08-31-bumpinto-mvp-design.md` (MVP) ·
`2026-09-01-web-tailwind-i18n-design.md` (web stil/i18n) ·
**`2026-09-01-web-parity-design.md` (rev 2 — web = tam ürün, oturum tipi, Mekanlar, Google haritası)**.

UI kaynağı (bağlayıcı): Claude Design `719fcd5f-…` (`Web Ekranlar v2.dc.html` — 34 artboard,
`Mobil Ekranlar v2.dc.html`) ve `b536b3aa-…` (`Design System v2.dc.html` §06–§10).

**Tasarım denetimi (2026-09-02) — iz üstü bağlayıcı kaynak.**
`docs/superpowers/specs/2026-09-02-design-audit-findings.md`. **W-3/W-4/M-2 başlamadan okunur;
artboard'ın yanlış olduğu yerlerde o dosya bağlayıcıdır.** İzlere düşen bulguları: K-W1, K-W3, K-M1.
İz üstü kalan iki çelişki: DS chip 46px ↔ spec 44px, kesik pin iki anlam taşıyor. Tasarım dosyaları
değiştirilmedi (Claude Design'da yama arayüzü yok; 174KB'lık artboard dosyasını yeniden yazma riski
alınmadı).

**Haritasız uzlaşma karar dokümanı (2026-09-03) — iz üstü bağlayıcı kaynak.**
`docs/superpowers/specs/2026-09-03-map-free-group-decision-ux.md`: ürün tezi (adalet → ilgi uyumu → uzlaşma →
ortak an), §4 tasarım kararları (adalet kıstası, TravelChips, tek rozet, ulaşım türü, adalet öncelikli sıra,
harita politikası, dil sözlüğü), §5 iş paketleri, §6 YAPMA listesi. İzlere düşen planlar: **B-7, W-6, M-3**;
K-görevleri: K-W8, K-B11/13/15. Artboard'lar bu karara göre yeniden çiziliyor (kullanıcı onayı bekliyor).

## Kimlik şeması

Planlar bileşen **izlerine** ayrılır; her iz kendi harfiyle numaralanır ve kendi tablosunda yönetilir.

| Harf | İz | Kapsam |
|---|---|---|
| `B` | Backend | Spring Boot uygulaması — domain, application, adapter, DB şeması, zamanlanmış işler |
| `W` | Web | `frontend/web` + `frontend/shared` |
| `M` | Mobil | `frontend/mobile` (Expo) |
| `I` | Altyapı | CI, imaj, K8s, dağıtım — tek bir bileşene ait olmayan, hepsini besleyen işler |

Yeni plan, ait olduğu izin bir sonraki numarasını alır. Sıradakiler: **B-8, W-7, M-4, I-2**.

Her izin plan tablosunun altında ikinci bir tablo var: **spec dışı görevler** (`K-B1`, `K-W4`,
`K-M2` …) — planlama ve yürütme sırasında bulunmuş, spec'te yer almayan işler, sapmalar, kararlar ve
adaylar. Kalem değil **görev** olarak yazılır: paket bulgular atomik satırlara bölünür. Numaralar
sabittir; yeni görev tablonun **sonuna** eklenir, sıra plan sırasını izler.

**Dosya adları tarihsel şemada kalır** (`2026-09-01-plan3-web.md`). `Eski #` kolonu iki şema
arasındaki tek çeviri anahtarıdır: plan gövdelerindeki "Plan 2", "Plan 5 Task 3" gibi çapraz
referanslar hâlâ eski numarayı kullanır — hangi kimliğe karşılık geldiğini o kolondan oku.

## Ajanlar için bağlayıcı kurallar

1. Bir planı yürütmeye başlarken bu dosyada o planın **Durum** alanını `in-progress` yap.
2. Her görev bitişinde **Son adım** alanını güncelle (ör. `Task 3/8 bitti`).
3. Plan tamamlanınca **Durum** → `done`, **Not** alanına tek satır özet.
4. Engellenirsen **Durum** → `blocked`, **Not** alanına neden + ne gerektiği.
5. Bu dosyayı yalnızca düzenle — git commit'i kullanıcı yapar (AGENTS.md).
6. **Her iz kendi içinde sıralıdır; sırayı kimlik numarası değil aşağıdaki "Yürütme sırası" bölümü
   belirler** (ör. B-3 retention, B-5 ve B-6'dan SONRA koşar). **Farklı izler eşzamanlı koşabilir.**
   6a. Bir plana başlamadan önce **Bağımlılık** kolonundaki her kimliğin durumunu bu dosyadan
   doğrula. Görev-seviyeli bağımlılık (`I-1:T3`) yalnız işaretlendiği görev bloğunu kapatır —
   planın geri kalanı beklemez.
   6b. `deferred` planlar iz akışına GİRMEZ, atlanır.
7. **UI işlerinde tasarım kaynağı Claude Design'dır** — ilgili planın "UI Kaynağı" bölümüne uy;
   ajan kendi tasarımını yapmaz.
8. **Bir planın "Ek A" bölümü varsa gövdeden ÖNCE okunur ve çelişkide kazanır** (M-1, I-1, B-3).
9. **Flyway numara sicili:** V1–V2 mevcut · **V3 = B-5** · **V4 = B-6** · **V5 = B-7** (adalet/ulaşım
   türü/karar şeffaflığı/sağlayıcı alanları) · **V6 = B-3** · **V7 = foto karuseli** (plan açılmadı; spec
   `2026-09-02-venue-photo-carousel-design.md`). Yeni migration açan plan burada numara alır; `outOfOrder` hep kapalı.
10. **Spec dışı bulguları plan gövdesinde bırakma, bu dosyaya yaz.** Yürütme sırasında spec'te
    olmayan bir şey çıkarsa (yeni uç, bilinçli sapma, sonraki plan adayı, maliyet/araç kararı)
    ilgili **izin** "Spec dışı görevler" tablosuna, sıradaki `K-<iz><n>` kimliğiyle tablonun
    **sonuna** ekle. Bulgu birden çok işi paketliyorsa her işi ayrı satır yap.
    10a. Bir kalem **tek** ize düşer. Birden çok izi bağlayan kaynak veya karar dosyanın **üst
    bloğuna** (başlık altındaki spec/UI kaynağı bloğu) yazılır; izlere düşen sonuçları ilgili
    tablolarda K-görevi olur ve üst bloğa referans verir (ör. tasarım denetimi → K-W1, K-W3, K-M1).
    10b. **Yeni `## B` / `## W` / `## M` / `## I` bölümü açılmaz** — her iz bu dosyada tek yer
    tutar: plan tablosu + spec dışı görev tablosu.

**Plan durumları:** `ready` (yazıldı, yürütülmedi) · `in-progress` · `blocked` · `done` ·
`deferred` (yazıldı, bilinçli olarak yürütülmüyor)

**Spec dışı görev durumları:** `done` (uygulandı ya da karar verilip yürürlüğe girdi) ·
`açık` (yapılacak iş, hedef planı belli) · `aday` (henüz plan açılmadı — hedef plana aday)

**Bağımlılık gösterimi:** `B-2` = o planın **tamamı** `done` olmalı ·
`I-1:T3` = yalnız o planın 3. görevi · `—` = bağımlılık yok · `✓` = koşul şu an sağlanıyor.

---

## Yürütme sırası (2026-09-02, rev 2 spec'inden türetildi)

Üç şerit paralel koşar; oklar zorunlu sırayı gösterir.

```
Backend   : B-5 ✓ ──> B-6 ✓ ──> B-7 (V5) ──> B-3 (V6, T1–T4) ──┐
Web       : W-3 ✓ ──> W-4 ✓ ──> W-5 ✓ ──> W-6a (hemen) ──> [B-7:T1–T4] W-6b ──┤
Mobil     : [B-6] M-1 (Ek A) ──> [B-5, W-4] M-2 ──> [B-7, W-6] M-3 ──────────┤
Altyapı   : I-1 T1–T3 (hemen) ──> [B-3 T5 ← I-1:T3] ──> I-1 T4 ◄──────────────┘  (yayın kontrol listesi)
```

**2026-09-03 güncellemesi:** B-7 açılış öncesi yürütülür (V5); B-3 V6'ya kaydı. W-6a B-7'yi beklemez.

Kritik yol (güncel): **B-7 → W-6b → M-1 → M-2 → M-3 → I-1:T4**. W-6a, B-7 ve I-1 T1–T3 aynı anda başlayabilir.

---

## B — Backend

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| B-1 | Backend iskelet + alan çekirdeği + karar motoru | `2026-09-01-plan1-backend-core.md` | Plan 1 | done | — | Task 8/8 + final review | 23/23 test yeşil (BUILD SUCCESS); domain saf, sıfır TODO; commit'ler kullanıcıda |
| B-2 | Application + adapter katmanları (API, Security, Unirest, STOMP) | `2026-09-01-plan2-backend-api.md` | Plan 2 | done | B-1 | Task 10/10 + 2 temizlik turu + kapanış denetimi | 119/119 test yeşil (temiz build); sıfır TODO/ölü kod; ArchUnit 3 kural; subagent-driven (impl Opus / review Fable); commit'ler kullanıcıda |
| B-5 | **Oturum modeli rev 2** — `SessionType`, `BROWSING`, `shuffle`, elle konum (`points`), yuvarlanmış konum + şehir etiketi, orta nokta/yarıçap, BROWSING'de "Bunu seç", runoff kilitleyenler | `2026-09-02-plan9-backend-session-model-v2.md` | Plan 9 | done | B-2 ✓ | Task 6/6 + orkestratör borç kapatma turu | 140/140 test yeşil (temiz build), web tsc + 5/5 web testi yeşil, sıfır TODO. Migration **V3**. Subagent-driven (impl Sonnet / review Opus, 19 ajan). Spec §8 kalem 4–9 kapandı. **Plan düzeltmesi:** planın `midpoint`/`radiusKm`'i ham döndüren kod bloğu, kendi "tam koordinat API'den asla çıkmaz" değişmezini çiğniyordu — 2 kişilik oturumda orta nokta diğerinin tam konumunu veriyordu; ikisi de yuvarlandı. Katılımcı sırası `joinedAt`'e göre deterministik yapıldı; `participant_left` olayı eklendi (removePoint sessizdi) |
| B-6 | **Hesap ve liste API'leri** — `GET /api/sessions`, `GET/PUT /api/me` (tercihler + dil), `POST /api/auth/logout`, `GET /sessions/{slug}/preview` (kamu), `SessionView.viewer` | `2026-09-02-plan10-backend-account-api.md` | Plan 10 | done | B-5 ✓ | Task 4/4 + kapanış incelemesi | 149/149 test yeşil (temiz build), web build + 5/5 yeşil, sıfır TODO. Migration **V4**. Subagent-driven (orkestrasyon Fable / impl Sonnet / review Opus; Task 3 → 3a+3b). Spec §8 kalem 1–3 + `preview` (host adı, kişi sayısı, `participants[{ad, host, hasLocation}]`) + `SessionView.viewer`. Tasarım denetimi (§9) gereği `readyCount`/`doneCount`/`decidedVenuePhotoUrl` eklendi; artboard'lar düzeltildi. **Bayat çerez hatası kapatıldı** (`PUBLIC_ENDPOINTS`). M-1'in cihaz-yerel liste tavizi kalktı. Sapmalar aşağıda; commit'ler kullanıcıda |
| B-3 | Veri saklama — süresi dolan oturumların kalıcı silinmesi | `2026-09-01-plan6-data-retention.md` | Plan 6 | ready | B-6 ✓ · *Task 5 için* `I-1:T3` | — | Spec §6 GDPR. **Ek A: migration V5** (V3/V4 B-5/B-6'ya verildi). B-6'dan sonra koşar; Task 5 (K8s CronJob) I-1'in imaj/secret adlarına dayanır. I-1'in yayın kontrol listesi bu plan `done` olmadan işaretlenmez |
| B-4 | Dinamik aktivite keşfi — self-host Overpass (OSM) | `2026-09-01-plan7-activity-discovery.md` | Plan 7 | deferred | iz akışı dışı | — | **YÜRÜTÜLMÜYOR.** Yerine ucuz yol seçildi: `ActivityType` 5→15 genişletildi (B-2 kodu üzerinde, 123/123 test). Açılırsa API sözleşmesi değişir → W-1/W-2/W-3/W-4/M-1/M-2 geriye dönük düzeltme; Task 7 (K8s) `I-1:T3`'e bağımlı |
| B-7 | **Adalet çekirdeği, ulaşım türü, karar şeffaflığı, sağlayıcı alanları, bütçe tavanları** — `TravelMode` + hıza ters ağırlıklı orta nokta, yuvarlanmış konumdan dakika (gizlilik), mekan başına `{maxMinutes, spreadMinutes}`, adalet öncelikli `deckOrder`, `decisionKind`/`decidedAt`/`runoffReason`/`likeCounts`, RUNOFF oy gizliliği, `midpointLabel` (Nominatim backend), Google aynı-katman alanları + FSQ Pro alanları, Nearby/Photo aylık tavanları | `2026-09-03-plan15-backend-fairness-travelmode.md` | Plan 15 | done | B-6 ✓ | Task 1a ✓ (V5, TravelMode, ağırlıklı centroid; 186 test yeşil) · Task 1b ✓ (travelMode API + /api/me defaultTravelMode + Bruno) · Task 1c ✓ (TravelMinutes/Fairness/DeckOrdering, ağırlıklı orta nokta, `VenueDto.fairness`, `ParticipantDto.midpointMinutes`, idempotent shuffle) · Task 2a+2b ✓ (DecisionKind/RunoffReason, decidedAt, likeCounts yalnız DECIDED, voteTally gizlilik kapısı, runoffVotes sızmıyor) · Task 3 ✓ (ReverseGeocodePort + Nominatim adapteri, UA/1 istek-sn/Caffeine, `midpointLabel` find-venues'ta bir kez) · Task 4a ✓ (Venue/VenueCandidate +6 alan, Google maskesi aynı katman: primaryTypeDisplayName/businessStatus/shortFormattedAddress/userRatingCount/regularOpeningHours/addressComponents, OPERATIONAL filtresi foto çözümünden önce) · Task 4b ✓ (FSQ Pro-only FIELDS `fsq_place_id,name,latitude,longitude,categories,location,website`, `VenueDto` +provider/category/address/locality/ratingCount/hoursToday/placeLink düz, mapsUrl yol tarifi fallback) · Task 5 ✓ (Nearby 1000/ay sert tavan — QuotaExceededException → FSQ'ya düşer; Place Photo 1000 görsel/ay, tükenince photoUrl null; `Quota` 3 arg) · Task 6 ✓ (openapi.json + api-types.ts yeniden üretildi, Bruno find-venues/shuffle docs, ARCHITECTURE alan modeli özeti; 230 test) · Kapanış incelemesi ✓ (2026-09-03): `PointRequest.travelMode` eklendi, `GeoMath.centroid(List)` silindi, V5 not-null testi, ARCHITECTURE §7 düzeltmeleri; **231 test yeşil**. Subagent-driven (impl Sonnet / review Opus, ~30 ajan). Kullanıcıda: commit, Bruno e2e (gerçek Google idToken), `:8060`'ta bırakılan `spring-boot:run` (PID 37675) — ajanlar IDE-debug JVM'ini iki kez öldürdü. Bilinçli sapmalar: shuffle kanonik taban (rating→externalId), TravelEstimate mod-suz overload silindi, Nominatim bloklayan throttle (K-B22), PARTIAL→Runoff'ta kind kaybı (karar dok. §7.7) | 10 görev bloğu (1a–1c, 2a–2b, 3, 4a–4b, 5, 6), TDD + Bruno. Karar dokümanı §4 + §5.A. Migration **V5**. Beraberlik puanla kırılır (§4.5); `ParticipantDto.midpointMinutes`, `VenueDto.locality` eklendi; `shuffle` adalet sırasını idempotent uygular (UI fiili "Karıştır ve kaydır" değişmez). Açılış maliyet modeli: Google bütçeli (1k Nearby + 1k foto/ay), FSQ Premium alanları çıkar, harita yok. K-B11/K-B13/K-B15 buraya düşer; K-B12 (paylaşımlı kota deposu) kapsam DIŞI kalır (Redis işi) |

**Spec dışı görevler** — planlama/yürütme sırasında bulundu, spec'te yok. `Plan` kolonu:
`done` için kalemin çıktığı plan, `açık`/`aday` için hedef plan.

| Kimlik | Görev | Durum | Plan | Not |
|---|---|---|---|---|
| K-B1 | `runoffVotedParticipantIds` — runoff'ta kimin kilitlediğini döndür | done | B-5 | Runoff sağ bölgesi "kim kilitledi" ister (neyi seçtiği değil) |
| K-B2 | `/shuffle` + `/points` için adlandırılmış rate-limit kovası | done | B-5 | **Açılmadı** (bilinçli sapma): genel `/api/*` 120/dk kovasına düşüyor. Gerekçe: ikisi de sağlayıcı çağrısı yapmıyor ve `shuffle` durum korumalı (ilk çağrıdan sonra 409). Bruno dokümanı koda göre yazıldı, plana göre değil |
| K-B3 | `GET /api/sessions/{slug}/preview` — kamu önizlemesi | done | B-6 | Katıl ekranı katılmadan önce host adını, oturum adını ve kişi sayısını gösteriyor; mevcut `GET /sessions/{slug}` 401 döndüğünden kamu ucu şart. Tasarım denetimi §9 gereği `participants[{displayName, host, hasLocation}]` da eklendi (koordinat/id yok) |
| K-B4 | `SessionView.viewer` — "host muyum / hangi katılımcıyım" | done | B-6 | Web sayfa yenilenince bellekten silinir; sunucu söyler |
| K-B5 | `SessionSummaryDto`'ya `readyCount`, `doneCount`, `decidedVenuePhotoUrl` | done | B-6 | Tasarım denetimi §9 gereği eklendi; artboard'lar düzeltildi |
| K-B6 | `POST /api/auth/logout` ve okuma uçları için adlandırılmış kova | done | B-6 | **Alınmadı** (bilinçli sapma): genel `/api` 120/dk. Auth kovası Google doğrulaması içindir |
| K-B7 | Dil doğrulaması tek kaynaktan | done | B-6 | `@Pattern` yerine `UserPreferences.LANGUAGES` (400 IllegalArgumentException ile) |
| K-B8 | Bayat çerez hatası — kamu uçlarında cookie okunmasın | done | B-6 | Bearer resolver `SecurityConfig.PUBLIC_ENDPOINTS` listesindeki uçlarda cookie okumaz; önceden bayat `bumpinto_at` ile logout/login 401 alıyordu |
| K-B9 | `summariesOfHost` satır başına sorguyu kaldır | done | B-6 | Satır başına sorgu yerine 3 sorgu (sayfa + katılımcılar `in` + mekanlar) |
| K-B10 | `PUT /api/me` tam değiştirme sözleşmesi | done | B-6 | Gönderilmeyen tercih temizlenir (displayName hariç) — W-3 Profil formu tam durumu yollar |
| K-B11 | `SessionView.likeCounts` — DECIDED'da mekan→beğeni sayısı | açık | B-7 | W-3'te Karar ekranının "hepiniz aynı yeri beğendi / 3/3 beğendi!" kesişim-1 kutlaması KAPALI bırakıldı: boş `voteTally` seyrek fallback'te ve force-decision'da da boş olduğundan oybirliği kanıtlanamıyor. Deste notundaki "diğerlerinin beğenileri sonuçta belli olur" vaadini de karşılar |
| K-B12 | Sağlayıcı kota durumunu paylaşımlı depoya taşı | aday | B-7 | `ProviderQuotaCache` ve `GooglePlacesVenueProvider`'ın aylık `searchNearby` sayacı **süreç içi**. Bedeli: pod yeniden başlayınca cache boş (ilk scheduler turuna dek `@Order` sırası — kota bilgisiz seçim), Google sayacı sıfırlanır → ay içinde **eksik sayar, bütçe aşılabilir** (para); çok pod'da hiçbiri paylaşılmaz (her pod kendi bütçesini ayrı yer). İş: ikisini Redis'e ya da tek tabloya (`provider_quota(provider, period, calls, remaining, reset_at, measured_at, source)`) taşımak — **Plan 5'teki rate-limit kovasının Bucket4j-Redis'e taşınmasıyla aynı iş, aynı Redis**. Kabul: restart sonrası kota satırı `unknown` değil son bilinen değer; iki pod aynı ayda tek sayaç. Bu arada gözlem loglardan: scheduler her turda `quota <provider>: kalan/limit (%) resets <an> [kaynak]`, orkestratör `venues from <provider>` (INFO) |
| K-B13 | Mekan açık/kapalı saati | açık | B-7 | API'de yok → W-4 Mekanlar'da rozet çizilemedi, artboard da düzeltildi (audit §11) |
| K-B14 | BROWSING'de SOLO konum düzenleme | aday | B-7 | Bugün backend 409 döndürüyor → W-4 ekranı düzenlemeyi göstermiyor |
| K-B15 | Orta nokta için şehir adı (ters geocode) | açık | B-7 | W-4 kapsülü "Orta nokta · ≤ N km" (`radiusKm`) ile yetiniyor |
| K-B16 | Host'un kaydırmama seçeneği ("Ben de kaydıracağım") | aday | B-7 | W-4'te düştü — hiçbir artboard'da ve backend'de yok |
| K-B17 | Apple girişi | aday | B-7 | M-1 Ek A'da kapsam dışı bırakıldı |
| K-B18 | `GET /api/sessions` sayfalama | aday | B-7 | Bugün son 20 kayıt |
| K-B19 | Google dışı mekan verisi — Foursquare OS Places (Apache 2.0) + OSM/Overpass | aday | B-4 | Ücretsiz haritanın ön koşulu: Places ToS "No Use With Non-Google Maps". Bedeli: mekan fotoğrafı yok, 15 tür için kategori eşlemesi, PostGIS. Maliyet gerekçesi ve karar: K-W4 |
| K-B20 | Katılımcı `locationLabel`'ını sunucuda çöz (Nominatim backend'de) | aday | B-8 | B-7 yalnız orta nokta etiketini sunucuya taşıdı; katılımcı etiketi hâlâ istemciden (`lib/geocode.ts`) geliyor — politika (UA, oran, cache) tek yerde olmalı |
| K-B21 | "Belli bir nokta" çapa modu (`anchorMode`/`anchorLat/Lng/Label`) | aday | B-8 | Karar dokümanı §7.2 açık; orta nokta yerine katılımcı yanı ya da adres; "adil" rozetleri bu modda kapanır |
| K-B22 | Nominatim ters geocode `find-venues` içinde senkron/bloklayan throttle | aday | B-8 | B-7:T3 plan gereği `Thread.sleep` ile 1 istek/sn kapısı `@Transactional` içinde: en kötü 1 sn + 5 sn HTTP zaman aşımı kadar isteği ve DB işlemini tutar, eşzamanlı find-venues çağrıları 1/sn serileşir. Kozmetik etiket için pahalı. İş: `tryAcquire` ile kapı doluysa etiketi atla ya da asenkron çöz + sonraki poll'da yaz |

## W — Web

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| W-1 | pnpm workspace + web katılım uygulaması | `2026-09-01-plan3-web.md` | Plan 3 | done | B-2 | Task 7/7 + kapanış denetimi | 5/5 test + tsc + prod/preprod build yeşil; subagent-driven; tüm ekranlar artboard'lardan birebir; pnpm 11 uyarlamaları; elle uçtan uca kullanıcıda; commit'ler kullanıcıda |
| W-2 | Web UI — Tailwind v4 + i18n (tr/en/nl) + rem token migrasyonu | `2026-09-01-plan8-web-tailwind-i18n.md` | Plan 8 | done | W-1 | Task 7/7 + final review | Tailwind v4 utility-first (utility yalnız components/), @theme rem token'ları, react-i18next tr/en/nl; 5/5 test + build yeşil. **en/nl çevirileri `_status` işaretiyle tasarım onayı bekliyor** (onay artefaktı: W-3 Task 2 + `Katıl EN/NL 1280` artboard'ları) |
| W-3 | **Kabuk, kimlik, hesap ekranları, dil menüsü, iki bölgeli yerleşim** — TopBar/LangMenu/AvatarMenu, Google web girişi, Landing, Oturumlar, Profil, hata sayfaları, mevcut 5 oturum ekranının ≥1024 iki bölgeye taşınması (harita hariç) | `2026-09-02-plan11-web-shell-account.md` | Plan 11 | done | W-2 ✓ · B-6 ✓ | Task 7/7 + kapanış incelemesi | 23/23 test + tsc + prod/preprod build yeşil; sıfır TODO; tr/en/nl 183/183/183 anahtar. Subagent-driven (orkestrasyon Fable / impl Sonnet / review Opus; Task 3 → 3a+3b, ~17 ajan). Varsayılan dil **en**; `?lng=` > sunucu tercihi > tarayıcı; `<html lang>`+başlık canlı. Kimlik sunucudan (`SessionView.viewer`; bellek-içi `self` kalktı), `locationLabel` join/konum değişikliğinde gönderiliyor (Nominatim ters geocode), `preview` 401'de bir kez. **Bilinçli sapmalar:** Google butonu GIS render'ı; `/sessions/new` W-4'e dek 404; Karar'da adres/açık-kapalı/km yok (API'de yok); Oturumlar kartında avatar satırı yok (liste API'sinde ad yok); **kesişim-1 kutlaması KAPALI** (B-7 `likeCounts`); Bekle kopyası rev-1 (onay bekliyor); Profil ad düzenleme satır-içi input (artboard'da düzenleme hâli çizilmedi). Tasarım düzeltmeleri Claude Design'a yazıldı (audit §10). Elle uçtan uca (gerçek Google client id) kullanıcıda; commit'ler kullanıcıda |
| W-4 | **Oturum tipi, Yeni buluşma, Lobi, Mekanlar, Google haritası** — `MapView` (Maps JS + AdvancedMarker, Map ID stili), tip seçimi, gruplu etkinlik seçici, Bireysel elle konumlar, rol/durum yönlendirmesi, Mekanlar (liste ↔ harita, Karıştır, Bunu seç), Katıl/Bekle/Karar haritaları, Profil tercih düzenleme | `2026-09-02-plan12-web-session-type-map.md` | Plan 12 | done | W-3 ✓, B-5 ✓, B-6 ✓ | Task 5/5 + kapanış incelemesi | 45/45 test + tsc + prod/preprod build yeşil; sıfır TODO; tr/en/nl 241/241/241 anahtar. Subagent-driven (orkestrasyon Fable / impl Sonnet / review Opus; Task 2→2a+2b, Task 4→4a+4b, ~22 ajan). Harita yalnız Google: `@googlemaps/js-api-loader` **v2** (`setOptions`+`importLibrary`; plandaki `Loader` sınıfı artık yok), tek `MapView` organizması (`mapPins.ts` = DS §10, içerik imzasıyla yeniden çizim, `lgOnly`), anahtar yokken yer tutucu notu. Anahtarlar `VITE_GOOGLE_MAPS_KEY` + `VITE_GOOGLE_MAPS_MAP_ID` (kullanıcı; I-1 Ek A). **Plan düzeltmeleri / bilinçli sapmalar:** (1) "Ben de kaydıracağım" anahtarı ve "Link hemen oluşur" ipucu düştü — hiçbir artboard'da yok, backend'de yok; (2) `shuffle`/`pick`/`findVenues`/`addPoint`/`removePoint` deckStore'da değil `sessionStore`'da (slug orada bağlı; `mutate()` sayacı bayat poll yanıtını düşürür); (3) Katıl'da kendi pini çizilmez — artboard (audit §9) pinsiz + "Katılınca konumlar haritada görünür"; (4) orta nokta kapsülü "Orta nokta · ≤ N km" (`radiusKm`); şehir adı B-7; (5) SOLO kurulumda nokta/find-venues hatasında da `/j/slug`'a gidilir, Bireysel kurulum ekranı sunucu durumunu gösterir; (6) 390'da harita yalnız Lobi ve Mekanlar (`lgOnly`: Maps JS yüklenmez); (7) Mekanlar'da açık/kapalı rozeti ve şehir yok (API'de yok), SOLO BROWSING'de konum düzenleme yok (backend 409) — artboard'lar da düzeltildi (audit §11); (8) tek `useOwnLocation` kancası (Katıl/Yeni buluşma/Profil), `useSessionAction` (Lobi/Bireysel/Mekanlar), `ActivityBadge`, `VenueMeta`/`VenueThumb`; (9) **Yeni oturum 1280 · Grup** sağ bölgesi (`InvitePreview`) artboard'da çizilmedi, spec §5'e göre yazıldı. **B-7 adayları:** host kaydırmama seçeneği, mekan açık/kapalı, SOLO BROWSING'de konum düzenleme, orta nokta şehir adı. Gerçek anahtarla göz kontrolü + uçtan uca (Grup/Bireysel) kullanıcıda; commit'ler kullanıcıda |
| W-5 | **Deste kaydırma jesti + karar animasyonları** — Tinder benzeri sürükle-bırak (sağ = beğen, sol = geç), eşik/fırlatma, dönüş + damga, arka kartın öne gelmesi, buton/klavye kararlarında aynı uçuş, geri al'da geri süzülme; kütüphanesiz (Pointer Events + CSS) | `2026-09-02-plan14-web-deck-swipe.md` | Plan 14 | done | W-4 ✓ | Task 4/4 + Opus inceleme | 60/60 test + tsc + prod/preprod build yeşil; sıfır TODO; yeni i18n anahtarı yok. Fable inline yazdı, Opus inceledi (APPROVE WITH MINORS; S2×3 + S3×4 kapatıldı: giriş animasyonu sürüklemeyi ezmesin, bayat hız fırlatma sayılmasın, ikinci parmak yoksayılır, klavye repeat/modifier/input koruması, d2 `key`, uçan kart `aria-hidden`, testte sabit saat). Yeni: `lib/swipeMath.ts` (saf geometri + test), `molecules/SwipeCard.tsx` (Pointer Events, DOM'a doğrudan yazan sıcak yol, damgalar), `VenueDeck` uçan katman + tek `commit` yolu, `app.css` `--animate-fly-out/fly-in-*/rise`, `test-setup.ts` PointerEvent çokdolgusu (jsdom 25'te yok). **Bilinçli sapma:** damga ve jest artboard'da çizilmedi — DS token'larından türetildi, Claude Design geri yazımı kullanıcıda. Karar iyimser (`decide()` anında, çıkan kart ayrı katmanda); reduced-motion'da uçuş atlanır. **Ek (kullanıcı isteği):** uçuş 0.7s + akıcılık (yığın terfisi `promote`/`appear`/`rise` 0.32s, üç eğri: swipe ease-out / stack in-out / snap esneme; buton kararı satır-içi timing); `molecules/DecisionBurst` — beğenide kalp + konfeti, geçte × + toz (Task 5). Elle kontrol (fare 1280 / dokunma 390 / dikey scroll / ← → ⌫ / efektler) kullanıcıda; commit kullanıcıda |
| W-6 | **Haritasız değerlendirme + grup uzlaşması** — TravelChips + FairnessBadge, Mekanlar liste-önce (MapView tembel, davetli liste, sıralama), Lobi/Bekle orta nokta kartı + ulaşım türü seçici + stepper, Deste kart anatomisi (uyum satırı, semt, atıf), Deste bitti bekleme lobisi (gönderildi hâli, dürt, olmadan devam et), Runoff v2 (trailer, gizli sayım, adil olana bırak), Karar v2 (haritasız, Neden burası?, yedek plan, açılış), analitik olayları | `2026-09-03-plan16-web-fairness-mapfree.md` | Plan 16 | done | W-5 ✓ · B-7 ✓ | Task 0–1 ✓ (serverFields köprüsü, shared fairness.ts, TravelChips/FairnessBadge, tek `travel` prop; 89 test) · Task 2 ✓ (liste-önce, MapView lazy ayrı chunk + LazyBoundary + useMediaQuery, VenueSort shared byFairness/byRating, SOLO SelectionCard, Attribution) · Task 3 ✓ (Deste bitti = bekleme lobisi, sunucu `deckDone` ile gönderildi hâli, PersonRow, useSessionAction hata yolu) · Task 4 ✓ (Runoff v2: RunoffTrailer karar veren hücre, INTERSECTION/FALLBACK kopyası, VoteTally RunoffTie içinde, Adil olana bırak, adlı kilit notu, lib/voters.ts) · Task 5 ✓ (Karar v2: harita yok, WhyHere ADALET/UYUM/YER, BackupPlan, tek seferlik açılış, decisionKind eyebrow, Karar verildi · HH:mm, ghost Maps bağlantısı) · Task 6a ✓ (MidpointCard/ActivityStrip/SessionSteps, Bekle'de harita yok, TwoZone mobileFirst, lib/travelMode.ts) · Task 7 ✓ (FitLine tek uygulama, formatRating Intl, kart anatomisi §4.9, semt bastırma, unionProvider atfı, DeckScreen bağlandı) · Task 6b ✓ (TravelModeField Segmented üstünde, 390 ikon-only, 5 yüzey; authStore.updatePrefs defaultTravelMode koruma düzeltmesi) · Task 8 ✓ (lib/analytics.ts no-op sarmalayıcı + 3 olay, serverFields.ts silindi → @bumpinto/shared, lib/serverEnums.ts, scripts/i18n-parity.mjs `pnpm i18n:check`; 212 test) · Kapanış incelemesi ✓ (2026-09-03): WinnerCard çift atıf, SoloSetup/NewSession 390 harita (§4.7), konumsuz katılımcı notu (§5.C), tr-casing düzeltildi; `fairnessOf` sunucu-yalnız yolu shared'a taşındı. **45 dosya / 225 test, tsc, build + preprod, i18n:check yeşil; MapView ayrı chunk.** Subagent-driven (impl Sonnet / review Opus, ~35 ajan). Tasarım kaynağı Claude Design değil, yerel `web.out.html` (limit doldu). **Bilinçli sapmalar:** tek `travel` prop (labels+selfId), TravelModeField Segmented üstünde, SoloSetup'ta mevcut manuel noktanın modu düzenlenemez (backend ucu yok, K-W10), PointsEditor tam alan (artboard 22px `.f-mp` değil), ActivityStrip/SessionSteps plan-kod görünümü (artboard ile ufak fark, K-W11). Commit, gerçek anahtarla göz kontrolü ve uçtan uca kullanıcıda | 10 görev bloğu (0–8, 6a/6b); adalet mantığı `frontend/shared/src/fairness.ts` (M-3 tüketir); SOLO onay kartı; TravelRange ve `(N)` yok. Karar dokümanı §4 + §5.B/§5.C; §6 YAPMA listesi bağlayıcı. W-6a (B-7'den bağımsız hızlı kazanımlar) hemen başlayabilir. Artboard'lar: `Web Ekranlar v2` aynı etiketler + yeni `Mekanlar grup 390 host`, `Deste bitti 390`, `Gönderildi 1280/390`, `Runoff 1280 kilitli`, `Karar 1280 oylama` (kullanıcı onayı bekliyor) |

**Spec dışı görevler** — planlama/yürütme sırasında bulundu, spec'te yok. `Plan` kolonu:
`done` için kalemin çıktığı plan, `açık`/`aday` için hedef plan.

| Kimlik | Görev | Durum | Plan | Not |
|---|---|---|---|---|
| K-W1 | EN/NL artboard'larını rev 2'ye taşı | açık | W-2 | W-2'nin `_status` işaretli en/nl çevirileri onaylanamıyor — onay artefaktı `Katıl EN/NL 1280` artboard'ları (tasarım denetimi) |
| K-W2 | Google giriş butonu Google'ın kendi pill'i olsun | done | W-3 | GIS politikası gereği; artboard'daki beyaz pill kullanılamıyor |
| K-W3 | "Bekle" ekranı kopyasını rev 2 akışına güncelle | açık | W-6 | Bugünkü metin rev-1 akışını anlatıyor (tasarım denetimi); yeni metin kullanıcı onayı bekliyor |
| K-W4 | Harita maliyeti — bugünkü kurulumda kal | done | W-4 | Karar: Dynamic Maps 10.000 yükleme/ay ücretsiz, 390'da Maps JS yüklenmiyor → ~2.000 oturum/ay'a kadar $0. Apple MapKit JS ve Mapbox elendi (Android'de Apple Maps yok; ToS engeli aynı). Ücretsiz harita (MapLibre + OpenFreeMap/Protomaps) yalnız veri Google'dan gelmezse mümkün → K-B19 (backend), K-M2 (mobil) |
| K-W5 | Tek `google.maps.Map` örneğini oturum boyunca ekranlar arası taşı | done | W-6 | **Alınmadı** (2026-09-03 kararı): harita 390'da hiç yüklenmiyor, 1280'de yalnız tıklayınca; tek örnek taşıma gereksizleşti |
| K-W6 | Karar/Bekle haritalarını Static Maps'e çevir | done | W-6 | **Alınmadı** (karar dokümanı §6): Karar ve Bekle'de harita yok — adres + "Google Maps'te aç" bağlantısı; statik görsel hâlâ Google haritası ve 110px'te okunmaz |
| K-W7 | `/terms` sayfası ve rotası | açık | W-6 | Landing'deki "Koşulları" bağlantısı için sayfa/rota yok — bugün 404'e düşer (W-3 Task 4 notu) |
| K-W8 | **Haritasız değerlendirme + grup uzlaşması UX paketi** | açık | B-7 + W-6 | Karar dokümanı `docs/superpowers/specs/2026-09-03-map-free-group-decision-ux.md` (§5 A backend ön koşul / B hızlı kazanımlar / C ekran paketi; §7 kullanıcı kararları). Bulgular: 390 Mekanlar'da Maps JS liste sekmesinde de yükleniyor; `SessionViewAssembler` viewer dışı dakikayı tam koordinattan hesaplıyor (gizlilik); RUNOFF'ta `runoffVotes` herkese gidiyor; Google maskesi zaten Enterprise katmanında |
| K-W9 | TravelRange (≥ 4 katılımcıda min–max çubuk) | done | W-6 | **Alınmadı** (2026-09-03): artboard yok, mock'lar 3 kişi; TravelChips satır sarar. ≥ 4 kişilik gruplar ölçülünce yeniden değerlendirilir |
| K-W10 | Bireysel akışta mevcut manuel noktanın ulaşım türünü düzenleme | aday | B-8/W-7 | W-6:T6b — `PointsEditor` yeni noktada modu gönderir; var olan katılımcının modunu değiştiren backend ucu yok (`LocationRequest` lat/lng zorunlu, manuel nokta için ayrı uç yok) |
| K-W11 | Artboard–kod görünüm uzlaşması (W-6 kalıntıları) | aday | W-7 | TravelModeField `.f-seg` ✓ ama `.f-mp` 22px kompakt seçici yok; ActivityStrip kart görünümü vs artboard düz satır; SessionSteps numaralı daire vs kalın metin; EBIKE ikonu [Lightning, Bicycle] vs bisiklet+rozet; Segmented radiogroup'ta roving tabindex yok (ActivityPicker'da da) |

## M — Mobil

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| M-1 | Expo RN host uygulaması | `2026-09-01-plan4-mobile.md` | Plan 4 | ready | B-6 ✓ (Ek A) | — | **Ek A (2026-09-02) gövdeden önce okunur:** cihaz-yerel liste YOK (`GET /api/sessions`), Apple girişi YOK, 15 tür 4 grup + "Bowling", grup tint'leri, Profil `/api/me`, `BROWSING` yer tutucu + "Karıştır", `sessionType: GROUP`, `locationLabel`. Google OAuth client id'leri kullanıcıda. Task 7 (EAS build) `I-1:T4`'ü besler |
| M-2 | **Mobil parite** — ortak dil dosyaları (`frontend/shared/src/i18n`), react-native-maps + pinler, Yeni buluşma tip/gruplu chip/elle konum, Mekanlar ekranı (tam ekran harita + şerit), Bireysel kurulum, Lobi/Bekle/Karar haritaları, Profil dil/tercih | `2026-09-02-plan13-mobile-parity-map.md` | Plan 13 | ready | **M-1**, B-5 ✓, B-6 ✓, W-4 ✓ | — | W-4'ten sonra: dil dosyaları web'den shared'a taşınır (tek kaynak). Expo Go'da Google Maps yok → dev build. Maps SDK anahtarları `app.config.ts` env'den (kullanıcı) |
| M-3 | **Mobil parite — haritasız uzlaşma** — paylaşılan adalet mantığı (`frontend/shared`), TravelChips/FairnessBadge RN, ulaşım türü seçici, haritasız varsayılanlar, Deste/Deste bitti/Runoff/Karar v2 | `2026-09-03-plan17-mobile-fairness-mapfree.md` | Plan 17 | ready | **M-2**, B-7, `W-6:T1` | — | 6 görev; Task 1 shared `fairness.ts`'i tüketir (W-6 üretir). Web artboard'ları onaylanınca `Mobil Ekranlar v2` 04–08 pariteye çekilir; o zamana dek web 390 artboard'ları + karar dokümanı §4 bağlayıcı |

**Spec dışı görevler** — planlama/yürütme sırasında bulundu, spec'te yok. `Plan` kolonu:
`done` için kalemin çıktığı plan, `açık`/`aday` için hedef plan.

| Kimlik | Görev | Durum | Plan | Not |
|---|---|---|---|---|
| K-M1 | "Mekanlar grup 390 host" artboard'ını çiz | done | W-6 | 2026-09-03: `Web Ekranlar v2` içinde `Mekanlar grup 390 host` olarak çizildi (liste-önce, sticky "Karıştır ve kaydır"); mobil dosya M-3'te pariteye çekilir |
| K-M2 | Ücretsiz haritaya geçilirse MapLibre RN'e taşı | aday | M-3 | Bugünkü karar Google Maps'te kalmak (K-W4); M-2'nin temeli react-native-maps + Google Maps SDK (Expo Go'da Google Maps yok → dev build) |

## I — Altyapı

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| I-1 | CI + Docker + K8s deploy | `2026-09-01-plan5-ci-deploy.md` | Plan 5 | ready | B-2 ✓, W-1 ✓ · *Task 4 için* `B-3` + `W-4` + `M-2:T5` | — | **Task 1–3 şimdi koşabilir.** **Ek A (2026-09-02):** web build-arg'ları (`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_MAPS_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`), Map ID + stil, referrer/paket kısıtlı anahtarlar, kota alarmı, yayın listesine SOLO uçtan uca. Task 4 = yayın kontrol listesi; B-3 `done` ve retention CronJob uygulanmadan işaretlenmez (spec §6 GDPR). Postgres kullanıcının mevcut kümesinde |

---

## Çapraz iz kilitleri

1. **Flyway sırası (kural 9).** B-5 (V3) → B-6 (V4) → B-3 (V5). B-3 artık B-6'dan önce koşamaz.

2. **I-1 ⇄ B-3 (imaj/secret adları).** Sıra: `I-1 Task 1-3` → `B-3 tümü` → `I-1 Task 4`.
   `B-3:T5` K8s CronJob'ı `I-1:T3`'teki backend imajının ve secret adının aynısını kullanır.

3. **W-3 → B-6.** W-3 Task 4–7 (`/api/me`, liste, çıkış, `preview`, `viewer`) B-6'yı bekler; Task 1–3
   (kabuk, i18n, iki bölge) beklemez.

4. **W-4 → B-5 + W-3.** Mekanlar/`shuffle`/`points`/`approxLocation`/`midpoint` B-5'ten; kabuk ve
   `authStore` W-3'ten.

5. **M-2 → W-4.** Dil dosyalarının `frontend/shared`'a taşınması web'i de değiştirir; W-4 kapanmadan
   yapılırsa çakışır. M-1 ise yalnız B-6'yı bekler.

6. **I-1:T4 ← B-3, W-4, M-2:T5.** Yayın kontrol listesi: retention CronJob, web uçtan uca (Grup +
   Bireysel, gerçek Maps anahtarları), EAS internal build.

**B-4 açılırsa** (deferred): API sözleşmesi değişir → W-1/W-2/W-3/W-4/M-1/M-2 geriye dönük düzeltme;
`B-4 T7` `I-1:T3`'ten sonra koşar.
