# v3 Ürün Cilası — Backend (B-15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mağaza kapısı (B-14) kapandıktan sonra v3 tasarımını besleyen beş küçük sözleşme: veri dışa aktarma (`GET /api/me/export`), mekân kartının "neyle bilinir" satırı (`VenueDto.tagline`), presence 2.0 (`lastSeenAt`, `linkOpenedAt`, dürt), 5 haneli oturum kodu (`SessionView.joinCode`, `GET /api/sessions/by-code/{code}`) ve davet OG kartı (`GET /og/{slug}.png`).

**Architecture:** Beşi de mevcut hexagonal düzene oturur, yeni katman açılmaz. `tagline` sağlayıcıda **türetilir** (`domain/venue/Taglines`, saf) ve `venues.tagline`/`tagline_source`'ta saklanır — ek ücretli çağrı yok, aynı FSQ Premium yanıtına `tips` alanı eklenir. Presence damgaları **kalıcıdır** (`participants.last_seen_at`, `link_opened_at`): süreç içi `InMemoryPresence` 2 sn'lik grace penceresinden sonra koltuğu budar, "Son görülen · 12:38" onun üstüne yazılamaz. Dürt kotası süreç içi (`adapter/out/presence/InMemoryNudgeCooldown`, presence ile aynı sınıf borç). Oturum kodu `sessions.join_code` üstünde tekildir; `slug` sözleşmesi **değişmez**. OG PNG saf JDK ile çizilir (`java.awt`, yeni bağımlılık yok), `adapter/out/image` altında `OgImagePort` arkasında.

**Tech Stack:** Spring Boot 4.1 (Spring 7, Jackson 3), JPA/Flyway/Postgres, Caffeine, bucket4j, Unirest 4 (+ mocks), `java.awt`/`ImageIO` (JDK), JUnit 5, AssertJ, Mockito, MockMvc, Testcontainers Postgres (`postgis/postgis:16-3.4`), ArchUnit.

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` — §2 sözleşme kararları (bağlayıcı), §3 backend, §4 paket B-15. Gereksinimler: **R-B6** (dışa aktarma), **R-B7** (`tagline`), **R-B8** (presence 2.0 + dürt), **R-B9** (oturum kodu), **R-B10** (OG kartı). Ham analiz: `req/backend.md` §2.

**UI Kaynağı:** Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36` (`Web Ekranlar v3.dc.html`, `Mobil Ekranlar v3.dc.html`, `Mobil Onboarding, İzinler ve Yasal.dc.html`). Beslenen artboard'lar: **P6** (Lobi — "Ayşe çevrimdışı"), **P11** (Mekanlar grup — saat + "neyle bilinir"), **P2** (Oturumlar boş — davet kod/link kartı), **W6d** (Gönderildi 1280 — presence + dürt), **W10b** (Çevrimdışı 1280 — son görülen), **W8/P21** (Karar + sonuç kartı paylaşımı → OG), **O8/W13** (Hesap ve veriler → "Veri"). Bu plan **hiç UI üretmez**; artboard'lar yalnız alan gereksinimini sabitler.

**Ön koşul:** **B-14 done** (V13–V16: `apple_sub`/`auth_providers`, `deleted_at`/`purge_after`, `reports`+`blocks`, `user_consents`). Bu plan V17/V18'i alır ve `ParticipantDto.blocked` alanının **zaten var olduğunu** varsayar (T5). Doğrulama (backend kökünden): `ls src/main/resources/db/migration | sort | tail -6` → `V13`…`V16` var, `V17`/`V18` yok; `grep -c blocked src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java` ≥ 1. Değilse **DUR**, B-14'ü bekle.

**Bağlayıcı kurallar (AGENTS.md + ARCHITECTURE.md):**

- **Git yazma işlemi YOK.** Her görevin sonunda "Commit" adımı yerine değişen dosya listesi bırakılır; kullanıcı commit'ler.
- Test komutu (backend kökünden, önek ZORUNLU): `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true mvn -o test -Dtest=<Sınıf>` — aşağıda kısaca `MVN_TEST <Sınıf>`. **Yeni Maven bağımlılığı eklenmez**, `-o` kalır.
- **Kod blokları `package`/`import` satırlarını taşımaz**: paket yolu **Files** listesindeki tam dosya yolundan, import'lar bloktaki tiplerin paketlerinden okunur. Alışılmadık olanlar ayrıca `Import:` satırıyla verilir.
- Test bloklarında sınıf iskeleti (alanlar, `@BeforeEach`, `mvc`/`assemble`/`createSession` gibi yardımcılar) **komşu test dosyasından birebir kopyalanır**; yeni test altyapısı kurulmaz.
- Domain paketinde Spring/Jakarta/Unirest/`java.awt` **yok** (ArchUnit `HexagonalArchitectureTest`).
- Her yeni/değişen HTTP ucu Bruno'ya girer (`backend/.infra/bumpinto-collection/`).
- §2 adları **değiştirilmez**: `tagline`, `taglineSource`, `lastSeenAt`, `linkOpenedAt`, `nudged{fromParticipantId,toParticipantId}`, `joinCode`, `/api/sessions/by-code/{code}`, `/api/me/export`, `/og/{slug}.png`.
- Flyway: **V17 = venues.tagline**, **V18 = participants.last_seen_at/link_opened_at + sessions.join_code** (INDEX kural 9).
- Record'a alan eklerken **mevcut imza convenience ctor olarak korunur** (repo deseni: `Venue`, `Session`, `VenueCandidate`) — çağrı yerleri kırılmaz.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `V17__venue_tagline.sql`, `domain/venue/{TaglineSource,Taglines}` (+Test), `Venue`, `VenueCandidate` | T1 | Tagline türetme |
| `VenueEntity`, `DeckStoreAdapter`, `application/deck/DeckFlow` | T1 | Kalıcılık + deste |
| `adapter/out/foursquare/FoursquareVenueSource` (+Test), `adapter/out/open/OpenVenueSource`, `ApiDtos.VenueDto`, `SessionViewAssembler` (+Test) | T2 | `tips`, OSM türevi, DTO |
| `domain/port/UserDataPort`, `adapter/out/persistence/UserDataAdapter`, `application/user/UserDataExport` (+Test) | T3 | Dışa aktarma verisi |
| `MeController`, `ApiDtos.ExportResponse`, `infra/security/RateLimitFilter` (+Test) | T3 | Uç + 1/saat kova |
| `V18__presence_stamps_and_join_code.sql`, `domain/port/PresenceStampsPort`, `adapter/out/persistence/PresenceStampsAdapter` (+Test) | T4 | Damga sütunları |
| `application/text/Ids` (+Test), `domain/session/Session`, `SessionEntity`, `SessionRepository`, `SessionStoreAdapter`, `SessionStorePort`, `SessionCommands`, `FakeStores` | T4 | Join code üretimi |
| `PresenceListener`, `SessionController`, `SessionViewAssembler`, `PointsController`, `ApiDtos.ParticipantDto` (+3 test) | T5 | `lastSeenAt`, `linkOpenedAt` |
| `domain/port/{NudgeCooldownPort,SessionEvent}`, `adapter/out/presence/InMemoryNudgeCooldown` (+Test), `application/session/NudgeCommands` (+Test), `NudgeController`, `TooManyRequestsException`, `ApiExceptionHandler` | T6 | Dürt |
| `SessionStorePort`, `SessionStoreAdapter`, `SessionQueries`, `SessionController`, `ApiDtos.SessionView`, `SessionViewAssembler`, `SecurityConfig`, `RateLimitFilter` | T7 | `joinCode` + `by-code` |
| `domain/og/OgCard`, `domain/port/OgImagePort`, `adapter/out/image/AwtOgImageRenderer` (+Test), `OgController` (+2 Test), `AppProps`, `application.yml`, `TestProps` | T8–T9 | OG PNG + meta |
| Bruno: `me/export.yml`, `sessions/{nudge,by-code,og-meta}.yml` | T3/T6/T7/T9 | Sözleşme örnekleri |
| `ARCHITECTURE.md`, `docs/CONFIGURATION.md`, `INDEX.md`, `openapi.json`, `api-types.ts` | T10 | Belge + sözleşme |

---

### Task 1: V17 + tagline türetme ve taşıma

**Files:**

- Create: `backend/src/main/resources/db/migration/V17__venue_tagline.sql`
- Create: `backend/src/main/java/com/bumpinto/domain/venue/{TaglineSource,Taglines}.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/venue/{Venue,VenueCandidate}.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/{VenueEntity,DeckStoreAdapter}.java`
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java`
- Test: `backend/src/test/java/com/bumpinto/domain/venue/TaglinesTest.java`

- [ ] **Step 1: Başarısız testi yaz**

```java
class TaglinesTest {

    @Test
    void firstUsableTipBecomesASingleSentenceUnderEightyChars() {
        assertThat(Taglines.fromTips(List.of(
                "Best flat white in town. Also they roast their own beans on Tuesdays.")))
                .isEqualTo("Best flat white in town");
    }

    @Test
    void longTipIsCutAtAWordBoundaryWithEllipsis() {
        String tip = "A very cosy corner place where the baristas remember your name and the "
                + "pastries are baked on site every single morning before seven";
        String out = Taglines.fromTips(List.of(tip));
        assertThat(out).hasSizeLessThanOrEqualTo(80).endsWith("…");
        assertThat(tip).startsWith(out.substring(0, out.length() - 1).strip());
    }

    @Test
    void spamAndTooShortTipsAreSkipped() {
        assertThat(Taglines.fromTips(List.of("ok", "visit https://spam.example", " "))).isNull();
        assertThat(Taglines.fromTips(null)).isNull();
    }

    @Test
    void openDataFallsBackToCategoryAndLocality() {
        assertThat(Taglines.fromCategory("espresso bar", "Eindhoven"))
                .isEqualTo("Espresso bar · Eindhoven");
        assertThat(Taglines.fromCategory("Bakery", null)).isEqualTo("Bakery");
        assertThat(Taglines.fromCategory("  ", "Eindhoven")).isNull();
    }
}
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör** — Run: `MVN_TEST TaglinesTest` · Expected: COMPILATION ERROR, `Taglines` yok.

- [ ] **Step 3: Domain türetmesini yaz**

`TaglineSource.java`:

```java
/** Tagline'in NEREDEN turedigi; UI atif satirini buna gore secer (§2: FSQ | OSM). */
public enum TaglineSource { FSQ, OSM }
```

`Taglines.java`:

```java
/**
 * "Neyle bilinir" tek satiri. Saf ve TURETICIDIR: sunucu metin uretmez, saglayicinin verdigini
 * kirpip temizler. Veri yoksa null doner ve istemci satiri hic cizmez (§4.9: bos etiket yasak).
 */
public final class Taglines {

    static final int MAX = 80;
    /** Bundan kisa bir ipucu ("nice", "ok") bilgi tasimaz, gurultudur. */
    private static final int MIN = 12;

    private Taglines() {
    }

    /** FSQ {@code tips[].text}: ilk KULLANILABILIR ipucunun ilk cumlesi. */
    public static String fromTips(List<String> tips) {
        if (tips == null) {
            return null;
        }
        for (String tip : tips) {
            String candidate = firstSentence(tip);
            if (candidate != null) {
                return candidate;
            }
        }
        return null;
    }

    /** Acik veri (OSM/Overture) turevi: "Espresso bar · Eindhoven". Kategori yoksa null. */
    public static String fromCategory(String category, String locality) {
        if (category == null || category.isBlank()) {
            return null;
        }
        String head = capitalize(collapse(category));
        String tail = locality == null || locality.isBlank() ? null : collapse(locality);
        return clamp(tail == null ? head : head + " · " + tail);
    }

    private static String firstSentence(String raw) {
        if (raw == null) {
            return null;
        }
        String text = collapse(raw);
        // Baglanti/etiket tasiyan ipucu reklamdir; kart metnine girmez.
        if (text.contains("http") || text.contains("@") || text.contains("www.")) {
            return null;
        }
        int end = text.length();
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '.' || c == '!' || c == '?') {
                end = i;
                break;
            }
        }
        String sentence = text.substring(0, end).strip();
        return sentence.length() < MIN ? null : clamp(sentence);
    }

    /** Kontrol karakteri ve tekrarli bosluk temizligi (Texts ile ayni ruh, saf hali). */
    private static String collapse(String raw) {
        return raw.replaceAll("[\\p{Cntrl}\\s]+", " ").strip();
    }

    private static String capitalize(String s) {
        return s.isEmpty() ? s : s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1);
    }

    /** 80 KARAKTER SERT SINIR (R-B7 kabul a): kelime sinirinda kesilir, "…" eklenir. */
    static String clamp(String s) {
        if (s.length() <= MAX) {
            return s;
        }
        String cut = s.substring(0, MAX - 1);
        int space = cut.lastIndexOf(' ');
        return (space > MAX / 2 ? cut.substring(0, space) : cut).stripTrailing() + "…";
    }
}
```

Import: `java.util.List`, `java.util.Locale`.

- [ ] **Step 4: Testi çalıştır** — Run: `MVN_TEST TaglinesTest` · Expected: `Tests run: 4, Failures: 0`.

- [ ] **Step 5: Migration'ı yaz** — `V17__venue_tagline.sql`:

```sql
-- R-B7: "neyle bilinir" satiri. Kaynak da saklanir: FSQ ipucu ile acik veri turevi ayni alani
-- doldurur ama UI'da farkli atif gerektirir (Powered by Foursquare / OSM).
alter table venues add column tagline text;
alter table venues add column tagline_source text;
alter table venues add constraint venues_tagline_source_check
    check (tagline_source is null or tagline_source in ('FSQ', 'OSM'));
alter table venues add constraint venues_tagline_len_check
    check (tagline is null or char_length(tagline) <= 80);
```

- [ ] **Step 6: Domain kayıtlarına alanları ekle**

`Venue.java` — kanonik ctor'un **sonuna** iki alan; mevcut 20 argümanlı imza convenience ctor olur:

```java
                    Double popularity, Integer ratingScale, String photoRef,
                    /** "Neyle bilinir" tek satiri (R-B7); veri yoksa null. */
                    String tagline, TaglineSource taglineSource) {

    /** Tagline'siz zenginlestirilmis mekan (B-13 imzasi; cagri yerleri kirilmaz). */
    public Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                 GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                 int deckOrder, String category, String address, String locality,
                 Integer ratingCount, String hoursToday, String placeLink,
                 ActivityType activityType, Double popularity, Integer ratingScale,
                 String photoRef) {
        this(id, sessionId, provider, externalId, name, location, rating, priceLevel, photoUrl,
                deckOrder, category, address, locality, ratingCount, hoursToday, placeLink,
                activityType, popularity, ratingScale, photoRef, null, null);
    }
```

Mevcut 10 argümanlı ctor 10 yerine 12 `null` ile biter; `withDeckOrder` sonuna `tagline, taglineSource`.

`VenueCandidate.java` — aynı desen: kanonik ctor sonuna `String tagline, TaglineSource taglineSource`; mevcut 17 argümanlı imza convenience ctor olur ve iki `null` geçer; 7 argümanlı kısa ctor 12 yerine 14 `null` ile biter. Javadoc'a: `@param tagline "neyle bilinir" tek satiri (<=80); saglayici veremezse null` ve `@param taglineSource kaynagi; tagline null ise null`.

- [ ] **Step 7: Kalıcılığa ve desteye taşı**

`VenueEntity` — `Instant fetchedAt;` satırından ÖNCE `String tagline;` ve `String taglineSource;`.

`DeckStoreAdapter.saveVenues` — `e.photoRef = v.photoRef();` sonrası:

```java
            e.tagline = v.tagline();
            e.taglineSource = v.taglineSource() == null ? null : v.taglineSource().name();
```

`DeckStoreAdapter.venuesOf` — `new Venue(...)` son argümanı `e.photoRef` idi:

```java
                        e.photoRef, e.tagline,
                        e.taglineSource == null ? null : TaglineSource.valueOf(e.taglineSource)))
```

`DeckFlow` — `new Venue(...)` sonu `c.photoRef()` idi; `c.photoRef(), c.tagline(), c.taglineSource()` olur. Import (iki dosyada): `com.bumpinto.domain.venue.TaglineSource`.

- [ ] **Step 8: Testleri çalıştır** — Run: `MVN_TEST TaglinesTest` · `MVN_TEST StoreAdapterTest` · `MVN_TEST DeckFlowTest` → yeşil (yeni sütunlar nullable). Olası düşme: `venues_tagline_len_check` — sağlayıcıda `Taglines.clamp` atlanmıştır (T2).

- [ ] **Step 9: Değişen dosyaları listele** — `V17__venue_tagline.sql`, `TaglineSource.java`, `Taglines.java`, `TaglinesTest.java`, `Venue.java`, `VenueCandidate.java`, `VenueEntity.java`, `DeckStoreAdapter.java`, `DeckFlow.java`. Mesaj: `feat(venue): tagline derivation, V17 columns, deck plumbing`.

---

### Task 2: Sağlayıcılarda tagline + `VenueDto.tagline`/`taglineSource`

**Files:**

- Modify: `backend/src/main/java/com/bumpinto/adapter/out/foursquare/FoursquareVenueSource.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/open/OpenVenueSource.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/{ApiDtos,SessionViewAssembler}.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/provider/FoursquareVenueProviderTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionViewAssemblerTest.java`

- [ ] **Step 1: Başarısız testleri yaz** — `FoursquareVenueProviderTest`'e (`searchWith` = dosyadaki mevcut Unirest `MockClient` kurulumunun yardımcıya alınmış hâli):

```java
    @Test
    void tipsFieldBecomesTaglineAndIsNullToleratedWhenAbsent() {
        String body = """
                {"results":[
                  {"fsq_place_id":"a1","name":"Kaffee","latitude":51.4,"longitude":5.4,
                   "tips":[{"text":"Best flat white in town. Roasted on site."}]},
                  {"fsq_place_id":"a2","name":"Tea","latitude":51.5,"longitude":5.5}
                ]}""";
        List<VenueCandidate> out = searchWith(body);
        assertThat(out.get(0).tagline()).isEqualTo("Best flat white in town");
        assertThat(out.get(0).taglineSource()).isEqualTo(TaglineSource.FSQ);
        assertThat(out.get(1).tagline()).isNull();
        assertThat(out.get(1).taglineSource()).isNull();
    }
```

`SessionViewAssemblerTest`'e (`session()`/`assemble(...)` dosyanın mevcut yardımcıları):

```java
    @Test
    void taglineAndSourceReachTheVenueDto() {
        Venue v = new Venue(UUID.randomUUID(), UUID.randomUUID(), "foursquare", "x", "Kaffee",
                new GeoPoint(51.4, 5.4), 8.4, 2, null, 0, "Coffee shop", null, "Eindhoven",
                12, null, null, ActivityType.COFFEE, 0.9, 10, null,
                "Best flat white in town", TaglineSource.FSQ);
        ApiDtos.VenueDto dto = assemble(session(), List.of(v)).venues().get(0);
        assertThat(dto.tagline()).isEqualTo("Best flat white in town");
        assertThat(dto.taglineSource()).isEqualTo(TaglineSource.FSQ);
    }
```

- [ ] **Step 2: Testleri çalıştır, düştüğünü gör** — Run: `MVN_TEST FoursquareVenueProviderTest` · Expected: COMPILATION ERROR, `tagline()` yok.

- [ ] **Step 3: FSQ `tips` alanını aynı çağrıya ekle** — `FIELDS` sonuna `,tips` (ek istek DEĞİL, aynı `/places/search` yanıtı — maliyet değişmez):

```java
    private static final String FIELDS = "fsq_place_id,name,latitude,longitude,categories,"
            + "location,website,hours,rating,price,popularity,photos,closed_bucket,tips";
```

`toCandidate` gövdesinin başına `String tagline = tagline(place);`; son argümanı (`photo == null ? null : ...text(photo, "id")`) sonrasına `tagline, tagline == null ? null : TaglineSource.FSQ);`. Yardımcı:

```java
    /**
     * {@code tips} Premium yanitinda GELMEYEBILIR (anahtar/plan farki): alan yoksa null doner ve
     * kart satiri hic cizilmez. Sozlesme null-TOLERELIDIR — eksik alan hata degildir (§5 risk 4).
     */
    private static String tagline(JSONObject place) {
        JSONArray tips = place.optJSONArray("tips");
        if (tips == null) {
            return null;
        }
        List<String> texts = new ArrayList<>(tips.length());
        for (int i = 0; i < tips.length(); i++) {
            JSONObject tip = tips.optJSONObject(i);
            if (tip != null) {
                texts.add(tip.optString("text", ""));
            }
        }
        return Taglines.fromTips(texts);
    }
```

Import: `com.bumpinto.domain.venue.{TaglineSource,Taglines}`.

- [ ] **Step 4: Açık kaynakta kategori türevini bağla** — `OpenVenueSource.toCandidate` son üç argümanı `null, null, null` idi:

```java
    private VenueCandidate toCandidate(OpenVenueRow row, List<ActivityType> requested) {
        String tagline = Taglines.fromCategory(row.getCategory(), row.getLocality());
        return new VenueCandidate(ID, row.getId(), row.getName(),
                new GeoPoint(row.getLat(), row.getLng()),
                null, null, row.getPhotoUrl(), row.getCategory(), row.getAddress(),
                row.getLocality(), null, row.getOpeningHours(), row.getWebsite(),
                attribution(row, requested), null, null, null,
                tagline, tagline == null ? null : TaglineSource.OSM);
    }
```

- [ ] **Step 5: DTO ve assembler** — `ApiDtos.VenueDto` son alanı `List<TravelDto> travel` idi:

```java
                           Double popularity, Integer ratingScale, List<TravelDto> travel,
                           /** "Neyle bilinir" tek satiri (<=80); veri yoksa null, UI gizler. */
                           String tagline, TaglineSource taglineSource) {
```

`SessionViewAssembler` — `new ApiDtos.VenueDto(...)` son argümanı `v.popularity(), v.ratingScale(), travel, v.tagline(), v.taglineSource()));`. Import (iki dosyada): `com.bumpinto.domain.venue.TaglineSource`.

- [ ] **Step 6: Testleri çalıştır** — Run: `MVN_TEST FoursquareVenueProviderTest` · `MVN_TEST SessionViewAssemblerTest` → yeşil. Olası düşme: mock gövdesi `text` yerine başka anahtar kullanıyorsa `optString("text")` boş döner; gerçek yanıt şekli `FoursquarePremiumContractTest` ile (env-gated) ölçülür.

- [ ] **Step 7: Değişen dosyaları listele** — `FoursquareVenueSource.java`, `OpenVenueSource.java`, `ApiDtos.java`, `SessionViewAssembler.java`, `FoursquareVenueProviderTest.java`, `SessionViewAssemblerTest.java`. Mesaj: `feat(venue): tagline from FSQ tips and open category, VenueDto fields`.

---

### Task 3: `GET /api/me/export` — veri dışa aktarma (R-B6)

**Files:**

- Create: `backend/src/main/java/com/bumpinto/domain/port/UserDataPort.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/UserDataAdapter.java`
- Create: `backend/src/main/java/com/bumpinto/application/user/UserDataExport.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/{ParticipantRepository,SwipeRepository,VoteRepository}.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/{ApiDtos,MeController}.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/RateLimitFilter.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`
- Test: `backend/src/test/java/com/bumpinto/application/user/UserDataExportTest.java`
- Test: `backend/src/test/java/com/bumpinto/infra/security/RateLimitFilterTest.java`
- Create: `backend/.infra/bumpinto-collection/me/export.yml`

- [ ] **Step 1: Başarısız testi yaz**

```java
class UserDataExportTest {

    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");
    static final UUID ME = UUID.randomUUID();

    private UserDataExport export(List<UserDataPort.Participation> rows) {
        FakeStores.InMemoryUserStore users = new FakeStores.InMemoryUserStore();
        users.save(ME, "ayse@example.com", "Ayşe");
        UserDataPort data = userId -> ME.equals(userId) ? rows : List.of();
        return new UserDataExport(users, data, Clock.fixed(T0, ZoneOffset.UTC));
    }

    @Test
    void coordinatesAreRoundedAndLocationlessSeatsCarryNone() {
        UserDataExport.Export out = export(List.of(
                new UserDataPort.Participation("abc12345", "Cuma kahvesi", true, T0, "Ayşe",
                        new GeoPoint(51.441642, 5.469722), "Eindhoven", TravelMode.BIKE, 7, 3, true),
                new UserDataPort.Participation("def67890", null, false, T0, "Ayşe",
                        null, null, TravelMode.CAR, 0, 0, false))).of(ME);

        UserDataExport.Participation located = out.participations().get(0);
        assertThat(located.lat()).isEqualTo(51.44);
        assertThat(located.lng()).isEqualTo(5.47);
        assertThat(located.likes()).isEqualTo(7);
        assertThat(out.participations().get(1).lat()).isNull();
        assertThat(out.participations().get(1).lng()).isNull();
        assertThat(out.exportedAt()).isEqualTo(T0);
        assertThat(out.profile().email()).isEqualTo("ayse@example.com");
    }
}
```

> `FakeStores.InMemoryUserStore` yoksa dosyadaki fake deseniyle `UserStorePort`'u karşılayan (`save(...)`, `profileOf(...)`) bir sınıf eklenir.

- [ ] **Step 2: Testi çalıştır, düştüğünü gör** — Run: `MVN_TEST UserDataExportTest` · Expected: COMPILATION ERROR, `UserDataPort`/`UserDataExport` yok.

- [ ] **Step 3: Portu ve uygulama servisini yaz**

`UserDataPort.java`:

```java
/**
 * GDPR tasinabilirligi (R-B6): kisinin KENDI koltuklari. Baskasinin adi, konumu ya da oyu bu
 * porttan HIC gecmez — dis aktarma bir oturum dokumu degil, kisinin kendi izidir.
 */
@FunctionalInterface
public interface UserDataPort {

    record Participation(String sessionSlug, String sessionName, boolean host, Instant joinedAt,
                         String displayName, GeoPoint location, String locationLabel,
                         TravelMode travelMode, long likes, long passes, boolean voted) {
    }

    List<Participation> participationsOf(UUID userId);
}
```

`UserDataExport.java`:

```java
/**
 * Tek istekte tasinabilir JSON. Konum YUVARLANIR (2 ondalik, ~1.1 km): dosya paylasilabilir bir
 * artefakttir; icinde ev adresi hassasiyetinde koordinat tasimasi gereksiz risktir.
 */
@Service
public class UserDataExport {

    public record Profile(String email, String displayName, String language,
                          String defaultActivity, String defaultTravelMode,
                          Double defaultLat, Double defaultLng, String defaultLocationLabel) {
    }

    public record Participation(String sessionSlug, String sessionName, boolean host,
                                Instant joinedAt, String displayName, Double lat, Double lng,
                                String locationLabel, TravelMode travelMode,
                                long likes, long passes, boolean voted) {
    }

    public record Export(Instant exportedAt, Profile profile, List<Participation> participations) {
    }

    private final UserStorePort users;
    private final UserDataPort data;
    private final Clock clock;

    public UserDataExport(UserStorePort users, UserDataPort data, Clock clock) {
        this.users = users;
        this.data = data;
        this.clock = clock;
    }

    public Export of(UUID userId) {
        UserProfile p = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        GeoPoint home = p.defaultLocation() == null ? null
                : TravelMinutes.approx(p.defaultLocation());
        Profile profile = new Profile(p.email(), p.name(), p.language(),
                p.defaultActivity() == null ? null : p.defaultActivity().name(),
                p.defaultTravelMode() == null ? null : p.defaultTravelMode().name(),
                home == null ? null : home.lat(), home == null ? null : home.lng(),
                p.defaultLocationLabel());
        return new Export(clock.instant(), profile,
                data.participationsOf(userId).stream().map(UserDataExport::toRow).toList());
    }

    private static Participation toRow(UserDataPort.Participation r) {
        GeoPoint rounded = r.location() == null ? null : TravelMinutes.approx(r.location());
        return new Participation(r.sessionSlug(), r.sessionName(), r.host(), r.joinedAt(),
                r.displayName(), rounded == null ? null : rounded.lat(),
                rounded == null ? null : rounded.lng(), r.locationLabel(), r.travelMode(),
                r.likes(), r.passes(), r.voted());
    }
}
```

> `UserProfile` erişimcileri (`name()`, `language()`, `defaultActivity()`, `defaultTravelMode()`, `defaultLocation()`, `defaultLocationLabel()`) `MeController.toResponse`'tan birebir alındı; farklıysa oradaki adlar esastır.

- [ ] **Step 4: Testi çalıştır** — Run: `MVN_TEST UserDataExportTest` · Expected: `Tests run: 1, Failures: 0`.

- [ ] **Step 5: Kalıcılık adapterini yaz** — `ParticipantRepository`'ye:

```java
    @Query("""
            select p.sessionId, p.id, s.slug, s.name, p.isHost, p.joinedAt, p.displayName,
                   p.lat, p.lng, p.locationLabel, p.travelMode
            from ParticipantEntity p, SessionEntity s
            where s.id = p.sessionId and p.userId = :userId
            order by p.joinedAt desc""")
    List<Object[]> exportRowsOf(UUID userId);
```

`SwipeRepository`'ye `List<SwipeEntity> findByParticipantIdIn(Collection<UUID> ids);`, `VoteRepository`'ye `List<VoteEntity> findByParticipantIdIn(Collection<UUID> ids);`.

`UserDataAdapter.java`:

```java
/** Sayimlar TEK sorguda toplanir: koltuk basina ayri sorgu 20 oturumda 40 gidis donus demekti. */
@Component
class UserDataAdapter implements UserDataPort {

    private final ParticipantRepository participants;
    private final SwipeRepository swipes;
    private final VoteRepository votes;

    UserDataAdapter(ParticipantRepository participants, SwipeRepository swipes,
                    VoteRepository votes) {
        this.participants = participants;
        this.swipes = swipes;
        this.votes = votes;
    }

    @Override public List<Participation> participationsOf(UUID userId) {
        List<Object[]> rows = participants.exportRowsOf(userId);
        Set<UUID> seatIds = rows.stream().map(r -> (UUID) r[1]).collect(Collectors.toSet());
        if (seatIds.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<SwipeEntity>> bySeat = swipes.findByParticipantIdIn(seatIds).stream()
                .collect(Collectors.groupingBy(s -> s.participantId));
        Set<UUID> votedSeats = votes.findByParticipantIdIn(seatIds).stream()
                .map(v -> v.participantId).collect(Collectors.toSet());
        List<Participation> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            UUID seatId = (UUID) r[1];
            List<SwipeEntity> mine = bySeat.getOrDefault(seatId, List.of());
            Double lat = (Double) r[7];
            Double lng = (Double) r[8];
            out.add(new Participation((String) r[2], (String) r[3], (boolean) r[4],
                    (Instant) r[5], (String) r[6],
                    lat == null || lng == null ? null : new GeoPoint(lat, lng),
                    (String) r[9], TravelMode.valueOf((String) r[10]),
                    mine.stream().filter(s -> s.liked).count(),
                    mine.stream().filter(s -> !s.liked).count(),
                    votedSeats.contains(seatId)));
        }
        return out;
    }
}
```

- [ ] **Step 6: Ucu ve hız sınırını yaz** — `ApiDtos`'a:

```java
    /** GDPR tasinabilirlik dosyasinin govdesi; konumlar YUVARLANMISTIR (~1.1 km). */
    public record ExportResponse(Instant exportedAt, UserDataExport.Profile profile,
                                 List<UserDataExport.Participation> participations) {
    }
```

`MeController` — ctor'a `UserDataExport exports`:

```java
    /**
     * Tek istek, indirilebilir dosya. Hiz siniri RateLimitFilter'dadir (1/saat): burada ikinci
     * bir kova tutmak ayni kurali iki yerde yasatirdi.
     */
    @GetMapping("/export")
    ResponseEntity<ApiDtos.ExportResponse> export(@AuthenticationPrincipal Jwt jwt) {
        UserDataExport.Export data = exports.of(WebPrincipals.accountId(jwt));
        String filename = "bumpinto-export-" + data.exportedAt().toString().substring(0, 10) + ".json";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(new ApiDtos.ExportResponse(data.exportedAt(), data.profile(),
                        data.participations()));
    }
```

Import: `org.springframework.http.{HttpHeaders,ResponseEntity}`, `com.bumpinto.application.user.UserDataExport`.

`RateLimitFilter` — `Policy` pencere kazanır (bugüne kadar hepsi 1 dakikaydı; 1/saat bunu kırıyor); anahtar ve kova pencereyi taşır:

```java
    /** capacity = {@code window} basina istek hakki (greedy refill). */
    public record Policy(String id, String method, Pattern path, int capacity, Duration window) {

        /** Varsayilan pencere 1 dakika: mevcut politikalarin hepsi boyleydi. */
        public Policy(String id, String method, Pattern path, int capacity) {
            this(id, method, path, capacity, Duration.ofMinutes(1));
        }
    }
```

```java
    private static Bucket newBucket(String key) {
        String[] parts = key.split(":", 3);
        int capacity = Integer.parseInt(parts[0]);
        Duration window = Duration.ofSeconds(Long.parseLong(parts[1]));
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(capacity).refillGreedy(capacity, window))
                .build();
    }
```

`doFilterInternal` içindeki anahtar: `String key = match.capacity() + ":" + match.window().toSeconds() + ":" + match.id() + ":" + clientIp(request);`

`defaultPolicies()` içine (`api` catch-all'dan ÖNCE):

```java
                // R-B6: dis aktarma 1/saat. Dakikalik bir kural burada 60 dosya/saat demekti.
                new Policy("export", "GET", Pattern.compile("^/api/me/export$"), 1,
                        Duration.ofHours(1)),
```

`RateLimitFilterTest`'e (dosyadaki mevcut `MockHttpServletRequest/Response` kurulumuyla; `status(...)` o kurulumun yardımcısı):

```java
    @Test
    void exportBucketRefillsHourlyNotEveryMinute() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(
                List.of(new RateLimitFilter.Policy("export", "GET",
                        Pattern.compile("^/api/me/export$"), 1, Duration.ofHours(1))), false);
        assertThat(status(filter, "GET", "/api/me/export")).isEqualTo(200);
        assertThat(status(filter, "GET", "/api/me/export")).isEqualTo(429);
    }
```

- [ ] **Step 7: Testleri çalıştır** — Run: `MVN_TEST RateLimitFilterTest` (eski 4 argümanlı ctor hâlâ derlenir) · `MVN_TEST UserDataExportTest` · `MVN_TEST AccountApiTest` → yeşil.

- [ ] **Step 8: Bruno isteğini ekle** — `backend/.infra/bumpinto-collection/me/export.yml`:

```yaml
info:
  name: Export My Data
  type: http
  seq: 3

http:
  method: GET
  url: "{{baseUrl}}/api/me/export"
  auth:
    type: bearer
    token: "{{accessToken}}"

runtime:
  scripts:
    - type: tests
      code: |-
        test("200 ve attachment", function() {
          expect(res.status).to.equal(200);
          expect(res.headers["content-disposition"]).to.include("attachment");
        });

docs:
  type: text/markdown
  content: |-
    GDPR tasinabilirligi (R-B6). Tek istek, `Content-Disposition: attachment`.
    Hiz siniri **1/saat/IP** — ikinci cagri 429. Konumlar 2 ondalik YUVARLANMISTIR (~1.1 km);
    baskasinin verisi govdede YOKTUR.
```

- [ ] **Step 9: Değişen dosyaları listele** — `UserDataPort.java`, `UserDataAdapter.java`, `UserDataExport.java`, `UserDataExportTest.java`, `ParticipantRepository.java`, `SwipeRepository.java`, `VoteRepository.java`, `ApiDtos.java`, `MeController.java`, `RateLimitFilter.java`, `RateLimitFilterTest.java`, `FakeStores.java`, `me/export.yml`. Mesaj: `feat(me): GET /api/me/export with hourly rate limit`.

---

### Task 4: V18 — presence damgaları ve oturum kodu altyapısı

**Files:**

- Create: `backend/src/main/resources/db/migration/V18__presence_stamps_and_join_code.sql`
- Create: `backend/src/main/java/com/bumpinto/domain/port/PresenceStampsPort.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/PresenceStampsAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/application/text/Ids.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/session/Session.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/port/SessionStorePort.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/{SessionEntity,SessionRepository,SessionStoreAdapter,ParticipantEntity,ParticipantRepository}.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`
- Test: `backend/src/test/java/com/bumpinto/application/text/IdsTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/persistence/PresenceStampsAdapterTest.java`

- [ ] **Step 1: Başarısız testleri yaz** — `IdsTest.java`:

```java
class IdsTest {

    @Test
    void joinCodeIsFiveCharsFromTheUnambiguousAlphabet() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 500; i++) {
            String code = Ids.joinCode();
            assertThat(code).hasSize(5).matches("[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}");
            seen.add(code);
        }
        assertThat(seen).hasSizeGreaterThan(450); // 31^5 uzayda 500 cekimde carpisma nadir
    }

    @Test
    void normalizeAcceptsLowercaseAndSeparatorsAndRejectsTheRest() {
        assertThat(Ids.normalizeJoinCode(" x7k-2m ")).isEqualTo("X7K2M");
        assertThat(Ids.normalizeJoinCode("x7k2")).isNull();
        assertThat(Ids.normalizeJoinCode("X7K2I")).isNull(); // I alfabede yok
        assertThat(Ids.normalizeJoinCode(null)).isNull();
    }
}
```

`PresenceStampsAdapterTest.java` — `StoreAdapterTest`'in `@DataJpaTest` + `PostgresContainer.shared()` kurulumu birebir kopyalanır (`seat()` oturum + katılımcı satırı yaratıp id döner, `sessionId` alanı testin kendi oturumu):

```java
    @Test
    void lastSeenIsOverwrittenButLinkOpenedIsWrittenOnlyOnce() {
        UUID seat = seat();
        Instant t1 = Instant.parse("2026-09-06T10:00:00Z");
        Instant t2 = t1.plusSeconds(600);
        stamps.markLinkOpened(seat, t1);
        stamps.markLinkOpened(seat, t2);
        stamps.touchLastSeen(seat, t1);
        stamps.touchLastSeen(seat, t2);
        PresenceStampsPort.Stamps out = stamps.stampsOf(sessionId).get(seat);
        assertThat(out.linkOpenedAt()).isEqualTo(t1);
        assertThat(out.lastSeenAt()).isEqualTo(t2);
    }

    @Test
    void unknownParticipantIsANoOpNotAnError() {
        stamps.touchLastSeen(UUID.randomUUID(), Instant.now());
        assertThat(stamps.stampsOf(UUID.randomUUID())).isEmpty();
    }
```

- [ ] **Step 2: Testleri çalıştır, düştüğünü gör** — Run: `MVN_TEST IdsTest` · Expected: COMPILATION ERROR, `joinCode` yok.

- [ ] **Step 3: Migration'ı yaz** — `V18__presence_stamps_and_join_code.sql`:

```sql
-- R-B8: presence damgalari KALICI. Surec ici presence (InMemoryPresence) 2 sn'lik grace
-- penceresinden sonra koltugu budar; "Son gorulen · 12:38" onun uzerine yazilamaz.
alter table participants add column last_seen_at timestamptz;
alter table participants add column link_opened_at timestamptz;

-- R-B9: 5 haneli oturum kodu; alfabe karisabilen I/O/0/1'i disarida birakir.
alter table sessions add column join_code text;
create unique index sessions_join_code_key on sessions (join_code);
alter table sessions add constraint sessions_join_code_shape_check
    check (join_code is null or join_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$');

-- Backfill: yalniz suresi DOLMAMIS oturumlar. Gecmis oturuma kod uretmek 31^5'lik uzayi bosuna
-- yerdi ve o oturuma kimse kodla katilamaz.
do $$
declare
    row_id uuid;
    candidate text;
begin
    for row_id in select id from sessions where expires_at > now() and join_code is null loop
        loop
            select string_agg(
                       substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                              floor(random() * 31)::int + 1, 1), '')
              into candidate
              from generate_series(1, 5);
            exit when not exists (select 1 from sessions where join_code = candidate);
        end loop;
        update sessions set join_code = candidate where id = row_id;
    end loop;
end $$;
```

- [ ] **Step 4: `Ids.joinCode` ve normalizasyonu yaz**

```java
    /**
     * Sesli okunabilen ve yanlis yazilamayan alfabe: I/O/0/1 YOK (§2). 31^5 ≈ 28,6 milyon kod;
     * tekillik DB'deki unique index ile garantilenir, burada degil.
     */
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    static final int CODE_LENGTH = 5;

    public static String joinCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    /**
     * Buyuk harf, bosluk/tire atilir. Alfabe DISI karakter (I, O, 0, 1 dahil) DUZELTILMEZ ->
     * null: "0" ile "O"nun hangisinin kastedildigi bilinemez, tahmin yanlis oturuma sokardi.
     */
    public static String normalizeJoinCode(String raw) {
        if (raw == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (char c : raw.toUpperCase(Locale.ROOT).toCharArray()) {
            if (c == ' ' || c == '-' || c == '_') {
                continue;
            }
            if (CODE_ALPHABET.indexOf(c) < 0 || sb.length() == CODE_LENGTH) {
                return null;
            }
            sb.append(c);
        }
        return sb.length() == CODE_LENGTH ? sb.toString() : null;
    }
```

Import: `java.util.Locale`.

- [ ] **Step 5: `Session.joinCode`'u taşı** — kanonik ctor'un sonuna `String joinCode`; **mevcut 15 argümanlı imza convenience ctor olur** (10 argümanlı ona zincirlenir); `withStatus`/`withMidpointLabel`/`decided`/`inRunoff` gövdelerinin sonuna `joinCode` eklenir:

```java
                      GeoPoint anchor,
                      /** 5 haneli davet kodu (R-B9); eski satirlarda ve backfill disinda null. */
                      String joinCode) {

    /** Kod ONCESI imza (B-14 ve oncesi cagri yerleri kirilmaz). */
    public Session(UUID id, String slug, UUID hostId, String name,
                   List<ActivityType> activityTypes, SessionType sessionType,
                   SessionStatus status, Instant expiresAt, UUID decidedVenueId,
                   List<UUID> runoffVenueIds, Instant decidedAt, DecisionKind decisionKind,
                   RunoffReason runoffReason, String midpointLabel, GeoPoint anchor) {
        this(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason,
                midpointLabel, anchor, null);
    }
```

`SessionEntity`'ye `String joinCode;`. `SessionRepository`'ye `Optional<SessionEntity> findByJoinCode(String joinCode);` ve `boolean existsByJoinCode(String joinCode);`. `SessionStoreAdapter.saveSession`'a `e.joinCode = s.joinCode();`, `toSession`'ın son argümanına `e.joinCode`. `SessionCommands.createSession`'daki `new Session(...)` çağrısının son argümanı (anchor'dan sonra) `store.freshJoinCode()` olur.

`SessionStorePort`'a `String freshJoinCode();` (javadoc: "Kullanilmamis bir davet kodu; carpisma nadirdir ama sessiz kalamaz — unique index atar"). `SessionStoreAdapter`:

```java
    /** Denemeler tukenirse ISTISNA atilir: kodsuz oturum acmak "kod ozelligi yok" demektir. */
    @Override public String freshJoinCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = Ids.joinCode();
            if (!sessions.existsByJoinCode(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("could not allocate a unique join code");
    }
```

`FakeStores.InMemorySessionStore`:

```java
        @Override public String freshJoinCode() {
            String candidate = Ids.joinCode();
            return sessions.values().stream().anyMatch(s -> candidate.equals(s.joinCode()))
                    ? freshJoinCode() : candidate;
        }
```

- [ ] **Step 6: Presence damgası portunu ve adapterini yaz** — `PresenceStampsPort.java`:

```java
/**
 * KALICI presence damgalari. {@code PresencePort} "su an burada mi"yi surec icinde tutar ve grace
 * penceresinden sonra koltugu unutur; "Son gorulen · 12:38" ise dun de dogru olmali.
 */
public interface PresenceStampsPort {

    record Stamps(Instant lastSeenAt, Instant linkOpenedAt) {
    }

    /** Her gelis/kopusta yazilir; bilinmeyen koltuk NO-OP'tur. */
    void touchLastSeen(UUID participantId, Instant at);

    /** YALNIZ ilk kez yazilir: "linki acti" ANIDIR, son ziyaret degil. */
    void markLinkOpened(UUID participantId, Instant at);

    Map<UUID, Stamps> stampsOf(UUID sessionId);
}
```

`ParticipantEntity`'ye `Instant lastSeenAt;` ve `Instant linkOpenedAt;`. `ParticipantRepository`'ye:

```java
    @Modifying
    @Query("update ParticipantEntity p set p.lastSeenAt = :at where p.id = :id")
    int touchLastSeen(UUID id, Instant at);

    @Modifying
    @Query("update ParticipantEntity p set p.linkOpenedAt = :at "
            + "where p.id = :id and p.linkOpenedAt is null")
    int markLinkOpened(UUID id, Instant at);
```

`PresenceStampsAdapter.java`:

```java
/**
 * REQUIRES_NEW: damga WS dinleyicisinden (transaction'siz) ve okuma uclarindan cagrilir;
 * cagiranin islemine iliserek onun rollback'inde kaybolmasi ya da onu kilitlemesi istenmez.
 */
@Component
class PresenceStampsAdapter implements PresenceStampsPort {

    private final ParticipantRepository participants;

    PresenceStampsAdapter(ParticipantRepository participants) {
        this.participants = participants;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void touchLastSeen(UUID participantId, Instant at) {
        participants.touchLastSeen(participantId, at);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markLinkOpened(UUID participantId, Instant at) {
        participants.markLinkOpened(participantId, at);
    }

    @Override
    public Map<UUID, Stamps> stampsOf(UUID sessionId) {
        return participants.findBySessionIdOrderByJoinedAtAscIdAsc(sessionId).stream()
                .filter(p -> p.lastSeenAt != null || p.linkOpenedAt != null)
                .collect(Collectors.toMap(p -> p.id, p -> new Stamps(p.lastSeenAt, p.linkOpenedAt)));
    }
}
```

Import: `org.springframework.data.jpa.repository.Modifying`, `org.springframework.transaction.annotation.{Propagation,Transactional}`.

- [ ] **Step 7: Testleri çalıştır** — Run: `MVN_TEST IdsTest` (2) · `MVN_TEST PresenceStampsAdapterTest` (2) · `MVN_TEST StoreAdapterTest` · `MVN_TEST SessionCommandsTest` → yeşil. Olası düşme: `@Modifying` sorgusu transaction'sız çağrılırsa `TransactionRequiredException` — adapterdeki `REQUIRES_NEW` eksiktir.

- [ ] **Step 8: Değişen dosyaları listele** — `V18__presence_stamps_and_join_code.sql`, `PresenceStampsPort.java`, `PresenceStampsAdapter.java`, `PresenceStampsAdapterTest.java`, `Ids.java`, `IdsTest.java`, `Session.java`, `SessionEntity.java`, `SessionRepository.java`, `SessionStoreAdapter.java`, `SessionStorePort.java`, `SessionCommands.java`, `ParticipantEntity.java`, `ParticipantRepository.java`, `FakeStores.java`. Mesaj: `feat(session): V18 presence stamps and join code storage`.

---

### Task 5: Presence 2.0 — `lastSeenAt` ve `linkOpenedAt` sözleşmede

**Files:**

- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/{ApiDtos,SessionViewAssembler,SessionController,PresenceListener,PointsController}.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/{SessionViewAssemblerTest,PresenceOverWebSocketTest,WebSecuritySliceTest}.java`

- [ ] **Step 1: Başarısız testleri yaz** — `SessionViewAssemblerTest`'e (sınıfa `PresenceStampsPort stamps = mock(PresenceStampsPort.class);` eklenir, assembler ctor'una 4. argüman verilir; `AYSE` dosyanın mevcut katılımcı id'si):

```java
    @Test
    void offlineParticipantCarriesLastSeenAndLinkOpenedStamps() {
        Instant seen = Instant.parse("2026-09-06T12:38:00Z");
        Instant opened = Instant.parse("2026-09-06T12:10:00Z");
        when(stamps.stampsOf(any())).thenReturn(Map.of(
                AYSE, new PresenceStampsPort.Stamps(seen, opened)));
        ApiDtos.ParticipantDto row = assemble(session(), List.of()).participants().stream()
                .filter(p -> p.id().equals(AYSE)).findFirst().orElseThrow();
        assertThat(row.online()).isFalse();
        assertThat(row.lastSeenAt()).isEqualTo(seen);
        assertThat(row.linkOpenedAt()).isEqualTo(opened);
    }

    @Test
    void participantWithoutStampsCarriesNulls() {
        when(stamps.stampsOf(any())).thenReturn(Map.of());
        ApiDtos.ParticipantDto row = assemble(session(), List.of()).participants().get(0);
        assertThat(row.lastSeenAt()).isNull();
        assertThat(row.linkOpenedAt()).isNull();
    }
```

`PresenceOverWebSocketTest`'e (gerçek STOMP istemcisiyle — untested-seam kuralı; `connectAs`/`awaitPresent`/`disconnect` dosyanın mevcut yardımcıları):

```java
    @Test
    void connectAndDisconnectStampLastSeenInTheDatabase() {
        connectAs(AYSE);
        awaitPresent(AYSE);
        disconnect();
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(stamps.stampsOf(SESSION_ID).get(AYSE).lastSeenAt()).isNotNull());
    }
```

- [ ] **Step 2: Testleri çalıştır, düştüğünü gör** — Run: `MVN_TEST SessionViewAssemblerTest` · Expected: COMPILATION ERROR, `lastSeenAt()` yok.

- [ ] **Step 3: DTO'ya iki alan ekle** — `ApiDtos.ParticipantDto`; B-14'ün eklediği `blocked` korunur, yeni alanlar SONA gelir:

```java
                                 /** Kendi ses konusuna abone (spec K4); SOLO'da daima false. */
                                 boolean inVoice,
                                 /** Goruntuleyen bu kisiyi engelledi mi (B-14). */
                                 boolean blocked,
                                 /** Son WS gelisi/kopusu; hic baglanmamissa null (R-B8). */
                                 Instant lastSeenAt,
                                 /** Daveti ILK actigi an; acmadiysa null. */
                                 Instant linkOpenedAt) {
```

> B-14 `blocked`'ı eklememişse o satır çıkarılır ve **B-14 önce koşulur** (ön koşul doğrulaması bunu yakalar).

- [ ] **Step 4: Assembler'ı bağla** — `SessionViewAssembler` ctor'una `PresenceStampsPort stamps` (4. parametre); `toView` içinde `Set<UUID> present = ...` satırından sonra `Map<UUID, PresenceStampsPort.Stamps> marks = stamps.stampsOf(snap.session().id());`; katılımcı eşlemesinin son argümanları:

```java
                        present.contains(p.id()),
                        room.map(r -> r.hasMember(p.id())).orElse(false),
                        blockedBy(viewer, p),   // B-14'ten gelen mevcut ifade; degistirilmez
                        marks.getOrDefault(p.id(), EMPTY_STAMPS).lastSeenAt(),
                        marks.getOrDefault(p.id(), EMPTY_STAMPS).linkOpenedAt()))
```

Sınıfa: `private static final PresenceStampsPort.Stamps EMPTY_STAMPS = new PresenceStampsPort.Stamps(null, null);`

`PointsController` — elle eklenen nokta soket açamaz, link de açmaz; son argümanlar:

```java
                // Elle eklenen nokta token tasimaz, soket asamaz → daima cevrimdisi ve ses disi.
                false, false, false, null, null));
```

- [ ] **Step 5: Damgaları yaz** — `PresenceListener` ctor'una `PresenceStampsPort stamps` + `Clock clock`; `apply(...)` içinde `change.accept(...)` satırından hemen sonra:

```java
        // Damga hem geliste hem kopusta yazilir: "son gorulen" kisinin en son BURADA oldugu andir
        // ve kopus ani onun ta kendisidir. InMemoryPresence 2 sn sonra koltugu budar, bu satir kalir.
        stamps.touchLastSeen(participantId, clock.instant());
```

`SessionController` — ctor'a `PresenceStampsPort stamps` + `Clock clock`; `view(...)` içinde `return response.body(...)` satırından önce `markLinkOpened(snapshot, auth);`; `preview` snapshot'ı bir kez alır:

```java
    @GetMapping("/{slug}/preview")
    ApiDtos.SessionPreview preview(@PathVariable String slug, Authentication auth) {
        SessionQueries.SessionSnapshot snapshot = queries.snapshot(slug);
        markLinkOpened(snapshot, auth);
        return assembler.toPreview(snapshot);
    }

    /**
     * "Linki acti" = davet ekranini (preview) ya da oturumu ILK KEZ actigi an. Anonim ziyaretcinin
     * koltugu yoktur ve damgalanacak satir da yoktur — sessizce atlanir. Yalniz ilk yazim tutar
     * (SQL'de {@code link_opened_at is null}); sonraki acilislar zamani ilerletmez.
     */
    private void markLinkOpened(SessionQueries.SessionSnapshot snapshot, Authentication auth) {
        UUID seat = WebPrincipals.seatOf(snapshot, auth).map(Participant::id)
                .orElseGet(() -> WebPrincipals.participantIdOrNull(auth));
        if (seat != null && snapshot.participants().stream().anyMatch(p -> p.id().equals(seat))) {
            stamps.markLinkOpened(seat, clock.instant());
        }
    }
```

- [ ] **Step 6: Testleri çalıştır** — Run: `MVN_TEST SessionViewAssemblerTest` · `MVN_TEST PresenceOverWebSocketTest` · `MVN_TEST ApiHappyPathTest` → yeşil. `MVN_TEST WebSecuritySliceTest` — ctor'lar değiştiği için `@MockitoBean PresenceStampsPort stamps;` eklenir.

- [ ] **Step 7: Değişen dosyaları listele** — `ApiDtos.java`, `SessionViewAssembler.java`, `SessionController.java`, `PresenceListener.java`, `PointsController.java`, `SessionViewAssemblerTest.java`, `PresenceOverWebSocketTest.java`, `WebSecuritySliceTest.java`. Mesaj: `feat(presence): lastSeenAt and linkOpenedAt on ParticipantDto`.

---

### Task 6: Dürt — `POST /api/sessions/{slug}/nudge/{participantId}`

**Files:**

- Create: `backend/src/main/java/com/bumpinto/domain/port/NudgeCooldownPort.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/presence/InMemoryNudgeCooldown.java`
- Create: `backend/src/main/java/com/bumpinto/application/error/TooManyRequestsException.java`
- Create: `backend/src/main/java/com/bumpinto/application/session/NudgeCommands.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/NudgeController.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/port/SessionEvent.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiExceptionHandler.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`
- Test: `backend/src/test/java/com/bumpinto/application/session/NudgeCommandsTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/presence/InMemoryNudgeCooldownTest.java`
- Create: `backend/.infra/bumpinto-collection/sessions/nudge.yml`

- [ ] **Step 1: Başarısız testi yaz**

```java
class NudgeCommandsTest {

    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");
    final FakeStores.InMemorySessionStore store = new FakeStores.InMemorySessionStore();
    final FakeStores.RecordingEvents events = new FakeStores.RecordingEvents();
    UUID sessionId;
    UUID mehmet;
    UUID ayse;
    NudgeCommands nudges;

    @BeforeEach
    void setUp() {
        Session s = store.saveSession(new Session(UUID.randomUUID(), "s1", UUID.randomUUID(),
                "Cuma", List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                T0.plusSeconds(3600), null, List.of()));
        sessionId = s.id();
        mehmet = seat("Mehmet", true, false);
        ayse = seat("Ayşe", false, false);
        Set<String> used = new HashSet<>();
        nudges = new NudgeCommands(store, events, (from, to, window) -> used.add(from + ":" + to),
                Clock.fixed(T0, ZoneOffset.UTC));
    }

    private UUID seat(String name, boolean host, boolean manual) {
        UUID id = UUID.randomUUID();
        store.saveParticipant(new Participant(id, sessionId, name, null, host, null, manual,
                null, TravelMode.CAR));
        return id;
    }

    @Test
    void nudgePublishesTheEventWithBothIds() {
        nudges.nudge("s1", mehmet, ayse);
        SessionEvent event = events.published.get("s1").get(0);
        assertThat(event.type()).isEqualTo("nudged");
        assertThat(event.payload()).containsEntry("fromParticipantId", mehmet.toString())
                .containsEntry("toParticipantId", ayse.toString());
    }

    @Test
    void secondNudgeWithinTheWindowIs429() {
        nudges.nudge("s1", mehmet, ayse);
        assertThatThrownBy(() -> nudges.nudge("s1", mehmet, ayse))
                .isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void nudgingYourselfAManualPointOrAStrangerIsForbidden() {
        UUID point = seat("Ev", false, true);
        assertThatThrownBy(() -> nudges.nudge("s1", mehmet, mehmet))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> nudges.nudge("s1", mehmet, point))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> nudges.nudge("s1", mehmet, UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);
    }
}
```

> `FakeStores.RecordingEvents` yoksa `SessionEventsPort`'u karşılayan, `Map<String, List<SessionEvent>> published` tutan bir sınıf `FakeStores`'a eklenir.

- [ ] **Step 2: Testi çalıştır, düştüğünü gör** — Run: `MVN_TEST NudgeCommandsTest` · Expected: COMPILATION ERROR (`NudgeCommands`, `NudgeCooldownPort`, `TooManyRequestsException` yok).

- [ ] **Step 3: Port, istisna ve olayı yaz** — `NudgeCooldownPort.java`:

```java
/**
 * Durt kotasi. Anahtar CIFTTIR (kim -> kimi): tek bir kisi birini spam'leyemesin ama oturumdaki
 * herkes ayni kisiyi bir kez durtebilsin — kota yalniz hedefe bagli olsaydi ilk durten
 * digerlerini 60 sn susturur, kotayi "ilk basana" cevirirdi.
 */
@FunctionalInterface
public interface NudgeCooldownPort {

    /** Hak varsa true doner VE tuketir; yoksa false. */
    boolean tryNudge(UUID fromParticipantId, UUID toParticipantId, Duration window);
}
```

`TooManyRequestsException.java`:

```java
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
```

`SessionEvent`'e (`voiceRosterChanged` sonrası):

```java
    /**
     * Biri birini durttu. Govde DOLU: istemci "seni Mehmet durttu" diyebilmek icin ikisini de
     * bilmeli — kimliksiz bir "tazele" zili bu ekrani yazamazdi. Yalniz o oturumun konusuna
     * gider; hedefin ozel konusu YOK (ses sinyali disinda kimlikli konu acilmaz).
     */
    public static SessionEvent nudged(UUID fromParticipantId, UUID toParticipantId) {
        return new SessionEvent("nudged", Map.of(
                "fromParticipantId", fromParticipantId.toString(),
                "toParticipantId", toParticipantId.toString()));
    }
```

`ApiExceptionHandler`'a:

```java
    /** Kota asimi sunucu hatasi degil, "az sonra tekrar dene"dir. */
    @ExceptionHandler(TooManyRequestsException.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    ApiError tooMany(TooManyRequestsException e) {
        return new ApiError(e.getMessage());
    }
```

- [ ] **Step 4: Uygulama komutunu yaz** — `NudgeCommands.java`:

```java
/** Durt: yazi DEGIL, tek bir zil. Govde yok, kalici kayit yok (R-B8). */
@Service
public class NudgeCommands {

    /** §2 sozlesmesi: kisi basina 60 sn'de bir. */
    static final Duration WINDOW = Duration.ofSeconds(60);

    private final SessionStorePort store;
    private final SessionEventsPort events;
    private final NudgeCooldownPort cooldown;
    private final Clock clock;

    public NudgeCommands(SessionStorePort store, SessionEventsPort events,
                         NudgeCooldownPort cooldown, Clock clock) {
        this.store = store;
        this.events = events;
        this.cooldown = cooldown;
        this.clock = clock;
    }

    public void nudge(String slug, UUID fromParticipantId, UUID toParticipantId) {
        Session session = SessionExpiry.required(store, slug, clock.instant());
        List<Participant> seats = store.participantsOf(session.id());
        requireSeat(seats, fromParticipantId);
        Participant target = requireSeat(seats, toParticipantId);
        if (fromParticipantId.equals(toParticipantId)) {
            throw new ForbiddenException("cannot nudge yourself");
        }
        // Elle eklenen nokta token tasimaz, soket acamaz: zil calacak bir cihaz yok.
        if (target.manual()) {
            throw new ForbiddenException("manual points cannot be nudged");
        }
        if (!cooldown.tryNudge(fromParticipantId, toParticipantId, WINDOW)) {
            throw new TooManyRequestsException("nudge_cooldown");
        }
        events.publish(slug, SessionEvent.nudged(fromParticipantId, toParticipantId));
    }

    /** Uyelik DB'den okunur: imzali token'daki "bu oturumdayim" iddiasi tek basina yetmez. */
    private static Participant requireSeat(List<Participant> seats, UUID participantId) {
        return seats.stream().filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new ForbiddenException("not a participant of this session"));
    }
}
```

- [ ] **Step 5: Süreç içi kotayı yaz** — `InMemoryNudgeCooldown.java`:

```java
/**
 * Surec ici kota (InMemoryPresence ile ayni sinif borc): cok pod'da paylasilmaz, restart'ta
 * sifirlanir. Bedeli en kotu ihtimalle pod sayisi kadar fazla zil; alternatifi her durtude
 * bir INSERT olurdu.
 */
@Component
public class InMemoryNudgeCooldown implements NudgeCooldownPort {

    private final Cache<String, Instant> lastNudge = Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .build();

    private final Clock clock;

    public InMemoryNudgeCooldown(Clock clock) {
        this.clock = clock;
    }

    @Override
    public boolean tryNudge(UUID fromParticipantId, UUID toParticipantId, Duration window) {
        String key = fromParticipantId + ":" + toParticipantId;
        Instant now = clock.instant();
        // Atomik: iki es zamanli istek okuyup ikisi de "hak var" diyemesin.
        Instant kept = lastNudge.asMap().compute(key,
                (k, previous) -> previous != null && previous.plus(window).isAfter(now)
                        ? previous : now);
        return now.equals(kept);
    }
}
```

`InMemoryNudgeCooldownTest` (`MutableClock` test dosyası içinde tanımlanır: `instant()` bir `AtomicReference` okur, `advance` ilerletir):

```java
    @Test
    void theWindowIsPerPairAndReopensAfterIt() {
        MutableClock clock = new MutableClock(T0);
        InMemoryNudgeCooldown cooldown = new InMemoryNudgeCooldown(clock);
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        UUID c = UUID.randomUUID();
        assertThat(cooldown.tryNudge(a, b, Duration.ofSeconds(60))).isTrue();
        assertThat(cooldown.tryNudge(a, b, Duration.ofSeconds(60))).isFalse();
        assertThat(cooldown.tryNudge(c, b, Duration.ofSeconds(60))).isTrue(); // baska gonderen
        clock.advance(Duration.ofSeconds(61));
        assertThat(cooldown.tryNudge(a, b, Duration.ofSeconds(60))).isTrue();
    }
```

- [ ] **Step 6: Ucu ve Bruno isteğini yaz** — `NudgeController.java`:

```java
/** Govde YOK, yanit YOK: 204. Durtmek bir zildir, bir kaynak yaratmaz. */
@RestController
@RequestMapping("/api/sessions/{slug}/nudge")
class NudgeController {

    private final NudgeCommands nudges;

    NudgeController(NudgeCommands nudges) {
        this.nudges = nudges;
    }

    @PostMapping("/{participantId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void nudge(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
               @PathVariable UUID participantId) {
        nudges.nudge(slug, WebPrincipals.participantId(me), participantId);
    }
}
```

`backend/.infra/bumpinto-collection/sessions/nudge.yml`:

```yaml
info:
  name: Nudge Participant
  type: http
  seq: 12

http:
  method: POST
  url: "{{baseUrl}}/api/sessions/{{slug}}/nudge/{{participantId}}"

runtime:
  scripts:
    - type: tests
      code: |-
        test("204 doner", function() {
          expect(res.status).to.equal(204);
        });

docs:
  type: text/markdown
  content: |-
    Katilimci token'i ile cagrilir; govde YOK, yanit 204.
    Kota: **gonderen-hedef cifti basina 60 sn** — ikinci cagri 429 `nudge_cooldown`.
    Kendini ya da elle eklenen bir noktayi durtmek 403.
    Oturumun konusuna `nudged{fromParticipantId, toParticipantId}` yayinlanir.
```

- [ ] **Step 7: Testleri çalıştır** — Run: `MVN_TEST NudgeCommandsTest` (3) · `MVN_TEST InMemoryNudgeCooldownTest` (1) · `MVN_TEST HexagonalArchitectureTest` (Caffeine adapterde) · `MVN_TEST WebSecuritySliceTest` (uç public listede DEĞİL; `anyRequest().authenticated()` yeter) → yeşil.

- [ ] **Step 8: Değişen dosyaları listele** — `NudgeCooldownPort.java`, `InMemoryNudgeCooldown.java`, `InMemoryNudgeCooldownTest.java`, `TooManyRequestsException.java`, `NudgeCommands.java`, `NudgeCommandsTest.java`, `NudgeController.java`, `SessionEvent.java`, `ApiExceptionHandler.java`, `FakeStores.java`, `sessions/nudge.yml`. Mesaj: `feat(presence): nudge endpoint, cooldown port, nudged event`.

---

### Task 7: Oturum kodu — `SessionView.joinCode` + `GET /api/sessions/by-code/{code}`

**Files:**

- Modify: `backend/src/main/java/com/bumpinto/domain/port/SessionStorePort.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionQueries.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/{SessionController,SessionViewAssembler,ApiDtos}.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/{SecurityConfig,RateLimitFilter}.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/JoinCodeApiTest.java`
- Create: `backend/.infra/bumpinto-collection/sessions/by-code.yml`

- [ ] **Step 1: Başarısız testi yaz** — `JoinCodeApiTest.java`; `ApiHappyPathTest`'in `@SpringBootTest` + `MockMvc` + Testcontainers kurulumu ve `createSession()`/`hostAuth()` yardımcıları kopyalanır:

```java
    @Test
    void ownerSeesTheJoinCodeAndAnonymousCanResolveItToAPreview() throws Exception {
        String slug = createSession();
        String code = mvc.perform(get("/api/sessions/" + slug).with(hostAuth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joinCode").isString())
                .andReturn().getResponse().getContentAsString()
                .replaceAll(".*\"joinCode\":\"([A-Z0-9]{5})\".*", "$1");

        // Kimliksiz cagri: onizleme kamu bilgisidir.
        mvc.perform(get("/api/sessions/by-code/" + code.toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value(slug))
                .andExpect(jsonPath("$.joinCode").doesNotExist());
    }

    @Test
    void malformedOrUnknownCodesAre404() throws Exception {
        mvc.perform(get("/api/sessions/by-code/X7K2I")).andExpect(status().isNotFound());
        mvc.perform(get("/api/sessions/by-code/ABC")).andExpect(status().isNotFound());
        mvc.perform(get("/api/sessions/by-code/ZZZZZ")).andExpect(status().isNotFound());
    }
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör** — Run: `MVN_TEST JoinCodeApiTest` · Expected: `$.joinCode` yok; `by-code` 401/404.

- [ ] **Step 3: Store ve sorgu tarafını yaz** — `SessionStorePort`'a `Optional<Session> sessionByJoinCode(String joinCode);` (javadoc: "kod kanonik — büyük harf, 5 hane — gelmelidir").

```java
    @Override public Optional<Session> sessionByJoinCode(String joinCode) {   // SessionStoreAdapter
        return sessions.findByJoinCode(joinCode).map(SessionStoreAdapter::toSession);
    }
```

```java
        @Override public Optional<Session> sessionByJoinCode(String joinCode) {   // FakeStores
            return sessions.values().stream()
                    .filter(s -> joinCode.equals(s.joinCode())).findFirst();
        }
```

`SessionQueries`'e (import `com.bumpinto.application.text.Ids`):

```java
    /**
     * Koda karsilik gelen anlik goruntu. Bicimsiz kod DB'ye HIC gitmez: boyle bir sorgu, kod
     * uzayini tarayan bir istemciye "bu bicim gecerli" ipucu verirdi.
     */
    public SessionSnapshot snapshotByJoinCode(String rawCode) {
        String code = Ids.normalizeJoinCode(rawCode);
        Session stored = code == null ? null : store.sessionByJoinCode(code).orElse(null);
        if (stored == null) {
            throw new NotFoundException("session not found");
        }
        return snapshot(stored.slug());
    }
```

- [ ] **Step 4: DTO ve ucu yaz** — `ApiDtos.SessionView` son alanı `VoiceDto voice` idi:

```java
                              VoiceDto voice,
                              /** 5 haneli davet kodu; YALNIZ uyeye gonderilir (R-B9). */
                              String joinCode) {
```

`SessionViewAssembler.toView` son argümanı:

```java
                room.map(r -> new ApiDtos.VoiceDto(r.endsAt())).orElse(null),
                // Uc zaten uye olmayana 403 veriyor; alan yine de viewer'a bagli — savunma tek
                // satirdir ve kodun kime gittigini kodun kendisi soyler.
                viewer == null ? null : snap.session().joinCode());
```

`SessionController`'a (`@GetMapping("/{slug}")`'dan ÖNCE tanımlanır ki yol eşlemesi tartışmasız olsun):

```java
    /**
     * Koddan ONIZLEME (R-B9). Kamu ucudur: kod elle yazilir ve yazan kisi henuz uye degildir.
     * Onizleme koordinat, katilimci id'si ve mekan TASIMAZ; {@code joinCode} de donmez —
     * koda karsi kod aramasina izin verilmez (§2).
     */
    @GetMapping("/by-code/{code}")
    ApiDtos.SessionPreview byCode(@PathVariable String code) {
        return assembler.toPreview(queries.snapshotByJoinCode(code));
    }
```

`SecurityConfig.PUBLIC_ENDPOINTS`'e `PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/sessions/by-code/*"),`. `RateLimitFilter.defaultPolicies()`'e (`api` catch-all'dan ÖNCE):

```java
                // R-B9: kod uzayi 31^5 ama 10/dk kaba kuvveti anlamsiz kilar.
                new Policy("bycode", "GET", Pattern.compile("^/api/sessions/by-code/[^/]+$"), 10),
```

- [ ] **Step 5: Bruno isteğini ekle** — `backend/.infra/bumpinto-collection/sessions/by-code.yml`:

```yaml
info:
  name: Session By Join Code
  type: http
  seq: 13

http:
  method: GET
  url: "{{baseUrl}}/api/sessions/by-code/{{joinCode}}"
  auth:
    type: none

runtime:
  scripts:
    - type: tests
      code: |-
        test("200 ya da 404", function() {
          expect([200, 404]).to.include(res.status);
        });

docs:
  type: text/markdown
  content: |-
    Kimlik GEREKMEZ: kod elle yazilir, yazan kisi henuz uye degildir. Yanit `SessionPreview`
    (koordinat, katilimci id'si, mekan YOK) ve icinde `joinCode` **yoktur**.
    Kucuk harf, bosluk ve tire kabul edilir; alfabe disi karakter (I, O, 0, 1) 404.
    Hiz siniri **10/dk/IP**. `slug` sozlesmesi degismedi — davet linki hala `/j/{slug}`.
```

- [ ] **Step 6: Testleri çalıştır** — Run: `MVN_TEST JoinCodeApiTest` (2) · `MVN_TEST SessionViewAssemblerTest` · `MVN_TEST WebSecuritySliceTest` → yeşil. Olası düşme: eşleme çakışması bildirilirse `byCode`'un `{slug}` ucundan önce tanımlandığı doğrulanır.

- [ ] **Step 7: Değişen dosyaları listele** — `SessionStorePort.java`, `SessionStoreAdapter.java`, `SessionQueries.java`, `SessionController.java`, `SessionViewAssembler.java`, `ApiDtos.java`, `SecurityConfig.java`, `RateLimitFilter.java`, `FakeStores.java`, `JoinCodeApiTest.java`, `sessions/by-code.yml`. Mesaj: `feat(session): join code in SessionView and by-code preview lookup`.

---

### Task 8: OG kartı — `GET /og/{slug}.png`

**Files:**

- Create: `backend/src/main/java/com/bumpinto/domain/og/OgCard.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/OgImagePort.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/image/AwtOgImageRenderer.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/OgController.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/config/AppProps.java`, `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/{SecurityConfig,RateLimitFilter}.java`
- Modify: `backend/src/test/java/com/bumpinto/support/TestProps.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/image/AwtOgImageRendererTest.java`

- [ ] **Step 1: Başarısız testi yaz**

```java
class AwtOgImageRendererTest {

    final AwtOgImageRenderer renderer = new AwtOgImageRenderer();

    @Test
    void rendersA1200x630PngUnder200Kb() throws Exception {
        byte[] png = renderer.render(new OgCard("Cuma kahvesi", "Kahve · Bar", "Mehmet", 4, false));
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(png));
        assertThat(image.getWidth()).isEqualTo(1200);
        assertThat(image.getHeight()).isEqualTo(630);
        assertThat(png.length).isLessThan(200 * 1024);
        assertThat(png[0]).isEqualTo((byte) 0x89); // PNG imzasi
    }

    @Test
    void expiredCardIsGenericAndStillValid() throws Exception {
        byte[] png = renderer.render(OgCard.generic());
        assertThat(ImageIO.read(new ByteArrayInputStream(png))).isNotNull();
        assertThat(png.length).isLessThan(200 * 1024);
    }

    @Test
    void veryLongTitlesDoNotOverflowTheCanvas() throws Exception {
        byte[] png = renderer.render(new OgCard(
                "Cuma kahvesi ve uzun uzun bir oturum adi ".repeat(4), "Kahve", "Mehmet", 12, false));
        assertThat(ImageIO.read(new ByteArrayInputStream(png)).getWidth()).isEqualTo(1200);
    }
}
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör** — Run: `MVN_TEST AwtOgImageRendererTest` · Expected: COMPILATION ERROR (`OgCard`, `AwtOgImageRenderer` yok).

- [ ] **Step 3: Domain kaydını ve portu yaz**

```java
/**
 * Davet karti UZERINDEKI HER SEY. Koordinat, katilimci adlari ve mekan YOKTUR (R-B10 kabul b):
 * bu goruntu link'i eline gecen HERKESE acilir ve onizleme sunucularinda onbelleklenir.
 */
public record OgCard(String title, String activityLabel, String hostDisplayName,
                     int participantCount, boolean expired) {

    /** Suresi dolmus / bilinmeyen oturum: jenerik kart (kabul c). */
    public static OgCard generic() {
        return new OgCard("BumpInto", "Birlikte karar verin", null, 0, true);
    }
}
```

```java
/** 1200x630 PNG uretir. Yazi tipi/cizim adapterde: domain {@code java.awt} gormez. */
public interface OgImagePort {
    byte[] render(OgCard card);
}
```

- [ ] **Step 4: Render adapterini yaz** — `AwtOgImageRenderer.java`:

```java
/**
 * Saf JDK ile cizim: yeni bagimlilik YOK. TYPE_INT_RGB (alfa yok) + duz renkler PNG'yi ~20 KB'da
 * tutar; 200 KB tavani (R-B10 kabul a) foto GOMULMEDIGI icin rahat gecilir — foto gomulseydi hem
 * boyut hem de saglayici lisansi (FSQ/Google gorsel yeniden yayin) sorun olurdu. Mantiksal yazi
 * tipi kullanilir: konteyner imajinda fontconfig bulunmali (docs/CONFIGURATION.md).
 */
@Component
class AwtOgImageRenderer implements OgImagePort {

    private static final int W = 1200;
    private static final int H = 630;
    private static final int PAD = 88;
    private static final Color INK = new Color(0x12, 0x16, 0x1C);
    private static final Color MUTED = new Color(0x5B, 0x64, 0x72);
    private static final Color TOP = new Color(0xFF, 0xF7, 0xEE);
    private static final Color BOTTOM = new Color(0xEA, 0xF1, 0xFF);
    private static final Color ACCENT = new Color(0xE8, 0x6A, 0x33);

    @Override
    public byte[] render(OgCard card) {
        BufferedImage image = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,
                    RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setPaint(new GradientPaint(0, 0, TOP, 0, H, BOTTOM));
            g.fillRect(0, 0, W, H);
            g.setColor(ACCENT);
            g.fillRect(0, 0, W, 12);
            g.setColor(MUTED);
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 30));
            g.drawString(card.activityLabel() == null ? "BumpInto" : card.activityLabel(),
                    PAD, PAD + 30);
            g.setColor(INK);
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 76));
            int y = PAD + 150;
            for (String line : wrap(g, card.title(), W - 2 * PAD, 3)) {
                g.drawString(line, PAD, y);
                y += 92;
            }
            g.setColor(MUTED);
            g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 34));
            g.drawString(footer(card), PAD, H - PAD);
            return toPng(image);
        } finally {
            g.dispose();
        }
    }

    /** Alt satir: host adi ve kisi sayisi kamu onizleme alanlaridir; baska kimse yazilmaz. */
    private static String footer(OgCard card) {
        if (card.expired()) {
            return "Bu davetin suresi doldu · bumpinto.app";
        }
        String host = card.hostDisplayName() == null ? "Bir arkadasin" : card.hostDisplayName();
        return host + " davet etti · " + card.participantCount() + " kisi · bumpinto.app";
    }

    /** Tasma yerine kirpma: {@code maxLines}'i asan metin "…" ile biter, tuval disina cikmaz. */
    private static List<String> wrap(Graphics2D g, String text, int maxWidth, int maxLines) {
        List<String> lines = new ArrayList<>(maxLines);
        String line = "";
        for (String word : (text == null ? "BumpInto" : text).strip().split("\\s+")) {
            String candidate = line.isEmpty() ? word : line + " " + word;
            if (g.getFontMetrics().stringWidth(candidate) <= maxWidth) {
                line = candidate;
            } else if (lines.size() + 1 < maxLines) {
                lines.add(line);
                line = word;
            } else {
                line = line + "…";   // son satir doldu: kalan kelimeler dusurulur
                break;
            }
        }
        lines.add(line);
        return lines;
    }

    private static byte[] toPng(BufferedImage image) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(64 * 1024);
        try {
            ImageIO.write(image, "png", out);
        } catch (IOException e) {
            throw new UncheckedIOException(e); // bellege yazarken IO hatasi = gercek ariza
        }
        return out.toByteArray();
    }
}
```

Import: `javax.imageio.ImageIO`, `java.awt.{Color,Font,GradientPaint,Graphics2D,RenderingHints}`, `java.awt.image.BufferedImage`, `java.io.{ByteArrayOutputStream,IOException,UncheckedIOException}`.

- [ ] **Step 5: Testi çalıştır** — Run: `MVN_TEST AwtOgImageRendererTest` · Expected: `Tests run: 3, Failures: 0`. Olası düşme: `HeadlessException` / `Fontconfig head is null` → JVM'de font yok; `-Djava.awt.headless=true` ile koş ve T10'daki `docs/CONFIGURATION.md` notunu uygula.

- [ ] **Step 6: Yapılandırmayı ekle** — `AppProps`'a bileşen (`Retention retention` sonrası `Og og`):

```java
    /**
     * OG karti. {@code cache}: hem HTTP {@code max-age} hem surec ici onbellek TTL'i; varsayilan
     * gereksinim dokumanindaki degerdir (24 s) ve daha uzunu TEK env ile acilir.
     * {@code appBaseUrl}: davet linkinin ({@code /j/{slug}}) yasadigi kaynak.
     * {@code publicBaseUrl}: bu API'nin dis adresi — PNG mutlak URL'i oradan kurulur.
     */
    public record Og(Duration cache, String appBaseUrl, String publicBaseUrl) {
    }
```

`application.yml`'ye (`retention` bloğundan sonra):

```yaml
  og:
    cache: ${OG_CACHE:PT24S}
    app-base-url: ${APP_BASE_URL:http://localhost:5173}
    public-base-url: ${PUBLIC_API_BASE_URL:http://localhost:8060}
```

`TestProps`'a aşağıdaki fabrika ve 4 `new AppProps(...)` çağrısına son argüman `og()`:

```java
    public static AppProps.Og og() {
        return new AppProps.Og(Duration.ofSeconds(24), "https://bumpinto.app",
                "https://api.bumpinto.app");
    }
```

- [ ] **Step 7: Ucu yaz** — `OgController.java`:

```java
/**
 * Onizleme kartlari. KAMU ucudur ve uzerinde YALNIZ kamu onizleme alanlari vardir. Render surec
 * ici onbellektedir: bir link WhatsApp/Slack/X tarafindan ayni anda cekilir ve her cekiste
 * yeniden cizmek bos CPU olurdu.
 */
@RestController
class OgController {

    private final SessionQueries queries;
    private final OgImagePort images;
    private final Duration cache;
    private final String appBaseUrl;
    private final String publicBaseUrl;
    private final Cache<String, byte[]> rendered;

    OgController(SessionQueries queries, OgImagePort images, AppProps props) {
        this.queries = queries;
        this.images = images;
        this.cache = props.og().cache();
        this.appBaseUrl = props.og().appBaseUrl();
        this.publicBaseUrl = props.og().publicBaseUrl();
        this.rendered = Caffeine.newBuilder().maximumSize(1_000)
                .expireAfterWrite(this.cache).build();
    }

    @GetMapping(value = "/og/{slug}.png", produces = MediaType.IMAGE_PNG_VALUE)
    ResponseEntity<byte[]> card(@PathVariable String slug) {
        byte[] png = rendered.get(slug, key -> images.render(cardOf(key)));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(cache).cachePublic())
                .contentType(MediaType.IMAGE_PNG)
                .body(png);
    }

    /**
     * Bilinmeyen ya da suresi dolmus slug 404 DEGIL jenerik karttir (kabul c): onizleme
     * sunuculari 404'te link'i "bozuk" gosterir ve paylasilan mesaj cirkinlesirdi.
     */
    OgCard cardOf(String slug) {
        try {
            SessionQueries.SessionSnapshot snap = queries.snapshot(slug);
            if (snap.session().status() == SessionStatus.EXPIRED) {
                return OgCard.generic();
            }
            String host = snap.participants().stream().filter(Participant::host).findFirst()
                    .map(Participant::displayName).orElse(null);
            String label = snap.session().activityTypes().stream().map(Enum::name)
                    .collect(Collectors.joining(" · "));
            String title = snap.session().name() == null ? "Birlikte karar verelim"
                    : snap.session().name();
            long people = snap.participants().stream().filter(p -> !p.manual()).count();
            return new OgCard(title, label, host, (int) people, false);
        } catch (NotFoundException unknown) {
            return OgCard.generic();
        }
    }
}
```

Import: `org.springframework.http.{CacheControl,MediaType,ResponseEntity}`, `com.github.benmanes.caffeine.cache.{Cache,Caffeine}`.

`SecurityConfig.PUBLIC_ENDPOINTS`'e `PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/og/*"),`. `RateLimitFilter.defaultPolicies()`'e (`/og/...` `^/api/` ile eşleşmez, aksi halde 240'lık FALLBACK'e düşerdi) `new Policy("og", "GET", Pattern.compile("^/og/.*"), 60),`.

- [ ] **Step 8: Testleri çalıştır** — Run: `MVN_TEST AwtOgImageRendererTest` · `MVN_TEST WebSecuritySliceTest` (`/og/x.png` kimliksiz 200) · `MVN_TEST HexagonalArchitectureTest` → yeşil. `java.awt` kuralı yoksa eklenir:

```java
    @ArchTest
    static final ArchRule awtStaysInTheImageAdapter = noClasses()
            .that().resideOutsideOfPackage("com.bumpinto.adapter.out.image..")
            .should().dependOnClassesThat().resideInAnyPackage("java.awt..", "javax.imageio..");
```

- [ ] **Step 9: Değişen dosyaları listele** — `OgCard.java`, `OgImagePort.java`, `AwtOgImageRenderer.java`, `AwtOgImageRendererTest.java`, `OgController.java`, `AppProps.java`, `application.yml`, `TestProps.java`, `SecurityConfig.java`, `RateLimitFilter.java`, `HexagonalArchitectureTest.java`. Mesaj: `feat(og): 1200x630 invite card behind an image port`.

---

### Task 9: `/j/{slug}` için OG meta ucu

**Files:**

- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/{ApiDtos,OgController}.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/SecurityConfig.java`
- Create: `backend/.infra/bumpinto-collection/sessions/og-meta.yml`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/OgMetaApiTest.java`

- [ ] **Step 1: Başarısız testi yaz** — `OgMetaApiTest.java`, `ApiHappyPathTest` kurulumuyla:

```java
    @Test
    void metaCarriesTheAbsoluteImageAndInviteUrls() throws Exception {
        String slug = createSession();
        mvc.perform(get("/api/sessions/" + slug + "/og"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrl").value(endsWith("/og/" + slug + ".png")))
                .andExpect(jsonPath("$.url").value(endsWith("/j/" + slug)))
                .andExpect(jsonPath("$.expired").value(false))
                .andExpect(jsonPath("$.title").isString())
                .andExpect(jsonPath("$.description").isString());
    }

    @Test
    void unknownSlugStillReturnsGenericMetaNot404() throws Exception {
        mvc.perform(get("/api/sessions/zzzzzzzz/og"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expired").value(true));
    }
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör** — Run: `MVN_TEST OgMetaApiTest` · Expected: 401/404.

- [ ] **Step 3: DTO ve ucu yaz** — `ApiDtos`'a:

```java
    /**
     * {@code /j/{slug}} sayfasinin OG/Twitter meta etiketlerini besleyen KAMU verisi. Etiketleri
     * HTML'e basmak web izinin isidir (W-15): backend SPA'nin index.html'ini uretmez ve tek bir
     * baslik satiri icin ikinci bir sunum katmani acmak dogru olmazdi.
     */
    public record OgMetaDto(String title, String description, String imageUrl, String url,
                            boolean expired) {
    }
```

`OgController`'a:

```java
    @GetMapping("/api/sessions/{slug}/og")
    ApiDtos.OgMetaDto meta(@PathVariable String slug) {
        OgCard card = cardOf(slug);
        String description = card.expired()
                ? "Bu davetin suresi doldu."
                : (card.hostDisplayName() == null ? "Bir arkadasin" : card.hostDisplayName())
                        + " seni davet etti · " + card.participantCount() + " kisi";
        return new ApiDtos.OgMetaDto(card.title(), description,
                publicBaseUrl + "/og/" + slug + ".png", appBaseUrl + "/j/" + slug, card.expired());
    }
```

`SecurityConfig.PUBLIC_ENDPOINTS`'e `PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/sessions/*/og"),`.

- [ ] **Step 4: Bruno isteğini ekle** — `backend/.infra/bumpinto-collection/sessions/og-meta.yml`:

```yaml
info:
  name: Invite OG Meta
  type: http
  seq: 14

http:
  method: GET
  url: "{{baseUrl}}/api/sessions/{{slug}}/og"
  auth:
    type: none

docs:
  type: text/markdown
  content: |-
    `/j/{slug}` sayfasinin OG/Twitter etiketlerini besler (kimlik gerekmez).
    `imageUrl` -> `GET /og/{slug}.png` (1200x630 PNG, `Cache-Control: public, max-age=<OG_CACHE>`).
    Bilinmeyen/suresi dolmus slug 404 DEGIL, `expired: true` ile jenerik metadir.
    Govdede koordinat, katilimci id'si ya da mekan YOKTUR.
```

- [ ] **Step 5: Testleri çalıştır** — Run: `MVN_TEST OgMetaApiTest` (2) · `MVN_TEST WebSecuritySliceTest` → yeşil.

- [ ] **Step 6: Değişen dosyaları listele** — `ApiDtos.java`, `OgController.java`, `SecurityConfig.java`, `OgMetaApiTest.java`, `sessions/og-meta.yml`. Mesaj: `feat(og): public meta endpoint for the /j/{slug} invite page`.

---

### Task 10: Sözleşme, belgeler ve INDEX

**Files:**

- Modify: `backend/ARCHITECTURE.md` (§3, §7, §11, §12, §14), `docs/CONFIGURATION.md` (§1), `docs/superpowers/plans/INDEX.md`
- Regenerate: `frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts`

- [ ] **Step 1: Tüm backend testlerini koş** — Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true mvn -o test` · Expected: BUILD SUCCESS; yeni test sayısı T1 4, T2 2, T3 2, T4 4, T5 3, T6 4, T7 2, T8 3, T9 2 = **26**.

- [ ] **Step 2: ARCHITECTURE.md** — §11 olay tablosuna, `voice_roster_changed` satırından sonra bir satır:

```markdown
| `nudged` | `fromParticipantId`, `toParticipantId` |
```

Kuralların sonuna 6. madde:

```markdown
6. **`nudged` gövdesi doludur.** Diğer "tazele zili" olaylarının aksine istemci "seni Mehmet
   dürttü" yazabilmek için iki kimliği de bilmek zorundadır. Yine de kimlikli bir KONU açılmaz:
   olay oturumun ortak konusuna gider ve alıcı `toParticipantId`'yi kendisiyle karşılaştırır.
   Kota süreç içidir (`InMemoryNudgeCooldown`, gönderen-hedef çifti başına 60 sn).
```

§3 paket haritasına: "`adapter/out/image/` OG kartı PNG render'ı (saf `java.awt`; domain yalnız `OgImagePort`'u görür)" ve "`domain/og/` davet kartının kamu alanları". §7 alan modeline: `Session.joinCode` (5 hane, ömür boyu tekil, `slug` sözleşmesini değiştirmez), `Venue.tagline`/`taglineSource`, `participants.last_seen_at`/`link_opened_at` (kalıcı damgalar; süreç içi presence ile karıştırılmaz). §12 `AppProps` listesine `og`. §14 borçlara:

```markdown
- **`tips` alanı doğrulanmadı.** `VenueDto.tagline` FSQ Premium yanıtındaki `tips` alanına
  dayanır; alan gelmezse sözleşme null-tolere davranır ve satır hiç çizilmez
  (`FoursquarePremiumContractTest` gerçek anahtarla ölçer).
- **OG render fontconfig ister.** Konteyner imajı `fontconfig` içermezse `/og/{slug}.png` 500 verir.
```

- [ ] **Step 3: docs/CONFIGURATION.md** — §1 anahtar envanteri tablosuna üç satır (mevcut satır biçimiyle): `OG_CACHE` (sır değil, varsayılan `PT24S`; hem HTTP `max-age` hem süreç içi TTL) · `APP_BASE_URL` (sır değil; web'in kökü, `/j/{slug}` linki buradan) · `PUBLIC_API_BASE_URL` (sır değil; API'nin dış adresi, `/og/{slug}.png` mutlak URL'i buradan). Aynı bölüme:

```markdown
> **OG kartı ve yazı tipleri.** `GET /og/{slug}.png` `java.awt` ile çizer ve mantıksal
> `SansSerif` yazı tipini kullanır. Backend imajı `fontconfig` + en az bir TrueType aile
> içermelidir (Debian tabanlı imajda `apt-get install -y fontconfig fonts-dejavu-core`);
> yoksa uç 500 verir. `java.awt.headless=true` Spring Boot varsayılanıdır, ezilmemelidir.
```

- [ ] **Step 4: INDEX.md** — Flyway kaydına "**V17 = B-15** (`venues.tagline`) · **V18 = B-15** (`participants.last_seen_at`/`link_opened_at`, `sessions.join_code`)"; "Sıradakiler" satırı **B-16**'ya güncellenir; B tablosuna B-14'ten sonra:

```markdown
| B-15 | **v3 ürün cilası** — `GET /api/me/export` (JSON attachment, 1/saat, konum yuvarlanmış), `VenueDto.tagline`/`taglineSource` (FSQ `tips` + açık veri türevi, ≤80 karakter, ek ücretli çağrı yok), presence 2.0 (`lastSeenAt`, `linkOpenedAt`, `POST /nudge/{participantId}` + `nudged` olayı), `sessions.join_code` + `SessionView.joinCode` + `GET /api/sessions/by-code/{code}`, `GET /og/{slug}.png` + `GET /api/sessions/{slug}/og` | `2026-09-06-plan34-backend-v3-polish.md` | Plan 34 | ready | **B-14** (V13–V16, `ParticipantDto.blocked`) | — | Spec `2026-09-06-v3-requirements.md` R-B6–R-B10, §2 sözleşme kararları. 10 görev, V17–V18. Yeni Maven bağımlılığı YOK (OG PNG saf `java.awt`). `RateLimitFilter.Policy` pencere kazandı (1/saat kovası); eski 4 argümanlı ctor korunur. Riskler: FSQ `tips` gerçek anahtarla ölçülmedi (null-tolere), OG imajı `fontconfig` ister. W-15 (dürt + paylaşım) ve M-7 (kod/QR) bu planın `openapi.json`'ını bekler |
```

- [ ] **Step 5: `openapi.json` ve `api-types.ts`'i yeniden üret** — `:8060`'ta kullanıcının kendi JVM'i çalışıyor olabilir, **hiçbir süreci öldürme**:

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && docker compose up -d postgres
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 \
  mvn -o spring-boot:run -Dspring-boot.run.arguments=--server.port=8061 > /tmp/bumpinto-8061.log 2>&1 &
echo $! > /tmp/bumpinto-8061.pid
until curl -sf http://localhost:8061/v3/api-docs > /dev/null; do sleep 2; done
curl -sf http://localhost:8061/v3/api-docs -o ../frontend/shared/openapi.json
cd .. && source ./init-nvm.sh && pnpm --filter @bumpinto/shared generate
kill $(cat /tmp/bumpinto-8061.pid)
```

Doğrulama: `grep -c "tagline\|lastSeenAt\|linkOpenedAt\|joinCode\|ExportResponse\|OgMetaDto" frontend/shared/src/api-types.ts` ≥ 6. `mvn spring-boot:run` `-o` ile açılmazsa (plugin yerelde yok) `-o`'suz tek sefer koş.

- [ ] **Step 6: Web'in hâlâ derlendiğini doğrula** — `cd /Users/mehmetserefoglu/projects/bumpinto && source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b` · Expected: hata yok (yeni alanların hepsi ek/opsiyonel). Hata varsa W-15'te ele alınır; burada sadece raporla.

- [ ] **Step 7: Değişen dosyaları listele** — `ARCHITECTURE.md`, `docs/CONFIGURATION.md`, `INDEX.md`, `frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts`. Mesaj: `docs(v3): nudged event, og/tagline notes, regenerated API types`.

---

## Plan öz-incelemesi

**Spec kapsamı (R-B6–R-B10, §2 sözleşme kararları):**

- **R-B6** T3: tek istek + `Content-Disposition: attachment` (kabul a); port yalnız çağıranın koltuklarını verir (kabul b); `export` politikası 1/saat (kabul c); konumlar `TravelMinutes.approx` ile yuvarlanmış.
- **R-B7** T1–T2: FSQ `tips` **aynı** `/places/search` çağrısında (ek ücret yok); açık veri `category+locality` türevi; `Taglines.clamp` 80 karakter + DB check (kabul a); alan yoksa `null` (kabul b/c).
- **R-B8** T4–T6: `ParticipantDto.lastSeenAt`/`linkOpenedAt` (kalıcı, V18); `POST /api/sessions/{slug}/nudge/{participantId}` → 204; 60 sn/çift → 429 (kabul b); `SessionEvent.nudged` yalnız o oturumun konusuna (kabul c).
- **R-B9** T4/T7: `sessions.join_code` 5 hane `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, unique index + backfill (kabul a); `by-code` 10/dk (kabul b); `slug` sözleşmesi dokunulmadı (kabul c); `SessionPreview`'da `joinCode` **yok**.
- **R-B10** T8–T9: 1200×630 PNG, `< 200 KB` testle sabit, `Cache-Control: public, max-age=<OG_CACHE>` + süreç içi Caffeine (kabul a); gövdede yalnız etkinlik/host adı/kişi sayısı (kabul b); bilinmeyen/süresi dolmuş → `OgCard.generic()` (kabul c); `adapter/out/image` portu arkasında.
- **Sözleşme + belge + INDEX** T10. Boşluk yok.

**Yer tutucu taraması:** "TBD", "TODO", "uygun hata yönetimi ekle", "önceki göreve benzer" ifadeleri yok; her adımda çalıştırılabilir kod ya da tam dosya yolu + tam satır var.

**Tip tutarlılığı:**

- `Taglines.fromTips(List<String>)` / `fromCategory(String,String)` — T1 test = T1 uygulama = T2 çağrı yerleri.
- `TaglineSource{FSQ,OSM}` — T1 = `VenueCandidate` = `Venue` = `VenueEntity` (String) = `ApiDtos.VenueDto` (enum) = T2 test.
- `UserDataPort.Participation` (11 alan) — T3 port = T3 adapter = T3 test lambda'sı (`@FunctionalInterface`); `UserDataExport.{Export,Profile,Participation}` = `ApiDtos.ExportResponse`.
- `RateLimitFilter.Policy(id,method,path,capacity,window)` + 4 argümanlı convenience ctor — mevcut test ve `defaultPolicies()` satırları derlenmeye devam eder.
- `PresenceStampsPort.Stamps(lastSeenAt,linkOpenedAt)` — T4 port = T4 adapter = T4 test = T5 assembler = T5 test.
- `NudgeCooldownPort.tryNudge(UUID,UUID,Duration)` — T6 port = `InMemoryNudgeCooldown` = `NudgeCommands` = T6 test lambda'sı.
- `SessionEvent.nudged(UUID,UUID)` — T6 = ARCHITECTURE §11 tablosu (T10) = §2 alan adları.
- `Session(…, GeoPoint anchor, String joinCode)` — T4; 15 ve 10 argümanlı convenience ctor'lar korunduğu için ~30 mevcut `new Session(` çağrısı kırılmaz; yalnız `Session.java` iç `with*` gövdeleri, `SessionStoreAdapter` ve `SessionCommands` güncellenir.
- `Venue(…, tagline, taglineSource)` ve `VenueCandidate(…, tagline, taglineSource)` — T1; aynı desen, `GooglePlacesVenueSource` (inaktif) dokunulmadan derlenir.
- `OgCard(title,activityLabel,hostDisplayName,participantCount,expired)` — T8 = `OgImagePort` = `AwtOgImageRenderer` = `OgController.cardOf` = T9 `meta`.
- `AppProps.Og(cache,appBaseUrl,publicBaseUrl)` — T8 = `application.yml` = `TestProps.og()` (4 çağrı yeri).

**Bilinçli sapmalar ve riskler:**

1. `OG_CACHE` varsayılanı gereksinim dokümanındaki **24 saniye**dir. Önizleme sunucuları kendileri gün ölçeğinde önbelleklediği için pratikte kısıt değildir; 24 saat istenirse tek env (`OG_CACHE=PT24H`) yeter, kod değişmez.
2. OG **meta etiketleri** HTML'e backend tarafından basılmaz; `/api/sessions/{slug}/og` JSON'unu W-15 kendi `/j/{slug}` sayfasında kullanır. Backend'e şablon motoru koymak, tek başlık satırı için ikinci bir sunum katmanı açmak olurdu.
3. Dürt kotası **(gönderen, hedef)** çiftine bağlıdır; yalnız hedefe bağlansaydı ilk dürten diğerlerini 60 sn susturur, kotayı "ilk basana" çevirirdi.
4. `join_code` backfill'i yalnız süresi dolmamış oturumları kapsar; geçmiş oturumların kodu `null` kalır ve `by-code` onları bulmaz — zaten katılım da kapalıdır.
5. `tips` alanının FSQ Premium yanıtında geldiği **doğrulanmadı** (§5 risk 4). Sözleşme null-toleredir: alan gelmezse `tagline` null kalır, hiçbir test kırmızıya dönmez, UI satırı çizmez.
