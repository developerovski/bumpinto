# "Buradayım" anlık plan + rozetler + shuffle kapısı — tasarım (2026-09-11)

Amaç: Keşfet izine (B-17 ✓ · W-17 · M-11) **Swarm ruhunu** plan teziyle çelişmeden eklemek.
Kullanıcının istediği üç şeyden ikisi şimdi girer — **anlık "buradayım" çağrısı** ve **plan
bazlı oyunlaştırma** — üçüncüsü (**mekândaki yabancılarla shuffle eşleşmesi**) ölçülebilir bir
yoğunluk kapısının arkasına alınır. **Arkadaşların nerede olduğunu görmek** gizlilik-önce bir
modelle **B-19**'a girer: paylaşım = "Buradayım" planının arkadaş-only kitlesi, arkadaşlık =
birlikte plana katıldığın kişiyle karşılıklı onay. **Sürekli/canlı konum paylaşımı yok.**

Kaynaklar: `.github/modernize/java-upgrade/20260902170714/plan.md` §Keşfet (B-17/W-17/M-11),
Keşfet POC (`719fcd5f-…/Web Ekranlar v3 - Keşfet POC.dc.html`, P1–P5), B-17 kodu (`OpenPlan`,
`DiscoverQueries`, `SessionRepository.findPublicUpcoming`, `MeetCheckins`, V20/V21),
2026-09-08 yön kararı ("plana katılırsın", flört/ısı haritası reddi), 2026-09-03 UX kararı
("kaydırma yalnız oylama mekaniği").

## 0. Karar (kısa)

| İstek | Karar | Neden |
|---|---|---|
| Mekânda etiketlen, oradakileri Tinder gibi kaydır | **Şimdi değil** — §7'deki kapı geçilince yeniden tasarlanır; ön karar: eşleşme = "birlikte plan aç", sohbet yok | Mekân-eşzamanlılık matematiği 500 kullanıcıda şehir genelinde haftada ~10–15 eşleşme verir; profil fotoğrafı/moderasyon pipeline'ı yok; flört kategorisi mağaza+GDPR yükü; 08.09 kararıyla çelişir |
| "Buradayım" anlık çağrı | **Şimdi** — `openUntil` pencereli, çapalı açık plan | B-17'nin üstüne tek kolon; Keşfet'te "Şimdi"; 50 kullanıcıda da çalışır |
| Rozet / seri | **Şimdi, küçük** — sayılar sunucuda, rozet istemcide | `meet_checkins` zaten ölçüyor; 4 rozet + haftalık seri |
| Arkadaşların nerede olduğunu görmek | **B-19, gizlilik-önce** — "Buradayım" planına kitle `PUBLIC \| FRIENDS \| NONE`; B-18 `PUBLIC \| NONE` ile açılır, `FRIENDS` + arkadaşlık B-19'da | Paylaşım eylemdir (mekân + pencere), sürekli konum değil; arkadaş rehberden değil plandan; liste özel |

## 1. Bağlayıcı kararlar (uygulayan ajan yeniden tartışmaz)

1. Anlık plan **ayrı bir kavram değil**: `OpenPlan`'a `openUntil` (nullable) eklenir. `null` =
   bugünkü noktasal plan; dolu = `[meetAt, openUntil]` penceresi. Kolon `sessions.open_until`.
2. Süreyi host seçer: **1 / 2 / 3 saat** (`openUntil = meetAt + n`). Üst sınır 3 saat, domain ve
   DB kısıtı birlikte zorlar.
3. Anlık planın **çapası zorunlu** (`anchor`): "buradayım" noktasız olamaz. Çapa noktası =
   host'un o anki konumu, çapa etiketi = host'un yazdığı mekân adı ("Nerede?"). Sunucu:
   `openUntil != null && anchor == null` → 400 `open_plan_anchor_required`.
4. Anlık planda katılım varsayılanı **OPEN** (host APPROVAL'a çevirebilir); zamanlı planda
   varsayılan APPROVAL kalır. Varsayılanı **form** seçer, sunucu politika dayatmaz. Gerekçe: push
   yok, 2 saatlik pencerede onay beklemek planı öldürür; isteyen zaten hesaplı, engel listesi süzer.
5. **K-B38 düzeltmesi bu izin parçasıdır:** Keşfet kartındaki `locality`, host'un çapa etiketi
   DEĞİL, çapa noktasının (çapasızsa host konumunun) kuruluşta ters geocode'lu semtidir. Yeni
   kolon `sessions.locality`. `midpointLabel` (host'un etiketi, örn. "Café X") üyelere özel kalır.
6. Keşfet listeleme kuralı `coalesce(open_until, meet_at) > now` olur; süren plan listede kalır,
   pencere kapanınca düşer. `meetPassed = now ≥ coalesce(openUntil, meetAt)`; TTL = o an + 3 sa.
7. Rozetler **istemcide** türetilir (`frontend/shared/src/badges.ts`, saf fonksiyon); sunucu
   yalnız sayar: `stats.plansMet`, `stats.metStreakWeeks`. Rozet tablosu/sunucu durumu yok.
8. Shuffle için kod yazılmaz; INDEX'e aday satır + §7'deki tetik ve SQL girer.
9. Bu tasarım üç plan açar: **B-18** (backend, V23, plan47), **W-18** (web, plan48), **M-12**
   (mobil, plan49) — INDEX'te B/W/M altında ayrı satırlar (kullanıcı kararı 2026-09-11). W-18/M-12,
   W-17/M-11'in W2/W3/W4/W6/W7 ve M1/M2/M3/M4/M5 çıktılarını genişletir; henüz başlamamış görevler
   doğrudan yeni şekliyle (birleşik) uygulanır — ara şekil üretilmez (INDEX kilit 22/23). Push rezervi V24'e kayar (sicil kuralı: numara fiilen
   inen migration'ındır).
10. Her açık planın bir **kitlesi** vardır: `audience ∈ {PUBLIC, FRIENDS, NONE}` (`sessions.audience`,
    yalnız açık planda dolu). `PUBLIC` = Keşfet; `FRIENDS` = yalnız karşılıklı arkadaşlar (B-19);
    `NONE` = hiçbir listede yok, yalnız davet linki — pencere, kapasite, yeter sayı, koltuk isteği
    ve check-in yine çalışır. Varsayılan `PUBLIC`. Mevcut B-17 satırları migration'da `PUBLIC`
    olur. B-18 formda yalnız Herkes | Kimse sunar; `FRIENDS` değeri sunucuda B-19'a kadar 400.
11. "Ne zaman" alanı planı tanımlar: **Belirsiz** = bugünkü gizli oturum (`openPlan` yok);
    **Şimdi** / **Tarih seç** = açık plan (süre ya da tarih-saat, kapasite, katılım, kitle).
    P3'teki "Keşfet'te göster" anahtarı kalkar; yerini "Kim görsün?" alır.
12. Arkadaşlık (B-19) kuralları şimdi sabitlenir, kod sonra: karşılıklı onay; aday yalnız aynı
    oturum/planda koltuğu olmuş hesap (rehber yok, arama yok, link yok); liste yalnız sahibine
    görünür; engel arkadaşlığı sessizce siler; çıkarma bildirimsiz. Arkadaş, seni yalnız
    `FRIENDS`/`PUBLIC` kitleli planın penceresi içinde ve yalnız o planın yeri kadar görür; "en son
    görüldü", iz, arka plan konumu yok. Gizlilik metni (`privacy.ts` "yalnız aynı oturumdakilerle")
    B-19'da genişler → hukukçu kapısı.
13. Git yazımı kullanıcıda.

## 2. Model — V23

```sql
-- V23__instant_plans.sql — B-18: "buradayım" penceresi + Keşfet'in kaba yer adı.
alter table sessions add column open_until timestamptz;
alter table sessions add column locality   text;
alter table sessions add column audience   text;
-- Pencere yalnız açık planda ve en çok 3 saat: "buradayım" TTL'siz süremez.
alter table sessions add constraint sessions_open_until_check
    check (open_until is null
           or (meet_at is not null and open_until > meet_at
               and open_until <= meet_at + interval '3 hours'));
-- Kitle açık planın parçası: B-17 satırları Keşfet'teydi, PUBLIC kalır (backfill kısıttan ÖNCE).
update sessions set audience = 'PUBLIC' where meet_at is not null;
alter table sessions add constraint sessions_audience_check
    check ((meet_at is null) = (audience is null)
           and (audience is null or audience in ('PUBLIC', 'FRIENDS', 'NONE')));
-- Keşfet yalnız PUBLIC okur; kısmi indeks daralır (FRIENDS/NONE hiç girmez).
drop index sessions_discover_idx;
create index sessions_discover_idx on sessions (meet_at) where audience = 'PUBLIC';
```

`OpenPlan(meetAt, capacity, joinPolicy, openUntil, audience)`:

| Üye | Kural |
|---|---|
| `end()` | `openUntil ?? meetAt` |
| `meetPassed(now)` | `!now.isBefore(end())` (sınır dahil, bugünkü davranış) |
| `expiresAt()` | `end() + GRACE_AFTER_MEET(3h)` |
| `inProgress(now)` | `openUntil != null && !now.isBefore(meetAt) && now.isBefore(openUntil)` |
| `audience` | `Audience {PUBLIC, FRIENDS, NONE}`; `listedInDiscover() = audience == PUBLIC` |
| ctor | `openUntil` verilirse `meetAt < openUntil ≤ meetAt + 3h`; `audience` null olamaz; değilse `IllegalArgumentException` |

`Session` kaydına `locality` (kaba ad, herkese açık) eklenir; `midpointLabel` anlamı değişmez.

## 3. Backend — B-18

- **Keşfet sorgusu** (`SessionRepository.findPublicUpcoming`): `s.audience = 'PUBLIC' and
  coalesce(s.openUntil, s.meetAt) > :now and s.meetAt < :until and s.expiresAt >= :now and
  status not in (DECIDED, EXPIRED)`, sıra `meetAt asc`. (`audience` dolu ⇔ `meetAt` dolu;
  `meetAt is not null` şartı kısıt sayesinde gereksizleşir.)
- **Kitle doğrulaması:** `OpenPlanInput.audience` (varsayılan `PUBLIC`); `FRIENDS` B-19 inene
  kadar 400 `audience_not_available` — sözleşmede enum tam, davranış kapılı. Süren planlar en erken `meetAt`'e sahip
  olduğu için doğal olarak öndedir; istemci ayrıca "Şimdi" aralığı sunar.
- **`SessionCommands.createSession`:** `locality` yazılır — açık planda çapa varsa
  `geocoder.label(anchor.point())`, yoksa `geocoder.label(hostLocation)`; gizli oturumda null (ağ
  isteği yok). `midpointLabelAt` çapasız açık planda aynı semti kullanır (tek geocode). Anlık planda çapa
  zorunluluğu burada: `IllegalArgumentException("open_plan_anchor_required")` — `ApiExceptionHandler`
  bu türü zaten 400'e eşler, yeni istisna sınıfı gerekmez.
- **`SessionViewAssembler.toDiscover`:** `PlanCardDto.locality ← session.locality()`; `openUntil`
  eklenir. `OpenPlanDto` → `openUntil`, `inProgress`, `audience`. `OpenPlanInput` → `openUntil?`,
  `audience?`.
- **Stats** (`UserProfileQueries.Stats` → `StatsDto`): `plansMet` = `meet_checkins.met = true`
  satırlarımın sayısı (`participants.user_id = me`); `metStreakWeeks` = `met=true` check-in'lerin
  ayrık ISO haftaları, bu haftadan ya da geçen haftadan geriye ardışık sayı (Java'da küçük
  döngü; SQL yalnız ayrık haftaları getirir). Sayı yoksa 0.
- Yeni uç yok. `openapi.json` → `pnpm codegen` → `api-types.ts` (el yaması yok).
- Bruno: `sessions/create-instant-plan.yml` (+ `discover` mevcut isteğine süren plan senaryosu).
- `backend/ARCHITECTURE.md`: açık plan bölümüne pencere kuralı ve `locality`/`midpointLabel`
  ayrımı (K-B38) bir paragraf.

## 4. Web — W-18 (plan48; W-17 görevlerini genişletir)

| Görev | Ek |
|---|---|
| **W2** form | "Ne zaman" → `Segmented` **Belirsiz \| Şimdi \| Tarih seç** (P3'teki "Keşfet'te göster" `Toggle`'ının yerine; *Belirsiz* = bugünkü gizli oturum, plan alanları kapalı). *Şimdi*: süre `Segmented` 1/2/3 sa; `joinPolicy` varsayılanı OPEN; çapa modu ANCHOR'a kilitli, nokta = `useOwnLocation`, "Nerede?" `Field` = çapa etiketi (zorunlu, ≤ 60); gövde `openPlan = { meetAt: now, openUntil: now + n, capacity, joinPolicy, audience }` + `anchor`. *Tarih seç*: bugünkü W2 alanları. Her iki plan hâlinde **"Kim görsün?"** `Segmented` **Herkes \| Kimse** (varsayılan Herkes; B-19 Arkadaşlar'ı ekler; Kimse = listelenmez, yalnız davet linki). Sorgu: `?open=1` → Tarih seç, `?now=1` → Şimdi. `validate()`: Şimdi + etiket boş → `plan.errWhereRequired`. |
| **W3** Keşfet | "Plan aç" yanına ikinci `LinkButton` **"Buradayım"** → `/sessions/new?open=1&now=1` (1280'de başlık sağında, 390'da `MobileCta` ikili). Aralık `Segmented`'a **Şimdi** (`inRange(p, "now")` = `p.openUntil && meetAt ≤ now < openUntil`). Süren kart: takvim satırı yerine `discover.inProgress` ("şimdi · ~1 sa 20 dk daha", `openUntil − now`, 5 dk'ya yuvarlı). Süren planlar istemci sıralamasında üstte. |
| **W4** plan detayı | `PlanIntro` takvim satırı: `preview.openPlan.inProgress` ise `discover.inProgress` metni (kalan süre `openUntil − now`); aksi hâlde bugünkü tarih/saat. |
| **W6** check-in | Tetik değişmez; `meetPassed` sunucudan. "Evet" sonrası `authStore.load()` (mevcut `/api/me` yeniden yükleme yolu); `badgesFor(önce) ⊂ badgesFor(sonra)` farkı varsa sheet'in kapanış hâlinde `Sticker` + `badge.<id>.title`. |
| **W7** profil | `shared/badges.ts` (`badgesFor(stats): BadgeId[]`; `first_met`(≥1), `met_3`, `met_10`, `streak_3`(≥3 hafta)); `ProfilePrefs` altında rozet satırı (`Badge` atomu, kazanılmamışlar soluk). |

i18n (tr önce, en/nl parite): `plan.whenUnset` ("Belirsiz"), `plan.now`, `plan.pickDate`,
`plan.duration`, `plan.durationHours` (`{{count}} sa`), `plan.where`, `plan.wherePlaceholder`,
`plan.errWhereRequired`, `plan.audience` ("Kim görsün?"), `plan.audiencePublic` ("Herkes"),
`plan.audienceNone` ("Kimse — yalnız link"), `plan.audienceNoneHint`,
`discover.here`, `discover.rangeNow`, `discover.inProgress`, `profile.badges`,
`badge.first_met.title/hint`, `badge.met_3.*`, `badge.met_10.*`, `badge.streak_3.*`.

## 5. Mobil — M-12 (plan49; M-11 görevlerini genişletir)

| Görev | Ek |
|---|---|
| **M1** Keşfet | Alt CTA ikili: "Plan aç" + **"Buradayım"** (`router.push({ pathname: "/sessions/new", params: { open: "1", now: "1" } })`); `Segmented`'a Şimdi; süren kart satırı. Konum `locationStore`. |
| **M2** form | W2'nin RN'i: Belirsiz/Şimdi/Tarih `Segmented`, süre `Segmented`, "Nerede?" `Input`, "Kim görsün?" `Segmented`; OPEN varsayılanı; çapa = `locationStore` konumu. |
| **M3** plan detayı | `PlanIntroScreen` süren planda `discover.inProgress` satırı (W4 ile aynı kural). |
| **M4** check-in | "Evet" sonrası `meStore.load()`; yeni rozet → `expo-haptics` Success + `Sticker`. |
| **M5** profil | Rozet satırı (`Badge`/`Chip`), aynı `shared/badges.ts`. |

## 6. Kabul edilen sınırlar

- Anlık plan = çapalı açık plan; Lobi ve karar motoru değişmez (host isterse deste yine açılır).
- OPEN anlık planda koltuk alan hesaplı kullanıcı kesin noktayı hemen görür (karar 4).
- Host erken kalkarsa "bitir" yok; pencere/TTL kapatır. (Aday: `PATCH openUntil`, şimdi değil.)
- Keşfet kartı süren planda dakika satırını yine yuvarlanmış konumdan verir; çapa noktası
  sızmaz (kart `locality` + dakika taşır, koordinat taşımaz — bugünkü kural).
- Rozet sunucuda saklanmaz → cihazlar arası "yeni rozet" anı yalnız o cihazda kutlanır.
- `NONE` kitleli planda davet linki **keşif** yetkisidir, koltuk yetkisi değil: link sahibi de
  `SeatRequests`'ten geçer (OPEN'da anında koltuk). K-B37 kapısı aynen kalır.
- `FRIENDS` kitleli planda arkadaş mekân adını görür (B-19, karar 12) — "kesin nokta yalnız
  onaylılara" kuralının bilinçli tek istisnası; ilişki karşılıklı onaylı olduğu için kabul.

## 7. Shuffle kapısı (kod yok)

INDEX aday satırı **K-B39**: "Shuffle eşleşmesi — mekânda son 5 saatte bulunanlar, simetrik
opt-in, sağ/sol; **tetik:** 4 ardışık hafta boyunca haftada ≥ 100 anlık plan **ve** anlık planların
≥ %50'si host dışı ≥ 1 koltuk alıyor. Ön kararlar: eşleşme = 'birlikte plan aç' daveti, sohbet
yok; profil fotoğrafı + moderasyon pipeline'ı ayrı iz; flört dili yasak."

Ölçüm (haftalık, salt okunur):

```sql
select date_trunc('week', s.created_at) as week,
       count(*) as instant_plans,
       count(*) filter (where exists (
           select 1 from participants p
            where p.session_id = s.id and not p.host and p.user_id is not null)) as with_guest
  from sessions s
 where s.open_until is not null
   and s.created_at >= now() - interval '4 weeks'
 group by 1 order by 1;
```

## 8. Arkadaşlar — B-19 modeli (bu spec'te kod yok, kapı yok: B-18'den sonra)

Amaç: "arkadaşlarım nerede" sorusuna **yalnız arkadaşın kendi eylemiyle** cevap vermek.

- **Kayıt:** `friendships(user_lo, user_hi, requested_by, status {PENDING, ACCEPTED}, created_at,
  decided_at)`; `user_lo < user_hi` sıralı çift, PK. Aday kuralı sunucuda: iki hesabın da
  `participants.user_id` ile koltuğu olduğu ortak bir oturum yoksa istek 403
  `friend_candidate_required`. Engel (`blocks`, iki yön) → satır silinir, yeni istek 403.
- **Uçlar (hesap JWT):** `GET /api/friends` (yalnız kendi listem + bekleyen istekler),
  `POST /api/friends/requests {userId}`, `POST /api/friends/requests/{id}/accept`,
  `DELETE /api/friends/{userId}` (bildirimsiz), `GET /api/friends/plans` (arkadaşlarımın
  `audience ∈ {FRIENDS, PUBLIC}` ve penceresi açık planları — Keşfet'in arkadaş süzgeçli ikizi,
  `locality` yerine `midpointLabel` yani mekân adı taşır: arkadaş "gidip bulayım" diyebilsin).
- **Görünürlük:** arkadaş yalnız pencere içinde ve yalnız o planın yerini görür; koordinat yok,
  "en son görüldü" yok, geçmiş listesi yok (kapanan plan arkadaş listesinden düşer).
- **Giriş noktaları:** oturum/plan katılımcı satırında "Arkadaş ekle" (yalnız hesaplı katılımcı);
  Keşfet üstünde "Arkadaşlar" şeridi (boşsa çizilmez); `/account/friends` liste + bekleyenler.
- **Gizlilik metni:** `privacy.ts` "yalnız aynı oturumdakilerle" cümlesi "…ve seçtiğin kitleyle
  (arkadaşlar/herkes), yalnız planın penceresi boyunca" olur — hukukçu kapısı B-19'a bağlı.
- **Kapsam dışı (bilerek):** rehber eşleştirme, kullanıcı arama, arkadaşlık linki, arkadaşın
  arkadaşı, canlı konum, bildirim (push yok).

## 9. Test

- Backend: `OpenPlanTest` (end/meetPassed/expiresAt/inProgress, ctor sınırları);
  `DiscoverQueriesTest` (süren listelenir, penceresi biten düşer, noktasal plan davranışı aynı);
  `SessionCommandsTest` (locality çapadan geocode, `midpointLabel` etiket kalır, çapasız anlık plan
  400; `FRIENDS` 400); `UserProfileQueriesTest` (plansMet + seri: ardışık/kesik haftalar,
  Testcontainers); `DiscoverApiTest` +2 (kart `locality` ≠ çapa etiketi — K-B38 kanıtı; `NONE`
  plan Keşfet'te yok ama `/j/{slug}` önizlemesi ve koltuk isteği çalışıyor); V23 kısıt + backfill
  testi (`@JdbcTest`, tek ihlal/tek test — K-B36 tuzağı; B-17 satırı `PUBLIC` olmuş).
- Web: `newSessionStore.test` (Şimdi → `openUntil`/OPEN/anchor; süre; etiket zorunlu; Belirsiz →
  `openPlan` yok; Kimse → `audience: "NONE"`),
  `DiscoverPage.test` (Şimdi aralığı, Buradayım bağlantısı, süren kart metni), `badges.test`
  (eşikler), `ProfilePrefs.test` (+1), `CheckinSheet.test` (+1 yeni rozet).
- Mobil: aynı dosyaların jest sürümleri (RNTL 14: test başına tek `render`).
- `pnpm i18n:check`, `tsc -b`, `expo lint`; backend `env -u TOKEN_SECRET … mvn test`.

## 10. INDEX ve sicil değişiklikleri

- `## B` tablosuna **B-18** ("Buradayım" anlık plan + kitle PUBLIC|NONE + rozet sayaçları + K-B38;
  V23) `ready`, bağımlılık B-17 ✓.
- `## B` tablosuna **B-19** (Arkadaşlar: `friendships`, `FRIENDS` kitlesi, `/api/friends*`,
  gizlilik metni; §8) `aday`, bağımlılık B-18; W/M ekleri B-19 planı yazılınca numaralanır.
- **K-B38** (bulgu, High değil — Medium): çapalı açık planda `PlanCardDto.locality` = host'un
  çapa etiketi → kesin nokta onaysız herkese; B-18 kapatır.
- **K-B39** (aday): shuffle, §7 metni.
- `## W` tablosuna **W-18** (plan48) `ready`, bağımlılık B-18 (openapi) + W-17 W2/W3/W4/W6/W7;
  `## M` tablosuna **M-12** (plan49) `ready`, bağımlılık B-18 + W-18 T1 (shared) + M-11 M1–M5.
  Çapraz kilitler 22 (W-18), 23 (M-12), 24 (B-19). W-17 W1/W5 B-18'siz koşulabilir.
- Kural 9: **V23 = B-18** (`open_until`, `locality`, `audience`) · **V24 = B-19** (`friendships`,
  aday) · push → **V25** (rezerv; sicil kuralı "numara fiilen inenindir" geçerli).
- Numaralandırma satırı: sıradaki B-20, W-19, M-13.

## 11. Tasarım turu kararları (2026-09-11, Claude Design incelemesi; kullanıcı spec'i onayladı)

Opus ajanı POC'u genişletirken 8 soru bıraktı; aşağıdaki cevaplar bağlayıcıdır (planlar buna göre):

1. **Şimdi planında başlık** isteğe bağlı; boşsa ad sunucunun varsayılanı (`Texts.sessionName`), mekân
   adı başlığa girmez (sızıntı).
2. **"Şimdi" bir filtre**, varsayılan sekme değil; Keşfet "Bu hafta" ile açılır, sürenler zaten üstte
   (`sortPlans`); P1c yalnız "Şimdi" seçilince.
3. **Süren damga amber** (`.stk.now`), "kesin" sarı kalır.
4. **OPEN planda güven metni** `plan.safetyOpen` ("host onaylar" cümlesi yok; bildir/engelle var).
5. **"Kim görsün?"de Arkadaşlar B-18'de ÇİZİLMEZ** (olmayan seçenek gösterilmez); B-19 ekler.
6. **Profil sayaçları:** `sessionsHosted` ("açtığın"), `plansMet` ("buluşma"), `metStreakWeeks`
   ("hafta seri"); yeni sunucu alanı yok.
7. **P7 arkadaş şeridindeki "Katıl" plan detayına götürür**, şeritten koltuk almaz (K-B37).
8. **Gelen arkadaşlık isteği yalnız `/account/friends` "Bekleyen"de**; oturum ekranında yalnız
   "Arkadaş ekle" / "İstek gönderildi" (B-19).

Ajanın bilinçli sapmaları kabul: P2a farklı bir plan (kahve) çizdi; P3a'da tür/başlık alanı 844 px'e
sığmadı — kodda alanlar vardır, artboard kısaltmadır.
