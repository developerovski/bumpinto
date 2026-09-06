# BumpInto — Plan Index

Spec'ler: `docs/superpowers/specs/2026-08-31-bumpinto-mvp-design.md` (MVP) ·
`2026-09-01-web-tailwind-i18n-design.md` (web stil/i18n) ·
**`2026-09-01-web-parity-design.md` (rev 2 — web = tam ürün, oturum tipi, Mekanlar, Google haritası)**.

UI kaynağı (bağlayıcı): Claude Design `719fcd5f-…` — **2026-09-06'dan itibaren `Web Ekranlar v3.dc.html`
(72 artboard, mobil v3 ile senkron; W13–W20 yasal/hesap sayfaları dahil), `Mobil Ekranlar v3.dc.html`, `Mobil Onboarding, İzinler ve Yasal.dc.html`**
(v2 dosyaları arşiv; kullanıcı mobil v3'ü beğendi, web senkronu istedi) ve `b536b3aa-…` (`Design System v2.dc.html` §06–§10).

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

**Mobil tasarım yönü + mağaza uyumluluğu (2026-09-06) — iz üstü kaynak, KULLANICI ONAYI BEKLİYOR.**
`docs/superpowers/specs/2026-09-06-mobile-design-direction.md` (rakip analizi, mevcut tasarım eleştirisi,
8 iyileştirme, kabuk kararları, 6 onay maddesi) ve `2026-09-06-mobile-store-compliance.md` (Apple/Play/KVKK
zorunlu 17 ekran + form işleri). Claude Design `719fcd5f-…`: **`Mobil Ekranlar v3.dc.html`** (P0–P26, 26 ekran)
ve **`Mobil Onboarding, İzinler ve Yasal.dc.html`** (O1–O19). Onaylanırsa M-1/M-2/M-3 UI kaynağı bu iki dosya
olur; `Mobil Ekranlar v2` eskir. İzlere düşen adaylar: K-B27–K-B29, K-W14, K-M3.
**Gereksinim analizi (2026-09-06 gece) — bağlayıcı:** `docs/superpowers/specs/2026-09-06-v3-requirements.md`
(destek matrisi, sözleşme kararları, R-B/R-W/R-M gereksinimleri, plan paketleri **B-14, B-15, W-13, W-14, W-15,
M-4, M-5, M-6** ve sıra; Flyway V12–V17 rezervi). Planlar henüz yazılmadı; kullanıcı kararı §5.

## Kimlik şeması

Planlar bileşen **izlerine** ayrılır; her iz kendi harfiyle numaralanır ve kendi tablosunda yönetilir.

| Harf | İz | Kapsam |
|---|---|---|
| `B` | Backend | Spring Boot uygulaması — domain, application, adapter, DB şeması, zamanlanmış işler |
| `W` | Web | `frontend/web` + `frontend/shared` |
| `M` | Mobil | `frontend/mobile` (Expo) |
| `I` | Altyapı | CI, imaj, K8s, dağıtım — tek bir bileşene ait olmayan, hepsini besleyen işler |

Yeni plan, ait olduğu izin bir sonraki numarasını alır. Sıradakiler: **B-14, W-13, M-4, I-3** (B-13/W-12/I-2 = plan30/31/32, 2026-09-06) (B-8…B-11 ve W-7…W-10 plan17–27 ile kullanıldı; tablo satırları eksik, spec başlıklarında kayıtlı).

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
9. **Flyway numara sicili (2026-09-06 düzeltildi, dosyalarla eşlendi):** V1–V2 mevcut · V3 = B-5 · V4 = B-6 ·
   V5 = B-7 · V6 = A-zinciri (participant token imzalı) · V7 = A4 (participants.user_id) · V8 = B-9 (çoklu
   aktivite) · V9 = B-10 (çapa) · **V10 = B-13** (`provider_usage` + venues alanları) · **V11 = B-13** (PostGIS +
   `venues_open`; I-2 ithal işleri bu tabloya yazar). **V12 = B-3** (plan 6; gövdesindeki "V5/V6" notları bayat) · **V13–V16 = B-14** (Apple, soft delete, rapor/engel, rıza) ·
   **V17–V18 = B-15** (`venues.tagline`; `last_seen_at`/`link_opened_at`/`join_code`) · V19 = push/device_tokens (rezerv, B-16). Foto karuseli açılırsa V20+. Yeni migration açan plan burada numara alır; `outOfOrder` hep kapalı.
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
`deferred` (yazıldı, bilinçli olarak yürütülmüyor) · `superseded` (yerini başka plan aldı; M-1/M-2/M-3 → M-4, 2026-09-06)

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

**2026-09-06 v3 güncellemesi (gereksinim dok. §4):**

```
Backend : B-3 (V12) ──> B-14 (V13–V16) ──> B-15 (V17–V18) ──> [B-16 push, sonraki iz]
Web     : W-12 ✓ ──> W-13 ──┐        [B-14] W-14 ──> [B-15, W-13] W-15
Mobil   : [mevcut API] M-4 ──┬─> M-7 ──> M-8 ──> [B-15] M-9
                             ├─> [B-14, W-14] M-5              ├─> [M-7, B-14] M-6
Altyapı : [M-4] I-3 T1–T5 (CI/build/e2e) ──> [M-5] I-3 T6–T9 (submit, görseller, runbook)
```

Kritik yol (v3, mağaza yayını): **B-3 → B-14 → W-14 → M-5 → I-3:T6**. Hemen başlayabilir: B-3, M-4, W-13 (W-12 bittiyse).
M-7 → M-8 → M-9 ürün akışı M-5 ile paralel; M-6 M-7'yi bekler. (2026-09-06 gece: plan38 üçe bölündü — M-4 temel, M-7 kurma/katılım, M-8 karar akışı; M-9 cila ve I-3 yayın hattı eklendi.)
M-1/M-2/M-3 `superseded`; I-1:T4 yayın kontrol listesi artık M-5:T11 (`RELEASE-CHECKLIST.md`) ile birlikte okunur.

---

## B — Backend

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| B-1 | Backend iskelet + alan çekirdeği + karar motoru | `2026-09-01-plan1-backend-core.md` | Plan 1 | done | — | Task 8/8 + final review | 23/23 test yeşil (BUILD SUCCESS); domain saf, sıfır TODO; commit'ler kullanıcıda |
| B-2 | Application + adapter katmanları (API, Security, Unirest, STOMP) | `2026-09-01-plan2-backend-api.md` | Plan 2 | done | B-1 | Task 10/10 + 2 temizlik turu + kapanış denetimi | 119/119 test yeşil (temiz build); sıfır TODO/ölü kod; ArchUnit 3 kural; subagent-driven (impl Opus / review Fable); commit'ler kullanıcıda |
| B-5 | **Oturum modeli rev 2** — `SessionType`, `BROWSING`, `shuffle`, elle konum (`points`), yuvarlanmış konum + şehir etiketi, orta nokta/yarıçap, BROWSING'de "Bunu seç", runoff kilitleyenler | `2026-09-02-plan9-backend-session-model-v2.md` | Plan 9 | done | B-2 ✓ | Task 6/6 + orkestratör borç kapatma turu | 140/140 test yeşil (temiz build), web tsc + 5/5 web testi yeşil, sıfır TODO. Migration **V3**. Subagent-driven (impl Sonnet / review Opus, 19 ajan). Spec §8 kalem 4–9 kapandı. **Plan düzeltmesi:** planın `midpoint`/`radiusKm`'i ham döndüren kod bloğu, kendi "tam koordinat API'den asla çıkmaz" değişmezini çiğniyordu — 2 kişilik oturumda orta nokta diğerinin tam konumunu veriyordu; ikisi de yuvarlandı. Katılımcı sırası `joinedAt`'e göre deterministik yapıldı; `participant_left` olayı eklendi (removePoint sessizdi) |
| B-6 | **Hesap ve liste API'leri** — `GET /api/sessions`, `GET/PUT /api/me` (tercihler + dil), `POST /api/auth/logout`, `GET /sessions/{slug}/preview` (kamu), `SessionView.viewer` | `2026-09-02-plan10-backend-account-api.md` | Plan 10 | done | B-5 ✓ | Task 4/4 + kapanış incelemesi | 149/149 test yeşil (temiz build), web build + 5/5 yeşil, sıfır TODO. Migration **V4**. Subagent-driven (orkestrasyon Fable / impl Sonnet / review Opus; Task 3 → 3a+3b). Spec §8 kalem 1–3 + `preview` (host adı, kişi sayısı, `participants[{ad, host, hasLocation}]`) + `SessionView.viewer`. Tasarım denetimi (§9) gereği `readyCount`/`doneCount`/`decidedVenuePhotoUrl` eklendi; artboard'lar düzeltildi. **Bayat çerez hatası kapatıldı** (`PUBLIC_ENDPOINTS`). M-1'in cihaz-yerel liste tavizi kalktı. Sapmalar aşağıda; commit'ler kullanıcıda |
| B-3 | Veri saklama — süresi dolan oturumların kalıcı silinmesi | `2026-09-01-plan6-data-retention.md` | Plan 6 | ready | B-6 ✓ · *Task 5 için* `I-1:T3` | — | Spec §6 GDPR. **Ek A: migration V5** (V3/V4 B-5/B-6'ya verildi). B-6'dan sonra koşar; Task 5 (K8s CronJob) I-1'in imaj/secret adlarına dayanır. I-1'in yayın kontrol listesi bu plan `done` olmadan işaretlenmez |
| B-4 | Dinamik aktivite keşfi — self-host Overpass (OSM) | `2026-09-01-plan7-activity-discovery.md` | Plan 7 | superseded | iz akışı dışı | — | **YÜRÜTÜLMÜYOR — 2026-09-06 spec `2026-09-06-open-hybrid-venue-stack-design.md` ile geçersiz: açık taban Overpass yerine Overture + OSM ithali (I-2/plan32), OPEN türleri B-13 `OpenVenueSource`.** Yerine ucuz yol seçildi: `ActivityType` 5→15 genişletildi (B-2 kodu üzerinde, 123/123 test). Açılırsa API sözleşmesi değişir → W-1/W-2/W-3/W-4/M-1/M-2 geriye dönük düzeltme; Task 7 (K8s) `I-1:T3`'e bağımlı |
| B-7 | **Adalet çekirdeği, ulaşım türü, karar şeffaflığı, sağlayıcı alanları, bütçe tavanları** — `TravelMode` + hıza ters ağırlıklı orta nokta, yuvarlanmış konumdan dakika (gizlilik), mekan başına `{maxMinutes, spreadMinutes}`, adalet öncelikli `deckOrder`, `decisionKind`/`decidedAt`/`runoffReason`/`likeCounts`, RUNOFF oy gizliliği, `midpointLabel` (Nominatim backend), Google aynı-katman alanları + FSQ Pro alanları, Nearby/Photo aylık tavanları | `2026-09-03-plan15-backend-fairness-travelmode.md` | Plan 15 | done | B-6 ✓ | Task 1a ✓ (V5, TravelMode, ağırlıklı centroid; 186 test yeşil) · Task 1b ✓ (travelMode API + /api/me defaultTravelMode + Bruno) · Task 1c ✓ (TravelMinutes/Fairness/DeckOrdering, ağırlıklı orta nokta, `VenueDto.fairness`, `ParticipantDto.midpointMinutes`, idempotent shuffle) · Task 2a+2b ✓ (DecisionKind/RunoffReason, decidedAt, likeCounts yalnız DECIDED, voteTally gizlilik kapısı, runoffVotes sızmıyor) · Task 3 ✓ (ReverseGeocodePort + Nominatim adapteri, UA/1 istek-sn/Caffeine, `midpointLabel` find-venues'ta bir kez) · Task 4a ✓ (Venue/VenueCandidate +6 alan, Google maskesi aynı katman: primaryTypeDisplayName/businessStatus/shortFormattedAddress/userRatingCount/regularOpeningHours/addressComponents, OPERATIONAL filtresi foto çözümünden önce) · Task 4b ✓ (FSQ Pro-only FIELDS `fsq_place_id,name,latitude,longitude,categories,location,website`, `VenueDto` +provider/category/address/locality/ratingCount/hoursToday/placeLink düz, mapsUrl yol tarifi fallback) · Task 5 ✓ (Nearby 1000/ay sert tavan — QuotaExceededException → FSQ'ya düşer; Place Photo 1000 görsel/ay, tükenince photoUrl null; `Quota` 3 arg) · Task 6 ✓ (openapi.json + api-types.ts yeniden üretildi, Bruno find-venues/shuffle docs, ARCHITECTURE alan modeli özeti; 230 test) · Kapanış incelemesi ✓ (2026-09-03): `PointRequest.travelMode` eklendi, `GeoMath.centroid(List)` silindi, V5 not-null testi, ARCHITECTURE §7 düzeltmeleri; **231 test yeşil**. Subagent-driven (impl Sonnet / review Opus, ~30 ajan). Kullanıcıda: commit, Bruno e2e (gerçek Google idToken), `:8060`'ta bırakılan `spring-boot:run` (PID 37675) — ajanlar IDE-debug JVM'ini iki kez öldürdü. Bilinçli sapmalar: shuffle kanonik taban (rating→externalId), TravelEstimate mod-suz overload silindi, Nominatim bloklayan throttle (K-B22), PARTIAL→Runoff'ta kind kaybı (karar dok. §7.7) | 10 görev bloğu (1a–1c, 2a–2b, 3, 4a–4b, 5, 6), TDD + Bruno. Karar dokümanı §4 + §5.A. Migration **V5**. Beraberlik puanla kırılır (§4.5); `ParticipantDto.midpointMinutes`, `VenueDto.locality` eklendi; `shuffle` adalet sırasını idempotent uygular (UI fiili "Karıştır ve kaydır" değişmez). Açılış maliyet modeli: Google bütçeli (1k Nearby + 1k foto/ay), FSQ Premium alanları çıkar, harita yok. K-B11/K-B13/K-B15 buraya düşer; K-B12 (paylaşımlı kota deposu) kapsam DIŞI kalır (Redis işi) |
| B-12 | **Sesli sohbet backend** — ses odası (süreç içi, 2h sert sınır), 3 REST ucu (`/voice`, `/voice/credentials`), STOMP sinyal relay (`/app/.../voice/signal` → özel konu), abonelikle üyelik, boş oturumda kapanış, Cloudflare TURN kısa ömürlü kimlik (STUN'a düşer), `SessionView.voice` + `inVoice` | `2026-09-06-plan28-voice-backend.md` | Plan 28 | done | B-8 ✓ | Task 8/8 + iki aşamalı inceleme | Spec `2026-09-06-voice-chat-design.md` K1–K12. `AppProps` +2 kayıt (11 test kurucusu), `requireHost` paylaşıldı. Cloudflare TURN anahtarı env'de yoksa `relay=false` (yan özellik, fail-open bilinçli). W-11 bu planın `openapi.json`'ını bekler. 365 test yeşil; inceleme ekleri: SessionGates, VoiceInboundGuard bütçeleri (20/240 dk), endsAt oturumu aşmaz, Tomcat 32 KB tamponu |
| B-13 | **Açık hibrit mekan yığını — backend** — `VenueSource` SPI (descriptor, YAML kategori eşlemesi, tek biçim config, 5 kurallı açılış doğrulaması, ArchUnit), tür başına sabit sıralı yönlendirme + `BudgetGate` (`provider_usage` V10), Foursquare **Premium** tek çağrı (foto/puan/popülerlik/saat), Google SPI'ye uyarlanmış ve inaktif, `OpenVenueSource` (V11 PostGIS `venues_open`), `MapLinks` + `VenueDto.ratingScale/popularity/travel[]`, saklama kuralı (saatlik), `GET /api/config`, `POST /api/geocode{,/reverse}`, `RoutingPort` + OSRM matrisi | `2026-09-06-plan30-open-hybrid-backend.md` | Plan 30 | done | B-10 ✓ · B-12 ✓ · *T6 için* `postgis/postgis` imajı (plan32 T1 ile aynı) | Task 11/11 + görev başına Opus incelemesi | **Backend 384 test yeşil (6 env-gated skip).** Spec `2026-09-06-open-hybrid-venue-stack-design.md` §3–§6, §8–§14. 11 görev. **Ön ölçümler (spec §16):** FSQ Premium curl (foto kapsaması), kümede PostGIS yetkisi. `PostgresContainer.shared()` → `postgis/postgis:16-3.4` (tüm entegrasyon testleri). `foursquare.yml`'de 10 kimlik doğrulanmamış → `FoursquarePremiumContractTest` ilk gerçek anahtarda kırmızı, düzeltmeyi o sürer. TripAdvisor (§5.3) bu planda DEĞİL: Terra API sözleşmesi ölçülünce ayrı küçük plan. `AppProps.Providers/Quota` silinir (12 test kurucusu `TestProps`'a). Yeni K-B26: `VenueDto.travelMinutes` W-12 sonrası silinir İnceleme ekleri: `ProviderUsageAdapter.increment` REQUIRES_NEW; degraded (kısmi hata) sonuç önbelleklenmez, kaynağa kova yarıçapı gider; OSRM 60 sn matris önbelleği + 60 sn geri çekilme; `venues.name` nullable (V10, saklama indirgemesi); FSQ/Google atıf yalnız seçilen türlere; geocode throttle → 429 `geocode_busy`, geocode 30/dk; V11 indeks `geography`. Bilinçli sıra sapması: T1a/T1b, T3→T4→T6 eklemeli, T5 geçiş (eski sağlayıcılar orada silindi). `openapi.json`/`api-types.ts` yenilendi (throwaway PostGIS :5435, backend :8061), web `tsc -b` temiz. K-B26 açıldı |
| B-14 | **Mağaza uyumluluk çekirdeği — backend** — V13–V16 (Apple, soft delete, rapor/engel, rıza), `AppleIdVerifier` (JWKS, çoklu audience, nonce) + `AppleTokenClient` (ES256 secret, refresh, revoke fail-open), `POST /api/auth/apple` + hesap birleştirme (`apple_sub` → e-posta), `MeResponse.consents/authProviders[]` + `PUT /api/me/consents`, `AccountDeletion` (host oturumları silinir, katılımlar anonimleşir, `purge_after=+30g`) + `DELETE /api/me` + `POST /api/me/delete-token`, `POST /api/reports` + `/api/me/blocks`, `ParticipantDto.blocked` + `VoiceAdmission` ses odası filtresi, OpenAPI/`api-types.ts` | `2026-09-06-plan33-backend-store-compliance.md` | Plan 33 | ready | **B-3 ✓ (V12)** | — | Gereksinim dok. `2026-09-06-v3-requirements.md` §2, R-B1–R-B5. 12 görev. **Kritik yol** (App Store 4.8, 5.1.1(v); Play hesap silme). `APPLE_*` anahtarları kullanıcıda; yoksa Apple girişi mock ile test edilir. |
| B-15 | **v3 ürün cilası — backend** — V17 `venues.tagline` (FSQ `tips`/OSM türevi ≤80, ek çağrı yok), V18 `last_seen_at`/`link_opened_at`/`join_code`, `GET /api/me/export` (1/saat), `ParticipantDto.lastSeenAt/linkOpenedAt`, `POST /api/sessions/{slug}/nudge/{participantId}` (60 sn, `nudged` olayı), `SessionView.joinCode` + `GET /api/sessions/by-code/{code}`, `GET /og/{slug}.png` (java.awt, Caffeine, 24 s) + `GET /api/sessions/{slug}/og` | `2026-09-06-plan34-backend-v3-polish.md` | Plan 34 | ready | B-14 | — | R-B6–R-B10. 10 görev. FSQ `tips` gerçek anahtarla ölçülmedi (null-tolere); OG render konteynerde `fontconfig` ister. |

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
| K-B19 | Google dışı mekan verisi — Foursquare OS Places (Apache 2.0) + OSM/Overpass | done (B-13) | B-4 | Ücretsiz haritanın ön koşulu: Places ToS "No Use With Non-Google Maps". Bedeli: mekan fotoğrafı yok, 15 tür için kategori eşlemesi, PostGIS. Maliyet gerekçesi ve karar: K-W4 |
| K-B20 | Katılımcı `locationLabel`'ını sunucuda çöz (Nominatim backend'de) | done (B-13) | B-8 | B-7 yalnız orta nokta etiketini sunucuya taşıdı; katılımcı etiketi hâlâ istemciden (`lib/geocode.ts`) geliyor — politika (UA, oran, cache) tek yerde olmalı |
| K-B21 | "Belli bir nokta" çapa modu (`anchorMode`/`anchorLat/Lng/Label`) | aday | B-8 | Karar dokümanı §7.2 açık; orta nokta yerine katılımcı yanı ya da adres; "adil" rozetleri bu modda kapanır |
| K-B22 | Nominatim ters geocode `find-venues` içinde senkron/bloklayan throttle | done (B-13) | B-8 | B-7:T3 plan gereği `Thread.sleep` ile 1 istek/sn kapısı `@Transactional` içinde: en kötü 1 sn + 5 sn HTTP zaman aşımı kadar isteği ve DB işlemini tutar, eşzamanlı find-venues çağrıları 1/sn serileşir. Kozmetik etiket için pahalı. İş: `tryAcquire` ile kapı doluysa etiketi atla ya da asenkron çöz + sonraki poll'da yaz |
| K-B23 | Anonim alınan koltuğu hesaba bağla (`participants.user_id`) | done | A-zinciri | A4/A5 sonrası kalan boşluk: `Caller.ANONYMOUS` ile açılan koltuğun sahibi yoktur, kişi sonradan giriş yapsa bile o koltuk hesabına bağlanmaz — ikinci cihazda kimliğini kurtaramaz ve yeniden katılıp **mükerrer satır** açar (orta noktayı çeker). Kural: istek geçerli bir katılımcı token'ı + hesap taşıyorsa ve token'ın koltuğu sahipsizse **ve** hesabın o oturumda koltuğu yoksa → `user_id` yazılır. Yıkıcı değil, idempotent, `(session_id,user_id)` unique index koruyor. **done 2026-09-04** (`SessionCommands.claimSeat`, tek onarım kapısı `GET /api/sessions/{slug}`, 253 test, mutasyonla doğrulandı). Kapsam DIŞI (kullanıcı kararı 2026-09-04): host kendi linkine anonim katılmışsa iki koltuk kalır — temizliği "host katılımcı çıkarabilsin" ürün kalemine bağlı |
| K-B24 | SOLO + mobil: katılımcı token'ı kaybolunca `/points`'e dönüş yolu yok | aday | M-1 | A5 sözleşme boşluğu: oda içi tek kimlik katılımcı token'ı, `ParticipantTokenDelivery.refresh` yalnız web (çerez), `join` SOLO'da 409 → mobil host token'ını kaybederse elle nokta ekleyemez. **Şimdi kod yazılmadı (bilinçli)**: mobil istemci yok, M-1 başlamadı; varsayım üstüne uç eklemek gereksiz kod. M-1/M-3'te ya mobil için gövde/başlık onarım kanalı ya da SOLO'ya kimlikli `join` açılmalı |
| K-B25 | Rate-limit anahtarlaması ingress arkasında | aday | I-1 | `RateLimitFilter` bugün `getRemoteAddr()`'a bakıyor; ingress/LB arkasında tüm trafik tek IP'den gelir → tek kova, herkes birbirini 429'lar. Çözüm `X-Forwarded-For` + güvenilen proxy sayısı, ama **ingress henüz yok** (I-1:T1–T3 yapılmadı): topoloji bilinmeden anahtar seçilemez. I-1 ile birlikte açılır |
| K-B26 | `VenueDto.travelMinutes` W-12 sonrası silinir (`travel[]` tek kaynak); `venues.maps_url` sütunu bir sonraki temizlikte düşer | aday | W-12 sonrası | B-13 T7 bilinçli olarak korudu: web/mobil bugün `travelMinutes`'ı okuyor |
| K-B27 | Sign in with Apple (Apple id doğrulama + aynı e-postayla hesap birleştirme + hesap silmede token iptali) | aday | B-13 | App Store 4.8: Google girişi olan uygulama eşdeğer alternatif sunmalı. Kaynak `2026-09-06-mobile-store-compliance.md` §1 L1, §4.1. |
| K-B28 | Hesap silme ucu (`DELETE /api/me`: hesap + host oturumları silinir, katılımlar anonimleşir; 30 gün yedek temizliği) + web sayfası `/account/delete` (W izine K-W14) | aday | B-13 | Apple 5.1.1(v) + Play hesap silme politikası; Play Data safety formu web linki ister. Kaynak uyumluluk dok. §1 L13–L14, §4.2. |
| K-B29 | Bildir / engelle (rapor kaydı, engel listesi; engellenen kişi sesli sohbette eşleşmez, roster'da engelleyene görünmez) | aday | B-13 | Apple 1.2 UGC: canlı sesli sohbet + görünen ad. Tasarım O18–O19. Kaynak uyumluluk dok. §1 L15, §4.3. |

## W — Web

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| W-1 | pnpm workspace + web katılım uygulaması | `2026-09-01-plan3-web.md` | Plan 3 | done | B-2 | Task 7/7 + kapanış denetimi | 5/5 test + tsc + prod/preprod build yeşil; subagent-driven; tüm ekranlar artboard'lardan birebir; pnpm 11 uyarlamaları; elle uçtan uca kullanıcıda; commit'ler kullanıcıda |
| W-2 | Web UI — Tailwind v4 + i18n (tr/en/nl) + rem token migrasyonu | `2026-09-01-plan8-web-tailwind-i18n.md` | Plan 8 | done | W-1 | Task 7/7 + final review | Tailwind v4 utility-first (utility yalnız components/), @theme rem token'ları, react-i18next tr/en/nl; 5/5 test + build yeşil. **en/nl çevirileri `_status` işaretiyle tasarım onayı bekliyor** (onay artefaktı: W-3 Task 2 + `Katıl EN/NL 1280` artboard'ları) |
| W-3 | **Kabuk, kimlik, hesap ekranları, dil menüsü, iki bölgeli yerleşim** — TopBar/LangMenu/AvatarMenu, Google web girişi, Landing, Oturumlar, Profil, hata sayfaları, mevcut 5 oturum ekranının ≥1024 iki bölgeye taşınması (harita hariç) | `2026-09-02-plan11-web-shell-account.md` | Plan 11 | done | W-2 ✓ · B-6 ✓ | Task 7/7 + kapanış incelemesi | 23/23 test + tsc + prod/preprod build yeşil; sıfır TODO; tr/en/nl 183/183/183 anahtar. Subagent-driven (orkestrasyon Fable / impl Sonnet / review Opus; Task 3 → 3a+3b, ~17 ajan). Varsayılan dil **en**; `?lng=` > sunucu tercihi > tarayıcı; `<html lang>`+başlık canlı. Kimlik sunucudan (`SessionView.viewer`; bellek-içi `self` kalktı), `locationLabel` join/konum değişikliğinde gönderiliyor (Nominatim ters geocode), `preview` 401'de bir kez. **Bilinçli sapmalar:** Google butonu GIS render'ı; `/sessions/new` W-4'e dek 404; Karar'da adres/açık-kapalı/km yok (API'de yok); Oturumlar kartında avatar satırı yok (liste API'sinde ad yok); **kesişim-1 kutlaması KAPALI** (B-7 `likeCounts`); Bekle kopyası rev-1 (onay bekliyor); Profil ad düzenleme satır-içi input (artboard'da düzenleme hâli çizilmedi). Tasarım düzeltmeleri Claude Design'a yazıldı (audit §10). Elle uçtan uca (gerçek Google client id) kullanıcıda; commit'ler kullanıcıda |
| W-4 | **Oturum tipi, Yeni buluşma, Lobi, Mekanlar, Google haritası** — `MapView` (Maps JS + AdvancedMarker, Map ID stili), tip seçimi, gruplu etkinlik seçici, Bireysel elle konumlar, rol/durum yönlendirmesi, Mekanlar (liste ↔ harita, Karıştır, Bunu seç), Katıl/Bekle/Karar haritaları, Profil tercih düzenleme | `2026-09-02-plan12-web-session-type-map.md` | Plan 12 | done | W-3 ✓, B-5 ✓, B-6 ✓ | Task 5/5 + kapanış incelemesi | 45/45 test + tsc + prod/preprod build yeşil; sıfır TODO; tr/en/nl 241/241/241 anahtar. Subagent-driven (orkestrasyon Fable / impl Sonnet / review Opus; Task 2→2a+2b, Task 4→4a+4b, ~22 ajan). Harita yalnız Google: `@googlemaps/js-api-loader` **v2** (`setOptions`+`importLibrary`; plandaki `Loader` sınıfı artık yok), tek `MapView` organizması (`mapPins.ts` = DS §10, içerik imzasıyla yeniden çizim, `lgOnly`), anahtar yokken yer tutucu notu. Anahtarlar `VITE_GOOGLE_MAPS_KEY` + `VITE_GOOGLE_MAPS_MAP_ID` (kullanıcı; I-1 Ek A). **Plan düzeltmeleri / bilinçli sapmalar:** (1) "Ben de kaydıracağım" anahtarı ve "Link hemen oluşur" ipucu düştü — hiçbir artboard'da yok, backend'de yok; (2) `shuffle`/`pick`/`findVenues`/`addPoint`/`removePoint` deckStore'da değil `sessionStore`'da (slug orada bağlı; `mutate()` sayacı bayat poll yanıtını düşürür); (3) Katıl'da kendi pini çizilmez — artboard (audit §9) pinsiz + "Katılınca konumlar haritada görünür"; (4) orta nokta kapsülü "Orta nokta · ≤ N km" (`radiusKm`); şehir adı B-7; (5) SOLO kurulumda nokta/find-venues hatasında da `/j/slug`'a gidilir, Bireysel kurulum ekranı sunucu durumunu gösterir; (6) 390'da harita yalnız Lobi ve Mekanlar (`lgOnly`: Maps JS yüklenmez); (7) Mekanlar'da açık/kapalı rozeti ve şehir yok (API'de yok), SOLO BROWSING'de konum düzenleme yok (backend 409) — artboard'lar da düzeltildi (audit §11); (8) tek `useOwnLocation` kancası (Katıl/Yeni buluşma/Profil), `useSessionAction` (Lobi/Bireysel/Mekanlar), `ActivityBadge`, `VenueMeta`/`VenueThumb`; (9) **Yeni oturum 1280 · Grup** sağ bölgesi (`InvitePreview`) artboard'da çizilmedi, spec §5'e göre yazıldı. **B-7 adayları:** host kaydırmama seçeneği, mekan açık/kapalı, SOLO BROWSING'de konum düzenleme, orta nokta şehir adı. Gerçek anahtarla göz kontrolü + uçtan uca (Grup/Bireysel) kullanıcıda; commit'ler kullanıcıda |
| W-5 | **Deste kaydırma jesti + karar animasyonları** — Tinder benzeri sürükle-bırak (sağ = beğen, sol = geç), eşik/fırlatma, dönüş + damga, arka kartın öne gelmesi, buton/klavye kararlarında aynı uçuş, geri al'da geri süzülme; kütüphanesiz (Pointer Events + CSS) | `2026-09-02-plan14-web-deck-swipe.md` | Plan 14 | done | W-4 ✓ | Task 4/4 + Opus inceleme | 60/60 test + tsc + prod/preprod build yeşil; sıfır TODO; yeni i18n anahtarı yok. Fable inline yazdı, Opus inceledi (APPROVE WITH MINORS; S2×3 + S3×4 kapatıldı: giriş animasyonu sürüklemeyi ezmesin, bayat hız fırlatma sayılmasın, ikinci parmak yoksayılır, klavye repeat/modifier/input koruması, d2 `key`, uçan kart `aria-hidden`, testte sabit saat). Yeni: `lib/swipeMath.ts` (saf geometri + test), `molecules/SwipeCard.tsx` (Pointer Events, DOM'a doğrudan yazan sıcak yol, damgalar), `VenueDeck` uçan katman + tek `commit` yolu, `app.css` `--animate-fly-out/fly-in-*/rise`, `test-setup.ts` PointerEvent çokdolgusu (jsdom 25'te yok). **Bilinçli sapma:** damga ve jest artboard'da çizilmedi — DS token'larından türetildi, Claude Design geri yazımı kullanıcıda. Karar iyimser (`decide()` anında, çıkan kart ayrı katmanda); reduced-motion'da uçuş atlanır. **Ek (kullanıcı isteği):** uçuş 0.7s + akıcılık (yığın terfisi `promote`/`appear`/`rise` 0.32s, üç eğri: swipe ease-out / stack in-out / snap esneme; buton kararı satır-içi timing); `molecules/DecisionBurst` — beğenide kalp + konfeti, geçte × + toz (Task 5). Elle kontrol (fare 1280 / dokunma 390 / dikey scroll / ← → ⌫ / efektler) kullanıcıda; commit kullanıcıda |
| W-6 | **Haritasız değerlendirme + grup uzlaşması** — TravelChips + FairnessBadge, Mekanlar liste-önce (MapView tembel, davetli liste, sıralama), Lobi/Bekle orta nokta kartı + ulaşım türü seçici + stepper, Deste kart anatomisi (uyum satırı, semt, atıf), Deste bitti bekleme lobisi (gönderildi hâli, dürt, olmadan devam et), Runoff v2 (trailer, gizli sayım, adil olana bırak), Karar v2 (haritasız, Neden burası?, yedek plan, açılış), analitik olayları | `2026-09-03-plan16-web-fairness-mapfree.md` | Plan 16 | done | W-5 ✓ · B-7 ✓ | Task 0–1 ✓ (serverFields köprüsü, shared fairness.ts, TravelChips/FairnessBadge, tek `travel` prop; 89 test) · Task 2 ✓ (liste-önce, MapView lazy ayrı chunk + LazyBoundary + useMediaQuery, VenueSort shared byFairness/byRating, SOLO SelectionCard, Attribution) · Task 3 ✓ (Deste bitti = bekleme lobisi, sunucu `deckDone` ile gönderildi hâli, PersonRow, useSessionAction hata yolu) · Task 4 ✓ (Runoff v2: RunoffTrailer karar veren hücre, INTERSECTION/FALLBACK kopyası, VoteTally RunoffTie içinde, Adil olana bırak, adlı kilit notu, lib/voters.ts) · Task 5 ✓ (Karar v2: harita yok, WhyHere ADALET/UYUM/YER, BackupPlan, tek seferlik açılış, decisionKind eyebrow, Karar verildi · HH:mm, ghost Maps bağlantısı) · Task 6a ✓ (MidpointCard/ActivityStrip/SessionSteps, Bekle'de harita yok, TwoZone mobileFirst, lib/travelMode.ts) · Task 7 ✓ (FitLine tek uygulama, formatRating Intl, kart anatomisi §4.9, semt bastırma, unionProvider atfı, DeckScreen bağlandı) · Task 6b ✓ (TravelModeField Segmented üstünde, 390 ikon-only, 5 yüzey; authStore.updatePrefs defaultTravelMode koruma düzeltmesi) · Task 8 ✓ (lib/analytics.ts no-op sarmalayıcı + 3 olay, serverFields.ts silindi → @bumpinto/shared, lib/serverEnums.ts, scripts/i18n-parity.mjs `pnpm i18n:check`; 212 test) · Kapanış incelemesi ✓ (2026-09-03): WinnerCard çift atıf, SoloSetup/NewSession 390 harita (§4.7), konumsuz katılımcı notu (§5.C), tr-casing düzeltildi; `fairnessOf` sunucu-yalnız yolu shared'a taşındı. **45 dosya / 225 test, tsc, build + preprod, i18n:check yeşil; MapView ayrı chunk.** Subagent-driven (impl Sonnet / review Opus, ~35 ajan). Tasarım kaynağı Claude Design değil, yerel `web.out.html` (limit doldu). **Bilinçli sapmalar:** tek `travel` prop (labels+selfId), TravelModeField Segmented üstünde, SoloSetup'ta mevcut manuel noktanın modu düzenlenemez (backend ucu yok, K-W10), PointsEditor tam alan (artboard 22px `.f-mp` değil), ActivityStrip/SessionSteps plan-kod görünümü (artboard ile ufak fark, K-W11). Commit, gerçek anahtarla göz kontrolü ve uçtan uca kullanıcıda | 10 görev bloğu (0–8, 6a/6b); adalet mantığı `frontend/shared/src/fairness.ts` (M-3 tüketir); SOLO onay kartı; TravelRange ve `(N)` yok. Karar dokümanı §4 + §5.B/§5.C; §6 YAPMA listesi bağlayıcı. W-6a (B-7'den bağımsız hızlı kazanımlar) hemen başlayabilir. Artboard'lar: `Web Ekranlar v2` aynı etiketler + yeni `Mekanlar grup 390 host`, `Deste bitti 390`, `Gönderildi 1280/390`, `Runoff 1280 kilitli`, `Karar 1280 oylama` (kullanıcı onayı bekliyor) |
| W-11 | **Sesli sohbet web** — `liveChannel` (STOMP tek yerde, yeniden abonelik), `voiceMesh` (full-mesh, küçük-id teklif, yeniden kurma + 15 sn bekçi), `audioLevels` (K12), `voiceStore` (mikrofon → abonelik → kimlik → mesh), `VoiceDock` (başlat/katıl/sustur/ayrıl/bitir, geri sayım, sebep), `ParticipantRow` mikrofon + halka | `2026-09-06-plan29-voice-web.md` | Plan 29 | done | B-12 (openapi) | Task 7/7 + iki aşamalı inceleme | Spec `2026-09-06-voice-chat-design.md` §7. Dock `sticky bottom-0` + `order-last` (spacer yok, AppShell değişmez). Katman 3 (sessizlik tespiti) v2. 402 web testi yeşil; inceleme ekleri: liveChannel istemci kimlik kapıları, mesh yeniden kurma + bekçi (15 sn), join jetonu, sticky dock, Button forwardRef, connectFailed durumu |
| W-12 | **Açık hibrit mekan yığını — web** — `configStore` (`GET /api/config`, yedekli), `MapView`/`MapPicker` motor anahtarı (`.google` + `.maplibre` dosyaları, `MapFrame`, `lib/maplibre.ts`, lazy chunk), veri-güdümlü `Attribution` (`sources[]`), `formatRating(rating, scale)` + sağlayıcı işareti, `lib/geocode.ts` → backend uçları, link sözleşmesi | `2026-09-06-plan31-open-hybrid-web.md` | Plan 31 | done | B-13 (`openapi.json`: `/api/config`, `/api/geocode`, `ratingScale`, `travel[]`) | Task 7/7 + görev başına Opus incelemesi | Spec §7, §8, §10–§12, §14. 7 görev. `maplibre-gl@^5.6.0` tek yeni bağımlılık. 390 davranışı değişmez (`lgOnly`, ghost). Popülerlik UI'ı, Static Maps, tile self-host (plan32) kapsam dışı. Aşama 2: bu plan bitince Google Maps anahtarları kapatılır (kullanıcı). **Web 68 dosya / 432 test yeşil** (tsc temiz, i18n:check 0, prod+preprod build); `maplibre-gl@5.6.0` kendi ~940 kB parçasında (Google motoru yüklerken hiç inmez). MapLibre `error` yalnız yüklenmeden önce başarısız sayılır (inceleme düzeltmesi). Config yüklenemezse yedek kalıcı değil, `failed` + yeniden deneme. Attribution'da sabit OpenFreeMap satırı yok (harita kontrolü basar) |
| W-13 | **v3 kabuk senkronu — web** — erişilebilirlik token'ları (`Overline` ink2, rozet ≥0.75rem, amber/pembe metin), `shared/fairness.ts` → `travel[]` (`travelMinutes` silinir, K-B26 kapanır), `RangeBar` + `TravelBars` (`TravelChips`/`FairnessBadge`/`TravelList` silinir), `VenueMeta` saat + `tagline`, VoiceDock `lg:` sağ alt + `voice.endedTimeLimitHint`, `useOnline` + `OfflineBanner`, `VenueRowSkeleton`, DS önizlemeleri | `2026-09-06-plan35-web-v3-shell-sync.md` | Plan 35 | ready | **W-12 ✓** (`travel[]`, `Attribution sources[]`) | — | R-W16, R-W1/2, R-W7, R-W8, R-W9. 12 görev; ~35 mevcut test dokunur. UI: Web Ekranlar v3 (W3b, W6, W8, W3e, W10b, W12). |
| W-14 | **Mağaza uyumluluğu — web** — analitik rıza kapısı (`lib/analytics.ts`: rıza yoksa betik yüklenmez), `/privacy /terms /kvkk` (`content/legal/*.tsx`, TR taban), `/attributions` (veri-güdümlü), `/account` (Yasal/Veri/Hakkında/Tehlikeli bölge, `GET /api/me/export`), `/account/consent` (`PUT /api/me/consents`), `AppleSignIn`, `/account/delete` kurulumsuz akış (`DELETE /api/me`) + `/account/deleted`, `/support` | `2026-09-06-plan36-web-store-compliance.md` | Plan 36 | ready | **B-14** (`/api/auth/apple`, `DELETE /api/me`, `/api/me/consents`, `/api/me/export`) | — | R-W10–R-W14, R-W17. 11 görev. Yasal metinler O9–O11'den aynen; hukukçu onayı yayın kapısı. UI: Web Ekranlar v3 W13–W19. |
| W-15 | **Sosyal güvenlik + paylaşım — web** — `toastStore`/`ToastHost`, presence 2.0 (`ParticipantRow`: nokta, nabız, "Linki açtı", "Son görülen"), `socialStore` + dürt (60 sn, `nudged` toast), `PersonSheet` (Bildir · Engelle · yerel Sustur) + `voiceMesh.setMutedPeers`, sonuç kartı görseli (`html-to-image` 1080×1920, CORS ön deneme → gradyan), `ics.ts` + `MeetTimeDialog`, `/j/:slug` OG meta | `2026-09-06-plan37-web-social-share.md` | Plan 37 | ready | B-14 (R-B4), **B-15** (R-B8), W-13 | — | R-W15, R-W5/6, R-W3/4. 9 görev. Bilinçli sapmalar: ICS `X-WR-TIMEZONE`, rapor sonrası otomatik engel. UI: W3, W5, W6d, W8, W20. |

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
| K-W13 | "Bu buluşma kapandı" ekranı (DECIDED / EXPIRED davet linki) | done | W-7 | Kapanmış ya da süresi dolmuş bir linke giren kişi bugün katılım formunu görüyor ve gönderince 409 alıyor — çıkmaz sokak. Gereken: `preview` zaten `status` taşıyor → `SessionPage` DECIDED/EXPIRED'de form yerine kapanış ekranı bassın (karar verildiyse seçilen mekan + "Yol tarifi", süresi dolduysa yalnız bilgi). Tasarım kaynağı yerel `web.out.html` W10 Hata kalıbı; 3 dilde kopya |
| K-W12 | Masaüstü genişlik: artboard 1280 çerçevesinden bilinçli sapma (kullanıcı incelemesi 2026-09-03) | done | W-6 | `Page` tavanı 70rem → 80rem (lg) / 96rem (xl), `wide` prop ile tavansız; Mekanlar: liste `minmax(26rem,32rem)` + harita kalan genişlik, `sticky`, `calc(100dvh-7rem)`; 390'da açılan harita 60dvh; Lobi haritası viewport yüksekliği. Global `cursor: pointer` kuralı (`app.css` @layer base) + harita pini. ▲ fark 0'da gizli. Artboard'lar/DS §07 (58/42 grid) bu kararla güncellenmeli (Claude Design limiti dolunca ertelendi) |
| K-W14 | Web v3 kod senkronu (W-12 adayı): DS token/renk düzeltmeleri (üstlük ink2, rozet ≥12px), `TravelChips` → yol çubuğu (`RangeBar`/`TravelBars`), `WinnerCard` → sonuç kartı + görsel paylaşım + takvim, presence/dock UI (Lobi/Bekle/Gönderildi), mekan satırında saat + "neyle bilinir", 3 etkinlik sınırı ve çapalı oturum artboard'ları, yasal sayfalar (`/privacy /terms /kvkk /account`, `/account/delete` K-B28) | aday | W-13/W-14 | Kaynak `2026-09-06-mobile-design-direction.md` §2–§4; gereksinim dok. `2026-09-06-v3-requirements.md` §4. |

## M — Mobil

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| M-1 | Expo RN host uygulaması | `2026-09-01-plan4-mobile.md` | Plan 4 | superseded | B-6 ✓ (Ek A) | — | **Ek A (2026-09-02) gövdeden önce okunur:** cihaz-yerel liste YOK (`GET /api/sessions`), Apple girişi YOK, 15 tür 4 grup + "Bowling", grup tint'leri, Profil `/api/me`, `BROWSING` yer tutucu + "Karıştır", `sessionType: GROUP`, `locationLabel`. Google OAuth client id'leri kullanıcıda. Task 7 (EAS build) `I-1:T4`'ü besler |
| M-2 | **Mobil parite** — ortak dil dosyaları (`frontend/shared/src/i18n`), react-native-maps + pinler, Yeni buluşma tip/gruplu chip/elle konum, Mekanlar ekranı (tam ekran harita + şerit), Bireysel kurulum, Lobi/Bekle/Karar haritaları, Profil dil/tercih | `2026-09-02-plan13-mobile-parity-map.md` | Plan 13 | superseded | **M-1**, B-5 ✓, B-6 ✓, W-4 ✓ | — | W-4'ten sonra: dil dosyaları web'den shared'a taşınır (tek kaynak). Expo Go'da Google Maps yok → dev build. Maps SDK anahtarları `app.config.ts` env'den (kullanıcı) |
| M-3 | **Mobil parite — haritasız uzlaşma** — paylaşılan adalet mantığı (`frontend/shared`), TravelChips/FairnessBadge RN, ulaşım türü seçici, haritasız varsayılanlar, Deste/Deste bitti/Runoff/Karar v2 | `2026-09-03-plan17-mobile-fairness-mapfree.md` | Plan 17 | superseded | **M-2**, B-7, `W-6:T1` | — | 6 görev; Task 1 shared `fairness.ts`'i tüketir (W-6 üretir). Web artboard'ları onaylanınca `Mobil Ekranlar v2` 04–08 pariteye çekilir; o zamana dek web 390 artboard'ları + karar dokümanı §4 bağlayıcı |
| M-4 | **Mobil temel** — Expo SDK 54 CNG prebuild (Expo Go yok), pnpm workspace + jest-expo, `app.config.ts` (AASA/assetlinks `bumpinto.app/j/*`, edge-to-edge, predictive back) + EAS dev build + sözleşme denetimi, `theme.ts` v3 + Phosphor eşlemesi, 13 atom, i18n + 9 saf `lib` modülü `frontend/shared`'a (web shim), Google girişi + secure-store + `authStore` + Giriş (O2), Oturumlar (P1/P2) + Profil (P22) | `2026-09-06-plan38-mobile-shell-v3.md` | Plan 38 | ready | B-6 ✓ (mevcut API) | — | **M-1/M-2/M-3'ü supersede eder.** 9 görev (plan38 üçe bölündü: M-4/M-7/M-8). K-M5: `SessionView`'da çapa etiketi yok, `midpointLabel`'dan okunur. UI: Mobil Ekranlar v3 P1/P2/P22, O2. |
| M-5 | **Mobil mağaza ve yasal paketi** — `app.config.ts` + `withPrivacyInfo` plugin (purpose string'ler O4/O7, `ITSAppUsesNonExemptEncryption=false`, izinler, target API 36), konum/mikrofon ön-ekranları + red kurtarma, Apple girişi (`expo-apple-authentication`), Hesap ve veriler, yasal okuyucular, açık rıza + rıza kapılı analitik, hesabı sil ("SİL"), bildir/engelle, `docs/store/RELEASE-CHECKLIST.md`, gerçek istemci testleri | `2026-09-06-plan39-mobile-store-compliance.md` | Plan 39 | ready | **B-14**, **W-14** (yasal URL'ler), **M-4** | — | R-M1–R-M7, R-M15, R-M16. 12 görev. Play kapalı test (12 tester × 14 gün) M-5 bitmeden başlatılır. UI: Mobil Onboarding, İzinler ve Yasal O2–O19. |
| M-6 | **Sesli sohbet — mobil** — `voiceMesh` saf mantığı `frontend/shared/src/voice/`'a (web adaptöre iner), `react-native-webrtc` + plugin + `InCallManager` + 16 KB `.so` hiza denetimi, STOMP `liveChannel` RN portu (`X-Participant-Token` el sıkışma), mikrofon izni (O7 → sistem → red), `dockState` 7 durum + `VoiceDock` (P25), `ParticipantRow` mikrofon/halka, arka plan bekçisi, Maestro + iki uçlu kontrol listesi | `2026-09-06-plan40-mobile-voice.md` | Plan 40 | ready | B-12 ✓, **M-7** (Lobi/Bekle/Mekanlar ekranları), B-14 (`blocked`) | — | R-M10 + R-M9 dock. 8 görev. K10 ("sesli sohbet yalnız web") kapanır. Engelli çift roster + sinyal dışı. |
| M-7 | **Kurma ve katılım** — Yeni buluşma (P3/P4: 3 etkinlik sınırı, çapa, tembel harita alt sayfası), konum izni akışı (O3 → sistem → O6) + Bireysel kurulum (P5), Katıl (P8/P9, derin link, host çevrimdışı notu, 409 "çok uzak"), durum yönlendirici + Lobi/Bekle (P6/P7/P10; M-8 ekranları `return null` iskeleti), Mekanlar (P11/P12/P13) + `RangeBar` | `2026-09-06-plan41-mobile-create-join.md` | Plan 41 | ready | **M-4** | — | plan38'den bölündü. 6 görev. Dock yer tutucu (M-6). K-M4 kaydı bu planın T6'sında. UI: P3–P13, O3/O6. |
| M-8 | **Karar akışı** — Deste (P14: kaydırma, damga, haptik, `TravelBars`), Deste bitti/Liste/Gönderildi (P15–P17), Runoff/berabere/Karar (P18–P20; sonuç kartı statik), çevrimdışı/hata (P24/P23, netinfo), Maestro e2e "giriş → katıl → deste → karar" | `2026-09-06-plan42-mobile-decision-flow.md` | Plan 42 | ready | **M-7** | — | plan38'den bölündü. 5 görev. Sonuç kartı görseli/takvim M-9. UI: P14–P20, P23, P24. |
| M-9 | **Mobil v3 cilası** — `nudge`/`sessionByCode`/`joinCode.ts`/`og.ts` shared, presence 2.0 + dürt (`socialStore` 60 sn, `nudged` toast + haptik), mekan kartı 2.0 (`tagline`, saat, `expo-image` foto, FSQ atfı), sonuç kartı görseli (`react-native-view-shot` 1080×1920 + `expo-sharing`), takvim (ICS `shared/src/ics.ts` + saat sayfası; `expo-calendar` yok), oturum kodu + QR (`expo-camera` tarama, `react-native-qrcode-svg`), Live Activity **taslağı** (yalnız `NSSupportsLiveActivities` + no-op arayüz; gerçek uygulama B-16) | `2026-09-06-plan43-mobile-v3-polish.md` | Plan 43 | ready | **M-8**, **B-15** (`tagline`, `lastSeenAt`/`linkOpenedAt`, `nudge`, `joinCode`, `by-code`, `/og`) | — | R-M9, R-M11, R-M12, R-M17. 8 görev. Bilinçli sapmalar: davetliye dürt yok (`presence.hostOnly`), `nudged` üreticisi M-6'ya bağlı (K-M6), kamera purpose string'i M-5'te (K-M7), üçüncü taraf QR çözülmez (K-M8). |

**Spec dışı görevler** — planlama/yürütme sırasında bulundu, spec'te yok. `Plan` kolonu:
`done` için kalemin çıktığı plan, `açık`/`aday` için hedef plan.

| Kimlik | Görev | Durum | Plan | Not |
|---|---|---|---|---|
| K-M1 | "Mekanlar grup 390 host" artboard'ını çiz | done | W-6 | 2026-09-03: `Web Ekranlar v2` içinde `Mekanlar grup 390 host` olarak çizildi (liste-önce, sticky "Karıştır ve kaydır"); mobil dosya M-3'te pariteye çekilir |
| K-M2 | Ücretsiz haritaya geçilirse MapLibre RN'e taşı | aday | M-3 | Bugünkü karar Google Maps'te kalmak (K-W4); M-2'nin temeli react-native-maps + Google Maps SDK (Expo Go'da Google Maps yok → dev build). Web tarafı W-12 ile MapLibre'ye geçti; mobil karşılığı `@maplibre/maplibre-react-native` ile M-3'te |
| K-M3 | M-1/M-2/M-3 UI kaynağını `Mobil Ekranlar v3` + `Mobil Onboarding, İzinler ve Yasal` yap; izin akışı (O3→O4/O5, O7), Hesap ve veriler (O8–O17), edge-to-edge/predictive back, Live Activity (P26) sonraki iz | aday | M-1 | Kullanıcı onayı bekliyor (yön dok. §6). Purpose string'ler O4/O7'den Info.plist'e aynen. |

## I — Altyapı

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| I-1 | CI + Docker + K8s deploy | `2026-09-01-plan5-ci-deploy.md` | Plan 5 | ready | B-2 ✓, W-1 ✓ · *Task 4 için* `B-3` + `W-4` + `M-2:T5` | — | **Task 1–3 şimdi koşabilir.** **Ek A (2026-09-02):** web build-arg'ları (`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_MAPS_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`), Map ID + stil, referrer/paket kısıtlı anahtarlar, kota alarmı, yayın listesine SOLO uçtan uca. Task 4 = yayın kontrol listesi; B-3 `done` ve retention CronJob uygulanmadan işaretlenmez (spec §6 GDPR). Postgres kullanıcının mevcut kümesinde |
| I-2 | **Açık veri servisleri** — PostGIS (compose + küme), `tools/venues-open` (Overture NL + OSM NL osm2pgsql + Wikidata P18 + dedupe, staging→swap, aylık CronJob, GHCR imajı), Nominatim NL, OSRM ×3 (prepare Job + refresh CronJob), isteğe bağlı PMTiles + nginx, `bumpinto-geo` ConfigMap, runbook | `2026-09-06-plan32-open-hybrid-infra.md` | Plan 32 | done | I-1:T1–T3 (imaj/secret adları: Secret `bumpinto-backend`) · B-13:T6 (V11 tabloyu yaratır) | Task 8/8 + Opus incelemesi | Spec §5.2, §7–§9, §13, §15–§16. 8 görev. Disk ~30 GB (Nominatim 15, OSRM 5–10, PostGIS 2, tiles 2). Yıkıcı adımlar "KULLANICI ÇALIŞTIRIR" etiketli (`docker compose down -v`, küme `psql`). Swap SQL indeks adlarını `ALTER INDEX … RENAME` ile V11 adlarına döndürür. İlk ithal tür başına sayım + Wikidata foto kapsaması basar (TripAdvisor 1b kararının girdisi). **Not:** osm2pgsql 2.1 imajda (plan 1.x bekliyordu; ilk gerçek ithalde doğrulanır); küme doğrulaması yapılmadı: yalnız client-side dry-run; T1 Step 3 (`docker compose down -v`) ve Step 5 (küme `psql create extension postgis`) KULLANICI'da; PMTiles yedeği isteğe bağlı, env ile açılır |
| I-3 | **Mobil yayın hattı** — `eas.json` profilleri (development/preview/production + submit; `appVersionSource: remote`, `runtimeVersion: appVersion`), imzalama EAS-managed (ASC API key, EAS keystore + Play App Signing; GitHub sırrı yalnız `EXPO_TOKEN` + `E2E_HOST_TOKEN`), `mobile-ci.yml` (+ `setup-mobile` composite), `mobile-build.yml` (PR etiketi → preview APK; `mobile-v*` tag → production, sürüm eşleşme kapısı), `mobile-e2e.yml` (Android emülatör + Maestro, preview APK'sını tüketir), `mobile-submit.yml` (korumalı ortam + `check-release-checklist.mjs`), Maestro `takeScreenshot` ile mağaza görselleri + `store-shots.mjs`, 16 KB `.so` hiza + `targetSdk 36` kapısı, `docs/RELEASE-MOBILE.md` runbook | `2026-09-06-plan44-infra-mobile-release.md` | Plan 44 | ready | **M-4** (build), **M-5** (submit), I-1:T1–T3 (secret kalıbı) | — | 9 görev. K-I1: e2e'nin "giriş" ayağı CI'da koşamaz (gerçek Google hesabı) → `katıl → deste → karar` deep link + katılımcı jetonuyla; giriş elle yayın kapısı. Ücretli/yıkıcı adımlar "KULLANICI ÇALIŞTIRIR". |

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

7. **B-14 → B-3.** V13–V16, B-3'ün V12'sinden sonra gelir; `AccountDeletion` `purge_after` alanını B-3'ün temizlik işi tüketir. B-3 done olmadan B-14 T1 açılmaz.

8. **W-13 → W-12 (K-B26).** `travelMinutes` → `travel[]` geçişi `shared/fairness.ts`'i değiştirir; W-12'nin `Attribution sources[]` ve `travel[]` üretimi olmadan W-13 T2 çakışır.

9. **W-14 / M-5 → B-14.** `openapi.json`'da `/api/auth/apple`, `DELETE /api/me`, `/api/me/consents`, `/api/me/export`, `/api/reports`, `/api/me/blocks` görünmeden başlamaz. M-5 ayrıca W-14'ün `/privacy /terms /kvkk /account/delete` URL'lerini (mağaza meta verisi) bekler.

10. **M-4 ⇄ W (shared taşıma).** M-4 T3 i18n JSON'larını ve 9 saf `lib` modülünü `frontend/shared`'a taşır, web'de shim bırakır; aynı anda koşan W-13/W-14 bu dosyalara dokunuyorsa önce M-4 T3 kapanır.

11. **W-15 → B-15.** `lastSeenAt`/`linkOpenedAt`/`nudge`/`nudged` B-15 T5–T6'dan; R-W15 (rapor/engel) yalnız B-14'ü bekler — W-15 T6 önce koşabilir.

12. **M-7 → M-4 → (M-8).** M-7 T4 durum yönlendiricisi M-8 ekran dosyalarını `return null` iskeletiyle açar; M-8 aynı dosyaları doldurur, yönlendiriciyi yeniden yazmaz. M-7 T4'ün `BROWSING` testi T5 (Mekanlar) bitince tam yeşil.

13. **M-9 → B-15 + M-8; M-6 → M-7.** `nudged` olayının mobilde üretilmesi M-6'nın `liveChannel` portuna bağlıdır (K-M6); M-9 T2 M-6 yoksa yalnız toast/soğuma katmanını kurar.

14. **I-3 ⇄ M-4/M-5.** I-3 T1 `eas.json`'daki `preprod` profilini `preview` yapar (M-4 T2 ile çelişirse I-3 kazanır); T6 submit ve T7 görseller M-5'in `RELEASE-CHECKLIST.md`'sini bekler.

15. **I-2 ⇄ I-1 ⇄ B-13.** `deploy/k8s/` I-2 ile doğar; I-1:T3 backend Deployment'ı
    `configMapRef: bumpinto-geo`'yu I-2'den alır (Plan 5 Ek B). `venues-open-import` swap'i
    B-13'ün V11'ini bekler — V11 yoksa iş bilerek patlar. Sıra: **I-1:T1–T3 → B-13 (V11 dahil)
    → I-2:T5–T8 → I-1:T4**. I-2:T1–T4 (compose + `tools/venues-open` + testler) hiçbirini beklemez.

**B-4 açılırsa** (deferred): API sözleşmesi değişir → W-1/W-2/W-3/W-4/M-1/M-2 geriye dönük düzeltme;
`B-4 T7` `I-1:T3`'ten sonra koşar.
