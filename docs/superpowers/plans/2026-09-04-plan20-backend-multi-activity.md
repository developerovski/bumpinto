# Plan 20: Backend — Çoklu ilgi alanı (max 3), bulk Places araması (B-9)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Kimlik:** `B-9` · İz: Backend · Durum INDEX'te tutulur (bu plan INDEX'i **düzenlemez**).

**Goal:** Bir oturumun tek bir `activityType` yerine **1–3** ilgi alanı taşıması; destenin bu alanların hepsinden dengeli beslenmesi; ve bunun **tek** Google Places çağrısıyla yapılması.

**Architecture:** Google `searchNearby` `includedTypes` bir dizi kabul eder — 3 aktivitenin türleri birleştirilip **tek** istekte gönderilir, yani çoklu ilgi alanı bugünkünden fazla kota harcamaz. Karşılığında yanıt hangi mekânın hangi aktiviteden geldiğini söylemez: bunu `places.primaryType` + `places.types` alanlarından geri kuruyoruz (ikisi de **Essentials** katmanı; mask'te zaten Pro/Enterprise alanlar var, dolayısıyla marjinal maliyet **sıfır**). Sıralama `POPULARITY`'den `DISTANCE`'a geçer — 20'lik sert tavanda popülarite seyrek türü (hiking_area, museum) tamamen dışarıda bırakıyordu; mesafe orta nokta ürününe de daha uygun. Deste, aktivite kovalarından **round-robin** doldurulur.

**Tech Stack:** Java 25 · Spring Boot 4.1 · Flyway · Caffeine · JUnit 5 + AssertJ + Testcontainers · ArchUnit.

**Öncül:** `B-8 done` ✓. **W-8 (plan21) bu planın çıktısına bağlıdır** — `pnpm codegen` ancak T9 bittikten sonra doğru tipleri üretir.

**Testleri çalıştırma (env öneki ZORUNLU — ARCHITECTURE §15):**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test
```

Tek sınıf için `-Dtest=SınıfAdı`. `Unresolved compilation problem` görürsen `mvn -o clean test` koş (ARCHITECTURE §15).

**Git kuralı:** Bu repoda ajan git yazma işlemi yapmaz (AGENTS.md). Her görevin sonundaki "Commit" adımı **kullanıcıya bırakılır**; ajan yalnız hangi dosyaların bir arada commit edileceğini yazar.

---

## Yürütme grupları (ÖNCE BUNU OKU)

Maven `main` kaynaklarının **tamamını** derler: `Session`'ın tipi değiştiği anda
`SessionCommands`, `SessionController`, `SessionViewAssembler` ve `DeckFlow` birlikte kırılır ve
`-Dtest=TekSınıf` dahil **hiçbir test koşmaz**. Bu yüzden görevler tek tek değil, **derlemesi
yeşilden yeşile giden gruplar** halinde yürütülür.

| Grup | Görevler | Sonunda |
|---|---|---|
| **G1** | T1 | Migration. Java derlemesi yeşil ama **süit kırmızıya döner**: `SessionEntity.activityType` artık var olmayan kolona bakar. **G1 tek başına commit EDİLMEZ** — G2 ile aynı commit'e girer. |
| **G2** | **T2 + T3 + T4 + T7 + T9'un mekanik kısmı + doğrulama + `create-session.yml`** | Tip genişletme sweep'i — `mvn -o clean test` YEŞİL |
| **G3** | T5 | Google bulk + DISTANCE + atıf — yeşil |
| **G4** | T6 | FSQ kapsama kilidi — yeşil |
| **G5** | T8 | ~~Round-robin deste~~ — **GERİ ALINDI**, aşağıya bak |
| **G6** | T9'un davranış kısmı | `emptyActivityTypes` + `VenueDto.activityType` — yeşil |
| **G7** | T10 | Bruno + ARCHITECTURE |

**Bruno `create-session.yml` G2'dedir, G7'de değil.** Gövdesi `activityType` gönderiyordu ve tip
değişiminden sonra o istek 400 döner. AGENTS.md API Collection Policy bunu "uç noktanın tanımının
parçası, sonraki iş değil" sayıyor — G7'ye ertelemek politikayı ihlal ederdi (2026-09-04 inceleme
bulgusu). G7'de yalnız **kırılmayan** dosyaların `docs:` güncellemeleri kaldı.

**`@UniqueElements` şart.** Sözleşme "tekrarsız" diyor ama ilk taslakta hiçbir grup uygulamıyordu.
Tekrar serbest kalsaydı `{COFFEE,COFFEE}` cache anahtarında `"COFFEE+COFFEE"` üretir ve **aynı arama
ikinci kez satın alınırdı** — Places bütçesi bu işin ana kısıtı olduğu için bu sessiz bir para
sızıntısıydı (2026-09-04 inceleme bulgusu).

**G5 (T8, round-robin) geri alındı — 2026-09-04 inceleme bulgusu.** Task 8'in gerekçesi
yanlıştı: "20'lik tavanda seyrek tür düşer" dedim, ama **kesme diye bir şey yok.**
`provider.search(..., DECK_MAX=20)` → Google `maxResultCount = min(limit,20)` → orchestrator
ilk dolu sonucu döndürür, birleştirmez → yarıçap döngüsü `found`'u yeniden atar, biriktirmez.
Yani aday sayısı hep `≤ 20 = DECK_MAX` ve `balanced()` girdisinin tamamını döndürür.

Tek canlı etkisi zararlıydı: başlangıç sırasını değiştirip `shuffle()`'ın idempotentlik
değişmezini bozuyordu (`findVenues` `balanced()`'tan, `shuffle()` `canonicalOrder`'dan kurar;
`fairnessFirst` içindeki `Collections.shuffle` konum bağımlıdır). Koruyan test kördü: `candAt`
atıfsız aday üretiyor, hepsi artık kovasına düşüyor, `balanced()` düz sıraya dejenere oluyordu.

Seyrek tür savunması G3'ün `DISTANCE`'ı, kullanıcı bildirimi G6'nın `emptyActivityTypes`'ıdır.
**Task 8 bu plandan uygulanmamalıdır.**

**Doğrulama G2'dedir, G6'da değil.** `@NotNull` boş listeyi geçirir ve sağlayıcı katmanı boş
seçimle çağrılınca 400 yerine **500** üretir. Anotasyon tipin sözleşmesinin parçasıdır; ayrı
gruba bırakmak yapay bir regresyon penceresi açar (2026-09-04 inceleme bulgusu).

**G1 + G2 tek bir commit'tir.** Migration şemayı yeniden adlandırdığı an entity eşlemesi kopar; ikisi ayrı commit'lenirse aradaki her revizyon çalışmaz durumdadır.

**G2 tek bir iştir, parçalanamaz.** İçindeki tüm dosyalar aynı anda değişir; testler ancak
sweep bittikten sonra koşar. G2 içindeki "Run test to verify it fails" adımları **derleme
hatası** olarak başarısız olur — bu beklenendir, TDD kırmızısı sayılır. Grubun sonunda:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o clean test
```

G3–G6 tek görevlik gruplardır ve normal TDD döngüsü işler.

**G2'nin kapsamı, dosya dosya:** `Session.java`, `Venue.java`, `VenueCandidate.java`,
`VenueProviderPort.java`, `QuotaAwareVenueProvider.java`, `GooglePlacesVenueProvider.java` ve
`FoursquareVenueProvider.java` (**yalnız `search` imzası** — bulk/DISTANCE/atıf G3'te, kapsama
kilidi G4'te), `ProviderOrchestrator.java`, `DeckFlow.java` (**yalnız** `provider.search`'e liste
geçmek ve `Venue`'ye `c.activityType()` yazmak — round-robin G5'te), `SessionEntity.java`,
`VenueEntity.java`, `SessionStoreAdapter.java`, `DeckStoreAdapter.java`, `ApiDtos.java`
(tip değişimi **+ `@NotEmpty @Size(max = 3)`** — `emptyActivityTypes` ve
`VenueDto.activityType` G6'da),
`SessionViewAssembler.java`, `SessionController.java`, `SessionCommands.java`, ve derlemeyi
yeşile döndürmek için gereken **tüm test dosyaları**.

> G2 sırasında `MeController` / `UserStoreAdapter` / `UserProfile` kırılırsa **tipi genişletme** —
> `defaultActivity` bilerek tekil kalıyor. Kırılıyorlarsa çağrı yerini düzelt, tipi değil.

---

## Kapsam dışı (bilerek)

- **Oy semantiği değişmiyor.** Karışık deste tek eksende kaydırılır; `DecisionEngine`'e dokunulmaz. Kullanıcı kararı 2026-09-04.
- **`UserProfile.defaultActivity` tekil kalır.** Çoklu varsayılan tercih ayrı bir istektir (YAGNI).
- **Ek/telafi çağrısı yasak.** Seçilen bir aktiviteden hiç mekân gelmezse ikinci istek atılmaz; durum kullanıcıya bildirilir (T9). Kullanıcı kararı: sınırsız Places kredisi yok.

---

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| **Create** `resources/db/migration/V8__multi_activity.sql` | `sessions.activity_type` → `activity_types` (CSV); `venues.activity_type` kolonu + geri doldurma |
| **Modify** `domain/session/Session.java` | `ActivityType activityType` → `List<ActivityType> activityTypes` |
| **Modify** `domain/venue/Venue.java` | `+ ActivityType activityType` (hangi ilgi alanından geldi) |
| **Modify** `domain/venue/VenueCandidate.java` | `+ ActivityType activityType` (sağlayıcı atfı; çözülemezse `null`) |
| **Modify** `domain/port/VenueProviderPort.java` | `search(..., List<ActivityType> types, ...)` |
| **Modify** `adapter/out/provider/GooglePlacesVenueProvider.java` | Bulk `includedTypes`, `rankPreference: DISTANCE`, mask'e `primaryType`+`types`, ters atıf |
| **Modify** `adapter/out/provider/FoursquareVenueProvider.java` | **Kapsama kilidi**: seçilenlerin hepsini eşleyemiyorsa boş dön (Google'a düş) |
| **Modify** `adapter/out/provider/ProviderOrchestrator.java` | Cache anahtarı tür **listesinden** kurulur |
| **Modify** `application/deck/DeckFlow.java` | Round-robin kova doldurma; `Venue`'ye atıf yazma |
| **Modify** `adapter/out/persistence/SessionEntity.java` | `activityType` → `activityTypes` (CSV, `runoffVenueIds` deseni) |
| **Modify** `adapter/out/persistence/VenueEntity.java` | `+ activityType` |
| **Modify** `adapter/out/persistence/SessionStoreAdapter.java` | CSV birleştir/ayır |
| **Modify** `adapter/out/persistence/DeckStoreAdapter.java` | `activityType` taşı |
| **Modify** `adapter/in/web/ApiDtos.java` | `activityTypes` (`@NotEmpty @Size(max=3)`), `VenueDto.activityType`, `SessionView.emptyActivityTypes` |
| **Modify** `adapter/in/web/SessionViewAssembler.java` | 3 nokta + boş aktivite türetimi |
| **Modify** `adapter/in/web/SessionController.java` | `request.activityTypes()` |
| **Modify** `application/session/SessionCommands.java` | `List<ActivityType>` parametresi |
| **Modify** `.infra/bumpinto-collection/sessions/*.yml` | Yeni alanların `docs:` açıklaması |
| **Modify** `backend/ARCHITECTURE.md` | §Sağlayıcılar: bulk arama + atıf + DISTANCE kararı |

---

## Sözleşme (W-8 bunu okur)

| Alan | Tip | Kural |
|---|---|---|
| `CreateSessionRequest.activityTypes` | `ActivityType[]` | **1–3** eleman, tekrarsız. Boş / 4+ / tekrarlı → **400** (`@NotEmpty @Size(max=3) @UniqueElements`). |
| `SessionView.activityTypes` | `ActivityType[]` | Oturumun seçili alanları, host'un seçtiği sırada. |
| `SessionPreview.activityTypes` | `ActivityType[]` | Aynı; davet önizlemesi. |
| `SessionSummaryDto.activityTypes` | `ActivityType[]` | Aynı; liste satırı. |
| `VenueDto.activityType` | `ActivityType \| null` | Mekânın hangi ilgi alanından geldiği. Atıf çözülemediyse `null`. |
| `SessionView.emptyActivityTypes` | `ActivityType[]` | Seçili ama **hiç mekân üretmemiş** alanlar. Deste yokken **ve** hiçbir mekân atfedilememişken boş — ikinci durumda elde sinyal yoktur, "hepsi boş" demek 20 mekân dururken yalan olurdu. |
| `POST /{slug}/find-venues` | 422 `NoVenuesFound` | Yalnız **hiçbir** aktiviteden mekân gelmezse. Kısmi sonuç başarıdır. |

---

## Task 1: V8 migration — CSV kolonu ve mekân atfı için şema

**Files:**
- Create: `backend/src/main/resources/db/migration/V8__multi_activity.sql`
- Test: `backend/src/test/java/com/bumpinto/SchemaMigrationTest.java`

CSV seçimi bilinçli: bu tablo `runoff_venue_ids`'i zaten CSV tutuyor (`SessionEntity.runoffVenueIds`). `text[]` Hibernate tarafında ayrı tip eşlemesi ister ve tek kazancı 3 elemanlı bir liste için indekslenebilirlik — kullanılmıyor. Var olan desende kal (AGENTS.md).

- [ ] **Step 1: Write the failing test**

`SchemaMigrationTest.java` içine, `v7AddsSeatOwnershipWithOneSeatPerAccount` testinden sonra ekle:

```java
    /** V8: oturum 1-3 ilgi alani tasir (CSV), mekan hangi alandan geldigini bilir. */
    @Test
    void v8RenamesSessionActivityToCsvAndAttributesVenues() {
        assertThat(columnsOf("sessions")).contains("activity_types").doesNotContain("activity_type");
        assertThat(columnsOf("venues")).contains("activity_type");
    }
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=SchemaMigrationTest
```

Expected: FAIL — `Expecting ... to contain: ["activity_types"]`.

- [ ] **Step 3: Write the migration**

`V8__multi_activity.sql`:

```sql
-- Oturum artik 1-3 ilgi alani tasir. Depolama CSV: bu tablo runoff_venue_ids'i de
-- oyle tutuyor ve liste en fazla 3 elemanli -- text[] tek kazanci olan indekslenebilirligi
-- hicbir sorgu kullanmiyor.
alter table sessions rename column activity_type to activity_types;

-- Mekan hangi ilgi alanindan geldigini bilir: karisik destede kart rozeti ve deste
-- dengesi buna bakar. Eski satirlar tek aktiviteliydi -- oturumun degeri aynen gecer.
alter table venues add column activity_type text;

update venues v
   set activity_type = s.activity_types
  from sessions s
 where v.session_id = s.id
   and s.activity_types not like '%,%';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=SchemaMigrationTest
```

Expected: PASS.

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte commit edilecek: `V8__multi_activity.sql`, `SchemaMigrationTest.java`.
Mesaj önerisi: `feat(db): V8 — session carries 1-3 activities, venue records its own`

---

## Task 2: `Session` domain — tekil alan listeye

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/domain/session/Session.java`
- Test: `backend/src/test/java/com/bumpinto/domain/session/SessionTest.java` (yoksa oluştur)

Bu görev **derleme kırar** — T4 bitene kadar `mvn test` yeşile dönmez. Kırık kalan çağrı yerleri T4'te kapanır; ara adımda yalnız bu sınıfın kendi testi koşulur.

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/bumpinto/domain/session/SessionTest.java`:

```java
package com.bumpinto.domain.session;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SessionTest {

    private static Session sample(List<ActivityType> activities) {
        return new Session(UUID.randomUUID(), "abc123", UUID.randomUUID(), "Cuma kahvesi",
                activities, SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-05T10:00:00Z"), null, List.of());
    }

    /** Aktivite listesi kopyalanir: cagiran listeyi sonradan degistirse oturum etkilenmez. */
    @Test
    void activityTypesAreDefensivelyCopied() {
        List<ActivityType> mutable = new java.util.ArrayList<>(
                List.of(ActivityType.COFFEE, ActivityType.HIKE));
        Session session = sample(mutable);
        mutable.clear();
        assertThat(session.activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.HIKE);
    }

    /** Durum/etiket/karar gecisleri aktivite listesini KAYBETMEZ (4 wither de elle sayiyor). */
    @Test
    void witherOperationsPreserveActivityTypes() {
        Session session = sample(List.of(ActivityType.COFFEE, ActivityType.BAR));
        UUID venue = UUID.randomUUID();
        assertThat(session.withStatus(SessionStatus.SWIPING).activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.BAR);
        assertThat(session.withMidpointLabel("Eindhoven").activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.BAR);
        assertThat(session.inRunoff(List.of(venue), RunoffReason.TIE).activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.BAR);
        assertThat(session.decided(venue, DecisionKind.FORCED, Instant.now()).activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.BAR);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=SessionTest
```

Expected: FAIL — derleme hatası, `Session` ctor'u `ActivityType` bekliyor.

- [ ] **Step 3: Değiştir**

`Session.java` — `ActivityType activityType` alanını `List<ActivityType> activityTypes` yap, savunmacı kopya için compact ctor ekle, dört wither'ı güncelle:

```java
public record Session(UUID id, String slug, UUID hostId, String name,
                      List<ActivityType> activityTypes,
                      SessionType sessionType, SessionStatus status, Instant expiresAt,
                      UUID decidedVenueId, List<UUID> runoffVenueIds,
                      /** Karar ani; DECIDED disinda null. */
                      Instant decidedAt, DecisionKind decisionKind, RunoffReason runoffReason,
                      /** Orta noktanin kasaba kelimesi; find-venues'te bir kez yazilir. */
                      String midpointLabel) {

    /** Liste KOPYALANIR: cagiranin elindeki liste sonradan degisse oturum bozulmaz. */
    public Session {
        activityTypes = List.copyOf(activityTypes);
    }

    /** Eski imza: karar meta'si ve orta nokta etiketi henuz yok. */
    public Session(UUID id, String slug, UUID hostId, String name,
                   List<ActivityType> activityTypes,
                   SessionType sessionType, SessionStatus status, Instant expiresAt,
                   UUID decidedVenueId, List<UUID> runoffVenueIds) {
        this(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt, decidedVenueId,
                runoffVenueIds, null, null, null, null);
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    public boolean isSolo() {
        return sessionType == SessionType.SOLO;
    }

    public Session withStatus(SessionStatus newStatus) {
        return new Session(id, slug, hostId, name, activityTypes, sessionType, newStatus,
                expiresAt, decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason,
                midpointLabel);
    }

    public Session withMidpointLabel(String label) {
        return new Session(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason, label);
    }

    /** runoffReason KORUNUR: "runoff'tan cikan karar" izini karar sonrasi da anlatir. */
    public Session decided(UUID venueId, DecisionKind kind, Instant when) {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(when, "when");
        return new Session(id, slug, hostId, name, activityTypes, sessionType,
                SessionStatus.DECIDED, expiresAt, venueId, runoffVenueIds, when, kind,
                runoffReason, midpointLabel);
    }

    public Session inRunoff(List<UUID> venueIds, RunoffReason reason) {
        Objects.requireNonNull(reason, "reason");
        return new Session(id, slug, hostId, name, activityTypes, sessionType,
                SessionStatus.RUNOFF, expiresAt, null, List.copyOf(venueIds), null, null, reason,
                midpointLabel);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=SessionTest
```

Expected: PASS. Diğer sınıflar hâlâ kırık — beklenen, T4'te kapanır.

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte: `Session.java`, `SessionTest.java`. Mesaj: `refactor(domain): session carries a list of activity types`

---

## Task 3: `Venue` + `VenueCandidate` — mekân kendi ilgi alanını taşır

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/domain/venue/Venue.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/venue/VenueCandidate.java`

Test yok: bunlar alan eklemesi, davranışı T5 ve T8 test ediyor (AGENTS.md — gereksiz test yazma).

- [ ] **Step 1: `VenueCandidate`'e atıf alanı ekle**

Record başlığına `ActivityType activityType` ekle (son parametre) ve javadoc satırı:

```java
package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;

/**
 * ...
 * @param activityType hangi secili ilgi alanindan geldigi; saglayici yaniti atfi cozemezse
 *                     null (deste dengesinde "artik" kovasina duser, uydurulmaz)
 */
public record VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                             Double rating, Integer priceLevel, String photoUrl, String mapsUrl,
                             String category, String address, String locality, Integer ratingCount,
                             String hoursToday, String placeLink, ActivityType activityType) {

    /** Eski imza: zenginlestirilmemis aday (testler ve OSM taban saglayicisi icin). */
    public VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                          Double rating, Integer priceLevel, String photoUrl, String mapsUrl) {
        this(provider, externalId, name, location, rating, priceLevel, photoUrl, mapsUrl,
                null, null, null, null, null, null, null);
    }
}
```

> `withActivityType()` **yazma.** İlk taslakta vardı; G3/G4 atfı doğrudan `VenueCandidate`
> ctor'unda veriyor, yani metot hiç çağrılmazdı (YAGNI — 2026-09-04 inceleme bulgusu).

- [ ] **Step 2: `Venue`'ye aynı alanı ekle**

```java
package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;

import java.util.UUID;

public record Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                    GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                    String mapsUrl, int deckOrder,
                    String category, String address, String locality, Integer ratingCount,
                    String hoursToday, String placeLink, ActivityType activityType) {

    /**
     * Yalnızca TESTLER için kısa imza; üretimde çağrısı yoktur (sağlayıcı alanları her zaman
     * dolar). Silinmesi denendi ve geri alındı: 5 test çağrı yerine altışar {@code null}
     * eklemek testleri okunmaz hale getiriyordu — kazanç 7 satır, bedeli kapsamın okunurluğu.
     */
    public Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                 GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                 String mapsUrl, int deckOrder) {
        this(id, sessionId, provider, externalId, name, location, rating, priceLevel, photoUrl,
                mapsUrl, deckOrder, null, null, null, null, null, null, null);
    }

    public Venue withDeckOrder(int newOrder) {
        return new Venue(id, sessionId, provider, externalId, name, location, rating, priceLevel,
                photoUrl, mapsUrl, newOrder, category, address, locality, ratingCount, hoursToday,
                placeLink, activityType);
    }
}
```

- [ ] **Step 3: Commit (kullanıcı yapar)**

Birlikte: `Venue.java`, `VenueCandidate.java`. Mesaj: `refactor(domain): venue records which activity it came from`

---

## Task 4: Persistence — CSV yaz/oku, mekân atfını taşı

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/VenueEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/DeckStoreAdapter.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapterTest.java`

- [ ] **Step 1: Write the failing test**

`SessionStoreAdapterTest.java` içine ekle (dosya yoksa mevcut persistence testlerinden birinin kurulumunu kopyala):

```java
    /** CSV gidis-donus: 3 aktivite yazilir, ayni sirada geri okunur. */
    @Test
    void activityTypesRoundTripAsCsvInSelectionOrder() {
        Session saved = adapter.saveSession(new Session(UUID.randomUUID(), "csv001",
                hostId, "Cuma", List.of(ActivityType.COFFEE, ActivityType.HIKE, ActivityType.BAR),
                SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-05T10:00:00Z"), null, List.of()));

        Session loaded = adapter.findBySlug(saved.slug()).orElseThrow();

        assertThat(loaded.activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.HIKE, ActivityType.BAR);
    }
```

- [ ] **Step 2: Run test to verify it fails**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=SessionStoreAdapterTest
```

Expected: FAIL — derleme hatası, `e.activityType` alanı `String` ve tekil.

- [ ] **Step 3: Entity ve adapter'ları güncelle**

`SessionEntity.java` — alan adını değiştir:

```java
    String activityTypes; // csv
```

`VenueEntity.java` — alan ekle (`placeLink`'ten sonra):

```java
    String activityType;
```

`SessionStoreAdapter.saveSession` — `e.activityType = ...` satırını değiştir:

```java
        e.activityTypes = s.activityTypes().stream()
                .map(ActivityType::name).collect(Collectors.joining(","));
```

`SessionStoreAdapter.toSession` — `ActivityType.valueOf(e.activityType)` satırını değiştir:

```java
    static Session toSession(SessionEntity e) {
        List<UUID> runoff = e.runoffVenueIds == null ? List.of()
                : Arrays.stream(e.runoffVenueIds.split(",")).map(UUID::fromString).toList();
        List<ActivityType> activities = Arrays.stream(e.activityTypes.split(","))
                .map(ActivityType::valueOf).toList();
        return new Session(e.id, e.slug, e.hostId, e.name, activities,
                SessionType.valueOf(e.sessionType), SessionStatus.valueOf(e.status), e.expiresAt,
                e.decidedVenueId, runoff, e.decidedAt,
                e.decisionKind == null ? null : DecisionKind.valueOf(e.decisionKind),
                e.runoffReason == null ? null : RunoffReason.valueOf(e.runoffReason),
                e.midpointLabel);
    }
```

`DeckStoreAdapter` — iki yön de elle alan sayıyor, ikisini de güncelle.

`saveVenues` içindeki `map` gövdesinde, `e.placeLink = v.placeLink();` satırından **sonra**:

```java
            e.activityType = v.activityType() == null ? null : v.activityType().name();
```

`venuesOf` içindeki `new Venue(...)` çağrısında, `e.placeLink`'ten sonraki **son** parametre olarak:

```java
        return venues.findBySessionIdOrderByDeckOrder(sessionId).stream()
                .map(e -> new Venue(e.id, e.sessionId, e.provider, e.externalId, e.name,
                        new GeoPoint(e.lat, e.lng), e.rating, e.priceLevel, e.photoUrl,
                        e.mapsUrl, e.deckOrder, e.category, e.address, e.locality, e.ratingCount,
                        e.hoursToday, e.placeLink,
                        e.activityType == null ? null : ActivityType.valueOf(e.activityType)))
                .toList();
```

`import com.bumpinto.domain.session.ActivityType;` ekle.

- [ ] **Step 4: Run test to verify it passes**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=SessionStoreAdapterTest
```

Expected: PASS.

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte: 4 persistence dosyası + testi. Mesaj: `feat(persistence): store activity list as csv, carry venue attribution`

---

## Task 5: Google sağlayıcı — bulk arama, DISTANCE, ters atıf

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/provider/GooglePlacesVenueProvider.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/provider/GooglePlacesVenueProviderTest.java`

Bu planın kalbi. Üç değişiklik tek istekte: birleşik `includedTypes`, `rankPreference`, ve atıf için iki mask alanı.

**Neden mask'e alan eklemek bedava:** Places API (New) isteği, mask'teki **en yüksek** katmandan faturalanır. Mevcut mask `places.rating`, `places.priceLevel`, `places.regularOpeningHours`, `places.userRatingCount` içeriyor — istek zaten Enterprise katmanında. `places.primaryType` ve `places.types` **Essentials** katmanıdır; katmanı yükseltemezler.

- [ ] **Step 1: Write the failing tests**

`GooglePlacesVenueProviderTest.java` — mevcut `buildsFlatIncludedTypesArrayForMultiTypeActivity` testini şununla **değiştir** ve altına üç test ekle:

```java
    /** includedTypes duz dize dizisi olmali; ic ice dizi Google'da sessizce filtresiz sonuc verir. */
    @Test
    void buildsFlatIncludedTypesArrayForMultiTypeActivity() {
        JSONArray types = GooglePlacesVenueProvider
                .requestBody(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.SWIM), 10)
                .getJSONArray("includedTypes");
        assertThat(types.toList()).containsExactlyInAnyOrder("swimming_pool", "water_park");
    }

    /** Uc aktivite TEK istekte birlesir: cogul ilgi alani ek kota harcamaz. */
    @Test
    void mergesEverySelectedActivityIntoOneRequest() {
        JSONArray types = GooglePlacesVenueProvider
                .requestBody(new GeoPoint(51.5, 5.5), 5.0,
                        List.of(ActivityType.COFFEE, ActivityType.HIKE, ActivityType.BAR), 20)
                .getJSONArray("includedTypes");
        assertThat(types.toList()).containsExactlyInAnyOrder(
                "cafe", "hiking_area", "national_park", "state_park", "bar");
    }

    /**
     * Siralama MESAFE: 20'lik sert tavanda populariteyle seyrek tur (hiking_area) hic
     * gelmiyordu. Karar 2026-09-04 -- tek aktiviteli destelerin icerigini de degistirir.
     */
    @Test
    void ranksByDistanceSoSparseTypesSurviveTheTwentyCap() {
        assertThat(GooglePlacesVenueProvider
                .requestBody(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.COFFEE), 20)
                .getString("rankPreference")).isEqualTo("DISTANCE");
    }

    /** primaryType secili kumede ise atif odur. */
    @Test
    void attributesPlaceByPrimaryType() {
        JSONObject place = new JSONObject()
                .put("primaryType", "hiking_area")
                .put("types", new JSONArray(List.of("hiking_area", "tourist_attraction")));
        assertThat(GooglePlacesVenueProvider.attribute(place,
                List.of(ActivityType.COFFEE, ActivityType.HIKE))).isEqualTo(ActivityType.HIKE);
    }

    /** primaryType secili kumede degilse types'a bakilir, secim SIRASI belirler. */
    @Test
    void fallsBackToTypesArrayInSelectionOrder() {
        JSONObject place = new JSONObject()
                .put("primaryType", "tourist_attraction")
                .put("types", new JSONArray(List.of("tourist_attraction", "bar", "restaurant")));
        assertThat(GooglePlacesVenueProvider.attribute(place,
                List.of(ActivityType.FOOD, ActivityType.BAR))).isEqualTo(ActivityType.FOOD);
    }

    /** Hicbir sey eslesmezse atif UYDURULMAZ: null doner, deste dengesinde artik kovasina duser. */
    @Test
    void returnsNullWhenNothingMatchesInsteadOfGuessing() {
        JSONObject place = new JSONObject()
                .put("primaryType", "tourist_attraction")
                .put("types", new JSONArray(List.of("tourist_attraction")));
        assertThat(GooglePlacesVenueProvider.attribute(place,
                List.of(ActivityType.COFFEE, ActivityType.HIKE))).isNull();
    }
```

Ayrıca `everyActivityTypeIsMappedToAtLeastOneGoogleType` testi olduğu gibi kalır.

- [ ] **Step 2: Run tests to verify they fail**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=GooglePlacesVenueProviderTest
```

Expected: FAIL — derleme hatası, `requestBody` `ActivityType` bekliyor, `attribute` yok.

- [ ] **Step 3: Sağlayıcıyı güncelle**

`requestBody` imzasını ve gövdesini değiştir:

```java
    /**
     * Ayri metot: includedTypes'in DUZ bir dize dizisi olmasi gerekiyor. {@code put(List)}
     * yazilirsa ic ice dizi ({@code [["a","b"]]}) gider — Google bunu 400 ile degil, sessizce
     * filtresiz sonuc dondurerek karsilar. Testin dogrudan tutabilmesi icin ayrildi.
     *
     * <p>Secili aktivitelerin turleri TEK istekte birlesir (includedTypes OR'lanir, istek
     * basina 50 ture kadar izinli): 3 ilgi alani 1 aktivitelik kotaya mal olur.
     */
    static JSONObject requestBody(GeoPoint center, double radiusKm, List<ActivityType> selected,
                                  int limit) {
        JSONArray types = new JSONArray();
        for (ActivityType type : selected) {
            List<String> mapped = TYPES.get(type);
            if (mapped == null) {
                throw new ProviderException("no google type mapping for " + type);
            }
            mapped.forEach(types::put);
        }
        return new JSONObject()
                .put("includedTypes", types)
                // MESAFE, populariteden farkli olarak seyrek turu (hiking_area, museum)
                // 20'lik tavanin disina itmez; orta nokta urununde dogru egilim de budur.
                .put("rankPreference", "DISTANCE")
                .put("maxResultCount", Math.min(limit, 20))
                .put("locationRestriction", new JSONObject().put("circle", new JSONObject()
                        .put("center", new JSONObject()
                                .put("latitude", center.lat()).put("longitude", center.lng()))
                        .put("radius", Math.min(radiusKm * 1000, 50000))));
    }

    /**
     * Yanit hangi mekanin hangi ilgi alanindan geldigini soylemez -- turlerden geri kurulur.
     * Once {@code primaryType} (mekanin kendi baskin turu), sonra {@code types} icinde
     * KULLANICININ SECIM SIRASINA gore ilk eslesme. Hicbiri tutmazsa null: uydurulmus bir
     * atif karti yanlis rozetle gosterir ve deste dengesini de yanlis hesaplatir.
     */
    static ActivityType attribute(JSONObject place, List<ActivityType> selected) {
        String primary = place.optString("primaryType", "");
        for (ActivityType type : selected) {
            if (TYPES.getOrDefault(type, List.of()).contains(primary)) {
                return type;
            }
        }
        JSONArray types = place.optJSONArray("types");
        if (types == null) {
            return null;
        }
        for (ActivityType type : selected) {
            List<String> mapped = TYPES.getOrDefault(type, List.of());
            for (int i = 0; i < types.length(); i++) {
                if (mapped.contains(types.getString(i))) {
                    return type;
                }
            }
        }
        return null;
    }
```

`search` imzasını değiştir ve mask'e iki alan ekle:

```java
    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm,
                                       List<ActivityType> selected, int limit) {
        JSONObject body = requestBody(center, radiusKm, selected, limit);
```

Mask satırını değiştir (son satıra `places.primaryType,places.types` eklenir):

```java
                .header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.location,places.rating,"
                                + "places.priceLevel,places.googleMapsUri,places.photos,"
                                + "places.primaryTypeDisplayName,places.businessStatus,"
                                + "places.shortFormattedAddress,places.userRatingCount,"
                                + "places.regularOpeningHours,places.addressComponents,"
                                // Essentials katmani: istek zaten Enterprise alanlar iceriyor,
                                // bunlar faturalama katmanini YUKSELTMEZ. Atif bunlardan cikar.
                                + "places.primaryType,places.types")
```

`VenueCandidate` kurulan yerde son parametre olarak atfı geç — `placeLink` argümanından sonra:

```java
                    attribute(p, selected)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=GooglePlacesVenueProviderTest
```

Expected: PASS (yeni 5 test dahil).

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte: `GooglePlacesVenueProvider.java` + testi. Mesaj: `feat(provider): one bulk nearby call for up to 3 activities, distance-ranked, attributed`

---

## Task 6: Foursquare kapsama kilidi

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/provider/FoursquareVenueProvider.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/provider/FoursquareVenueProviderTest.java`

**Düzeltilen hata:** FSQ 15 aktivitenin yalnız 5'ini eşliyor ve `@Order(1)` ile Google'dan önce geliyor. COFFEE+HIKE seçilirse FSQ kahveyi servis eder, hike'ı edemez, **dolu** sonuç döner — orchestrator "ilk dolu kazanır" der ve Google'a hiç gitmez. Kullanıcı tek bir hike görmez, sebebini de bilmez. Sağlayıcı seçilenlerin **hepsini** kapsamıyorsa hiç denememeli. Bu aynı zamanda boşa gidecek bir HTTP isteğini de siler.

- [ ] **Step 1: Write the failing test**

```java
    /**
     * KISMI kapsama = kapsama yok. FSQ hike'i eslemiyor; kahve+hike icin dolu bir kahve
     * listesi donerse orkestrator "ilk dolu kazanir" der ve Google'a hic gitmez -- kullanici
     * sectigi hike'tan tek mekan gormez. Bos donup Google'a birakmak TEK dogru davranis.
     */
    @Test
    void returnsEmptyWhenItCannotCoverEverySelectedActivity() {
        List<VenueCandidate> result = provider.search(new GeoPoint(51.44, 5.47), 5.0,
                List.of(ActivityType.COFFEE, ActivityType.HIKE), 20);

        assertThat(result).isEmpty();
    }

    /** Hepsi esleniyorsa kategoriler virgulle birlesir: yine TEK istek. */
    @Test
    void joinsCategoryIdsWhenEveryActivityIsMapped() {
        assertThat(FoursquareVenueProvider.categoryIds(
                List.of(ActivityType.COFFEE, ActivityType.BAR))).isEqualTo("13032,13003");
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=FoursquareVenueProviderTest
```

Expected: FAIL — derleme hatası, `categoryIds` yok.

- [ ] **Step 3: Değiştir**

`search` imzasını değiştir ve baştaki kapıyı genişlet:

```java
    /**
     * Secili aktivitelerin HEPSI eslenmisse virgullu kategori dizesi, biri bile eksikse null.
     * KISMI kapsama kabul edilmez: orkestrator "ilk dolu sonuc kazanir" kuralini isletir,
     * yani eksik kapsamayla donen dolu bir liste Google'i devre disi birakir ve kullanici
     * sectigi bir ilgi alanindan hic mekan gormez.
     */
    static String categoryIds(List<ActivityType> selected) {
        StringBuilder joined = new StringBuilder();
        for (ActivityType type : selected) {
            String id = CATEGORIES.get(type);
            if (id == null) {
                return null;
            }
            if (!joined.isEmpty()) {
                joined.append(',');
            }
            joined.append(id);
        }
        return joined.isEmpty() ? null : joined.toString();
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm,
                                       List<ActivityType> selected, int limit) {
        String category = categoryIds(selected);
        if (category == null) {
            // Kategorisiz ya da EKSIK kategoriyle arama YAPMA: FSQ filtresiz sonuc doner ya da
            // secimin bir kismini servis eder. Bos donersek orkestrator Google'a gecer.
            return List.of();
        }
```

`queryString("fsq_category_ids", category)` satırı olduğu gibi kalır.

`VenueCandidate` kurulan yerde son parametre — FSQ yanıtı makine kategorisi vermiyor, atıf yalnız tek aktivite seçiliyse kesindir:

```java
                    // FSQ yaniti makine kategorisi tasimiyor: atif ancak tek aktivite
                    // secildiginde kesindir, coklu secimde null (deste dengesi artik kovasi).
                    selected.size() == 1 ? selected.get(0) : null
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=FoursquareVenueProviderTest
```

Expected: PASS.

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte: `FoursquareVenueProvider.java` + testi. Mesaj: `fix(provider): foursquare must cover every selected activity or step aside`

---

## Task 7: Port ve orchestrator — liste imzası, liste cache anahtarı

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/domain/port/VenueProviderPort.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/provider/QuotaAwareVenueProvider.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/provider/ProviderOrchestrator.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/provider/ProviderOrchestratorTest.java`

- [ ] **Step 1: Write the failing test**

```java
    /** Cache anahtari SIRAYA duyarli OLMAMALI: {COFFEE,BAR} ile {BAR,COFFEE} ayni aramadir. */
    @Test
    void cacheKeyIsOrderIndependentForTheSameActivitySet() {
        GeoPoint center = new GeoPoint(51.44, 5.47);
        orchestrator.search(center, 5.0, List.of(ActivityType.COFFEE, ActivityType.BAR), 20);
        orchestrator.search(center, 5.0, List.of(ActivityType.BAR, ActivityType.COFFEE), 20);

        assertThat(provider.callCount()).isEqualTo(1);
    }

    /** Farkli kume = farkli anahtar: kahve destesi hike destesini kirletmez. */
    @Test
    void differentActivitySetsDoNotShareACacheEntry() {
        GeoPoint center = new GeoPoint(51.44, 5.47);
        orchestrator.search(center, 5.0, List.of(ActivityType.COFFEE), 20);
        orchestrator.search(center, 5.0, List.of(ActivityType.COFFEE, ActivityType.HIKE), 20);

        assertThat(provider.callCount()).isEqualTo(2);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=ProviderOrchestratorTest
```

Expected: FAIL — derleme hatası.

- [ ] **Step 3: Değiştir**

`VenueProviderPort.java`:

```java
public interface VenueProviderPort {
    /** {@code types} bos olamaz; en fazla 3 eleman (API katmani dogrular). */
    List<VenueCandidate> search(GeoPoint center, double radiusKm, List<ActivityType> types,
                                int limit);
}
```

`QuotaAwareVenueProvider` bu portu genişletiyorsa ayrıca değişiklik gerekmez; kendi `search` bildirimi varsa aynı imzaya çek.

`ProviderOrchestrator.search` — anahtar üretimini değiştir, gerisi aynı:

```java
    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm,
                                       List<ActivityType> types, int limit) {
        // Anahtar SIRADAN bagimsiz: {COFFEE,BAR} ile {BAR,COFFEE} ayni aramadir, ikincisi
        // ayni sonucu ikinci kez satin almamali. Enum dogal sirasi kanonik bicimi verir.
        String canonical = types.stream().map(ActivityType::name).sorted()
                .collect(Collectors.joining("+"));
        String key = String.format(Locale.ROOT, "%.3f:%.3f:%.1f:%s:%d",
                center.lat(), center.lng(), radiusKm, canonical, limit);
        List<VenueCandidate> cached = results.getIfPresent(key);
        if (cached != null) {
            return cached;
        }
        List<VenueCandidate> result = searchRanked(center, radiusKm, types, limit);
        // BOS sonuc CACHE'LENMEZ: seyrek bolgede gecici bir bosluk 30 dk boyunca
        // "mekan yok"a donusurdu. Hata durumu da cache'lenmez (istisna yukari gider).
        if (!result.isEmpty()) {
            results.put(key, result);
        }
        return result;
    }
```

`searchRanked` imzasını da `List<ActivityType> types` alacak şekilde güncelle; gövdesindeki `provider.search(center, radiusKm, type, limit)` çağrısı `types` geçer, log satırındaki `{}` yer tutucusu `types` basar. `import java.util.stream.Collectors;` ekle.

- [ ] **Step 4: Run tests to verify they pass**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=ProviderOrchestratorTest
```

Expected: PASS.

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte: port, `QuotaAwareVenueProvider`, orchestrator + testi. Mesaj: `refactor(provider): port takes an activity list, cache key is set-canonical`

---

## Task 8: `DeckFlow` — round-robin dengeli deste

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java`
- Test: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`

Tek çağrıdan gelen 20 mekân aktivite kovalarına ayrılır ve **sırayla** çekilir. 18 kafe + 2 hike geldiyse sonuç yine 20 mekândır ama hike'ın ikisi de destededir — popülariteyle ikisi de dışarıda kalıyordu. Atfı çözülemeyen adaylar "artık" kovasında bekler ve yalnız boş kalan yeri doldurur.

- [ ] **Step 1: Write the failing test**

```java
    /**
     * Seyrek aktivite desteden DUSMEZ: 18 kafe + 2 hike geldiginde round-robin ikisini de
     * ilk turlarda alir. Populariteye birakilsaydi ikisi de 20'lik kesitin disinda kalirdi.
     */
    @Test
    void roundRobinKeepsSparseActivitiesInTheDeck() {
        List<VenueCandidate> found = new ArrayList<>();
        for (int i = 0; i < 18; i++) {
            found.add(candidate("cafe" + i, 4.5, ActivityType.COFFEE));
        }
        found.add(candidate("hike0", 3.1, ActivityType.HIKE));
        found.add(candidate("hike1", 3.0, ActivityType.HIKE));
        provider.willReturn(found);

        List<Venue> deck = flow.findVenues(slug, hostParticipantId);

        assertThat(deck).hasSize(20);
        assertThat(deck).extracting(Venue::activityType)
                .contains(ActivityType.HIKE, ActivityType.COFFEE);
        assertThat(deck.stream().filter(v -> v.activityType() == ActivityType.HIKE)).hasSize(2);
    }

    /** Atfi cozulemeyen aday UYDURULMAZ: yalniz bos kalan yeri doldurur. */
    @Test
    void unattributedCandidatesOnlyTopUpRemainingSlots() {
        provider.willReturn(List.of(
                candidate("cafe0", 4.9, ActivityType.COFFEE),
                candidate("hike0", 4.8, ActivityType.HIKE),
                candidate("ghost", 5.0, null)));

        List<Venue> deck = flow.findVenues(slug, hostParticipantId);

        assertThat(deck).extracting(Venue::externalId)
                .containsExactly("cafe0", "hike0", "ghost");
    }

    /** Kismi sonuc BASARIDIR: hike hic gelmese bile kahve destesi kurulur. */
    @Test
    void partialCoverageStillBuildsADeck() {
        provider.willReturn(List.of(
                candidate("cafe0", 4.5, ActivityType.COFFEE),
                candidate("cafe1", 4.4, ActivityType.COFFEE),
                candidate("cafe2", 4.3, ActivityType.COFFEE),
                candidate("cafe3", 4.2, ActivityType.COFFEE),
                candidate("cafe4", 4.1, ActivityType.COFFEE),
                candidate("cafe5", 4.0, ActivityType.COFFEE)));

        assertThat(flow.findVenues(slug, hostParticipantId)).hasSize(6);
    }
```

Yardımcı (test sınıfının altına):

```java
    private static VenueCandidate candidate(String id, double rating, ActivityType type) {
        return new VenueCandidate("google", id, id, new GeoPoint(51.44, 5.47), rating,
                null, null, null, null, null, null, null, null, null, type);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=DeckFlowTest
```

Expected: FAIL — derleme hatası ve `Venue::activityType` yok sayılıyor.

- [ ] **Step 3: `findVenues`'u güncelle**

Sağlayıcı çağrısı listeyi geçer:

```java
        List<VenueCandidate> found = List.of();
        for (int attempt = 0; attempt <= SearchRadius.MAX_EXPANSIONS; attempt++) {
            found = provider.search(center, SearchRadius.expandedKm(baseKm, attempt),
                    session.activityTypes(), DECK_MAX);
            if (found.size() >= DECK_MIN) {
                break;
            }
        }
```

Kalite kapısı bloğunu (`unique` + `shortlist`) şununla değiştir:

```java
        Map<String, VenueCandidate> unique = new LinkedHashMap<>();
        found.forEach(c -> unique.putIfAbsent(c.externalId(), c));
        // Puan = kalite kapisi, round-robin = denge: tek cagriyla gelen 20 mekan aktivite
        // kovalarina ayrilir ve sirayla cekilir, boylece seyrek ilgi alani desteden dusmez.
        List<VenueCandidate> shortlist = balanced(unique.values(), session.activityTypes(),
                DECK_MAX);
```

`Venue` kurulan döngüde son parametre olarak atfı ekle:

```java
            venues.add(new Venue(UUID.randomUUID(), session.id(), c.provider(), c.externalId(),
                    c.name(), c.location(), c.rating(), c.priceLevel(), c.photoUrl(),
                    c.mapsUrl(), i, c.category(), c.address(), c.locality(), c.ratingCount(),
                    c.hoursToday(), c.placeLink(), c.activityType()));
```

Sınıfın alt kısmına, `canonicalOrder`'ın yanına ekle:

```java
    /**
     * Aktivite kovalarindan SIRAYLA cekerek deste kurar. Her kova kendi icinde kanonik
     * siradadir (puan, sonra sabit kimlik); tur t'de her kovadan t. mekan alinir. Bir kova
     * erken tukenirse digerleri doldurmaya devam eder — yani 18 kafe + 2 hike geldiginde
     * sonuc yine 20 mekandir ama hike'in IKISI de icindedir.
     *
     * <p>Atfi cozulemeyen adaylar ({@code activityType == null}) hicbir kovaya girmez; yalniz
     * kovalar tukendikten sonra kalan yeri doldururlar. Uydurulmus bir atif karti yanlis
     * rozetle gosterirdi.
     */
    static List<VenueCandidate> balanced(Collection<VenueCandidate> found,
                                         List<ActivityType> activities, int max) {
        Comparator<VenueCandidate> order =
                canonicalOrder(VenueCandidate::rating, VenueCandidate::externalId);
        Map<ActivityType, List<VenueCandidate>> buckets = new LinkedHashMap<>();
        activities.forEach(a -> buckets.put(a, new ArrayList<>()));
        List<VenueCandidate> leftovers = new ArrayList<>();
        for (VenueCandidate c : found) {
            List<VenueCandidate> bucket = c.activityType() == null ? leftovers
                    : buckets.getOrDefault(c.activityType(), leftovers);
            bucket.add(c);
        }
        buckets.values().forEach(b -> b.sort(order));
        leftovers.sort(order);

        List<VenueCandidate> out = new ArrayList<>(max);
        for (int round = 0; out.size() < max; round++) {
            boolean progressed = false;
            for (List<VenueCandidate> bucket : buckets.values()) {
                if (round < bucket.size() && out.size() < max) {
                    out.add(bucket.get(round));
                    progressed = true;
                }
            }
            if (!progressed) {
                break;
            }
        }
        for (VenueCandidate c : leftovers) {
            if (out.size() >= max) {
                break;
            }
            out.add(c);
        }
        return out;
    }
```

`import java.util.Collection;` ekle.

- [ ] **Step 4: Run tests to verify they pass**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=DeckFlowTest
```

Expected: PASS.

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte: `DeckFlow.java` + testi. Mesaj: `feat(deck): round-robin fill so every selected activity survives the 20 cap`

---

## Task 9: API yüzeyi — doğrulama, DTO'lar, boş aktivite sinyali

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionController.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionControllerTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionViewAssemblerTest.java`

- [ ] **Step 1: Write the failing tests**

`SessionControllerTest.java`:

```java
    /** 1-3 arasi: sifir secim oturumu anlamsiz kilar, 4+ destede her alandan 5 mekan birakir. */
    @Test
    void rejectsEmptyOrOversizedActivitySelection() throws Exception {
        mvc.perform(post("/api/sessions").with(hostJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("[]")))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/sessions").with(hostJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("[\"COFFEE\",\"BAR\",\"HIKE\",\"SWIM\"]")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void acceptsThreeActivitiesAndEchoesThemInTheView() throws Exception {
        mvc.perform(post("/api/sessions").with(hostJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("[\"COFFEE\",\"HIKE\",\"BAR\"]")))
                .andExpect(status().isCreated());
    }
```

`SessionViewAssemblerTest.java`:

```java
    /**
     * Secili ama hic mekan uretmemis alan kullaniciya SOYLENIR. Ek cagri yapilmadigi icin
     * (Places kredisi sinirli) sessizce eksik kalmasi kabul edilemez; ekran "hike icin
     * yakinda yer bulunamadi" yazabilsin diye alan turetilir -- depolanmaz.
     */
    @Test
    void reportsSelectedActivitiesThatProducedNoVenues() {
        SessionQueries.SessionSnapshot snap = snapshotWith(
                List.of(ActivityType.COFFEE, ActivityType.HIKE),
                SessionStatus.BROWSING,
                List.of(venue("cafe0", ActivityType.COFFEE)));

        assertThat(assembler.toView(snap, null).emptyActivityTypes())
                .containsExactly(ActivityType.HIKE);
    }

    /** BROWSING oncesi deste HENUZ yok: "hepsi bos" demek yanlis olurdu. */
    @Test
    void reportsNoEmptyActivitiesBeforeTheDeckExists() {
        SessionQueries.SessionSnapshot snap = snapshotWith(
                List.of(ActivityType.COFFEE, ActivityType.HIKE),
                SessionStatus.COLLECTING, List.of());

        assertThat(assembler.toView(snap, null).emptyActivityTypes()).isEmpty();
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest='SessionControllerTest,SessionViewAssemblerTest'
```

Expected: FAIL — derleme hatası.

- [ ] **Step 3: DTO'ları ve assembler'ı güncelle**

`ApiDtos.java` — `CreateSessionRequest` (**G2'de yapıldı**, burada yalnız referans):

```java
    public record CreateSessionRequest(
                                       /** 1-3 ilgi alani; siralama host'un secim sirasidir. */
                                       @NotEmpty @Size(max = 3) List<ActivityType> activityTypes,
                                       @Size(max = 60) String name,
                                       /** null → GROUP (M-1 mobil istemcisi alani gondermez). */
                                       SessionType sessionType,
                                       @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                       @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                       @NotBlank @Size(max = 40) String displayName,
                                       @Size(max = 80) String locationLabel,
                                       /** null → CAR (spec §4.5b varsayilani). */
                                       TravelMode travelMode) {
    }
```

`import jakarta.validation.constraints.NotEmpty;` ekle.

`SessionView` — `ActivityType activityType` → `List<ActivityType> activityTypes`, ve sona alan ekle:

```java
                              /** Secili ama hic mekan uretmemis alanlar; BROWSING oncesi bos. */
                              List<ActivityType> emptyActivityTypes,
```

`SessionPreview` ve `SessionSummaryDto` — `ActivityType activityType` → `List<ActivityType> activityTypes`.

`VenueDto` — sona alan ekle:

```java
    public record VenueDto(UUID id, String name, double lat, double lng, Double rating,
                           Integer priceLevel, String photoUrl, String mapsUrl, int deckOrder,
                           Map<UUID, Integer> travelMinutes, FairnessDto fairness,
                           String provider, String category, String address, String locality,
                           Integer ratingCount, String hoursToday, String placeLink,
                           /** Hangi ilgi alanindan geldigi; atif cozulemediyse null. */
                           ActivityType activityType) {
    }
```

`SessionViewAssembler.toView` — `VenueDto` kurulan yerde son parametre `v.activityType()`; `SessionView` kurulan yerde `snap.session().activityType()` → `snap.session().activityTypes()` ve sona `emptyActivityTypes(snap)`:

```java
    /**
     * Secili ama desteye tek mekan sokamamis alanlar. TURETILIR, depolanmaz: deste zaten
     * elimizde ve tek kaynak odur. Deste kurulmadan once (BROWSING oncesi) bos doner --
     * yoksa "hicbir sey bulunamadi" gibi okunurdu.
     */
    private static List<ActivityType> emptyActivityTypes(SessionQueries.SessionSnapshot snap) {
        if (snap.venues().isEmpty()) {
            return List.of();
        }
        Set<ActivityType> covered = snap.venues().stream().map(Venue::activityType)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        return snap.session().activityTypes().stream()
                .filter(a -> !covered.contains(a)).toList();
    }
```

`toPreview` ve `toSummaryDto` içinde `activityType()` → `activityTypes()`.

`SessionCommands.createSession` imzası:

```java
    public CreateSessionResult createSession(UUID hostUserId, String name,
                                             List<ActivityType> types,
                                             SessionType sessionType, GeoPoint hostLocation,
                                             String hostDisplayName, String hostLocationLabel,
                                             TravelMode hostTravelMode) {
        Session session = store.saveSession(new Session(UUID.randomUUID(), Ids.slug(), hostUserId,
                Texts.sessionName(name), types, sessionType, SessionStatus.COLLECTING,
                clock.instant().plus(SESSION_TTL), null, List.of()));
```

`SessionController.create` — `request.activityType()` → `request.activityTypes()`.

- [ ] **Step 4: Run the full suite**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o clean test
```

Expected: BUILD SUCCESS — tüm modül yeşil. Kalan derleme hataları varsa `MeController`/`UserStoreAdapter` gibi `defaultActivity` kullanan yerlerdir; **onlar tekil kalır**, dokunma.

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte: `ApiDtos.java`, `SessionViewAssembler.java`, `SessionController.java`, `SessionCommands.java` + iki test. Mesaj: `feat(api): sessions accept 1-3 activities and report ones that found nothing`

---

## Task 10: Bruno koleksiyonu + ARCHITECTURE

**Files:**
- Modify: `backend/.infra/bumpinto-collection/sessions/create-session.yml`
- Modify: `backend/.infra/bumpinto-collection/sessions/get-session.yml`
- Modify: `backend/.infra/bumpinto-collection/sessions/preview.yml`
- Modify: `backend/.infra/bumpinto-collection/sessions/find-venues.yml`
- Modify: `backend/ARCHITECTURE.md`

API Collection Policy (AGENTS.md): değişen her uç noktanın Bruno karşılığı **tanımın parçasıdır**, sonraki iş değil.

- [ ] **Step 1: `create-session.yml` gövdesini ve dokümanını güncelle**

Gövdedeki `"activityType": "COFFEE"` alanını değiştir:

```yaml
      "activityTypes": ["COFFEE", "HIKE"],
```

`docs:` bloğuna satır ekle:

```
  activityTypes: 1-3 ilgi alani, tekrarsiz. Bos ya da 4+ -> 400.
  Siralama host'un secim sirasidir; deste kovalari bu sirada doldurulur.
```

- [ ] **Step 2: `get-session.yml` / `preview.yml` / `find-venues.yml` dokümanlarını güncelle**

`get-session.yml` `docs:` bloğuna:

```
  activityTypes: oturumun secili alanlari (1-3).
  emptyActivityTypes: secili ama hic mekan uretmemis alanlar; BROWSING oncesi daima bos.
  venues[].activityType: mekanin geldigi alan; saglayici atfi cozulemediyse null.
```

`preview.yml` ve `find-venues.yml` `docs:` bloklarında `activityType` geçen satırları `activityTypes` olarak düzelt. `find-venues.yml`'a ekle:

```
  422 NoVenuesFound yalniz HICBIR aktiviteden mekan gelmediginde doner.
  Kismi sonuc (secilen 3 alandan 1'i bos) BASARIDIR; eksik alan emptyActivityTypes'ta bildirilir.
```

- [ ] **Step 3: `ARCHITECTURE.md` sağlayıcı bölümünü güncelle**

Sağlayıcılar bölümüne ekle:

```markdown
### Çoklu ilgi alanı ve bulk arama (B-9, 2026-09-04)

Bir oturum 1–3 ilgi alanı taşır. Google `searchNearby` `includedTypes` bir dizi kabul ettiği
için seçilen alanların türleri **tek** istekte birleşir: çoklu seçim ek kota harcamaz.

Üç bağlı karar:

1. **`rankPreference: DISTANCE`.** `maxResultCount` 20'de sert tavanlıdır. Popülarite
   sıralamasında şehir merkezinde kafe/bar, `hiking_area`/`museum` gibi seyrek türleri
   kesitin tamamen dışına itiyordu. Mesafe orta nokta ürününde zaten doğru eğilimdir.
   Bu karar **tek aktiviteli** destelerin içeriğini de değiştirir (bilinçli).
2. **Atıf `primaryType` + `types`'tan geri kurulur.** Bu iki alan Essentials katmanıdır;
   mask zaten Enterprise alanlar taşıdığından faturalama katmanını yükseltmezler. Çözülemeyen
   atıf `null` bırakılır — uydurulmaz.
3. **Foursquare kısmi kapsamayla arama yapmaz.** Orchestrator "ilk dolu sonuç kazanır"
   kuralını işletir; FSQ seçimin bir kısmını servis ederse Google devre dışı kalır ve kullanıcı
   seçtiği bir alandan hiç mekân görmez.

Deste, aktivite kovalarından round-robin doldurulur (`DeckFlow.balanced`). **Telafi çağrısı
yoktur**: bir alandan hiç mekân gelmezse ikinci istek atılmaz, durum `SessionView
.emptyActivityTypes` ile bildirilir (Places bütçesi sınırlı — kullanıcı kararı 2026-09-04).
```

- [ ] **Step 4: Doğrula**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o clean test
```

Expected: BUILD SUCCESS. Ardından W-8 için sözleşme hazır:

```bash
pnpm codegen
```

- [ ] **Step 5: Commit (kullanıcı yapar)**

Birlikte: 4 Bruno dosyası + `ARCHITECTURE.md`. Mesaj: `docs(api): bruno + architecture for multi-activity bulk search`

---

## Bitirme kontrolü

- [ ] `mvn -o clean test` yeşil
- [ ] `V8` migration'ı boş bir veritabanında ve dolu bir kopyada koştu
- [ ] `pnpm codegen` çalıştı; `frontend/shared/openapi.json` `activityTypes` içeriyor
- [ ] `emptyActivityTypes` yalnız `BROWSING` ve sonrasında dolabiliyor
- [ ] Tek aktiviteli oturum hâlâ çalışıyor (geriye dönük: CSV tek elemanlı)
- [ ] `MeController` / `UserProfile.defaultActivity` **tekil** kaldı
