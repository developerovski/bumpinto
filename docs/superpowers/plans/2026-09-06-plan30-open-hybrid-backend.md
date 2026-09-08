# Açık Hibrit Mekan Yığını — Backend (B-13) Implementation Plan

> **Fable inceleme notu (2026-09-06):** V11 indeks adları plan32 swap adımıyla hizalandı (`venues_open_geom_gist`, `venues_open_activity_types_gin`); yeni K- kalemi `K-B26` (K-B23 doluydu). Secret adı plan 5'e göre `bumpinto-backend`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buluşma başına mekan maliyetini ~17,5 sentten ~2 sente indirmek: sağlayıcı SPI'si (`VenueSource`), tür başına sabit sıralı yönlendirme, DB'de kalıcı aylık bütçe sayacı, Foursquare Premium (foto + puan + popülerlik), kendi PostGIS'inde açık taban (`venues_open`), API'siz harita linkleri, saklama kuralı, `GET /api/config`, `POST /api/geocode`, OSRM matris rotalama.

**Architecture:** `DeckFlow` → `VenueProviderPort` (imza değişmez) → `ProviderOrchestrator`. Orkestratör türleri yönlendirme tablosuna böler, küme başına kaynakları sabit sırada dener, `BudgetGate` ile ayı dolmuş kaynağı eler, sonucu `externalId` ile birleştirir. Kaynaklar `domain.venue.VenueSource` SPI'sini uygular ve `adapter.out.<id>` paketlerinde yaşar; kategori eşlemeleri `classpath:venue-sources/<id>.yml`'den veri olarak yüklenir. Bütçe sayacı `provider_usage` tablosunda (`ON CONFLICT … RETURNING`), açık taban `venues_open` tablosunda (PostGIS `ST_DWithin`). Harita linki koordinattan üretilir (`domain.geo.MapLinks`), rota süreleri `RoutingPort` → OSRM `/table`, geocode `GeocodePort` → Nominatim.

**Tech Stack:** Java 25, Spring Boot 4.1 (Spring 7, Jackson 3 = `tools.jackson.databind`), PostgreSQL 16 + PostGIS + Flyway, Unirest 4 (`kong.unirest`), Caffeine, Bucket4j, SnakeYAML (Boot classpath'inde), JUnit 5, AssertJ, Mockito, Testcontainers, ArchUnit. **Yeni Maven bağımlılığı YOK**: `JdbcTemplate` gerekmiyor (aşağıya bak), `org.yaml.snakeyaml` `spring-boot-starter` ile zaten geliyor, PostGIS sunucu tarafı bir uzantı (sürücü değişmiyor).

**Spec:** `docs/superpowers/specs/2026-09-06-open-hybrid-venue-stack-design.md` (§0 bağlayıcı kararlar, §3 SPI, §4 yönlendirme, §5 kaynaklar, §6 bütçe, §8 geocode, §9 rota, §10 harita linkleri, §11 uyum, §12 API, §13 veri, §14 test, §15 aşamalar). Maliyet gerekçesi: `2026-09-06-google-maps-cost-plan.md` §7.3.

**Bu plan aşama 1'dir (spec §15).** İçinde OLMAYAN, spec'te olan iki iş: **TripAdvisor kaynağı** (spec §5.3 — Terra API'nin canlı ölçümüne bağlı, aşama 1b; kendi küçük planını alacak) ve **MapLibre/web tarafı** (W-12). `/api/config` bu planda `mapEngine` olarak yapılandırmada ne yazıyorsa onu döner; web onu W-12'ye kadar okumaz.

**Bağlayıcı kurallar (AGENTS.md + ARCHITECTURE.md):**
- **Git yazma işlemi YOK.** Her görevin sonunda "Commit" adımı yerine değişen dosya listesi bırakılır; kullanıcı commit'ler.
- Test komutu (backend kökünden, önek ZORUNLU):
  `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true mvn -o test -Dtest=<Sınıf>`
  Aşağıda kısaca `MVN_TEST <Sınıf>` yazılır; ajan tam komutu kullanır. Bağımlılık eklenmez, `-o` kalır.
- Domain paketinde Spring/Jakarta/Unirest **yok** (ArchUnit `HexagonalArchitectureTest.domainIsPure`). `VenueSource` SPI'si domain'de olduğu için `ProviderQuota` da domain'e taşınır.
- **`JdbcTemplate` / `EntityManager` / `Connection` YASAK** — ArchUnit `sqlOnlyThroughSpringData` kuralı bunları derlemede kapatıyor. `venues_open` ve `provider_usage` erişimi Spring Data JPA **native `@Query`** + arayüz projeksiyonu ile yazılır; her parametre `:named` bağlanır, dize birleştirme yok. (Spec §5.2 "JdbcTemplate" diyor; kod tabanının kuralı daha güçlü, bu plan kuralı izler.)
- Her yeni/değişen HTTP ucu Bruno'ya girer (`backend/.infra/bumpinto-collection/`, OpenCollection `*.yml`).
- Testler önce yazılır (kırmızı → yeşil). DB testleri `PostgresContainer.shared()` kullanır, `@Testcontainers` **kullanmaz**.
- Yorumlar kısa ve Türkçe; uzun açıklama yok.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `domain/venue/VenueSource.java`, `VenueSourceDescriptor.java`, `RetentionRule.java`, `MapEngine.java`, `CategoryMapping.java`, `SearchRequest.java`, `SearchResult.java`, `ProviderQuota.java` | T1 | SPI (saf domain) |
| `infra/config/AppProps.java` + `application.yml` + 12 test kurucusu + `support/TestProps.java` | T1 | `Venues`, `MapProps`, `Geocode`, `Routing`, `Retention`; `Providers`/`Quota` silinir |
| `adapter/out/provider/CategoryMappingLoader.java`, `VenueSourceConfigValidator.java` (+2 test) | T1 | YAML yükleme, açılış doğrulaması |
| `HexagonalArchitectureTest.java` | T1 | Spec §2'nin üç kuralı |
| `db/migration/V10__provider_usage_and_venue_fields.sql` | T2 | `provider_usage` + `venues` sütunları |
| `domain/port/ProviderUsagePort.java`, `adapter/out/persistence/ProviderUsage{Entity,Repository,Adapter}.java`, `adapter/out/provider/BudgetGate.java` (+2 test) | T2 | Kalıcı aylık sayaç, bütçe kapısı |
| `adapter/out/provider/VenueSourceSupport.java`, `adapter/out/foursquare/FoursquareVenueSource.java`, `venue-sources/foursquare.yml` (+2 test) | T3 | FSQ Premium |
| `adapter/out/google/GooglePlacesVenueSource.java`, `venue-sources/google.yml` (+test) | T4 | Google, koşullu bean |
| `adapter/out/provider/ProviderOrchestrator.java` (+test), `ProviderQuotaCache.java`, `QuotaAwareVenueProvider.java` (silinir) | T5 | Tür bölme, sıra, önbellek |
| `db/migration/V11__venues_open.sql`, `adapter/out/open/*`, `venue-sources/open.yml`, `support/PostgresContainer.java` (+test) | T6 | Açık taban |
| `domain/geo/MapLinks.java`, `VenueCandidate`, `Venue`, `VenueEntity`, `DeckStoreAdapter`, `ApiDtos.VenueDto`, `SessionViewAssembler`, `DeckFlow` (+4 test) | T7 | Alanlar, linkler, kalite kapısı |
| `domain/port/VenueRetentionPort.java`, `application/venue/VenueContentRetention.java`, `adapter/out/persistence/VenueRetentionAdapter.java`, `infra/config/SchedulingConfig.java` (+2 test) | T8 | Saklama |
| `adapter/in/web/ConfigController.java`, `GeocodeController.java`, `domain/port/GeocodePort.java`, `domain/geo/GeoResult.java`, `adapter/out/geocode/NominatimGeocoder.java`, `SecurityConfig`, `RateLimitFilter` + 3 Bruno dosyası (+3 test) | T9 | `/api/config`, `/api/geocode` |
| `domain/port/RoutingPort.java`, `domain/geo/TravelLeg.java`, `TravelMinutes.java`, `adapter/out/routing/OsrmRouting.java`, `ApiDtos.TravelDto` (+3 test) | T10 | Gerçek süre matrisi |
| `openapi.json`, `api-types.ts`, `docs/CONFIGURATION.md`, `backend/ARCHITECTURE.md`, `docs/superpowers/plans/INDEX.md` | T11 | Belge + sözleşme |

---

### Task 1: SPI, kategori eşlemesi, yapılandırma şeması, açılış doğrulaması, ArchUnit

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/venue/VenueSource.java`
- Create: `backend/src/main/java/com/bumpinto/domain/venue/VenueSourceDescriptor.java`
- Create: `backend/src/main/java/com/bumpinto/domain/venue/RetentionRule.java`
- Create: `backend/src/main/java/com/bumpinto/domain/venue/MapEngine.java`
- Create: `backend/src/main/java/com/bumpinto/domain/venue/CategoryMapping.java`
- Create: `backend/src/main/java/com/bumpinto/domain/venue/SearchRequest.java`
- Create: `backend/src/main/java/com/bumpinto/domain/venue/SearchResult.java`
- Move: `adapter/out/provider/ProviderQuota.java` → `backend/src/main/java/com/bumpinto/domain/venue/ProviderQuota.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/provider/CategoryMappingLoader.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/provider/VenueSourceConfigValidator.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/config/AppProps.java`
- Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/test/java/com/bumpinto/support/TestProps.java`
- Modify (AppProps kurucusu, 12 dosya): `AuthControllerTest`, `WebSecuritySliceTest` (`adapter/in/web`), `NominatimReverseGeocoderTest` (`adapter/out/geocode`), `FoursquareVenueProviderTest`, `GooglePlacesVenueProviderTest` (`adapter/out/provider`), `CloudflareTurnCredentialsTest` (`adapter/out/turn`), `VoiceCommandsTest` (`application/session`), `GoogleIdVerifierTest`, `ParticipantTokenFilterTest`, `RateLimitFilterTest`, `SecurityPolicyTest`, `TokenServiceTest` (`infra/security`)
- Modify: `backend/src/test/java/com/bumpinto/HexagonalArchitectureTest.java`
- Test: `backend/src/test/java/com/bumpinto/domain/venue/CategoryMappingTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/provider/CategoryMappingLoaderTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/provider/VenueSourceConfigValidatorTest.java`

- [ ] **Step 1: Başarısız domain testini yaz**

`backend/src/test/java/com/bumpinto/domain/venue/CategoryMappingTest.java`:

```java
package com.bumpinto.domain.venue;

import com.bumpinto.domain.session.ActivityType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CategoryMappingTest {

    static final CategoryMapping MAP = new CategoryMapping(Map.of(
            ActivityType.COFFEE, List.of("c1"),
            ActivityType.FOOD, List.of("f1", "f2")));

    @Test
    void coversOnlyWhenEveryTypeIsMapped() {
        assertThat(MAP.covers(List.of(ActivityType.COFFEE, ActivityType.FOOD))).isTrue();
        assertThat(MAP.covers(List.of(ActivityType.COFFEE, ActivityType.SWIM))).isFalse();
        assertThat(MAP.covers(List.of())).isFalse();
    }

    /** Coklu turde tek istek: kimlikler birlesir, tekrar yok, sira girdi sirasindadir. */
    @Test
    void idsForFlattensWithoutDuplicates() {
        assertThat(MAP.idsFor(List.of(ActivityType.FOOD, ActivityType.COFFEE)))
                .containsExactly("f1", "f2", "c1");
        assertThat(MAP.idsFor(List.of(ActivityType.SWIM))).isEmpty();
    }

    /** Atif ADLA degil KIMLIKLE geri eslenir (spec §5.1). */
    @Test
    void activityForResolvesAttributionById() {
        assertThat(MAP.activityFor("f2")).isEqualTo(ActivityType.FOOD);
        assertThat(MAP.activityFor("nope")).isNull();
    }
}
```

- [ ] **Step 2: Testi çalıştır, derleme hatasıyla düştüğünü gör**

Run: `MVN_TEST CategoryMappingTest`
Expected: COMPILATION ERROR — `CategoryMapping` yok.

- [ ] **Step 3: Domain SPI tiplerini yaz**

`domain/venue/RetentionRule.java`:

```java
package com.bumpinto.domain.venue;

/** Saglayicinin sozlesmesi metadata'yi ne kadar tutmamiza izin veriyor (spec §11). */
public enum RetentionRule {
    /** Oturum expires_at'i gecince kazanan disi satirlar indirgenir (FSQ, Google). */
    STRIP_AT_EXPIRY,
    /** Cekimden 24 saat sonra, oturum durumu ne olursa olsun (TripAdvisor). */
    STRIP_AFTER_24H,
    /** Acik veri: dokunulmaz. */
    KEEP
}
```

`domain/venue/MapEngine.java`:

```java
package com.bumpinto.domain.venue;

/** Kaynagin ZORUNLU kildigi harita motoru. Google Places ToS: "No Use With Non-Google Maps". */
public enum MapEngine {
    MAPLIBRE, GOOGLE, ANY
}
```

`domain/venue/VenueSourceDescriptor.java`:

```java
package com.bumpinto.domain.venue;

import java.time.ZoneId;

/**
 * Kaynagin kendisi hakkinda soyledigi her sey. Orkestrator, atif, saklama ve /api/config
 * BURAYI okur; hicbiri kaynak sinifinin adini bilmez.
 *
 * @param ratingScale      10 (FSQ), 5 (TA/Google), null (puan yok) — donusturulmez (spec §11)
 * @param requiredMapEngine Google icin GOOGLE, digerlerinde ANY
 * @param billingZone      ay siniri: FSQ/TA UTC, Google America/Los_Angeles
 */
public record VenueSourceDescriptor(String id, String attributionKey, String attributionUrl,
                                    Integer ratingScale, RetentionRule retention,
                                    boolean requiresKey, MapEngine requiredMapEngine,
                                    ZoneId billingZone) {
}
```

`domain/venue/CategoryMapping.java`:

```java
package com.bumpinto.domain.venue;

import com.bumpinto.domain.session.ActivityType;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ActivityType -> saglayicinin kategori kimlikleri. VERI'dir, kod degil: venue-sources/<id>.yml
 * yuklenir, degisiklik kod degisikligi sayilmaz (spec §3).
 */
public record CategoryMapping(Map<ActivityType, List<String>> byType) {

    public CategoryMapping {
        Map<ActivityType, List<String>> copy = new LinkedHashMap<>();
        byType.forEach((k, v) -> copy.put(k, List.copyOf(v)));
        byType = Map.copyOf(copy);
    }

    public static CategoryMapping empty() {
        return new CategoryMapping(Map.of());
    }

    /** Secimin TAMAMI eslenmis mi. Kismi kapsama yonlendirmede kabul edilmez (spec §3). */
    public boolean covers(List<ActivityType> types) {
        return !types.isEmpty() && types.stream().allMatch(byType::containsKey);
    }

    /** Tek istekte gonderilecek kimlikler; tekrar yok, girdi sirasinda. */
    public List<String> idsFor(List<ActivityType> types) {
        List<String> out = new ArrayList<>();
        types.forEach(t -> byType.getOrDefault(t, List.of())
                .forEach(id -> {
                    if (!out.contains(id)) {
                        out.add(id);
                    }
                }));
        return List.copyOf(out);
    }

    /** Atif: yanittaki kategori KIMLIGI hangi ture ait. Bilinmiyorsa null (uydurulmaz). */
    public ActivityType activityFor(String categoryId) {
        for (Map.Entry<ActivityType, List<String>> e : byType.entrySet()) {
            if (e.getValue().contains(categoryId)) {
                return e.getKey();
            }
        }
        return null;
    }

    public List<String> allIds() {
        return byType.values().stream().flatMap(List::stream).distinct().toList();
    }
}
```

`domain/venue/SearchRequest.java`:

```java
package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;

import java.util.List;

public record SearchRequest(GeoPoint center, double radiusKm, List<ActivityType> types, int limit) {

    public SearchRequest {
        types = List.copyOf(types);
    }
}
```

`domain/venue/SearchResult.java`:

```java
package com.bumpinto.domain.venue;

import java.util.List;

/** @param quota kaynak telemetri vermiyorsa null (open, TripAdvisor). */
public record SearchResult(List<VenueCandidate> candidates, ProviderQuota quota) {

    public static SearchResult empty() {
        return new SearchResult(List.of(), null);
    }

    public SearchResult {
        candidates = List.copyOf(candidates);
    }
}
```

`domain/venue/VenueSource.java`:

```java
package com.bumpinto.domain.venue;

/**
 * Bir mekan kaynagi: "HTTP istegini kur, yaniti adaya cevir". Kesisen isler (zaman asimi,
 * 429, butce, onbellek, log, atif, saklama) burada DEGIL, orkestratordedir (spec §3).
 */
public interface VenueSource {

    VenueSourceDescriptor descriptor();

    CategoryMapping categories();

    SearchResult search(SearchRequest request);
}
```

`domain/venue/ProviderQuota.java` — `adapter/out/provider/ProviderQuota.java` dosyası bu yola **taşınır**; içerik aynen kalır, yalnız `package` satırı `com.bumpinto.domain.venue` olur. Gerekçe: `SearchResult` domain'de ve onu taşıyor; adapter'da kalsaydı `domainIsPure` kuralı kırılırdı. Eski dosya silinir; `ProviderQuotaCache`, `FoursquareVenueProvider`, `GooglePlacesVenueProvider`, `ProviderOrchestrator` ve testleri `import com.bumpinto.domain.venue.ProviderQuota;` ekler.

- [ ] **Step 4: Testi çalıştır, yeşile döndüğünü gör**

Run: `MVN_TEST CategoryMappingTest`
Expected: 3 test yeşil.

- [ ] **Step 5: YAML yükleyicinin başarısız testini yaz**

`backend/src/test/java/com/bumpinto/adapter/out/provider/CategoryMappingLoaderTest.java`:

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CategoryMappingLoaderTest {

    @Test
    void loadsEveryActivityTypeFromClasspath() {
        CategoryMapping map = new CategoryMappingLoader().load("foursquare");

        assertThat(map.byType()).containsOnlyKeys(ActivityType.values());
        assertThat(map.idsFor(java.util.List.of(ActivityType.COFFEE)))
                .containsExactly("4bf58dd8d48988d1e0931735");
    }

    /** idPattern BICIM korumasidir: 5 haneli eski taksonomi kodu FSQ'da 400 verir (2026-09-06). */
    @Test
    void rejectsIdThatBreaksThePattern() {
        assertThatThrownBy(() -> new CategoryMappingLoader().load("broken-fixture"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("13032")
                .hasMessageContaining("^[0-9a-f]{24}$");
    }

    @Test
    void failsLoudlyWhenFileIsMissing() {
        assertThatThrownBy(() -> new CategoryMappingLoader().load("nope"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("venue-sources/nope.yml");
    }
}
```

Fixture: `backend/src/test/resources/venue-sources/broken-fixture.yml`

```yaml
id: broken-fixture
idPattern: "^[0-9a-f]{24}$"
categories:
  COFFEE: [13032]
```

- [ ] **Step 6: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST CategoryMappingLoaderTest`
Expected: COMPILATION ERROR — `CategoryMappingLoader` yok.

- [ ] **Step 7: `CategoryMappingLoader`'ı yaz**

`adapter/out/provider/CategoryMappingLoader.java`:

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** venue-sources/<id>.yml -> CategoryMapping. Bicim hatasi ACILISTA patlar, calisma aninda degil. */
@Component
public class CategoryMappingLoader {

    public CategoryMapping load(String sourceId) {
        String path = "venue-sources/" + sourceId + ".yml";
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            throw new IllegalStateException("missing category mapping: " + path);
        }
        Map<String, Object> root;
        try (InputStream in = resource.getInputStream()) {
            root = new Yaml().load(in);
        } catch (IOException e) {
            throw new IllegalStateException("cannot read " + path, e);
        }
        if (root == null || !sourceId.equals(root.get("id"))) {
            throw new IllegalStateException(path + ": 'id' must be " + sourceId);
        }
        Pattern idPattern = Pattern.compile(String.valueOf(root.getOrDefault("idPattern", ".+")));
        Object rawCategories = root.get("categories");
        if (!(rawCategories instanceof Map<?, ?> categories)) {
            throw new IllegalStateException(path + ": 'categories' must be a map");
        }
        Map<ActivityType, List<String>> byType = new LinkedHashMap<>();
        categories.forEach((key, value) -> {
            ActivityType type = ActivityType.valueOf(String.valueOf(key));
            List<String> ids = new ArrayList<>();
            for (Object id : (List<?>) value) {
                String text = String.valueOf(id);
                if (!idPattern.matcher(text).matches()) {
                    throw new IllegalStateException(path + ": id '" + text + "' breaks "
                            + idPattern.pattern());
                }
                ids.add(text);
            }
            byType.put(type, ids);
        });
        return new CategoryMapping(byType);
    }
}
```

- [ ] **Step 8: `application.yml` ve `AppProps` şemasını yaz**

`backend/src/main/resources/application.yml` — `bumpinto:` altındaki `providers:` ve `quota:` blokları **silinir**, yerlerine:

```yaml
  venues:
    sources:
      # key/budget bos birakilamayan tek kaynak foursquare (requiresKey=true, enabled=true).
      foursquare: { enabled: true,  key: ${FOURSQUARE_API_KEY}, budget: ${FSQ_PREMIUM_MONTHLY_BUDGET:5000} }
      tripadvisor: { enabled: false, key: "${TRIPADVISOR_API_KEY:}", budget: 900 }
      open:        { enabled: true,  key: "", budget: 0 }   # 0 = sinirsiz (yerel PostGIS)
      google:      { enabled: false, key: "${GOOGLE_PLACES_API_KEY:}", budget: 1000 }
    route:
      # Ucretli kaynak YALNIZ dort tabela turunde; kalan 11 tur acik tabandan.
      COFFEE: foursquare,open
      FOOD: foursquare,open
      BAR: foursquare,open
      NIGHTLIFE: foursquare,open
      MUSEUM: open          # 1b sonrasi: tripadvisor,open
      THEME_PARK: open
      ART: open
      WALK: open
      HIKE: open
      SWIM: open
      FITNESS: open
      CINEMA: open
      GAMES: open
      ADVENTURE: open
      ACTIVITY: open
  map:
    engine: ${MAP_ENGINE:maplibre}   # maplibre | google
    tiles:
      style-url: ${MAP_TILES_STYLE_URL:https://tiles.openfreemap.org/styles/positron}
  geocode:
    contact: ${NOMINATIM_CONTACT:dev@bumpinto.test}
    min-interval: ${NOMINATIM_MIN_INTERVAL:PT1S}
    engine: ${GEOCODE_ENGINE:nominatim}
    base-url: ${GEOCODE_BASE_URL:https://nominatim.openstreetmap.org}
  routing:
    osrm:
      # Bos = OSRM yok; TravelMinutes haversine tahminine duser (estimated=true).
      car: "${OSRM_CAR_URL:}"
      bicycle: "${OSRM_BICYCLE_URL:}"
      foot: "${OSRM_FOOT_URL:}"
  retention:
    enabled: ${RETENTION_ENABLED:true}
```

`infra/config/AppProps.java` — bileşen listesi ve iki yeni/iki silinen kayıt:

```java
@ConfigurationProperties(prefix = "bumpinto")
public record AppProps(Security security, Cors cors, Cookies cookies, RateLimit rateLimit,
                       Geocode geocode, Voice voice, Turn turn,
                       Venues venues, MapProps map, Routing routing, Retention retention) {
```

`Providers` ve `Quota` kayıtları **silinir**. Gerekçe (AGENTS.md "defect class, not the single instance"): anahtar ve bütçe artık `venues.sources.<id>` altında; `bumpinto.providers.*` bırakılsaydı aynı sırrın iki adresi olurdu ve biri güncellenmeden kalırdı.

Yeni kayıtlar (aynı dosyada):

```java
    /**
     * Kaynak basina ayar. {@code budget} 0 = sinirsiz (yerel kaynaklar). {@code key} yalniz
     * {@code requiresKey} kaynaklarda zorunlu — kontrol VenueSourceConfigValidator'da.
     */
    public record VenueSourceProps(boolean enabled, String key, int budget) {

        @Override
        public String toString() {
            return "VenueSourceProps[enabled=" + enabled + ", key=" + MASK
                    + ", budget=" + budget + "]";
        }
    }

    /**
     * @param sources kaynak id -> ayar
     * @param route   ActivityType -> virgullu kaynak id listesi; sira SABITTIR (spec §4)
     */
    public record Venues(Map<String, VenueSourceProps> sources,
                         Map<ActivityType, String> route) {

        /** "foursquare,open" -> [foursquare, open]; tanimsiz tur = bos liste. */
        public List<String> routeFor(ActivityType type) {
            String raw = route.get(type);
            if (raw == null || raw.isBlank()) {
                return List.of();
            }
            return Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                    .toList();
        }
    }

    /**
     * Adi {@code MapProps}, yapilandirma yolu {@code bumpinto.map} (baglama BILESEN ADINDAN
     * gelir, tip adindan degil). {@code Map} adi ayni dosyadaki {@code java.util.Map}'i
     * golgelerdi.
     */
    public record MapProps(String engine, Tiles tiles) {

        public record Tiles(String styleUrl) {
        }
    }

    /** {@code engine}/{@code baseUrl}: kendi kumemizdeki Nominatim'e gecis tek env ile olur. */
    public record Geocode(String contact, Duration minInterval, String engine, String baseUrl) {
    }

    /** Profil basina OSRM base URL; bos dize = o profil kapali. */
    public record Routing(Osrm osrm) {

        public record Osrm(String car, String bicycle, String foot) {
        }
    }

    public record Retention(boolean enabled) {
    }
```

- [ ] **Step 9: Test kurucularını tek yerde topla**

`backend/src/test/java/com/bumpinto/support/TestProps.java` (yeni). Gerekçe: 12 test dosyası `new AppProps(...)` çağırıyor; `AppProps` her büyüdüğünde 12 dosya değişiyor. Tek fabrika bunu bire indirir.

```java
package com.bumpinto.support;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.infra.config.AppProps;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Testlerin ortak AppProps'u; yalniz ilgilendigi kaydi degistirir. */
public final class TestProps {

    private TestProps() {
    }

    public static AppProps.Security security() {
        return new AppProps.Security("client-id", "0123456789012345678901234567890123456789",
                Duration.ofHours(12));
    }

    public static AppProps.Venues venues() {
        Map<String, AppProps.VenueSourceProps> sources = new LinkedHashMap<>();
        sources.put("foursquare", new AppProps.VenueSourceProps(true, "fsq-key", 5000));
        sources.put("open", new AppProps.VenueSourceProps(true, "", 0));
        sources.put("google", new AppProps.VenueSourceProps(false, "", 1000));
        Map<ActivityType, String> route = new LinkedHashMap<>();
        for (ActivityType type : ActivityType.values()) {
            route.put(type, "open");
        }
        route.put(ActivityType.COFFEE, "foursquare,open");
        route.put(ActivityType.FOOD, "foursquare,open");
        route.put(ActivityType.BAR, "foursquare,open");
        route.put(ActivityType.NIGHTLIFE, "foursquare,open");
        return new AppProps.Venues(sources, route);
    }

    public static AppProps defaults() {
        return of(security(), venues(), new AppProps.RateLimit(false), new AppProps.Turn("", ""));
    }

    public static AppProps of(AppProps.Security security) {
        return of(security, venues(), new AppProps.RateLimit(false), new AppProps.Turn("", ""));
    }

    public static AppProps of(AppProps.Venues venues) {
        return of(security(), venues, new AppProps.RateLimit(false), new AppProps.Turn("", ""));
    }

    public static AppProps of(AppProps.RateLimit rateLimit) {
        return of(security(), venues(), rateLimit, new AppProps.Turn("", ""));
    }

    public static AppProps of(AppProps.Turn turn) {
        return of(security(), venues(), new AppProps.RateLimit(false), turn);
    }

    public static AppProps of(AppProps.Security security, AppProps.Venues venues,
                              AppProps.RateLimit rateLimit, AppProps.Turn turn) {
        return new AppProps(security, new AppProps.Cors(List.of("http://localhost:5173")),
                new AppProps.Cookies(false, null), rateLimit,
                new AppProps.Geocode("dev@bumpinto.test", Duration.ofMillis(1), "nominatim",
                        "https://nominatim.openstreetmap.org"),
                new AppProps.Voice(Duration.ofHours(2)), turn,
                venues,
                new AppProps.MapProps("maplibre",
                        new AppProps.MapProps.Tiles("https://tiles.example/style.json")),
                new AppProps.Routing(new AppProps.Routing.Osrm("", "", "")),
                new AppProps.Retention(true));
    }
}
```

12 test dosyasındaki her `new AppProps(...)` çağrısı `TestProps.defaults()` ya da ilgili `TestProps.of(...)` ile değiştirilir (ör. `TokenServiceTest` → `TestProps.of(new AppProps.Security(...))`, `RateLimitFilterTest` → `TestProps.of(new AppProps.RateLimit(true))`, `CloudflareTurnCredentialsTest` → `TestProps.of(new AppProps.Turn("k", "t"))`). `FoursquareVenueProviderTest` ve `GooglePlacesVenueProviderTest` bu görevde yalnız derlenir hale getirilir; içerikleri T3/T4'te yeniden yazılır.

- [ ] **Step 10: Açılış doğrulamasının başarısız testini yaz**

`backend/src/test/java/com/bumpinto/adapter/out/provider/VenueSourceConfigValidatorTest.java`:

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;

import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VenueSourceConfigValidatorTest {

    static VenueSource source(String id, boolean requiresKey, MapEngine engine,
                              List<ActivityType> covered) {
        Map<ActivityType, List<String>> byType = new LinkedHashMap<>();
        covered.forEach(t -> byType.put(t, List.of(t.name().toLowerCase(java.util.Locale.ROOT))));
        VenueSourceDescriptor d = new VenueSourceDescriptor(id, "attribution." + id, null, null,
                RetentionRule.KEEP, requiresKey, engine, ZoneOffset.UTC);
        return new VenueSource() {
            @Override public VenueSourceDescriptor descriptor() { return d; }
            @Override public CategoryMapping categories() { return new CategoryMapping(byType); }
            @Override public SearchResult search(com.bumpinto.domain.venue.SearchRequest r) {
                return SearchResult.empty();
            }
        };
    }

    static VenueSource open() {
        return source("open", false, MapEngine.ANY, List.of(ActivityType.values()));
    }

    static void validate(List<VenueSource> sources, AppProps props) {
        new VenueSourceConfigValidator(sources, props).validate();
    }

    @Test
    void acceptsTheShippedConfiguration() {
        VenueSource fsq = source("foursquare", true, MapEngine.ANY,
                List.of(ActivityType.COFFEE, ActivityType.FOOD, ActivityType.BAR,
                        ActivityType.NIGHTLIFE));
        assertThatCode(() -> validate(List.of(fsq, open()), TestProps.defaults()))
                .doesNotThrowAnyException();
    }

    /** (a) yonlendirmedeki her id ENABLED bir kaynak olmali. */
    @Test
    void rejectsRouteToUnknownSource() {
        AppProps props = TestProps.of(withRoute(ActivityType.SWIM, "tripadvisor,open"));
        assertThatThrownBy(() -> validate(List.of(open()), props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("tripadvisor");
    }

    /** (b) her ActivityType icin en az bir kaynak. */
    @Test
    void rejectsTypeWithoutAnySource() {
        AppProps props = TestProps.of(withRoute(ActivityType.GAMES, ""));
        assertThatThrownBy(() -> validate(List.of(open()), props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GAMES");
    }

    /** (c) yonlendirilen kaynagin YAML'i o turu kapsamali. */
    @Test
    void rejectsSourceThatDoesNotCoverItsRoutedType() {
        VenueSource fsq = source("foursquare", true, MapEngine.ANY, List.of(ActivityType.COFFEE));
        assertThatThrownBy(() -> validate(List.of(fsq, open()), TestProps.defaults()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("foursquare")
                .hasMessageContaining("FOOD");
    }

    /** (d) google acilirsa harita motoru google olmali (Places ToS). */
    @Test
    void rejectsGoogleSourceWhileMapEngineIsMaplibre() {
        VenueSource google = source("google", true, MapEngine.GOOGLE,
                List.of(ActivityType.values()));
        AppProps props = TestProps.of(withRoute(ActivityType.SWIM, "google"));
        assertThatThrownBy(() -> validate(List.of(google, open()), props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("map.engine");
    }

    /** (e) requiresKey ve anahtar bos -> hata (AppProps.required deseni). */
    @Test
    void rejectsMissingKeyForSourceThatNeedsOne() {
        VenueSource fsq = source("foursquare", true, MapEngine.ANY,
                List.of(ActivityType.COFFEE, ActivityType.FOOD, ActivityType.BAR,
                        ActivityType.NIGHTLIFE));
        Map<String, AppProps.VenueSourceProps> sources =
                new LinkedHashMap<>(TestProps.venues().sources());
        sources.put("foursquare", new AppProps.VenueSourceProps(true, "", 5000));
        AppProps props = TestProps.of(
                new AppProps.Venues(sources, TestProps.venues().route()));
        assertThatThrownBy(() -> validate(List.of(fsq, open()), props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("foursquare");
    }

    static AppProps.Venues withRoute(ActivityType type, String value) {
        Map<ActivityType, String> route = new LinkedHashMap<>(TestProps.venues().route());
        route.put(type, value);
        return new AppProps.Venues(TestProps.venues().sources(), route);
    }
}
```

- [ ] **Step 11: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST VenueSourceConfigValidatorTest`
Expected: COMPILATION ERROR — `VenueSourceConfigValidator` yok.

- [ ] **Step 12: `VenueSourceConfigValidator`'ı yaz**

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Spec §3'un bes kurali, ACILISTA. Yanlis yapilandirma calisma aninda "mekan bulunamadi"
 * olarak degil, uygulama hic kalkmayarak bildirilir.
 */
@Component
public class VenueSourceConfigValidator {

    private final Map<String, VenueSource> byId;
    private final AppProps props;

    public VenueSourceConfigValidator(List<VenueSource> sources, AppProps props) {
        this.byId = sources.stream().collect(Collectors.toMap(
                s -> s.descriptor().id(), Function.identity(), (a, b) -> a));
        this.props = props;
    }

    @PostConstruct
    public void validate() {
        String engine = props.map().engine() == null ? "" : props.map().engine();
        for (ActivityType type : ActivityType.values()) {
            List<String> route = props.venues().routeFor(type);
            if (route.isEmpty()) {
                throw new IllegalStateException("bumpinto.venues.route." + type
                        + " is empty: every activity type needs at least one source");
            }
            for (String id : route) {
                VenueSource source = byId.get(id);
                if (source == null) {
                    throw new IllegalStateException("bumpinto.venues.route." + type
                            + " points at '" + id + "' which is not an enabled venue source");
                }
                if (!source.categories().covers(List.of(type))) {
                    throw new IllegalStateException("venue-sources/" + id + ".yml does not cover "
                            + type + " but route sends it there");
                }
            }
        }
        byId.values().forEach(source -> {
            VenueSourceDescriptor d = source.descriptor();
            AppProps.VenueSourceProps config = props.venues().sources().get(d.id());
            if (config == null) {
                throw new IllegalStateException("bumpinto.venues.sources." + d.id() + " is missing");
            }
            if (d.requiresKey()) {
                AppProps.required("bumpinto.venues.sources." + d.id() + ".key", config.key());
            }
            if (d.requiredMapEngine() != MapEngine.ANY
                    && !d.requiredMapEngine().name().toLowerCase(Locale.ROOT).equals(engine)) {
                throw new IllegalStateException("source '" + d.id() + "' requires bumpinto.map"
                        + ".engine=" + d.requiredMapEngine().name().toLowerCase(Locale.ROOT)
                        + " but it is '" + engine + "'");
            }
        });
    }
}
```

- [ ] **Step 13: ArchUnit kurallarını ekle**

`backend/src/test/java/com/bumpinto/HexagonalArchitectureTest.java` sonuna (spec §2):

```java
    // Bir kaynak paketi yalniz domain'i, paylasilan HTTP altyapisini ve config'i gorur.
    // Orkestratoru ya da baska bir kaynagi goren kaynak, "yeni saglayici tek pakete dokunur"
    // sozunu bozar (spec §0.8).
    @ArchTest
    static final ArchRule venueSourcesAreSelfContained = classes()
            .that().resideInAnyPackage("com.bumpinto.adapter.out.foursquare..",
                    "com.bumpinto.adapter.out.google..", "com.bumpinto.adapter.out.open..")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage("com.bumpinto.domain..", "com.bumpinto.infra.config..",
                    "com.bumpinto.adapter.out.provider", "java..", "kong.unirest..",
                    "org.springframework..", "org.slf4j..", "jakarta..");

    // Orkestrator SOMUT kaynagi gormez, yalniz SPI'yi. Gorseydi sira/eleme mantigi
    // saglayiciya ozel dallara acilirdi (2026-09-06 oncesi hata sinifi).
    @ArchTest
    static final ArchRule orchestratorKnowsOnlyTheSpi = noClasses()
            .that().haveSimpleName("ProviderOrchestrator")
            .should().dependOnClassesThat()
            .resideInAnyPackage("com.bumpinto.adapter.out.foursquare..",
                    "com.bumpinto.adapter.out.google..", "com.bumpinto.adapter.out.open..");

    @ArchTest
    static final ArchRule applicationDoesNotSeeVenueSources = noClasses()
            .that().resideInAPackage("com.bumpinto.application..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("com.bumpinto.adapter.out.foursquare..",
                    "com.bumpinto.adapter.out.google..", "com.bumpinto.adapter.out.open..",
                    "com.bumpinto.adapter.out.provider..");
```

`noClassesSitInLayerRoots` listesine dokunulmaz (yeni paketler alt paket).

- [ ] **Step 14: Görevin bütün testlerini çalıştır**

Run: `MVN_TEST CategoryMappingTest,CategoryMappingLoaderTest,VenueSourceConfigValidatorTest,HexagonalArchitectureTest`
Expected: hepsi yeşil. `CategoryMappingLoaderTest.loadsEveryActivityTypeFromClasspath` T3'te `foursquare.yml` yazılana kadar KIRMIZI kalır — bu bilinçlidir; T1 sonunda o tek test `@Disabled("T3: foursquare.yml")` ile işaretlenir ve T3 Step 1'de açılır.

- [ ] **Step 15: Değişen dosyaları listele**

`domain/venue/{VenueSource,VenueSourceDescriptor,RetentionRule,MapEngine,CategoryMapping,SearchRequest,SearchResult,ProviderQuota}.java`, `adapter/out/provider/{CategoryMappingLoader,VenueSourceConfigValidator}.java`, `adapter/out/provider/ProviderQuota.java` (silindi), `infra/config/AppProps.java`, `application.yml`, `support/TestProps.java`, 12 test dosyası, `HexagonalArchitectureTest.java`, 3 yeni test + 1 fixture.
Mesaj: `feat(venues): VenueSource SPI, category mapping from YAML, config schema and startup validation`

---

### Task 2: `provider_usage` migration, `ProviderUsagePort`, `BudgetGate`

**Files:**
- Create: `backend/src/main/resources/db/migration/V10__provider_usage_and_venue_fields.sql`
- Create: `backend/src/main/java/com/bumpinto/domain/port/ProviderUsagePort.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/ProviderUsageEntity.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/ProviderUsageRepository.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/ProviderUsageAdapter.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/provider/BudgetGate.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/persistence/ProviderUsageAdapterTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/provider/BudgetGateTest.java`

- [ ] **Step 1: Migration'ı yaz**

`V10__provider_usage_and_venue_fields.sql`:

```sql
-- Aylik cagri sayaci: replica'dan ve pod yeniden baslatmasindan BAGIMSIZ olmali.
-- Eski surumde sayac Google saglayicisinin icinde AtomicLong'du; her restart butceyi
-- sifirliyor, iki pod ayni butceyi iki kez harciyordu.
create table provider_usage (
    provider text not null,
    month    date not null,          -- saglayicinin faturalama ayinin ilk gunu (descriptor.billingZone)
    calls    integer not null default 0,
    primary key (provider, month)
);

-- Premium alanlar geri geldi (spec §5.1): popularite 0-1, puan olcegi saglayicinin kendi
-- olcegi (donusturulmez), photo_ref FSQ foto kimligi (saklanabilir), fetched_at saklama
-- kuralinin (STRIP_AFTER_24H) saydigi an.
alter table venues add column popularity real;
alter table venues add column rating_scale smallint;
alter table venues add column photo_ref text;
alter table venues add column fetched_at timestamptz not null default now();

-- venues.maps_url KALIR ama artik assembler uretir (MapLinks); sutun bir sonraki temizlikte duser.
```

- [ ] **Step 2: Başarısız Testcontainers testini yaz**

`backend/src/test/java/com/bumpinto/adapter/out/persistence/ProviderUsageAdapterTest.java`:

```java
package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.ProviderUsagePort;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.YearMonth;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ProviderUsageAdapterTest {

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        PostgreSQLContainer<?> pg = PostgresContainer.shared();
        registry.add("spring.datasource.url", pg::getJdbcUrl);
        registry.add("spring.datasource.username", pg::getUsername);
        registry.add("spring.datasource.password", pg::getPassword);
    }

    @Autowired
    ProviderUsagePort usage;

    @Test
    void incrementReturnsTheNewValueAndCurrentReadsItBack() {
        YearMonth month = YearMonth.of(2026, 9);

        assertThat(usage.increment("t-basic", month)).isEqualTo(1);
        assertThat(usage.increment("t-basic", month)).isEqualTo(2);
        assertThat(usage.current("t-basic", month)).isEqualTo(2);
        assertThat(usage.current("t-basic", YearMonth.of(2026, 10))).isZero();
        assertThat(usage.current("t-unknown", month)).isZero();
    }

    /**
     * ON CONFLICT ... RETURNING ATOMIK olmali: 20 es zamanli artis 20 FARKLI deger dondurmeli.
     * Read-modify-write yazsaydik ayni sayi iki kez donerdi ve butce tavani sessizce asilirdi.
     */
    @Test
    void concurrentIncrementsNeverHandOutTheSameNumber() throws Exception {
        YearMonth month = YearMonth.of(2026, 11);
        try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
            List<Callable<Long>> jobs = java.util.stream.IntStream.range(0, 20)
                    .<Callable<Long>>mapToObj(i -> () -> usage.increment("t-race", month))
                    .toList();
            List<Long> seen = pool.invokeAll(jobs).stream().map(ProviderUsageAdapterTest::get)
                    .toList();

            assertThat(seen).hasSize(20).doesNotHaveDuplicates()
                    .containsExactlyInAnyOrderElementsOf(
                            java.util.stream.LongStream.rangeClosed(1, 20).boxed().toList());
        }
        assertThat(usage.current("t-race", month)).isEqualTo(20);
    }

    static long get(Future<Long> f) {
        try {
            return f.get();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
```

- [ ] **Step 3: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST ProviderUsageAdapterTest`
Expected: COMPILATION ERROR — `ProviderUsagePort` yok.

- [ ] **Step 4: Port, entity, repository ve adapter'ı yaz**

`domain/port/ProviderUsagePort.java`:

```java
package com.bumpinto.domain.port;

import java.time.YearMonth;

/**
 * Saglayici basina aylik cagri sayaci. Butce SERT tavandir ve replica'lar arasinda
 * paylasilmali; bu yuzden surec ici degil, DB'de.
 */
public interface ProviderUsagePort {

    /** Bir artirir ve YENI degeri doner (atomik). */
    long increment(String provider, YearMonth month);

    /** Bu aya kadar yapilan cagri; satir yoksa 0. */
    long current(String provider, YearMonth month);
}
```

`adapter/out/persistence/ProviderUsageEntity.java`:

```java
package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.LocalDate;

/** Yalniz native sorgular icin gerekli olan JPA capasi; okuma/yazma @Query ile yapilir. */
@Entity
@Table(name = "provider_usage")
@IdClass(ProviderUsageEntity.Key.class)
class ProviderUsageEntity {
    @Id String provider;
    @Id LocalDate month;
    int calls;

    record Key(String provider, LocalDate month) implements Serializable {
        Key() {
            this(null, null);
        }
    }
}
```

`adapter/out/persistence/ProviderUsageRepository.java`:

```java
package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

interface ProviderUsageRepository extends Repository<ProviderUsageEntity, ProviderUsageEntity.Key> {

    /**
     * TEK ifadede artir ve yeni degeri oku. Iki ifadeye bolunseydi (select + update) iki pod
     * ayni sayiyi okuyup butceyi iki kez harcardi.
     */
    @Query(value = """
            insert into provider_usage (provider, month, calls) values (:provider, :month, 1)
            on conflict (provider, month) do update set calls = provider_usage.calls + 1
            returning calls
            """, nativeQuery = true)
    long increment(@Param("provider") String provider, @Param("month") LocalDate month);

    @Query(value = "select coalesce((select calls from provider_usage "
            + "where provider = :provider and month = :month), 0)", nativeQuery = true)
    long current(@Param("provider") String provider, @Param("month") LocalDate month);
}
```

`adapter/out/persistence/ProviderUsageAdapter.java`:

```java
package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.ProviderUsagePort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;

@Component
public class ProviderUsageAdapter implements ProviderUsagePort {

    private final ProviderUsageRepository rows;

    public ProviderUsageAdapter(ProviderUsageRepository rows) {
        this.rows = rows;
    }

    /** INSERT ... RETURNING yazan bir sorgu: yazma islemi olarak isaretlenmeli. */
    @Override
    @Transactional
    public long increment(String provider, YearMonth month) {
        return rows.increment(provider, month.atDay(1));
    }

    @Override
    @Transactional(readOnly = true)
    public long current(String provider, YearMonth month) {
        return rows.current(provider, month.atDay(1));
    }
}
```

> **Eğer Hibernate `insert … returning`'i sorgu olarak reddederse** (`NativeQuery` DML uyarısı): repository metodunu ikiye böl — `@Modifying @Query("insert … on conflict … do update set calls = provider_usage.calls + 1") void bump(...)` ve mevcut `current(...)`; adapter aynı `@Transactional` içinde önce `bump` sonra `current` çağırır. O zaman eşzamanlılık testinin ikinci iddiası `doesNotHaveDuplicates()` yerine `assertThat(usage.current("t-race", month)).isEqualTo(20)` ile sınırlanır (artış hâlâ atomik, yalnız dönen değer okunurken yarışabilir). Bu düşüşü ancak gerçek hata mesajı görüldükten sonra uygula.

- [ ] **Step 5: Testi çalıştır, yeşile döndüğünü gör**

Run: `MVN_TEST ProviderUsageAdapterTest`
Expected: 2 test yeşil (Flyway V10 uygulanır).

- [ ] **Step 6: `BudgetGate` için başarısız testi yaz**

`backend/src/test/java/com/bumpinto/adapter/out/provider/BudgetGateTest.java`:

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.port.ProviderUsagePort;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BudgetGateTest {

    /** Pasifik'te hala Agustos, UTC'de Eylul: Google'in ayi burada doner (spec §6). */
    static final Instant MONTH_EDGE = Instant.parse("2026-09-01T03:00:00Z");

    static VenueSourceDescriptor descriptor(String id, ZoneId zone) {
        return new VenueSourceDescriptor(id, "attribution." + id, null, 10,
                RetentionRule.STRIP_AT_EXPIRY, true, MapEngine.ANY, zone);
    }

    static final class FakeUsage implements ProviderUsagePort {
        final Map<String, Long> counts = new HashMap<>();

        @Override public long increment(String provider, YearMonth month) {
            return counts.merge(provider + "@" + month, 1L, Long::sum);
        }

        @Override public long current(String provider, YearMonth month) {
            return counts.getOrDefault(provider + "@" + month, 0L);
        }
    }

    static BudgetGate gate(ProviderUsagePort usage, AppProps props) {
        return new BudgetGate(usage, props, Clock.fixed(MONTH_EDGE, ZoneOffset.UTC));
    }

    @Test
    void allowsUntilTheBudgetIsSpentThenRefuses() {
        FakeUsage usage = new FakeUsage();
        Map<String, AppProps.VenueSourceProps> sources =
                new HashMap<>(TestProps.venues().sources());
        sources.put("foursquare", new AppProps.VenueSourceProps(true, "k", 2));
        BudgetGate gate = gate(usage, TestProps.of(
                new AppProps.Venues(sources, TestProps.venues().route())));
        VenueSourceDescriptor fsq = descriptor("foursquare", ZoneOffset.UTC);

        assertThat(gate.allows(fsq)).isTrue();
        gate.record(fsq);
        assertThat(gate.allows(fsq)).isTrue();
        gate.record(fsq);
        assertThat(gate.allows(fsq)).isFalse();
    }

    /** budget 0 = sinirsiz: yerel kaynak DB'ye hic dokunmaz. */
    @Test
    void treatsZeroBudgetAsUnlimitedAndSkipsTheCounter() {
        FakeUsage usage = new FakeUsage();
        BudgetGate gate = gate(usage, TestProps.defaults());
        VenueSourceDescriptor open = descriptor("open", ZoneOffset.UTC);

        assertThat(gate.allows(open)).isTrue();
        gate.record(open);
        assertThat(usage.counts).isEmpty();
    }

    /** Ay siniri descriptor.billingZone'dan: Pasifik saglayicisi hala onceki ayi sayar. */
    @Test
    void monthBoundaryFollowsTheBillingZone() {
        FakeUsage usage = new FakeUsage();
        Map<String, AppProps.VenueSourceProps> sources =
                new HashMap<>(TestProps.venues().sources());
        sources.put("google", new AppProps.VenueSourceProps(true, "k", 10));
        BudgetGate gate = gate(usage, TestProps.of(
                new AppProps.Venues(sources, TestProps.venues().route())));

        gate.record(descriptor("foursquare", ZoneOffset.UTC));
        gate.record(descriptor("google", ZoneId.of("America/Los_Angeles")));

        assertThat(usage.counts).containsOnlyKeys("foursquare@2026-09", "google@2026-08");
    }
}
```

- [ ] **Step 7: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST BudgetGateTest`
Expected: COMPILATION ERROR — `BudgetGate` yok.

- [ ] **Step 8: `BudgetGate`'i yaz**

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.port.ProviderUsagePort;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.YearMonth;

/**
 * Aylik butce kapisi. Butce IS tavani degil GUVENLIK tavanidir: dolunca urun acik tabana
 * duser, cokmez (spec §6).
 */
@Component
public class BudgetGate {

    private static final Logger log = LoggerFactory.getLogger(BudgetGate.class);

    private final ProviderUsagePort usage;
    private final AppProps props;
    private final Clock clock;

    public BudgetGate(ProviderUsagePort usage, AppProps props, Clock clock) {
        this.usage = usage;
        this.props = props;
        this.clock = clock;
    }

    public boolean allows(VenueSourceDescriptor descriptor) {
        int budget = budgetOf(descriptor);
        if (budget <= 0) {
            return true;
        }
        long calls = usage.current(descriptor.id(), month(descriptor));
        if (calls < budget) {
            return true;
        }
        log.warn("quota {}: 0/{} (0%) [BUDGET]", descriptor.id(), budget);
        return false;
    }

    /** GERCEKTEN yapilmis (faturalanan) bir cagriyi say. Yetki/sunucu hatasi cagrilmaz. */
    public void record(VenueSourceDescriptor descriptor) {
        if (budgetOf(descriptor) <= 0) {
            return;
        }
        usage.increment(descriptor.id(), month(descriptor));
    }

    private int budgetOf(VenueSourceDescriptor descriptor) {
        AppProps.VenueSourceProps config = props.venues().sources().get(descriptor.id());
        return config == null ? 0 : config.budget();
    }

    private YearMonth month(VenueSourceDescriptor descriptor) {
        return YearMonth.from(clock.instant().atZone(descriptor.billingZone()));
    }
}
```

- [ ] **Step 9: İkisini birden çalıştır**

Run: `MVN_TEST ProviderUsageAdapterTest,BudgetGateTest`
Expected: 5 test yeşil.

- [ ] **Step 10: Değişen dosyaları listele**

`db/migration/V10__provider_usage_and_venue_fields.sql`, `domain/port/ProviderUsagePort.java`, `adapter/out/persistence/{ProviderUsageEntity,ProviderUsageRepository,ProviderUsageAdapter}.java`, `adapter/out/provider/BudgetGate.java`, 2 test.
Mesaj: `feat(venues): persistent monthly provider budget (V10, provider_usage, BudgetGate)`

---

### Task 3: Foursquare Premium kaynağı + `foursquare.yml` + sözleşme testi

**Files:**
- Create: `backend/src/main/java/com/bumpinto/adapter/out/provider/VenueSourceSupport.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/foursquare/FoursquareVenueSource.java`
- Delete: `backend/src/main/java/com/bumpinto/adapter/out/provider/FoursquareVenueProvider.java`
- Create: `backend/src/main/resources/venue-sources/foursquare.yml`
- Rename+rewrite: `backend/src/test/java/com/bumpinto/adapter/out/provider/FoursquareVenueProviderTest.java` → `backend/src/test/java/com/bumpinto/adapter/out/foursquare/FoursquareVenueSourceTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/foursquare/FoursquarePremiumContractTest.java`

- [ ] **Step 1: `foursquare.yml`'ı yaz ve T1'de `@Disabled` bırakılan testi aç**

`backend/src/main/resources/venue-sources/foursquare.yml`:

```yaml
id: foursquare
# FSQ 24 HANELI kimlik ister; 5 haneli eski taksonomi kodu HTTP 400 "invalid id" verir
# (2026-09-06 olcumu). Bu desen o hatayi acilista yakalar.
idPattern: "^[0-9a-f]{24}$"
categories:
  # --- Gercek istekle DOGRULANMIS bes kimlik (2026-09-06, ll=51.8,4.85 r=25km) ---
  COFFEE: [4bf58dd8d48988d1e0931735]      # Coffee Shop (Café DEGIL: NL'de cafe = bruin kafe/bar)
  FOOD: [4d4b7105d754a06374d81259]        # Food (ust duzey; "Restaurant" kimligi bos donuyor)
  BAR: [4bf58dd8d48988d116941735]         # Bar
  WALK: [4bf58dd8d48988d163941735]        # Park
  ACTIVITY: [4bf58dd8d48988d1e4931735]    # Bowling Alley
  # --- Asagidaki 10 kimlik v2 taksonomisinden okundu, HENUZ CANLI ISTEKLE DOGRULANMADI ---
  # canli istekle dogrulanacak (T3 sozlesme testi): her kimlik icin yanittaki
  # categories[].name yorumda yazan adi icermeli. Uymayan kimlik testi KIRMIZI yapar.
  NIGHTLIFE: [4d4b7105d754a06376d81259]   # Nightlife Spot (ust duzey)
  MUSEUM: [4bf58dd8d48988d181941735]      # Museum
  ART: [4bf58dd8d48988d1e2931735]         # Art Gallery
  CINEMA: [4bf58dd8d48988d17f941735]      # Movie Theater
  FITNESS: [4bf58dd8d48988d175941735]     # Gym / Fitness Center
  SWIM: [4bf58dd8d48988d105941735]        # Pool
  HIKE: [4bf58dd8d48988d159941735]        # Trail
  THEME_PARK: [4bf58dd8d48988d182941735]  # Theme Park
  GAMES: [4bf58dd8d48988d1e1931735]       # Arcade
  ADVENTURE: [4f4528bc4b90abdf24c9de85]   # Athletics & Sports
```

`CategoryMappingLoaderTest.loadsEveryActivityTypeFromClasspath` üstündeki `@Disabled` kaldırılır.

Run: `MVN_TEST CategoryMappingLoaderTest`
Expected: 3 test yeşil (15 tür de yüklenir).

- [ ] **Step 2: Kaynağın başarısız birim testini yaz**

`backend/src/test/java/com/bumpinto/adapter/out/foursquare/FoursquareVenueSourceTest.java` (eski `FoursquareVenueProviderTest`'in yerine; Unirest MockClient deseni aynen korunur):

```java
package com.bumpinto.adapter.out.foursquare;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.adapter.out.provider.VenueSourceSupport;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.ProviderQuota;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.support.TestProps;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FoursquareVenueSourceTest {

    static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");
    static final GeoPoint CENTER = new GeoPoint(51.44, 5.47);
    static final String SEARCH = "https://places-api.foursquare.com/places/search";

    UnirestInstance http;
    MockClient mock;
    FoursquareVenueSource source;

    @BeforeEach
    void setUp() {
        http = Unirest.spawnInstance();
        mock = MockClient.register(http);
        source = new FoursquareVenueSource(new VenueSourceSupport(http),
                TestProps.defaults(), new CategoryMappingLoader(),
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @AfterEach
    void tearDown() {
        MockClient.clear(http);
        http.close();
    }

    static SearchRequest request(ActivityType... types) {
        return new SearchRequest(CENTER, 5.0, List.of(types), 20);
    }

    static String body() {
        return """
                {"results":[{
                  "fsq_place_id":"5a1b2c3d4e5f60718293a4b5",
                  "name":"Koffie Bar","latitude":51.44,"longitude":5.47,
                  "categories":[{"id":"4bf58dd8d48988d1e0931735","name":"Coffee Shop"}],
                  "location":{"locality":"Eindhoven","formatted_address":"Kleine Berg 16, Eindhoven"},
                  "website":"https://koffie.example","rating":8.7,"price":2,"popularity":0.93,
                  "hours":{"display":"08:00-18:00"},"closed_bucket":"VeryLikelyOpen",
                  "photos":[{"id":"ph-1","prefix":"https://fastly.4sqi.net/img/general/",
                             "suffix":"/abc.jpg"}]
                }]}
                """;
    }

    /** Premium alanlarin TAMAMI adaya gecer; foto adresi prefix+original+suffix. */
    @Test
    void mapsPremiumFieldsIntoTheCandidate() {
        mock.expect(kong.unirest.core.HttpMethod.GET, SEARCH)
                .thenReturn(body()).withHeader("x-ratelimit-limit", "1000")
                .withHeader("x-ratelimit-remaining", "993")
                .withHeader("x-ratelimit-reset", String.valueOf(NOW.plusSeconds(3600).getEpochSecond()));

        SearchResult result = source.search(request(ActivityType.COFFEE));
        VenueCandidate c = result.candidates().get(0);

        assertThat(c.provider()).isEqualTo("foursquare");
        assertThat(c.externalId()).isEqualTo("5a1b2c3d4e5f60718293a4b5");
        assertThat(c.rating()).isEqualTo(8.7);
        assertThat(c.ratingScale()).isEqualTo(10);
        assertThat(c.popularity()).isEqualTo(0.93);
        assertThat(c.priceLevel()).isEqualTo(2);
        assertThat(c.photoUrl())
                .isEqualTo("https://fastly.4sqi.net/img/general/original/abc.jpg");
        assertThat(c.photoRef()).isEqualTo("ph-1");
        assertThat(c.hoursToday()).isEqualTo("08:00-18:00");
        assertThat(c.placeLink()).isEqualTo("https://koffie.example");
        assertThat(c.address()).isEqualTo("Kleine Berg 16, Eindhoven");
        assertThat(c.locality()).isEqualTo("Eindhoven");
        assertThat(c.category()).isEqualTo("Coffee Shop");
        assertThat(result.quota().remaining()).isEqualTo(993);
        assertThat(result.quota().source()).isEqualTo(ProviderQuota.Source.HEADER);
    }

    /** Coklu turde atif KIMLIKLE cozulur; ad uzerinden tahmin YOK. */
    @Test
    void resolvesAttributionByCategoryIdEvenWithMultipleTypes() {
        mock.expect(kong.unirest.core.HttpMethod.GET, SEARCH).thenReturn(body());

        SearchResult result = source.search(request(ActivityType.COFFEE, ActivityType.FOOD));

        assertThat(result.candidates().get(0).activityType()).isEqualTo(ActivityType.COFFEE);
    }

    /** Kredi-429'u ile saatlik-429'u AYRI (limit: 0 -> 24 saat). */
    @Test
    void separatesCreditExhaustionFromHourlyRateLimit() {
        mock.expect(kong.unirest.core.HttpMethod.GET, SEARCH)
                .thenReturn("{}").withStatus(429).withHeader("x-ratelimit-limit", "0");

        assertThatThrownBy(() -> source.search(request(ActivityType.COFFEE)))
                .isInstanceOf(com.bumpinto.adapter.out.provider.QuotaExceededException.class)
                .hasMessageContaining("credits");
    }

    /** Descriptor sozlesmesi: atif, olcek, saklama, faturalama saati. */
    @Test
    void descriptorDeclaresAttributionScaleAndRetention() {
        assertThat(source.descriptor().id()).isEqualTo("foursquare");
        assertThat(source.descriptor().attributionKey()).isEqualTo("attribution.foursquare");
        assertThat(source.descriptor().attributionUrl()).isEqualTo("https://foursquare.com");
        assertThat(source.descriptor().ratingScale()).isEqualTo(10);
        assertThat(source.descriptor().retention()).isEqualTo(RetentionRule.STRIP_AT_EXPIRY);
        assertThat(source.descriptor().requiredMapEngine()).isEqualTo(MapEngine.ANY);
        assertThat(source.descriptor().billingZone()).isEqualTo(ZoneOffset.UTC);
    }
}
```

- [ ] **Step 3: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST FoursquareVenueSourceTest`
Expected: COMPILATION ERROR — `FoursquareVenueSource`, `VenueSourceSupport` yok; `VenueCandidate.popularity/ratingScale/photoRef` T7'de eklenecek → bu üç alan **bu görevde** eklenir (T7 yalnız `Venue`/`VenueEntity`/DTO tarafını taşır). `VenueCandidate`'e T3'te eklenen alanlar:

```java
public record VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                             Double rating, Integer priceLevel, String photoUrl,
                             String category, String address, String locality, Integer ratingCount,
                             String hoursToday, String placeLink, ActivityType activityType,
                             Double popularity, Integer ratingScale, String photoRef) {
```

`mapsUrl` bileşeni **kalkar** (spec §10: link koordinattan üretilir). Kısa test kurucusu güncellenir:

```java
    /** Zenginlestirilmemis aday (testler ve acik taban icin). */
    public VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                          Double rating, Integer priceLevel, String photoUrl) {
        this(provider, externalId, name, location, rating, priceLevel, photoUrl,
                null, null, null, null, null, null, null, null, null, null);
    }
```

`ProviderOrchestratorTest`, `GooglePlacesVenueProviderTest` ve `DeckFlow` bu imza değişikliğiyle derlenmez; T3'te yalnız derlenir hale getirilir (`mapsUrl` argümanı silinir), anlamlı değişiklik T5/T7'de.

- [ ] **Step 4: `VenueSourceSupport`'u yaz**

```java
package com.bumpinto.adapter.out.provider;

import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Kaynaklarin paylastigi HTTP isleri. KALITIM DEGIL bilesim: kaynak sinifi bunu enjekte alir,
 * boylece "yeni saglayici = bir paket" sozu kalitim agacina donusmez (spec §3).
 */
@Component
public class VenueSourceSupport {

    private final UnirestInstance http;

    public VenueSourceSupport(UnirestInstance http) {
        this.http = http;
    }

    public UnirestInstance http() {
        return http;
    }

    /** 2xx degilse ProviderException; 429 cagirana birakilir (siniflandirma kaynaga ozel). */
    public void requireSuccess(HttpResponse<?> response, String sourceId) {
        if (!response.isSuccess()) {
            throw new ProviderException(sourceId + " returned " + response.getStatus());
        }
    }

    /** {@code x-ratelimit-*} basliklarindan kota; basliklar yoksa null. */
    public com.bumpinto.domain.venue.ProviderQuota rateLimitQuota(HttpResponse<?> response,
                                                                  String sourceId, Clock clock) {
        String limit = response.getHeaders().getFirst("x-ratelimit-limit");
        String remaining = response.getHeaders().getFirst("x-ratelimit-remaining");
        String reset = response.getHeaders().getFirst("x-ratelimit-reset");
        if (limit.isEmpty() || remaining.isEmpty()) {
            return null;
        }
        Instant now = clock.instant();
        Instant resetAt = reset.isEmpty() ? now.plus(Duration.ofHours(1))
                : Instant.ofEpochSecond(Long.parseLong(reset));
        return new com.bumpinto.domain.venue.ProviderQuota(sourceId, Long.parseLong(limit),
                Long.parseLong(remaining), resetAt, now,
                com.bumpinto.domain.venue.ProviderQuota.Source.HEADER);
    }

    /** Bos dize -> null: "veri yokken bos etiket" yasak (spec §4.9). */
    public static String text(JSONObject json, String key) {
        String value = json.optString(key, "");
        return value.isBlank() ? null : value;
    }

    public static JSONObject firstObject(JSONObject json, String key) {
        JSONArray array = json.optJSONArray(key);
        return array == null || array.isEmpty() ? null : array.optJSONObject(0);
    }

    public static Double number(JSONObject json, String key) {
        return json.has(key) && !json.isNull(key) ? json.optDouble(key) : null;
    }

    public JsonNode nothing() {
        return null;
    }
}
```

- [ ] **Step 5: `FoursquareVenueSource`'u yaz**

`adapter/out/foursquare/FoursquareVenueSource.java`:

```java
package com.bumpinto.adapter.out.foursquare;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.adapter.out.provider.ProviderException;
import com.bumpinto.adapter.out.provider.QuotaExceededException;
import com.bumpinto.adapter.out.provider.VenueSourceSupport;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.ProviderQuota;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

/** Premium arama: foto, puan, popularite, saat TEK cagrida gelir (spec §5.1). */
@Component
@Order(1)
@ConditionalOnProperty(prefix = "bumpinto.venues.sources.foursquare", name = "enabled")
public class FoursquareVenueSource implements VenueSource {

    public static final String ID = "foursquare";

    /** Kredi bitince x-ratelimit-limit: 0 gelir ve kendiliginden dolmaz; gunde bir prob makul. */
    static final Duration CREDIT_COOLDOWN = Duration.ofHours(24);

    private static final String SEARCH_URL = "https://places-api.foursquare.com/places/search";
    private static final String API_VERSION = "2025-06-17";
    private static final String FIELDS = "fsq_place_id,name,latitude,longitude,categories,"
            + "location,website,hours,rating,price,popularity,photos,closed_bucket";
    /** Premium foto boyutu: "original" CDN'in kendi en buyuk halini verir. */
    private static final String PHOTO_SIZE = "original";

    private static final VenueSourceDescriptor DESCRIPTOR = new VenueSourceDescriptor(
            ID, "attribution.foursquare", "https://foursquare.com", 10,
            RetentionRule.STRIP_AT_EXPIRY, true, MapEngine.ANY, ZoneOffset.UTC);

    private final VenueSourceSupport support;
    private final String apiKey;
    private final CategoryMapping categories;
    private final Clock clock;

    public FoursquareVenueSource(VenueSourceSupport support, AppProps props,
                                 CategoryMappingLoader loader, Clock clock) {
        this.support = support;
        this.apiKey = props.venues().sources().get(ID).key();
        this.categories = loader.load(ID);
        this.clock = clock;
    }

    @Override
    public VenueSourceDescriptor descriptor() {
        return DESCRIPTOR;
    }

    @Override
    public CategoryMapping categories() {
        return categories;
    }

    @Override
    public SearchResult search(SearchRequest request) {
        List<String> ids = categories.idsFor(request.types());
        if (ids.isEmpty()) {
            return SearchResult.empty();
        }
        HttpResponse<JsonNode> response = support.http().get(SEARCH_URL)
                .header("Authorization", "Bearer " + apiKey)
                .header("X-Places-Api-Version", API_VERSION)
                .header("Accept", "application/json")
                .queryString("ll", request.center().lat() + "," + request.center().lng())
                .queryString("radius", (int) Math.min(request.radiusKm() * 1000, 100000))
                .queryString("fsq_category_ids", String.join(",", ids))
                .queryString("limit", Math.min(request.limit(), 50))
                .queryString("fields", FIELDS)
                .asJson();
        if (response.getStatus() == 429) {
            throw classify429(response);
        }
        support.requireSuccess(response, ID);
        ProviderQuota quota = support.rateLimitQuota(response, ID, clock);
        JSONObject root = response.getBody() == null ? new JSONObject()
                : response.getBody().getObject();
        if (!root.has("results")) {
            return new SearchResult(List.of(), quota);
        }
        JSONArray results = root.getJSONArray("results");
        List<VenueCandidate> out = new ArrayList<>(results.length());
        for (int i = 0; i < results.length(); i++) {
            out.add(toCandidate(results.getJSONObject(i)));
        }
        return new SearchResult(out, quota);
    }

    private QuotaExceededException classify429(HttpResponse<?> response) {
        String limit = response.getHeaders().getFirst("x-ratelimit-limit");
        String reset = response.getHeaders().getFirst("x-ratelimit-reset");
        Instant now = clock.instant();
        if ("0".equals(limit) || reset.isEmpty()) {
            return new QuotaExceededException("foursquare credits exhausted",
                    now.plus(CREDIT_COOLDOWN));
        }
        return new QuotaExceededException("foursquare hourly rate limit hit",
                Instant.ofEpochSecond(Long.parseLong(reset)));
    }

    private VenueCandidate toCandidate(JSONObject place) {
        JSONObject location = place.optJSONObject("location");
        JSONObject firstCategory = VenueSourceSupport.firstObject(place, "categories");
        JSONObject photo = VenueSourceSupport.firstObject(place, "photos");
        JSONObject hours = place.optJSONObject("hours");
        String category = firstCategory == null ? null
                : VenueSourceSupport.text(firstCategory, "name");
        Double price = VenueSourceSupport.number(place, "price");
        return new VenueCandidate(ID, place.getString("fsq_place_id"), place.getString("name"),
                new GeoPoint(place.getDouble("latitude"), place.getDouble("longitude")),
                VenueSourceSupport.number(place, "rating"),
                price == null ? null : price.intValue(),
                photoUrl(photo), category,
                location == null ? null : VenueSourceSupport.text(location, "formatted_address"),
                location == null ? null : VenueSourceSupport.text(location, "locality"),
                null,
                hours == null ? null : VenueSourceSupport.text(hours, "display"),
                VenueSourceSupport.text(place, "website"),
                attribution(place),
                VenueSourceSupport.number(place, "popularity"), 10,
                photo == null ? null : VenueSourceSupport.text(photo, "id"));
    }

    private static String photoUrl(JSONObject photo) {
        if (photo == null) {
            return null;
        }
        String prefix = photo.optString("prefix", "");
        String suffix = photo.optString("suffix", "");
        return prefix.isBlank() || suffix.isBlank() ? null : prefix + PHOTO_SIZE + suffix;
    }

    /** Atif KIMLIKTEN: coklu turde ad uzerinden tahmin guvenilir degildi (spec §5.1). */
    private ActivityType attribution(JSONObject place) {
        JSONArray list = place.optJSONArray("categories");
        if (list == null) {
            return null;
        }
        for (int i = 0; i < list.length(); i++) {
            JSONObject category = list.optJSONObject(i);
            if (category == null) {
                continue;
            }
            ActivityType type = categories.activityFor(category.optString("id", ""));
            if (type != null) {
                return type;
            }
        }
        return null;
    }

    /** Kapali mekan eleme sinyali (spec §4.6); kalite kapisi DeckFlow'da. */
    public static boolean likelyClosed(String closedBucket) {
        return "LikelyClosed".equals(closedBucket) || "VeryLikelyClosed".equals(closedBucket);
    }
}
```

> `closed_bucket` adaya `VenueCandidate` alanı olarak **taşınmaz**: kalite kapısı arama anında çalışır. `search` içinde `likelyClosed(place.optString("closed_bucket",""))` doğruysa aday listeye hiç eklenmez — kapalı mekan hiçbir zaman deste adayı olmaz ve DB'ye yazılmaz. Bu satır `toCandidate` çağrısından önce `search` döngüsüne eklenir:
> ```java
>             JSONObject place = results.getJSONObject(i);
>             if (likelyClosed(place.optString("closed_bucket", ""))) {
>                 continue;
>             }
>             out.add(toCandidate(place));
> ```

Eski `adapter/out/provider/FoursquareVenueProvider.java` silinir.

- [ ] **Step 6: Testi çalıştır, yeşile döndüğünü gör**

Run: `MVN_TEST FoursquareVenueSourceTest`
Expected: 4 test yeşil.

- [ ] **Step 7: Sözleşme testini yaz**

`backend/src/test/java/com/bumpinto/adapter/out/foursquare/FoursquarePremiumContractTest.java`:

```java
package com.bumpinto.adapter.out.foursquare;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.adapter.out.provider.VenueSourceSupport;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * GERCEK istek. CI'da anahtar yoksa atlanir, yerelde kosar. Varlik sebebi: gecersiz kimlik
 * 400 verir ama GECERLI-AMA-YANLIS kimlik 200 ile sessizce yanlis mekan listeler.
 */
@EnabledIfEnvironmentVariable(named = "FOURSQUARE_API_KEY", matches = ".+")
class FoursquarePremiumContractTest {

    /** Eindhoven merkezi; NL kapsamasi burada en yogun. */
    static final GeoPoint CENTER = new GeoPoint(51.4416, 5.4697);

    static UnirestInstance http;
    static FoursquareVenueSource source;
    static CategoryMapping mapping;

    @BeforeAll
    static void setUp() {
        http = Unirest.spawnInstance();
        Map<String, AppProps.VenueSourceProps> sources =
                new HashMap<>(TestProps.venues().sources());
        sources.put("foursquare", new AppProps.VenueSourceProps(true,
                System.getenv("FOURSQUARE_API_KEY"), 5000));
        AppProps props = TestProps.of(
                new AppProps.Venues(sources, TestProps.venues().route()));
        mapping = new CategoryMappingLoader().load("foursquare");
        source = new FoursquareVenueSource(new VenueSourceSupport(http), props,
                new CategoryMappingLoader(), Clock.systemUTC());
    }

    @AfterAll
    static void tearDown() {
        http.close();
    }

    /** Premium alanlarin BICIMI: foto, puan, popularite, closed_bucket gercekten geliyor mu. */
    @Test
    void premiumFieldsArePresentInAtLeastHalfOfTheResults() {
        SearchResult result = source.search(
                new SearchRequest(CENTER, 5.0, List.of(ActivityType.FOOD), 50));

        assertThat(result.candidates()).isNotEmpty();
        assertThat(result.quota()).isNotNull();
        long withPhoto = result.candidates().stream()
                .filter(c -> c.photoUrl() != null).count();
        long withRating = result.candidates().stream()
                .filter(c -> c.rating() != null).count();
        // Kapsama %60'in altindaysa Wikimedia + monogram payi buyur (spec §16.1) — bu esik
        // OLCUMDUR, kirmizi olursa spec §16.1 notu guncellenir, kod degil.
        assertThat(withPhoto).isGreaterThanOrEqualTo(result.candidates().size() / 2);
        assertThat(withRating).isGreaterThanOrEqualTo(result.candidates().size() / 2);
        result.candidates().stream().filter(c -> c.photoUrl() != null).forEach(c -> {
            assertThat(c.photoUrl()).contains("/original/");
            assertThat(c.photoRef()).isNotBlank();
        });
        result.candidates().stream().filter(c -> c.rating() != null).forEach(c -> {
            assertThat(c.rating()).isBetween(0.0, 10.0);
            assertThat(c.ratingScale()).isEqualTo(10);
        });
        result.candidates().stream().filter(c -> c.popularity() != null)
                .forEach(c -> assertThat(c.popularity()).isBetween(0.0, 1.0));
    }

    /**
     * yml'deki HER kimlik sonuc doguruyor ve donen mekanlar o kimlikle etiketli. Yorumdaki
     * kategori adiyla uyusmayan kimlik burada yakalanir.
     */
    @ParameterizedTest
    @EnumSource(ActivityType.class)
    void everyMappedCategoryIdReturnsVenuesTaggedWithThatId(ActivityType type) {
        List<String> ids = mapping.idsFor(List.of(type));
        assertThat(ids).as("venue-sources/foursquare.yml misses %s", type).isNotEmpty();

        // 40 km: seyrek turlerde (THEME_PARK) 5 km bos donebilir, kimlik yine de gecerlidir.
        SearchResult result = source.search(new SearchRequest(CENTER, 40.0, List.of(type), 10));

        assertThat(result.candidates())
                .as("%s (%s) returned nothing at 40 km — id is probably wrong", type, ids)
                .isNotEmpty();
        assertThat(result.candidates()).allSatisfy(c ->
                assertThat(c.activityType())
                        .as("%s: attribution must resolve back through the yml id", c.name())
                        .isEqualTo(type));
    }

    /** Kota basliklari degismedi mi (BudgetGate disinda ikinci fren). */
    @Test
    void rateLimitHeadersStillArrive() {
        SearchResult result = source.search(
                new SearchRequest(CENTER, 2.0, List.of(ActivityType.COFFEE), 10));

        assertThat(result.quota()).isNotNull();
        assertThat(result.quota().limit()).isPositive();
        assertThat(result.quota().remaining()).isNotNegative();
    }

    static VenueCandidate first(SearchResult r) {
        return r.candidates().get(0);
    }
}
```

- [ ] **Step 8: Sözleşme testini gerçek anahtarla çalıştır (kullanıcı ortamı)**

Run: `MVN_TEST FoursquarePremiumContractTest`
Expected: Anahtar yoksa **skipped**. Anahtar varsa `everyMappedCategoryIdReturnsVenuesTaggedWithThatId` 15 türden kaçının kırmızı olduğunu söyler; **kırmızı kalan her tür için `foursquare.yml`'daki kimlik düzeltilir** (FSQ kategori taksonomisinden doğru 24 haneli kimlik alınır) ve test yeniden koşulur. Bu testin ilk turda kırmızı çıkması beklenen davranıştır — doğrulanmamış 10 kimlik bu yüzden yorumda işaretli.

- [ ] **Step 9: Değişen dosyaları listele**

`adapter/out/provider/VenueSourceSupport.java`, `adapter/out/foursquare/FoursquareVenueSource.java`, `adapter/out/provider/FoursquareVenueProvider.java` (silindi), `resources/venue-sources/foursquare.yml`, `domain/venue/VenueCandidate.java`, `FoursquareVenueSourceTest`, `FoursquarePremiumContractTest`, derlenirlik için dokunulan `ProviderOrchestratorTest`/`GooglePlacesVenueProviderTest`/`DeckFlow`.
Mesaj: `feat(foursquare): Premium VenueSource with YAML category mapping and live contract test`

---

### Task 4: Google Places kaynağının SPI'ye uyarlanması

**Files:**
- Create: `backend/src/main/java/com/bumpinto/adapter/out/google/GooglePlacesVenueSource.java`
- Delete: `backend/src/main/java/com/bumpinto/adapter/out/provider/GooglePlacesVenueProvider.java`
- Create: `backend/src/main/resources/venue-sources/google.yml`
- Rename+rewrite: `.../adapter/out/provider/GooglePlacesVenueProviderTest.java` → `backend/src/test/java/com/bumpinto/adapter/out/google/GooglePlacesVenueSourceTest.java`

- [ ] **Step 1: `google.yml`'ı yaz**

```yaml
id: google
# Places API (New) Table A tur adlari; 24 haneli degil, bu yuzden desen farkli.
idPattern: "^[a-z_]+$"
categories:
  COFFEE: [cafe]
  FOOD: [restaurant]
  BAR: [bar]
  WALK: [park]
  ACTIVITY: [bowling_alley]
  SWIM: [swimming_pool, water_park]
  HIKE: [hiking_area, national_park, state_park]
  FITNESS: [gym, fitness_center]
  CINEMA: [movie_theater]
  MUSEUM: [museum, art_museum, history_museum]
  ART: [art_gallery, performing_arts_theater, cultural_landmark]
  NIGHTLIFE: [night_club, karaoke, live_music_venue]
  THEME_PARK: [amusement_park, zoo, aquarium]
  ADVENTURE: [adventure_sports_center, paintball_center, go_karting_venue]
  GAMES: [video_arcade, amusement_center, miniature_golf_course]
```

- [ ] **Step 2: Testi yeniden yaz (kırmızı)**

`backend/src/test/java/com/bumpinto/adapter/out/google/GooglePlacesVenueSourceTest.java` — eski testin gövdesi korunur, üç değişiklikle:

```java
    /** Bean YALNIZ enabled=true iken olusur; kapaliyken anahtar bile istenmez (spec §5.4). */
    @Test
    void descriptorForcesGoogleMapEngineAndPacificBilling() {
        assertThat(source.descriptor().id()).isEqualTo("google");
        assertThat(source.descriptor().requiredMapEngine()).isEqualTo(MapEngine.GOOGLE);
        assertThat(source.descriptor().billingZone())
                .isEqualTo(ZoneId.of("America/Los_Angeles"));
        assertThat(source.descriptor().ratingScale()).isEqualTo(5);
        assertThat(source.descriptor().retention()).isEqualTo(RetentionRule.STRIP_AT_EXPIRY);
        assertThat(source.descriptor().attributionKey()).isEqualTo("attribution.google");
    }

    /** googleMapsUri artik placeLink; yol tarifi linkini assembler uretir (spec §10). */
    @Test
    void googleMapsUriBecomesPlaceLink() {
        mock.expect(HttpMethod.POST, NEARBY).thenReturn(body());

        VenueCandidate c = source.search(request(ActivityType.COFFEE)).candidates().get(0);

        assertThat(c.placeLink()).isEqualTo("https://maps.google.com/?cid=1");
        assertThat(c.ratingScale()).isEqualTo(5);
    }

    /** Butce kapisi ARTIK burada DEGIL: sayac BudgetGate'te, kaynak yalniz HTTP yapar. */
    @Test
    void sourceNoLongerCountsCallsItself() {
        mock.expect(HttpMethod.POST, NEARBY).thenReturn(body());

        for (int i = 0; i < 5; i++) {
            assertThat(source.search(request(ActivityType.COFFEE)).candidates()).hasSize(1);
        }
    }
```

Eski testteki `measureQuota()`, `monthlyBudget`, `photoMonthlyBudget` ile ilgili tüm testler **silinir** — o sorumluluk `BudgetGate`'e taşındı (T2) ve `BudgetGateTest` onu kapsıyor. Foto çözümüyle ilgili testler aynen kalır.

- [ ] **Step 3: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST GooglePlacesVenueSourceTest`
Expected: COMPILATION ERROR — `GooglePlacesVenueSource` yok.

- [ ] **Step 4: `GooglePlacesVenueSource`'u yaz**

`adapter/out/google/GooglePlacesVenueSource.java` — eski `GooglePlacesVenueProvider`'ın **gövdesi taşınır**, şu farklarla:

```java
@Component
@Order(3) // acilirsa acik tabandan SONRA denenir; zaten inaktif
@ConditionalOnProperty(prefix = "bumpinto.venues.sources.google", name = "enabled")
public class GooglePlacesVenueSource implements VenueSource {

    public static final String ID = "google";

    private static final VenueSourceDescriptor DESCRIPTOR = new VenueSourceDescriptor(
            ID, "attribution.google", "https://www.google.com/maps", 5,
            RetentionRule.STRIP_AT_EXPIRY, true, MapEngine.GOOGLE,
            ZoneId.of("America/Los_Angeles"));

    private final VenueSourceSupport support;
    private final String apiKey;
    private final CategoryMapping categories;

    public GooglePlacesVenueSource(VenueSourceSupport support, AppProps props,
                                   CategoryMappingLoader loader) {
        this.support = support;
        this.apiKey = props.venues().sources().get(ID).key();
        this.categories = loader.load(ID);
    }

    @Override public VenueSourceDescriptor descriptor() { return DESCRIPTOR; }

    @Override public CategoryMapping categories() { return categories; }

    @Override
    public SearchResult search(SearchRequest request) {
        // includedTypes artik statik TYPES map'inden DEGIL YAML'dan gelir.
        List<String> types = categories.idsFor(request.types());
        if (types.isEmpty()) {
            return SearchResult.empty();
        }
        // ... eski requestBody/parse gövdesi aynen; sonunda:
        return new SearchResult(candidates, null); // Google header vermez; kota BudgetGate'te
    }
}
```

Silinenler: `TYPES` sabiti (YAML'a taşındı), `measureQuota()`, `period`/`calls`/`photoCalls` sayaçları, `BILLING_ZONE` sabiti (descriptor'a taşındı), `monthlyBudget`/`photoMonthlyBudget` alanları ve `QuotaExceededException` fırlatan bütçe kapısı. Korunanlar: `X-Goog-FieldMask` (aynen), Enterprise maskesi, `resolvePhoto` mantığı ve `CompletableFuture` foto çözümü, `businessStatus` elemesi, `primaryType`/`types` üzerinden atıf (artık `categories.activityFor(...)` ile).

Foto bütçesi olmadığı için `photoCalls` kapısı düşer; Google **inaktif** olduğu sürece bu bir maliyet değildir. Google açılırsa foto çözümünü "yalnız nihai kısa liste"ye indirmek ayrı iştir (spec §5.4, bu planda değil).

`googleMapsUri` → `placeLink`; `mapsUrl` alanı zaten `VenueCandidate`'ten kalktı (T3).

- [ ] **Step 5: Testi çalıştır, yeşile döndüğünü gör**

Run: `MVN_TEST GooglePlacesVenueSourceTest`
Expected: yeşil.

- [ ] **Step 6: Koşullu bean'in gerçekten oluşmadığını doğrula**

Run: `MVN_TEST VenueSourceConfigValidatorTest,HexagonalArchitectureTest`
Expected: yeşil (`venueSourcesAreSelfContained` yeni `adapter.out.google` paketini kapsar).

- [ ] **Step 7: Değişen dosyaları listele**

`adapter/out/google/GooglePlacesVenueSource.java`, `adapter/out/provider/GooglePlacesVenueProvider.java` (silindi), `resources/venue-sources/google.yml`, `GooglePlacesVenueSourceTest`.
Mesaj: `refactor(google): adapt Places source to VenueSource SPI, disabled by default`

---

### Task 5: `ProviderOrchestrator` — tür bölme, sabit sıra, bütçe kapısı, önbellek

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/provider/ProviderOrchestrator.java`
- Delete: `backend/src/main/java/com/bumpinto/adapter/out/provider/QuotaAwareVenueProvider.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/provider/ProviderQuotaCache.java`
- Rewrite: `backend/src/test/java/com/bumpinto/adapter/out/provider/ProviderOrchestratorTest.java`

- [ ] **Step 1: Başarısız testi yaz**

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.ProviderQuota;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProviderOrchestratorTest {

    static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");
    static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    static final GeoPoint CENTER = new GeoPoint(51.4416, 5.4697);

    static VenueCandidate candidate(String source, String id, ActivityType type) {
        return new VenueCandidate(source, id, id, CENTER, null, null, null,
                null, null, null, null, null, null, type, null, null, null);
    }

    /** Cagri gunlugu tutan sahte kaynak: hangi tur kumesiyle kac kez cagrildi. */
    static final class RecordingSource implements VenueSource {
        final VenueSourceDescriptor descriptor;
        final CategoryMapping mapping;
        final Function<SearchRequest, SearchResult> answer;
        final List<List<ActivityType>> calls = new ArrayList<>();

        RecordingSource(String id, List<ActivityType> covered,
                        Function<SearchRequest, SearchResult> answer) {
            Map<ActivityType, List<String>> byType = new LinkedHashMap<>();
            covered.forEach(t -> byType.put(t, List.of(t.name())));
            this.descriptor = new VenueSourceDescriptor(id, "attribution." + id, null, null,
                    RetentionRule.KEEP, false, MapEngine.ANY, ZoneOffset.UTC);
            this.mapping = new CategoryMapping(byType);
            this.answer = answer;
        }

        @Override public VenueSourceDescriptor descriptor() { return descriptor; }
        @Override public CategoryMapping categories() { return mapping; }
        @Override public SearchResult search(SearchRequest request) {
            calls.add(request.types());
            return answer.apply(request);
        }
    }

    static ProviderOrchestrator orchestrator(List<VenueSource> sources, AppProps props,
                                             BudgetGate gate) {
        return new ProviderOrchestrator(sources, props, new ProviderQuotaCache(), gate, CLOCK);
    }

    static BudgetGate openGate() {
        return new BudgetGate(new BudgetGateTest.FakeUsage(), TestProps.defaults(), CLOCK);
    }

    /**
     * TUR BOLME: COFFEE foursquare'e, SWIM open'a gider ve AYNI listeye giden turler TEK
     * istekte birlesir. Ayri ayri sorulsaydi her tur ayri bir Premium cagrisi olurdu.
     */
    @Test
    void splitsTypesByRouteAndMergesTypesThatShareTheSameSourceList() {
        RecordingSource fsq = new RecordingSource("foursquare",
                List.of(ActivityType.COFFEE, ActivityType.FOOD, ActivityType.BAR,
                        ActivityType.NIGHTLIFE),
                r -> new SearchResult(List.of(candidate("foursquare", "f1", ActivityType.COFFEE)),
                        null));
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                r -> new SearchResult(List.of(candidate("open", "o1", ActivityType.SWIM)), null));

        List<VenueCandidate> result = orchestrator(List.of(fsq, open), TestProps.defaults(),
                openGate())
                .search(CENTER, 5.0, List.of(ActivityType.COFFEE, ActivityType.FOOD,
                        ActivityType.SWIM), 20);

        assertThat(fsq.calls).containsExactly(List.of(ActivityType.COFFEE, ActivityType.FOOD));
        assertThat(open.calls).containsExactly(List.of(ActivityType.SWIM));
        assertThat(result).extracting(VenueCandidate::externalId)
                .containsExactlyInAnyOrder("f1", "o1");
    }

    /** Kume icinde sira SABIT: ilk kaynak dolu donduyse ikincisine hic gidilmez. */
    @Test
    void staysWithTheFirstSourceOfTheListWhenItAnswers() {
        RecordingSource fsq = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                r -> new SearchResult(List.of(candidate("foursquare", "f1", ActivityType.COFFEE)),
                        null));
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                r -> new SearchResult(List.of(candidate("open", "o1", ActivityType.COFFEE)), null));

        orchestrator(List.of(fsq, open), TestProps.defaults(), openGate())
                .search(CENTER, 5.0, List.of(ActivityType.COFFEE), 20);

        assertThat(open.calls).isEmpty();
    }

    /** Bos donen kaynak siradakine devreder (istisna degil). */
    @Test
    void fallsThroughToTheNextSourceWhenTheFirstIsEmpty() {
        RecordingSource fsq = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                r -> SearchResult.empty());
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                r -> new SearchResult(List.of(candidate("open", "o1", ActivityType.COFFEE)), null));

        assertThat(orchestrator(List.of(fsq, open), TestProps.defaults(), openGate())
                .search(CENTER, 5.0, List.of(ActivityType.COFFEE), 20))
                .extracting(VenueCandidate::externalId).containsExactly("o1");
    }

    /** Butcesi dolmus kaynak HIC cagrilmaz — cevabini bildigimiz istegi satin almayiz. */
    @Test
    void skipsSourceWhoseMonthlyBudgetIsSpent() {
        BudgetGateTest.FakeUsage usage = new BudgetGateTest.FakeUsage();
        Map<String, AppProps.VenueSourceProps> sources =
                new LinkedHashMap<>(TestProps.venues().sources());
        sources.put("foursquare", new AppProps.VenueSourceProps(true, "k", 1));
        AppProps props = TestProps.of(
                new AppProps.Venues(sources, TestProps.venues().route()));
        usage.increment("foursquare", java.time.YearMonth.of(2026, 9));
        RecordingSource fsq = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                r -> new SearchResult(List.of(candidate("foursquare", "f1", ActivityType.COFFEE)),
                        null));
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                r -> new SearchResult(List.of(candidate("open", "o1", ActivityType.COFFEE)), null));

        List<VenueCandidate> result = orchestrator(List.of(fsq, open), props,
                new BudgetGate(usage, props, CLOCK))
                .search(CENTER, 5.0, List.of(ActivityType.COFFEE), 20);

        assertThat(fsq.calls).isEmpty();
        assertThat(result).extracting(VenueCandidate::externalId).containsExactly("o1");
    }

    /** 429 -> kaynak resetAt'e kadar EXHAUSTED; ikinci arama ona hic gitmez. */
    @Test
    void marksSourceExhaustedAfterQuotaExceeded() {
        RecordingSource fsq = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                r -> {
                    throw new QuotaExceededException("credits", NOW.plus(Duration.ofHours(24)));
                });
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                r -> new SearchResult(List.of(candidate("open", "o1", ActivityType.COFFEE)), null));
        ProviderOrchestrator o = orchestrator(List.of(fsq, open), TestProps.defaults(),
                openGate());

        o.search(CENTER, 5.0, List.of(ActivityType.COFFEE), 20);
        o.search(CENTER, 40.0, List.of(ActivityType.COFFEE), 20);

        assertThat(fsq.calls).hasSize(1);
    }

    /** Tekillestirme anahtari <sourceId>:<externalId> — iki kaynakta ayni id carpismaz. */
    @Test
    void deduplicatesPerSourceNotGlobally() {
        RecordingSource fsq = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                r -> new SearchResult(List.of(candidate("foursquare", "x", ActivityType.COFFEE),
                        candidate("foursquare", "x", ActivityType.COFFEE)), null));
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                r -> new SearchResult(List.of(candidate("open", "x", ActivityType.SWIM)), null));

        assertThat(orchestrator(List.of(fsq, open), TestProps.defaults(), openGate())
                .search(CENTER, 5.0, List.of(ActivityType.COFFEE, ActivityType.SWIM), 20))
                .hasSize(2);
    }

    /** Tum kumeler bos -> NoVenuesFoundException DEGIL bos liste; karari DeckFlow verir. */
    @Test
    void returnsEmptyWhenEverySourceIsEmpty() {
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                r -> SearchResult.empty());

        assertThat(orchestrator(List.of(open), TestProps.defaults(), openGate())
                .search(CENTER, 5.0, List.of(ActivityType.SWIM), 20)).isEmpty();
    }

    /** Onbellek anahtari: 2 ondalik merkez + yaricap kovasi + kanonik tur kumesi. */
    @Test
    void cacheKeyRoundsCenterBucketsRadiusAndSortsTypes() {
        assertThat(ProviderOrchestrator.cacheKey(new GeoPoint(51.4416, 5.4697), 3.0,
                List.of(ActivityType.FOOD, ActivityType.COFFEE)))
                .isEqualTo(ProviderOrchestrator.cacheKey(new GeoPoint(51.4444, 5.4666), 4.9,
                        List.of(ActivityType.COFFEE, ActivityType.FOOD)));
        assertThat(ProviderOrchestrator.cacheKey(CENTER, 3.0, List.of(ActivityType.COFFEE)))
                .isNotEqualTo(ProviderOrchestrator.cacheKey(CENTER, 12.0,
                        List.of(ActivityType.COFFEE)));
    }

    /** BOS sonuc 10 dk isaretlenir: host tekrar bastiginda saglayiciya GIDILMEZ (maliyet §E.2). */
    @Test
    void remembersEmptyResultForTenMinutes() {
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                r -> SearchResult.empty());
        ProviderOrchestrator o = orchestrator(List.of(open), TestProps.defaults(), openGate());

        o.search(CENTER, 5.0, List.of(ActivityType.SWIM), 20);
        o.search(CENTER, 5.0, List.of(ActivityType.SWIM), 20);

        assertThat(open.calls).hasSize(1);
    }

    /** Dolu sonuc da onbellekte; ayni arama ikinci kez satin alinmaz. */
    @Test
    void servesRepeatedSearchesFromCache() {
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                r -> new SearchResult(List.of(candidate("open", "o1", ActivityType.SWIM)), null));
        ProviderOrchestrator o = orchestrator(List.of(open), TestProps.defaults(), openGate());

        assertThat(o.search(CENTER, 5.0, List.of(ActivityType.SWIM), 20)).hasSize(1);
        assertThat(o.search(CENTER, 5.0, List.of(ActivityType.SWIM), 20)).hasSize(1);
        assertThat(open.calls).hasSize(1);
    }

    /** Kaynak hic yoksa acilista patla — sessizce "mekan yok" DEME. */
    @Test
    void refusesToStartWithoutAnySource() {
        assertThatThrownBy(() -> orchestrator(List.of(), TestProps.defaults(), openGate()))
                .isInstanceOf(IllegalStateException.class);
    }
}
```

`BudgetGateTest.FakeUsage` package-private'tan `static final class` olarak erişilebilir kalır (aynı pakette).

- [ ] **Step 2: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST ProviderOrchestratorTest`
Expected: COMPILATION ERROR — yeni kurucu imzası yok.

- [ ] **Step 3: `ProviderOrchestrator`'ı yeniden yaz**

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.ProviderQuota;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.infra.config.AppProps;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Tur bolme + kume basina SABIT sira + butce eleme + sonuc onbellegi (spec §4).
 *
 * <p>Sira {@code bumpinto.venues.route}'tan gelir ve kotaya BAKMAZ. Kalan kota ORANINA gore
 * siralayan surum niyetin tersini yapiyordu: Google'in orani aylik butceden, FSQ'nunki
 * saatlik istek limitinden geliyor, iki oran ayni seyi olcmedigi icin her arama once ucretli
 * saglayiciya gidiyordu (2026-09-06 duzeltmesi).
 */
@Component
@Primary
public class ProviderOrchestrator implements VenueProviderPort {

    private static final Logger log = LoggerFactory.getLogger(ProviderOrchestrator.class);

    /** Yaricap kovalari: 3,1 km ile 4,9 km ayni aramadir; ayri anahtar ikinci kez satin alirdi. */
    static final double[] RADIUS_BUCKETS = {1, 2, 5, 10, 20, 40};

    private final Map<String, VenueSource> sources;
    private final AppProps props;
    private final ProviderQuotaCache quotas;
    private final BudgetGate budget;
    private final Clock clock;
    private final Cache<String, List<VenueCandidate>> results = Caffeine.newBuilder()
            .maximumSize(1000).expireAfterWrite(Duration.ofMinutes(30)).build();
    /** BOS sonuc AYRI ve KISA omurlu: seyrek bolgede gecici bosluk 30 dk "mekan yok" olmasin. */
    private final Cache<String, Boolean> emptyMarks = Caffeine.newBuilder()
            .maximumSize(1000).expireAfterWrite(Duration.ofMinutes(10)).build();

    public ProviderOrchestrator(List<VenueSource> sources, AppProps props,
                                ProviderQuotaCache quotas, BudgetGate budget, Clock clock) {
        if (sources.isEmpty()) {
            throw new IllegalStateException("no venue source configured");
        }
        this.sources = sources.stream().collect(Collectors.toMap(
                s -> s.descriptor().id(), Function.identity(), (a, b) -> a, LinkedHashMap::new));
        this.props = props;
        this.quotas = quotas;
        this.budget = budget;
        this.clock = clock;
    }

    /** 2 ondalik merkez (~1 km) + yaricap kovasi + alfabetik tur kumesi. */
    static String cacheKey(GeoPoint center, double radiusKm, List<ActivityType> types) {
        double bucket = RADIUS_BUCKETS[RADIUS_BUCKETS.length - 1];
        for (double candidate : RADIUS_BUCKETS) {
            if (radiusKm <= candidate) {
                bucket = candidate;
                break;
            }
        }
        String canonical = types.stream().map(ActivityType::name).sorted()
                .collect(Collectors.joining("+"));
        return String.format(Locale.ROOT, "%.2f:%.2f:%.0f:%s",
                center.lat(), center.lng(), bucket, canonical);
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm,
                                       List<ActivityType> types, int limit) {
        String key = cacheKey(center, radiusKm, types);
        List<VenueCandidate> cached = results.getIfPresent(key);
        if (cached != null) {
            return cached;
        }
        if (Boolean.TRUE.equals(emptyMarks.getIfPresent(key))) {
            return List.of();
        }
        Map<String, VenueCandidate> merged = new LinkedHashMap<>();
        splitByRoute(types).forEach((route, group) ->
                searchGroup(route, group, center, radiusKm, limit)
                        .forEach(c -> merged.putIfAbsent(c.provider() + ":" + c.externalId(), c)));
        List<VenueCandidate> result = List.copyOf(merged.values());
        if (result.isEmpty()) {
            emptyMarks.put(key, Boolean.TRUE);
        } else {
            results.put(key, result);
        }
        return result;
    }

    /** Ayni kaynak listesine giden turler TEK istekte birlesir (spec §4.1). */
    Map<List<String>, List<ActivityType>> splitByRoute(List<ActivityType> types) {
        Map<List<String>, List<ActivityType>> groups = new LinkedHashMap<>();
        types.forEach(type -> groups
                .computeIfAbsent(props.venues().routeFor(type), k -> new ArrayList<>())
                .add(type));
        return groups;
    }

    private List<VenueCandidate> searchGroup(List<String> route, List<ActivityType> types,
                                             GeoPoint center, double radiusKm, int limit) {
        Instant now = clock.instant();
        for (String id : route) {
            VenueSource source = sources.get(id);
            if (source == null || !source.categories().covers(types)) {
                continue;
            }
            if (quotas.get(id).map(q -> !q.available(now)).orElse(false)
                    || !budget.allows(source.descriptor())) {
                continue;
            }
            try {
                SearchResult result = source.search(
                        new SearchRequest(center, radiusKm, types, limit));
                budget.record(source.descriptor());
                if (result.quota() != null) {
                    quotas.record(result.quota());
                }
                if (!result.candidates().isEmpty()) {
                    log.info("venues from {}: {} results for {} r={}km ({})", id,
                            result.candidates().size(), types, radiusKm, quotaText(id));
                    return result.candidates();
                }
            } catch (QuotaExceededException e) {
                // 429 faturalanabilir: sayaci yine de artir, sonra kaynagi kapat.
                budget.record(source.descriptor());
                quotas.exhaust(id, e.resetAt(), now);
                log.warn("{} quota exhausted until {}: {}", id, e.resetAt(), e.getMessage());
            } catch (RuntimeException e) {
                // Gecici aksaklik: yalniz bu cagri duser, kota ve butce degismez.
                log.warn("{} search failed, trying next source: {}", id, e.getMessage());
            }
        }
        return List.of();
    }

    private String quotaText(String id) {
        return quotas.get(id).map(q -> "quota " + q.remaining() + "/" + q.limit()
                + " [" + q.source() + "]").orElse("quota unknown");
    }
}
```

`QuotaAwareVenueProvider.java` silinir (yerini `VenueSource` aldı). `ProviderQuotaCache` yalnız `import com.bumpinto.domain.venue.ProviderQuota;` satırıyla güncellenir.

> **Bütçe muhasebesi:** `budget.record(...)` HTTP çağrısı yapıldıktan **sonra** çağrılır (2xx ve 429'da), yetki/sunucu hatasında değil — ARCHITECTURE §10'daki "sayaç yalnız faturalanan çağrıyı sayar" düzeltmesinin aynısı. `open` kaynağı `budget=0` olduğu için sayaca hiç dokunmaz.

- [ ] **Step 4: Testi çalıştır, yeşile döndüğünü gör**

Run: `MVN_TEST ProviderOrchestratorTest,BudgetGateTest,HexagonalArchitectureTest`
Expected: 11 + 3 + kural testleri yeşil.

- [ ] **Step 5: Değişen dosyaları listele**

`adapter/out/provider/ProviderOrchestrator.java`, `QuotaAwareVenueProvider.java` (silindi), `ProviderQuotaCache.java`, `ProviderOrchestratorTest.java`.
Mesaj: `feat(venues): route-driven orchestrator with type splitting, budget gate and empty-result marker`

---

### Task 6: `venues_open` (V11), açık taban kaynağı, PostGIS test altyapısı

**Files:**
- Create: `backend/src/main/resources/db/migration/V11__venues_open.sql`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/open/VenueOpenEntity.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/open/VenueOpenRepository.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/open/OpenVenueRow.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/open/OpenVenueSource.java`
- Create: `backend/src/main/resources/venue-sources/open.yml`
- Modify: `backend/src/test/java/com/bumpinto/support/PostgresContainer.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/open/OpenVenueSourceTest.java`

- [ ] **Step 1: Testcontainers imajını PostGIS'e çevir**

`support/PostgresContainer.java`, tek satır:

```java
            PostgreSQLContainer<?> container = new PostgreSQLContainer<>(
                    DockerImageName.parse("postgis/postgis:16-3.4")
                            .asCompatibleSubstituteFor("postgres"));
```

(`import org.testcontainers.utility.DockerImageName;` eklenir.) **Bu değişiklik HER entegrasyon testini etkiler**: ilk koşuda imaj indirilir (~1 GB), sonraki koşular aynı hızda. V11 `CREATE EXTENSION postgis` çalıştırdığı için düz `postgres:16-alpine` ile Flyway patlar — seçenek yok. docker-compose'un aynı imaja geçmesi plan 32'nin (I-2) işidir; yerelde `docker compose up` yapan geliştirici V11'de aynı hatayı alır ve o planı bekler. **Kullanıcıya bu bildirilir.**

- [ ] **Step 2: V11 migration'ı yaz**

```sql
-- Acik taban: Overture Places NL + OSM NL, aylik yenilenir (I-2 ithal isleri).
-- Uzanti burada aciliyor: ithal isi calismasa bile sema hazir olmali, yoksa V11'i
-- calistiran her ortam iki farkli sirada patlardi.
create extension if not exists postgis;

create table venues_open (
    id             text primary key,          -- "<kaynak>:<dis id>", ithal isi uretir
    source         text not null,             -- overture | osm
    name           text not null,
    geom           geometry(Point, 4326) not null,
    category       text,                      -- kaynagin kendi kategori kelimesi
    activity_types text[] not null,           -- eslenen ActivityType adlari
    confidence     real not null,             -- Overture'da olcum, OSM satirinda 1.0
    website        text,
    wikidata_id    text,
    photo_url      text,                      -- Wikimedia Commons FilePath
    opening_hours  text,
    locality       text,
    address        text,
    updated_at     timestamptz not null
);

-- ST_DWithin bunu kullanir; GIN ise activity_types && :types kesisimini.
create index venues_open_geom_gist on venues_open using gist (geom);
create index venues_open_activity_types_gin on venues_open using gin (activity_types);
```

- [ ] **Step 3: `open.yml`'ı yaz**

```yaml
id: open
# Overture categories.primary slug'lari ve OSM etiket ciftleri karisik; tek desen ikisini de kapsar.
idPattern: "^[a-z0-9_]+(=[a-z0-9_]+)?$"
categories:
  COFFEE: [cafe, coffee_shop, amenity=cafe]
  FOOD: [restaurant, amenity=restaurant, fast_food]
  BAR: [bar, pub, amenity=bar, amenity=pub]
  NIGHTLIFE: [nightclub, amenity=nightclub, music_venue]
  WALK: [park, leisure=park, garden, leisure=garden]
  HIKE: [hiking_trail, route=hiking, nature_preserve, natural=heath]
  SWIM: [swimming_pool, leisure=swimming_pool, water_park, leisure=water_park]
  FITNESS: [gym, leisure=fitness_centre, leisure=sports_centre]
  CINEMA: [cinema, amenity=cinema]
  MUSEUM: [museum, tourism=museum]
  ART: [art_gallery, tourism=gallery, arts_and_entertainment]
  THEME_PARK: [amusement_park, tourism=theme_park, zoo, tourism=zoo]
  GAMES: [arcade, leisure=amusement_arcade, board_game_cafe]
  ADVENTURE: [climbing_gym, leisure=climbing, go_kart_track]
  ACTIVITY: [bowling_alley, leisure=bowling_alley, leisure=pitch]
```

- [ ] **Step 4: Başarısız testi yaz**

`backend/src/test/java/com/bumpinto/adapter/out/open/OpenVenueSourceTest.java`:

```java
package com.bumpinto.adapter.out.open;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class OpenVenueSourceTest {

    /** Eindhoven merkezi ve ~1,5 km kuzeyi. */
    static final GeoPoint CENTER = new GeoPoint(51.4416, 5.4697);

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        PostgreSQLContainer<?> pg = PostgresContainer.shared();
        registry.add("spring.datasource.url", pg::getJdbcUrl);
        registry.add("spring.datasource.username", pg::getUsername);
        registry.add("spring.datasource.password", pg::getPassword);
    }

    @Autowired OpenVenueSource source;
    @Autowired VenueOpenRepository rows;

    @BeforeEach
    void seed() {
        rows.deleteAllRows();
        // yakin + dogru tur + guvenilir
        rows.insertFixture("osm:1", "osm", "Stadswandelpark", 5.4750, 51.4450,
                "leisure=park", "{WALK}", 1.0f, null, "https://commons.example/park.jpg");
        // yakin ama BASKA tur
        rows.insertFixture("ovt:2", "overture", "Koffie Corner", 5.4700, 51.4420,
                "cafe", "{COFFEE}", 0.9f, "https://koffie.example", null);
        // dogru tur ama UZAK (~9 km)
        rows.insertFixture("osm:3", "osm", "Verre Park", 5.4700, 51.5230,
                "leisure=park", "{WALK}", 1.0f, null, null);
        // dogru tur, yakin ama GUVENILMEZ (kapanmis olabilir, spec §4.6)
        rows.insertFixture("ovt:4", "overture", "Spookpark", 5.4720, 51.4430,
                "park", "{WALK}", 0.4f, null, null);
        // cok turlu satir: WALK sorgusunda da HIKE sorgusunda da cikar
        rows.insertFixture("osm:5", "osm", "Groene Route", 5.4680, 51.4400,
                "route=hiking", "{WALK,HIKE}", 1.0f, null, null);
    }

    @Test
    void findsOnlyNearbyRowsOfTheRequestedTypesAboveTheConfidenceFloor() {
        List<VenueCandidate> found = source
                .search(new SearchRequest(CENTER, 5.0, List.of(ActivityType.WALK), 20))
                .candidates();

        assertThat(found).extracting(VenueCandidate::externalId)
                .containsExactly("osm:5", "osm:1");   // mesafeye gore artan
        assertThat(found).extracting(VenueCandidate::provider).containsOnly("open");
    }

    @Test
    void matchesRowsThatCarryAnyOfTheRequestedTypes() {
        assertThat(source.search(new SearchRequest(CENTER, 5.0, List.of(ActivityType.HIKE), 20))
                .candidates()).extracting(VenueCandidate::externalId).containsExactly("osm:5");
    }

    @Test
    void mapsWikimediaPhotoAndWebsiteWithoutInventingARating() {
        VenueCandidate park = source
                .search(new SearchRequest(CENTER, 5.0, List.of(ActivityType.WALK), 20))
                .candidates().stream().filter(c -> c.externalId().equals("osm:1")).findFirst()
                .orElseThrow();

        assertThat(park.photoUrl()).isEqualTo("https://commons.example/park.jpg");
        assertThat(park.rating()).isNull();
        assertThat(park.ratingScale()).isNull();
        assertThat(park.popularity()).isNull();
        assertThat(park.activityType()).isEqualTo(ActivityType.WALK);
    }

    @Test
    void limitIsHonoured() {
        assertThat(source.search(new SearchRequest(CENTER, 40.0, List.of(ActivityType.WALK), 1))
                .candidates()).hasSize(1);
    }

    /** Acik veri: puan yok, saklama KEEP, atif OSM lisansina. */
    @Test
    void descriptorDeclaresOpenDataTerms() {
        assertThat(source.descriptor().ratingScale()).isNull();
        assertThat(source.descriptor().retention()).isEqualTo(RetentionRule.KEEP);
        assertThat(source.descriptor().requiresKey()).isFalse();
        assertThat(source.descriptor().requiredMapEngine()).isEqualTo(MapEngine.ANY);
        assertThat(source.descriptor().attributionKey()).isEqualTo("attribution.open");
        assertThat(source.descriptor().attributionUrl())
                .isEqualTo("https://www.openstreetmap.org/copyright");
    }
}
```

- [ ] **Step 5: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST OpenVenueSourceTest`
Expected: COMPILATION ERROR — `OpenVenueSource` yok.

- [ ] **Step 6: Entity, projeksiyon ve repository'yi yaz**

`adapter/out/open/VenueOpenEntity.java` — JPA'nın repository için istediği çapa. `geom` ve `activity_types` **eşlenmez**: `geometry` ve `text[]` icin hibernate-spatial / ozel tip gerekirdi, ikisi de yeni bagimlilik. Native sorgular bu sutunlari zaten kendisi okur.

```java
package com.bumpinto.adapter.out.open;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** geom ve activity_types BILINCLI olarak eslenmez; native sorgular okur (bagimlilik yok). */
@Entity
@Table(name = "venues_open")
class VenueOpenEntity {
    @Id String id;
    String source;
    String name;
    String category;
    float confidence;
    String website;
    String wikidataId;
    String photoUrl;
    String openingHours;
    String locality;
    String address;
    Instant updatedAt;
}
```

`adapter/out/open/OpenVenueRow.java` — arayüz projeksiyonu:

```java
package com.bumpinto.adapter.out.open;

/** Native sorgunun donduğu satir; alan adlari sorgudaki takma adlarla eslesir. */
public interface OpenVenueRow {
    String getId();
    String getName();
    double getLat();
    double getLng();
    String getCategory();
    String getActivityTypes();   // virgullu; array_to_string ile
    String getWebsite();
    String getPhotoUrl();
    String getOpeningHours();
    String getLocality();
    String getAddress();
}
```

`adapter/out/open/VenueOpenRepository.java`:

```java
package com.bumpinto.adapter.out.open;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * JdbcTemplate DEGIL: ArchUnit {@code sqlOnlyThroughSpringData} onu yasakliyor. Her parametre
 * :adiyla baglanir; dizeler string_to_array ile diziye cevrilir (dize birlestirme YOK).
 */
interface VenueOpenRepository extends Repository<VenueOpenEntity, String> {

    @Query(value = """
            select id                                as id,
                   name                              as name,
                   st_y(geom)                        as lat,
                   st_x(geom)                        as lng,
                   category                          as category,
                   array_to_string(activity_types, ',') as activityTypes,
                   website                           as website,
                   photo_url                         as photoUrl,
                   opening_hours                     as openingHours,
                   locality                          as locality,
                   address                           as address
              from venues_open
             where st_dwithin(geom::geography,
                              st_setsrid(st_makepoint(:lng, :lat), 4326)::geography,
                              :radiusMeters)
               and activity_types && string_to_array(:types, ',')
               and confidence >= :minConfidence
             order by geom <-> st_setsrid(st_makepoint(:lng, :lat), 4326)
             limit :max
            """, nativeQuery = true)
    List<OpenVenueRow> nearby(@Param("lat") double lat, @Param("lng") double lng,
                              @Param("radiusMeters") double radiusMeters,
                              @Param("types") String types,
                              @Param("minConfidence") double minConfidence,
                              @Param("max") int max);

    // --- yalniz test fixture'i icin; uretimde ithal isi (I-2) yazar ---

    @Modifying
    @Query(value = "delete from venues_open", nativeQuery = true)
    void deleteAllRows();

    @Modifying
    @Query(value = """
            insert into venues_open (id, source, name, geom, category, activity_types,
                                     confidence, website, photo_url, updated_at)
            values (:id, :source, :name, st_setsrid(st_makepoint(:lng, :lat), 4326), :category,
                    cast(:types as text[]), :confidence, :website, :photoUrl, now())
            """, nativeQuery = true)
    void insertFixture(@Param("id") String id, @Param("source") String source,
                       @Param("name") String name, @Param("lng") double lng,
                       @Param("lat") double lat, @Param("category") String category,
                       @Param("types") String types, @Param("confidence") float confidence,
                       @Param("website") String website, @Param("photoUrl") String photoUrl);
}
```

> Fixture metodları üretim kodunda duruyor çünkü repository arayüzü tek dosyadır ve testten erişilebilir olması gerekiyor; `insertFixture` adı bunu açıkça söyler. Alternatif (ayrı test repository'si) ikinci bir Spring Data arayüzü demekti — AGENTS.md dosya eşiğine takılır. Test sınıfı `@Transactional` değil; `deleteAllRows` + `insertFixture` `@Modifying` olduğu için testte `TransactionTemplate` yerine repository çağrıları `@Transactional` bir yardımcıya sarılır: `OpenVenueSourceTest` alanına `@Autowired VenueOpenFixtures fixtures` koymak yerine, `VenueOpenRepository`'nin `@Modifying` metotlarını `@Transactional` bir `OpenVenueSource` dışı bileşene taşımadan, testin `@BeforeEach`'i `org.springframework.transaction.support.TransactionTemplate`'i `@Autowired` alır ve `fixtures` çağrılarını onun içinde koşar.

- [ ] **Step 7: `OpenVenueSource`'u yaz**

```java
package com.bumpinto.adapter.out.open;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.List;

/** Kendi PostGIS'imiz: ucretsiz, sinirsiz, saklanabilir (spec §5.2). */
@Component
@Order(2)
@ConditionalOnProperty(prefix = "bumpinto.venues.sources.open", name = "enabled")
public class OpenVenueSource implements VenueSource {

    public static final String ID = "open";

    /** Overture olcumu; altindaki satir "muhtemelen kapali" sayilir (spec §4.6). */
    static final double MIN_CONFIDENCE = 0.6;

    private static final VenueSourceDescriptor DESCRIPTOR = new VenueSourceDescriptor(
            ID, "attribution.open", "https://www.openstreetmap.org/copyright", null,
            RetentionRule.KEEP, false, MapEngine.ANY, ZoneOffset.UTC);

    private final VenueOpenRepository rows;
    private final CategoryMapping categories;

    public OpenVenueSource(VenueOpenRepository rows, CategoryMappingLoader loader) {
        this.rows = rows;
        this.categories = loader.load(ID);
    }

    @Override public VenueSourceDescriptor descriptor() { return DESCRIPTOR; }

    @Override public CategoryMapping categories() { return categories; }

    @Override
    @Transactional(readOnly = true)
    public SearchResult search(SearchRequest request) {
        String types = request.types().stream().map(Enum::name)
                .reduce((a, b) -> a + "," + b).orElse("");
        if (types.isEmpty()) {
            return SearchResult.empty();
        }
        List<VenueCandidate> out = rows
                .nearby(request.center().lat(), request.center().lng(),
                        request.radiusKm() * 1000, types, MIN_CONFIDENCE, request.limit())
                .stream().map(row -> toCandidate(row, request.types())).toList();
        // quota null: yerel kaynagin kotasi yok.
        return new SearchResult(out, null);
    }

    private VenueCandidate toCandidate(OpenVenueRow row, List<ActivityType> requested) {
        return new VenueCandidate(ID, row.getId(), row.getName(),
                new GeoPoint(row.getLat(), row.getLng()),
                null, null, row.getPhotoUrl(), row.getCategory(), row.getAddress(),
                row.getLocality(), null, row.getOpeningHours(), row.getWebsite(),
                attribution(row, requested), null, null, null);
    }

    /** Satirin turleriyle SECILEN turlerin ilk kesisimi; kesismiyorsa null (uydurulmaz). */
    private static ActivityType attribution(OpenVenueRow row, List<ActivityType> requested) {
        List<String> onRow = List.of(row.getActivityTypes().split(","));
        return requested.stream().filter(t -> onRow.contains(t.name())).findFirst().orElse(null);
    }
}
```

- [ ] **Step 8: Testi çalıştır, yeşile döndüğünü gör**

Run: `MVN_TEST OpenVenueSourceTest`
Expected: 5 test yeşil. **İlk koşuda PostGIS imajı indirilir**; süre uzun olabilir, bu hata değildir.

- [ ] **Step 9: Diğer entegrasyon testlerinin PostGIS imajıyla hâlâ yeşil olduğunu doğrula**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true mvn -o test`
Expected: tüm paket yeşil (imaj değişikliğinin yan etkisi yok; V10/V11 her testte uygulanır).

- [ ] **Step 10: Değişen dosyaları listele**

`db/migration/V11__venues_open.sql`, `adapter/out/open/{VenueOpenEntity,VenueOpenRepository,OpenVenueRow,OpenVenueSource}.java`, `resources/venue-sources/open.yml`, `support/PostgresContainer.java`, `OpenVenueSourceTest.java`.
Mesaj: `feat(open): PostGIS-backed open venue source (V11 venues_open, ST_DWithin query)`

---

### Task 7: `MapLinks`, mekan alanları, `SessionViewAssembler`, kalite kapısı

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/geo/MapLinks.java`
- Modify: `domain/venue/Venue.java`, `adapter/out/persistence/VenueEntity.java`, `DeckStoreAdapter.java`
- Modify: `adapter/in/web/ApiDtos.java`, `adapter/in/web/SessionViewAssembler.java`
- Modify: `application/deck/DeckFlow.java`
- Test: `backend/src/test/java/com/bumpinto/domain/geo/MapLinksTest.java`
- Modify: `SessionViewAssemblerTest.java`, `DeckFlowTest.java` (varsa `application/deck` altındaki mevcut test)

- [ ] **Step 1: `MapLinksTest`'i yaz (kırmızı)**

```java
package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MapLinksTest {

    @Test
    void directionsCarriesTheViewersTravelMode() {
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.WALK)).isEqualTo(
                "https://www.google.com/maps/dir/?api=1&destination=51.44,5.47&travelmode=walking");
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.BIKE)).endsWith("bicycling");
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.EBIKE)).endsWith("bicycling");
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.TRANSIT)).endsWith("transit");
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.CAR)).endsWith("driving");
    }

    /** Mod null (konumsuz/anonim gorunum) -> araba: Google'in kendi varsayilani. */
    @Test
    void directionsFallsBackToDrivingWhenModeIsUnknown() {
        assertThat(MapLinks.directions(51.44, 5.47, null)).endsWith("driving");
    }

    @Test
    void appleUsesDirflgLetters() {
        assertThat(MapLinks.apple(51.44, 5.47, TravelMode.WALK))
                .isEqualTo("https://maps.apple.com/?daddr=51.44,5.47&dirflg=w");
        assertThat(MapLinks.apple(51.44, 5.47, TravelMode.EBIKE)).endsWith("dirflg=b");
        assertThat(MapLinks.apple(51.44, 5.47, TravelMode.TRANSIT)).endsWith("dirflg=r");
        assertThat(MapLinks.apple(51.44, 5.47, TravelMode.CAR)).endsWith("dirflg=d");
    }

    @Test
    void geoEscapesTheVenueName() {
        assertThat(MapLinks.geo(51.44, 5.47, "Café & Bar"))
                .isEqualTo("geo:51.44,5.47?q=51.44,5.47(Caf%C3%A9%20%26%20Bar)");
        assertThat(MapLinks.geo(51.44, 5.47, null)).isEqualTo("geo:51.44,5.47?q=51.44,5.47");
    }
}
```

- [ ] **Step 2: Testi çalıştır** — Run: `MVN_TEST MapLinksTest` → COMPILATION ERROR.

- [ ] **Step 3: `MapLinks`'i yaz**

```java
package com.bumpinto.domain.geo;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Harita linkleri API'SIZ: koordinat + ulasim turunden uretilir, her saglayicida ayni
 * (spec §10). Google Maps URL'leri anahtar istemez ve icerik gostermez, o yuzden Google
 * disi veriyle de kullanilabilir.
 */
public final class MapLinks {

    private MapLinks() {
    }

    public static String directions(double lat, double lng, TravelMode mode) {
        return String.format(Locale.ROOT,
                "https://www.google.com/maps/dir/?api=1&destination=%s,%s&travelmode=%s",
                lat, lng, googleMode(mode));
    }

    public static String apple(double lat, double lng, TravelMode mode) {
        return String.format(Locale.ROOT, "https://maps.apple.com/?daddr=%s,%s&dirflg=%s",
                lat, lng, appleFlag(mode));
    }

    /** Mobilde yerel harita uygulamasini acan sema; ad varsa etiketlenir. */
    public static String geo(double lat, double lng, String name) {
        String base = String.format(Locale.ROOT, "geo:%s,%s?q=%s,%s", lat, lng, lat, lng);
        if (name == null || name.isBlank()) {
            return base;
        }
        return base + "(" + URLEncoder.encode(name, StandardCharsets.UTF_8)
                .replace("+", "%20") + ")";
    }

    private static String googleMode(TravelMode mode) {
        if (mode == null) {
            return "driving";
        }
        return switch (mode) {
            case WALK -> "walking";
            case BIKE, EBIKE -> "bicycling";
            case TRANSIT -> "transit";
            case CAR -> "driving";
        };
    }

    private static String appleFlag(TravelMode mode) {
        if (mode == null) {
            return "d";
        }
        return switch (mode) {
            case WALK -> "w";
            case BIKE, EBIKE -> "b";
            case TRANSIT -> "r";
            case CAR -> "d";
        };
    }
}
```

- [ ] **Step 4: `Venue`, `VenueEntity`, `DeckStoreAdapter`'ı genişlet**

`domain/venue/Venue.java` — `mapsUrl` bileşeni **kalkar**, üç alan eklenir:

```java
public record Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                    GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                    int deckOrder, String category, String address, String locality,
                    Integer ratingCount, String hoursToday, String placeLink,
                    ActivityType activityType,
                    Double popularity, Integer ratingScale, String photoRef) {

    /** Yalnizca TESTLER icin kisa imza. */
    public Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                 GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                 int deckOrder) {
        this(id, sessionId, provider, externalId, name, location, rating, priceLevel, photoUrl,
                deckOrder, null, null, null, null, null, null, null, null, null, null);
    }

    /** Normalize puan: olcekler karistirilmadan kiyaslanabilsin (spec §4.6, §11). */
    public Double normalizedRating() {
        if (rating == null || ratingScale == null || ratingScale <= 0) {
            return null;
        }
        return rating / ratingScale;
    }

    public Venue withDeckOrder(int newOrder) {
        return new Venue(id, sessionId, provider, externalId, name, location, rating, priceLevel,
                photoUrl, newOrder, category, address, locality, ratingCount, hoursToday,
                placeLink, activityType, popularity, ratingScale, photoRef);
    }
}
```

`VenueEntity`: `String mapsUrl;` **kalır** (sütun V10'da düşürülmedi, yazılmaz) ve eklenir:

```java
    Double popularity;
    Integer ratingScale;
    String photoRef;
    Instant fetchedAt;
```

`DeckStoreAdapter.saveVenues`: `e.mapsUrl = null;` satırı silinir (alan hiç yazılmaz), yerine `e.popularity = v.popularity(); e.ratingScale = v.ratingScale(); e.photoRef = v.photoRef(); e.fetchedAt = clock.instant();` — adapter kurucusuna `Clock clock` eklenir. `venuesOf` eşlemesi `e.mapsUrl` argümanını bırakır, üç yeni alanı okur.

- [ ] **Step 5: `DeckFlow`'un kalite kapısını normalize puana çevir**

`findVenues` içindeki kısa liste:

```java
        Map<String, VenueCandidate> unique = new LinkedHashMap<>();
        found.forEach(c -> unique.putIfAbsent(c.provider() + ":" + c.externalId(), c));
        // Kalite kapisi: kapali mekan zaten kaynakta elendi (FSQ closed_bucket, open confidence).
        // Burada kalan tek olcut NORMALIZE puan — 8,7/10 ile 4,3/5 ayni sirada durabilsin.
        // Puan ESIGI YOK: seyrek bolgede deste kucultulmez (spec §4.6).
        List<VenueCandidate> shortlist = unique.values().stream()
                .sorted(canonicalOrder(VenueCandidate::normalizedRating,
                        VenueCandidate::externalId))
                .limit(DECK_MAX)
                .toList();
```

`VenueCandidate`'e `Venue` ile aynı `normalizedRating()` metodu eklenir. `shuffle`'daki kanonik sıralama da `Venue::normalizedRating` kullanır (idempotentlik korunur: iki yol aynı ölçütü kullanmalı). `Venue` kurucusu `c.mapsUrl()` argümanını bırakır, `c.popularity(), c.ratingScale(), c.photoRef()` alır.

`evaluate` içindeki `ratings` haritası da `v.normalizedRating()` kullanır (null → 0.0) — karar motoru artık farklı ölçekleri karşılaştırmaz.

- [ ] **Step 6: DTO ve assembler**

`ApiDtos.VenueDto`:

```java
    /** @param estimated OSRM yoksa haversine tahmini (yalniz teshis/analitik; UI "~" zaten basar). */
    public record TravelDto(UUID participantId, int minutes, boolean estimated) {
    }

    public record VenueDto(UUID id, String name, double lat, double lng, Double rating,
                           Integer priceLevel, String photoUrl, String mapsUrl, int deckOrder,
                           Map<UUID, Integer> travelMinutes, FairnessDto fairness,
                           String provider, String category, String address, String locality,
                           Integer ratingCount, String hoursToday, String placeLink,
                           ActivityType activityType,
                           /** 0-1, saglayici vermezse null. */
                           Double popularity,
                           /** 5 | 10 | null — puan DONUSTURULMEZ (spec §11). */
                           Integer ratingScale,
                           /** travelMinutes'un tahmin bayrakli hali; W-12 sonrasi tekil kaynak. */
                           List<TravelDto> travel) {
    }
```

> `travelMinutes` **bilerek duruyor**: web ve mobil bugün onu okuyor; bu plan backend'dir ve `pnpm exec tsc -b` kırmızıya düşmemeli. `travel[]` aynı sayıları `estimated` bayrağıyla taşır; `travelMinutes` W-12'de silinir (K-B26 olarak INDEX'e düşer).

`SessionViewAssembler`: `directionsUrl(v)` yardımcısı **silinir**, yerine:

```java
        UUID viewerId = WebPrincipals.viewerOf(snap, auth) == null ? null
                : WebPrincipals.viewerOf(snap, auth).participantId();
        TravelMode viewerMode = snap.participants().stream()
                .filter(p -> p.id().equals(viewerId)).findFirst()
                .map(Participant::travelMode).orElse(TravelMode.CAR);
```

ve DTO kurulumunda `MapLinks.directions(v.location().lat(), v.location().lng(), viewerMode)`, `v.placeLink()`, `v.popularity()`, `v.ratingScale()`. `travel` listesi T10'da doldurulur; bu görevde `travelMinutes`'tan türetilir (`estimated = true`, çünkü OSRM henüz yok):

```java
            List<ApiDtos.TravelDto> travelList = travel.entrySet().stream()
                    .map(e -> new ApiDtos.TravelDto(e.getKey(), e.getValue(), true)).toList();
```

- [ ] **Step 7: Assembler testini genişlet**

`SessionViewAssemblerTest`'e:

```java
    /** mapsUrl artik YOL TARIFI ve GORUNTULEYENIN moduyla: yaya bakan "walking" gorur. */
    @Test
    void mapsUrlUsesTheViewersTravelMode() {
        // ... mevcut fixture: viewer = yaya katilimci
        ApiDtos.VenueDto venue = view.venues().get(0);

        assertThat(venue.mapsUrl()).endsWith("&travelmode=walking");
        assertThat(venue.mapsUrl()).contains("destination=51.44,5.47");
        assertThat(venue.placeLink()).isEqualTo("https://koffie.example");
        assertThat(venue.ratingScale()).isEqualTo(10);
        assertThat(venue.popularity()).isEqualTo(0.93);
        assertThat(venue.travel()).extracting(ApiDtos.TravelDto::estimated).containsOnly(true);
    }

    /** Uye olmayan gorunumde mod bilinmez -> driving; link yine de calisir. */
    @Test
    void mapsUrlFallsBackToDrivingForNonMembers() {
        assertThat(assembler.toView(snapshot, null).venues().get(0).mapsUrl())
                .endsWith("&travelmode=driving");
    }
```

- [ ] **Step 8: Testleri çalıştır**

Run: `MVN_TEST MapLinksTest,SessionViewAssemblerTest,DeckFlowTest`
Expected: yeşil.

- [ ] **Step 9: Değişen dosyaları listele**

`domain/geo/MapLinks.java`, `domain/venue/{Venue,VenueCandidate}.java`, `adapter/out/persistence/{VenueEntity,DeckStoreAdapter}.java`, `adapter/in/web/{ApiDtos,SessionViewAssembler}.java`, `application/deck/DeckFlow.java`, `MapLinksTest`, `SessionViewAssemblerTest`, `DeckFlowTest`.
Mesaj: `feat(venues): API-free map links, popularity/ratingScale fields, scale-normalized quality gate`

---

### Task 8: Saklama kuralı ve saatlik iş

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/port/VenueRetentionPort.java`
- Create: `backend/src/main/java/com/bumpinto/application/venue/VenueContentRetention.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/VenueRetentionAdapter.java`
- Create: `backend/src/main/java/com/bumpinto/infra/config/SchedulingConfig.java`
- Test: `backend/src/test/java/com/bumpinto/application/venue/VenueContentRetentionTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/persistence/VenueRetentionAdapterTest.java`

- [ ] **Step 1: Port'u ve kullanım senaryosunun kırmızı testini yaz**

`domain/port/VenueRetentionPort.java`:

```java
package com.bumpinto.domain.port;

import java.time.Instant;
import java.util.Set;

/**
 * Saklama indirgemesi (spec §11). Uc kural, uc yazma; hepsi DB-ICI, ucretli cagri YOK.
 * Kazanan satir korunur (katilimcilarin verdigi kararin kaydi), yalnizca fotosu duser.
 */
public interface VenueRetentionPort {

    /** Suresi dolmus oturumlarda KAZANAN DISI satirlari indirger. */
    int stripExpiredSessions(Set<String> providers, Instant now);

    /** Suresi dolmus oturumlarin KAZANAN satirinda yalniz photo_url'i dusurur. */
    int stripWinnerPhotos(Set<String> providers, Instant now);

    /** fetched_at'i cutoff'tan eski satirlari indirger (oturum durumundan bagimsiz). */
    int stripOlderThan(Set<String> providers, Instant cutoff);
}
```

`backend/src/test/java/com/bumpinto/application/venue/VenueContentRetentionTest.java`:

```java
package com.bumpinto.application.venue;

import com.bumpinto.domain.port.VenueRetentionPort;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class VenueContentRetentionTest {

    static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");

    static VenueSource source(String id, RetentionRule rule) {
        VenueSourceDescriptor d = new VenueSourceDescriptor(id, "attribution." + id, null, null,
                rule, false, MapEngine.ANY, ZoneOffset.UTC);
        return new VenueSource() {
            @Override public VenueSourceDescriptor descriptor() { return d; }
            @Override public CategoryMapping categories() { return CategoryMapping.empty(); }
            @Override public SearchResult search(SearchRequest r) { return SearchResult.empty(); }
        };
    }

    static final class RecordingPort implements VenueRetentionPort {
        final List<String> calls = new ArrayList<>();

        @Override public int stripExpiredSessions(Set<String> providers, Instant now) {
            calls.add("expired" + providers + now);
            return providers.size();
        }

        @Override public int stripWinnerPhotos(Set<String> providers, Instant now) {
            calls.add("winner" + providers + now);
            return providers.size();
        }

        @Override public int stripOlderThan(Set<String> providers, Instant cutoff) {
            calls.add("aged" + providers + cutoff);
            return providers.size();
        }
    }

    /** Uc kural, uc ayri saglayici kumesi; open HICBIRINE girmez. */
    @Test
    void appliesEachRuleToTheSourcesThatDeclareIt() {
        RecordingPort port = new RecordingPort();
        new VenueContentRetention(List.of(
                source("foursquare", RetentionRule.STRIP_AT_EXPIRY),
                source("google", RetentionRule.STRIP_AT_EXPIRY),
                source("tripadvisor", RetentionRule.STRIP_AFTER_24H),
                source("open", RetentionRule.KEEP)),
                port, Clock.fixed(NOW, ZoneOffset.UTC)).run();

        assertThat(port.calls).containsExactly(
                "expired[foursquare, google]" + NOW,
                "winner[foursquare, google]" + NOW,
                "aged[tripadvisor]" + NOW.minus(Duration.ofHours(24)));
    }

    /** KEEP disinda kaynak yoksa DB'ye hic dokunulmaz. */
    @Test
    void doesNothingWhenEverySourceKeepsItsData() {
        RecordingPort port = new RecordingPort();
        new VenueContentRetention(List.of(source("open", RetentionRule.KEEP)), port,
                Clock.fixed(NOW, ZoneOffset.UTC)).run();

        assertThat(port.calls).isEmpty();
    }
}
```

- [ ] **Step 2: Testi çalıştır** — Run: `MVN_TEST VenueContentRetentionTest` → COMPILATION ERROR.

- [ ] **Step 3: Kullanım senaryosunu ve zamanlayıcıyı yaz**

```java
package com.bumpinto.application.venue;

import com.bumpinto.domain.port.VenueRetentionPort;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** Saglayici sozlesmelerinin metadata omru (spec §11). DB-ICI; ucretli cagri yok. */
@Service
@ConditionalOnProperty(prefix = "bumpinto.retention", name = "enabled", matchIfMissing = true)
public class VenueContentRetention {

    private static final Logger log = LoggerFactory.getLogger(VenueContentRetention.class);
    private static final Duration MAX_AGE = Duration.ofHours(24);

    private final Set<String> atExpiry;
    private final Set<String> after24h;
    private final VenueRetentionPort rows;
    private final Clock clock;

    public VenueContentRetention(List<VenueSource> sources, VenueRetentionPort rows, Clock clock) {
        this.atExpiry = idsWith(sources, RetentionRule.STRIP_AT_EXPIRY);
        this.after24h = idsWith(sources, RetentionRule.STRIP_AFTER_24H);
        this.rows = rows;
        this.clock = clock;
    }

    private static Set<String> idsWith(List<VenueSource> sources, RetentionRule rule) {
        return sources.stream().map(VenueSource::descriptor)
                .filter(d -> d.retention() == rule)
                .map(VenueSourceDescriptor::id)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /** Saatte bir; oturum TTL'i 24 saat oldugu icin daha sik kosmanin kazanci yok. */
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M",
            scheduler = "retentionScheduler")
    public void run() {
        Instant now = clock.instant();
        if (!atExpiry.isEmpty()) {
            int stripped = rows.stripExpiredSessions(atExpiry, now);
            int winners = rows.stripWinnerPhotos(atExpiry, now);
            log.info("retention: stripped {} expired rows, {} winner photos ({})",
                    stripped, winners, atExpiry);
        }
        if (!after24h.isEmpty()) {
            int aged = rows.stripOlderThan(after24h, now.minus(MAX_AGE));
            log.info("retention: stripped {} rows older than 24h ({})", aged, after24h);
        }
    }
}
```

`infra/config/SchedulingConfig.java`:

```java
package com.bumpinto.infra.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * Saklama isi KENDI havuzunda: STOMP heartbeat zamanlayicisini paylassaydi bir DB duraksamasi
 * soket kalp atislarini geciktirirdi.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Bean
    ThreadPoolTaskScheduler retentionScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("retention-");
        scheduler.setAwaitTerminationSeconds(5);
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        return scheduler;
    }
}
```

- [ ] **Step 4: Adapter'ın Testcontainers testini yaz**

`VenueRetentionAdapterTest` — `PostgresContainer.shared()` ile `@SpringBootTest` (T2'deki `@DynamicPropertySource` bloğunun aynısı). Kurgu: bir süresi dolmuş oturum (`expires_at = now-1h`, `decided_venue_id = kazanan`), içinde `foursquare` sağlayıcılı iki mekan (kazanan + kaybeden) ve bir `open` mekanı; bir de `fetched_at = now-30h` olan `tripadvisor` satırı.

```java
    @Test
    void stripsLoserRowsOfExpiredSessionsButKeepsIdentityColumns() {
        adapter.stripExpiredSessions(Set.of("foursquare"), NOW);

        Venue loser = deck.venuesOf(sessionId).stream()
                .filter(v -> v.externalId().equals("loser")).findFirst().orElseThrow();
        assertThat(loser.name()).isNull();
        assertThat(loser.rating()).isNull();
        assertThat(loser.popularity()).isNull();
        assertThat(loser.priceLevel()).isNull();
        assertThat(loser.hoursToday()).isNull();
        assertThat(loser.address()).isNull();
        assertThat(loser.locality()).isNull();
        assertThat(loser.category()).isNull();
        assertThat(loser.photoUrl()).isNull();
        // Kimlik ve link KALIR: external_id, photo_ref, koordinat, place_link.
        assertThat(loser.externalId()).isEqualTo("loser");
        assertThat(loser.photoRef()).isEqualTo("ph-loser");
        assertThat(loser.location().lat()).isEqualTo(51.44);
        assertThat(loser.placeLink()).isEqualTo("https://loser.example");
    }

    /** Kazanan satir ADI ve YOL TARIFINI tutar, yalniz fotosu duser (karar kaydi). */
    @Test
    void keepsWinnerNameAndLinkWhileDroppingOnlyThePhoto() {
        adapter.stripExpiredSessions(Set.of("foursquare"), NOW);
        adapter.stripWinnerPhotos(Set.of("foursquare"), NOW);

        Venue winner = deck.venuesOf(sessionId).stream()
                .filter(v -> v.externalId().equals("winner")).findFirst().orElseThrow();
        assertThat(winner.name()).isEqualTo("Kazanan Kafe");
        assertThat(winner.placeLink()).isEqualTo("https://winner.example");
        assertThat(winner.location().lng()).isEqualTo(5.47);
        assertThat(winner.photoUrl()).isNull();
        assertThat(winner.rating()).isNull();
    }

    /** open satiri KEEP: hicbir kural onu gormemeli (kural kumesi disinda). */
    @Test
    void neverTouchesOpenRows() {
        adapter.stripExpiredSessions(Set.of("foursquare"), NOW);

        Venue open = deck.venuesOf(sessionId).stream()
                .filter(v -> v.provider().equals("open")).findFirst().orElseThrow();
        assertThat(open.name()).isEqualTo("Stadswandelpark");
        assertThat(open.photoUrl()).isNotNull();
    }

    /** STRIP_AFTER_24H oturum durumuna BAKMAZ: taze oturumdaki eski satir da indirgenir. */
    @Test
    void stripsRowsOlderThanTheCutoffRegardlessOfSessionState() {
        assertThat(adapter.stripOlderThan(Set.of("tripadvisor"), NOW.minus(Duration.ofHours(24))))
                .isEqualTo(1);
        assertThat(deck.venuesOf(freshSessionId).stream()
                .filter(v -> v.provider().equals("tripadvisor")).findFirst().orElseThrow().name())
                .isNull();
    }
```

- [ ] **Step 5: Adapter'ı yaz**

```java
package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.VenueRetentionPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;

@Component
public class VenueRetentionAdapter implements VenueRetentionPort {

    private final VenueRetentionRepository rows;

    public VenueRetentionAdapter(VenueRetentionRepository rows) {
        this.rows = rows;
    }

    @Override
    @Transactional
    public int stripExpiredSessions(Set<String> providers, Instant now) {
        return rows.stripExpired(providers, now);
    }

    @Override
    @Transactional
    public int stripWinnerPhotos(Set<String> providers, Instant now) {
        return rows.stripWinnerPhoto(providers, now);
    }

    @Override
    @Transactional
    public int stripOlderThan(Set<String> providers, Instant cutoff) {
        return rows.stripAged(providers, cutoff);
    }
}
```

`adapter/out/persistence/VenueRetentionRepository.java`:

```java
package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Set;

interface VenueRetentionRepository extends Repository<VenueEntity, java.util.UUID> {

    /** Indirgenen sutunlar spec §11'de sayili; kimlik/koordinat/link DOKUNULMAZ. */
    @Modifying
    @Query(value = """
            update venues v set name = null, rating = null, popularity = null,
                   price_level = null, hours_today = null, address = null, locality = null,
                   category = null, photo_url = null, rating_count = null
              from sessions s
             where v.session_id = s.id
               and v.provider in (:providers)
               and s.expires_at < :now
               and (s.decided_venue_id is null or v.id <> s.decided_venue_id)
               and v.name is not null
            """, nativeQuery = true)
    int stripExpired(@Param("providers") Set<String> providers, @Param("now") Instant now);

    @Modifying
    @Query(value = """
            update venues v set photo_url = null, rating = null, popularity = null,
                   price_level = null, hours_today = null, address = null, locality = null,
                   category = null, rating_count = null
              from sessions s
             where v.session_id = s.id
               and v.provider in (:providers)
               and s.expires_at < :now
               and v.id = s.decided_venue_id
               and v.photo_url is not null
            """, nativeQuery = true)
    int stripWinnerPhoto(@Param("providers") Set<String> providers, @Param("now") Instant now);

    @Modifying
    @Query(value = """
            update venues set name = null, rating = null, popularity = null, price_level = null,
                   hours_today = null, address = null, locality = null, category = null,
                   photo_url = null, rating_count = null
             where provider in (:providers) and fetched_at < :cutoff and name is not null
            """, nativeQuery = true)
    int stripAged(@Param("providers") Set<String> providers, @Param("cutoff") Instant cutoff);
}
```

> `and v.name is not null` / `and v.photo_url is not null` koşulları **idempotentlik** içindir: iş saatte bir koşar, aynı satırı ikinci kez güncellemez ve dönen sayı "bu turda kaç satır indirgendi"yi doğru söyler.

- [ ] **Step 6: Testleri çalıştır**

Run: `MVN_TEST VenueContentRetentionTest,VenueRetentionAdapterTest`
Expected: 6 test yeşil.

- [ ] **Step 7: Değişen dosyaları listele**

`domain/port/VenueRetentionPort.java`, `application/venue/VenueContentRetention.java`, `adapter/out/persistence/{VenueRetentionAdapter,VenueRetentionRepository}.java`, `infra/config/SchedulingConfig.java`, 2 test.
Mesaj: `feat(venues): provider retention rules with hourly DB-only sweep`

---

### Task 9: `GET /api/config`, `POST /api/geocode`, ileri geocode, Bruno

**Files:**
- Create: `domain/port/GeocodePort.java`, `domain/geo/GeoResult.java`
- Rename+extend: `adapter/out/geocode/NominatimReverseGeocoder.java` → `adapter/out/geocode/NominatimGeocoder.java`
- Create: `adapter/in/web/ConfigController.java`, `adapter/in/web/GeocodeController.java`
- Modify: `adapter/in/web/ApiDtos.java`, `infra/security/SecurityConfig.java`, `infra/security/RateLimitFilter.java`
- Create: `.infra/bumpinto-collection/config/{folder.yml,get-config.yml}`, `.infra/bumpinto-collection/geocode/{folder.yml,forward.yml,reverse.yml}`
- Test: `adapter/out/geocode/NominatimGeocoderTest.java` (mevcut testin yerine), `adapter/in/web/ConfigControllerTest.java`, `adapter/out/geocode/NominatimContractTest.java`
- Modify: `WebSecuritySliceTest`, `RateLimitFilterTest`

- [ ] **Step 1: Port ve değer nesnesini yaz (kırmızı test önce)**

`domain/geo/GeoResult.java`:

```java
package com.bumpinto.domain.geo;

/** Ileri geocode sonucu: nokta + insanin okuyacagi etiket. */
public record GeoResult(GeoPoint point, String label) {
}
```

`domain/port/GeocodePort.java`:

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.GeoResult;

import java.util.Optional;

/**
 * Metinden koordinat. {@code bias} varsa arama o noktanin cevresine oncelik verir (host'un
 * capa secimi Hollanda'da bir sokak adi yazdiginda Amerika'daki adasini bulmasin).
 * Basarisizlik NORMALDIR: cagiran 404 doner.
 */
public interface GeocodePort {

    Optional<GeoResult> forward(String query, GeoPoint bias);
}
```

`NominatimGeocoderTest` (mevcut `NominatimReverseGeocoderTest`'in devamı, üç yeni test):

```java
    @Test
    void forwardReturnsThePointAndLabelOfTheFirstHit() {
        mock.expect(HttpMethod.GET, "https://nominatim.openstreetmap.org/search")
                .thenReturn("""
                        [{"lat":"51.4416","lon":"5.4697","display_name":"Eindhoven, Nederland"}]
                        """);

        assertThat(geocoder.forward("Eindhoven", null)).contains(
                new GeoResult(new GeoPoint(51.4416, 5.4697), "Eindhoven, Nederland"));
    }

    @Test
    void forwardReturnsEmptyForNoHitsAndForTransportFailure() {
        mock.expect(HttpMethod.GET, SEARCH).thenReturn("[]");
        assertThat(geocoder.forward("qqqq", null)).isEmpty();

        MockClient.clear(http);
        mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH).thenReturn("boom").withStatus(500);
        assertThat(geocoder.forward("Eindhoven", null)).isEmpty();
    }

    /** Throttle BLOKLAMAZ: dolu pencerede istek atlanir, cagiran bos doner (K-B20/K-B22). */
    @Test
    void throttleSkipsInsteadOfSleeping() {
        mock.expect(HttpMethod.GET, SEARCH).thenReturn("""
                [{"lat":"51.0","lon":"5.0","display_name":"A"}]
                """);
        NominatimGeocoder tight = new NominatimGeocoder(http, TestProps.of(
                new AppProps.Geocode("dev@bumpinto.test", Duration.ofMinutes(5), "nominatim",
                        "https://nominatim.openstreetmap.org")));

        assertThat(tight.forward("A", null)).isPresent();
        long start = System.nanoTime();
        assertThat(tight.forward("B", null)).isEmpty();
        assertThat(System.nanoTime() - start).isLessThan(Duration.ofSeconds(1).toNanos());
    }
```

- [ ] **Step 2: Testi çalıştır** — Run: `MVN_TEST NominatimGeocoderTest` → COMPILATION ERROR.

- [ ] **Step 3: `NominatimGeocoder`'ı yaz**

Mevcut `NominatimReverseGeocoder` dosyası yeniden adlandırılır (`implements ReverseGeocodePort, GeocodePort`) ve dört değişiklik alır:

```java
    private final String baseUrl;   // AppProps.Geocode.baseUrl; sondaki '/' kirpilir
    private final Semaphore slot = new Semaphore(1);
    private volatile long nextAllowedNanos = System.nanoTime();

    /** BLOKLAMAYAN throttle: dolu pencerede istek ATLANIR (etiket bir sonraki poll'da gelir). */
    private boolean tryAcquire() {
        if (!slot.tryAcquire()) {
            return false;
        }
        try {
            if (System.nanoTime() < nextAllowedNanos) {
                return false;
            }
            nextAllowedNanos = System.nanoTime() + minInterval.toNanos();
            return true;
        } finally {
            slot.release();
        }
    }

    @Override
    public Optional<GeoResult> forward(String query, GeoPoint bias) {
        if (query == null || query.isBlank() || !tryAcquire()) {
            return Optional.empty();
        }
        try {
            var request = http.get(baseUrl + "/search")
                    .header("User-Agent", userAgent)
                    .header("Accept", "application/json")
                    .queryString("format", "jsonv2")
                    .queryString("limit", 1)
                    .queryString("q", query);
            if (bias != null) {
                // Viewbox ~40 km: sonuc kutunun disinda da olabilir, yalniz oncelik verir.
                GeoPoint p = TravelMinutes.approx(bias);
                request = request.queryString("viewbox",
                        (p.lng() - 0.5) + "," + (p.lat() + 0.36) + ","
                                + (p.lng() + 0.5) + "," + (p.lat() - 0.36));
            }
            HttpResponse<JsonNode> response = request.asJson();
            if (!response.isSuccess() || response.getBody() == null
                    || !response.getBody().isArray() || response.getBody().getArray().isEmpty()) {
                return Optional.empty();
            }
            JSONObject hit = response.getBody().getArray().getJSONObject(0);
            return Optional.of(new GeoResult(
                    new GeoPoint(hit.getDouble("lat"), hit.getDouble("lon")),
                    hit.optString("display_name", null)));
        } catch (RuntimeException e) {
            log.warn("nominatim search failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
```

`REVERSE_URL` sabiti `baseUrl + "/reverse"` olur; `throttle()` (Thread.sleep'li) silinir ve `label(...)` da `tryAcquire()` kullanır — dolu pencerede `Optional.empty()` döner (etiket zaten susma payıdır).

- [ ] **Step 4: DTO'ları, iki controller'ı ve güvenlik/limit ayarlarını yaz**

`ApiDtos`'a:

```java
    public record ConfigTilesDto(String styleUrl) {
    }

    public record ConfigSourceDto(String id, String attributionKey, String attributionUrl,
                                  Integer ratingScale) {
    }

    public record ConfigResponse(String mapEngine, ConfigTilesDto tiles,
                                 List<ConfigSourceDto> sources) {
    }

    public record GeocodeRequest(@NotBlank @Size(max = 200) String query,
                                 Double biasLat, Double biasLng) {
    }

    public record GeocodeResponse(double lat, double lng, String label) {
    }

    public record ReverseGeocodeRequest(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                        @NotNull @DecimalMin("-180") @DecimalMax("180")
                                        Double lng) {
    }

    public record ReverseGeocodeResponse(String label) {
    }
```

`ConfigController`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/** Istemcinin acilista okudugu TEK yapilandirma ucu (spec §7). Sir tasimaz, public. */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    private final AppProps props;
    private final List<ApiDtos.ConfigSourceDto> sources;

    /** Liste @Order sirasindadir; atif satirlari da bu sirada cizilir. */
    public ConfigController(AppProps props, List<VenueSource> sources) {
        this.props = props;
        this.sources = sources.stream().map(VenueSource::descriptor)
                .map(ConfigController::toDto).toList();
    }

    private static ApiDtos.ConfigSourceDto toDto(VenueSourceDescriptor d) {
        return new ApiDtos.ConfigSourceDto(d.id(), d.attributionKey(), d.attributionUrl(),
                d.ratingScale());
    }

    @GetMapping
    public ResponseEntity<ApiDtos.ConfigResponse> config() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(new ApiDtos.ConfigResponse(props.map().engine(),
                        new ApiDtos.ConfigTilesDto(props.map().tiles().styleUrl()), sources));
    }
}
```

`GeocodeController`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.GeocodePort;
import com.bumpinto.domain.port.ReverseGeocodePort;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Geocode SUNUCUDA: istemci Nominatim'e dogrudan gitmiyor (kullanim politikasi, User-Agent,
 * throttle ve onbellek tek yerde). Hesap JWT'si ya da katilimci token'i yeter.
 */
@RestController
@RequestMapping("/api/geocode")
public class GeocodeController {

    private final GeocodePort forward;
    private final ReverseGeocodePort reverse;

    public GeocodeController(GeocodePort forward, ReverseGeocodePort reverse) {
        this.forward = forward;
        this.reverse = reverse;
    }

    @PostMapping
    public ResponseEntity<ApiDtos.GeocodeResponse> forward(
            @Valid @RequestBody ApiDtos.GeocodeRequest request) {
        GeoPoint bias = request.biasLat() == null || request.biasLng() == null ? null
                : new GeoPoint(request.biasLat(), request.biasLng());
        return forward.forward(request.query(), bias)
                .map(r -> ResponseEntity.ok(new ApiDtos.GeocodeResponse(
                        r.point().lat(), r.point().lng(), r.label())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Etiket bulunamamasi HATA DEGIL: {label: null} doner, cagiran satiri gizler. */
    @PostMapping("/reverse")
    public ApiDtos.ReverseGeocodeResponse reverse(
            @Valid @RequestBody ApiDtos.ReverseGeocodeRequest request) {
        return new ApiDtos.ReverseGeocodeResponse(
                reverse.label(new GeoPoint(request.lat(), request.lng())).orElse(null));
    }
}
```

`SecurityConfig.PUBLIC_ENDPOINTS` listesine:

```java
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/config"),
```

`RateLimitFilter.defaultPolicies()`'e (`api` catch-all'dan **önce**):

```java
                // Nominatim politikasi 1 istek/sn; 10/dk kullanicinin yazarken tetikledigi
                // aramalari kaldirir ama tek istemcinin ustumuzden Nominatim'i doldurmasini
                // engeller.
                new Policy("geocode", "POST", Pattern.compile("^/api/geocode(/reverse)?$"), 10),
```

- [ ] **Step 5: Uç testlerini yaz ve çalıştır**

`ConfigControllerTest` (`@WebMvcTest` + `MockMvcTester`, mevcut web dilim testlerinin deseni):

```java
    /** Sozlesme SABIT: web bu dort alani okur, fazlasi degil. */
    @Test
    void returnsEngineTilesAndEnabledSourcesInOrder() {
        assertThat(mvc.get().uri("/api/config")).hasStatusOk()
                .hasHeader("Cache-Control", "max-age=300, public")
                .bodyJson().isLenientlyEqualTo("""
                        {"mapEngine":"maplibre",
                         "tiles":{"styleUrl":"https://tiles.example/style.json"},
                         "sources":[
                           {"id":"foursquare","attributionKey":"attribution.foursquare",
                            "attributionUrl":"https://foursquare.com","ratingScale":10},
                           {"id":"open","attributionKey":"attribution.open",
                            "attributionUrl":"https://www.openstreetmap.org/copyright",
                            "ratingScale":null}]}
                        """);
    }
```

`WebSecuritySliceTest`'e: `/api/config` kimliksiz **200**, `/api/geocode` kimliksiz **401**, katılımcı token'ıyla **200/404**. `RateLimitFilterTest`'e: 11. `POST /api/geocode` **429**.

- [ ] **Step 6: Nominatim sözleşme testi**

`NominatimContractTest` — `@EnabledIfEnvironmentVariable(named = "GEOCODE_BASE_URL", matches = ".+")`; iki test: `forward("Eindhoven")` bir nokta döner ve NL sınırları içindedir (lat 50.7–53.6, lng 3.2–7.3); `label(51.4416, 5.4697)` boş olmayan bir kasaba kelimesi döner. Env yoksa atlanır.

- [ ] **Step 7: Bruno dosyalarını yaz**

`.infra/bumpinto-collection/config/folder.yml` (`name: Config`, `seq` mevcut klasörlerden sonra), `config/get-config.yml`:

```yaml
info:
  name: Get Config
  type: http
  seq: 1

http:
  method: GET
  url: "{{baseUrl}}/api/config"

runtime:
  scripts:
    - type: tests
      code: |-
        test("200 ve mapEngine doner", function() {
          expect(res.status).to.equal(200);
          expect(res.body.mapEngine).to.be.oneOf(["maplibre", "google"]);
          expect(res.body.sources.length).to.be.above(0);
        });

docs:
  type: text/markdown
  content: |-
    **Auth: yok (public).** `Cache-Control: max-age=300`.

    Istemcinin acilista okudugu tek yapilandirma ucu.
    - `mapEngine`: `maplibre` | `google` — harita motoru SUNUCUDAN gelir, `VITE_MAP_ENGINE` yok.
    - `tiles.styleUrl`: MapLibre stil JSON adresi (OpenFreeMap positron; PMTiles yedegi env ile).
    - `sources[]`: ACIK sagliyicilarin tanimlayicisi, `@Order` sirasinda.
      `attributionKey` i18n anahtaridir (`attribution.foursquare`), `ratingScale` 10 | 5 | null.
      Atif satirlari ve `formatRating` bu listeden kurulur; saglayici basina kod dali YOKTUR.

    Rate limit: `api` kovasi (120/dk).
```

`geocode/folder.yml`, `geocode/forward.yml` (`POST {{baseUrl}}/api/geocode`, bearer `{{participantToken}}`, gövde `{"query":"Eindhoven","biasLat":51.44,"biasLng":5.47}`, test 200|404, `bru.setVar("geocodeLat", res.body.lat)`) ve `geocode/reverse.yml` (`POST /api/geocode/reverse`, gövde `{"lat":51.4416,"lng":5.4697}`, test 200 + `label` string|null). Her ikisinin `docs:` bloğu: auth = hesap JWT **veya** katılımcı token'ı; `query` 1–200 karakter; rate limit **geocode 10/dk**; 404 = sonuç yok (hata değil); ters geocode `{label: null}` dönebilir.

- [ ] **Step 8: Testleri çalıştır**

Run: `MVN_TEST NominatimGeocoderTest,ConfigControllerTest,WebSecuritySliceTest,RateLimitFilterTest`
Expected: yeşil. `MVN_TEST NominatimContractTest` → env yoksa skipped.

- [ ] **Step 9: Değişen dosyaları listele**

`domain/port/GeocodePort.java`, `domain/geo/GeoResult.java`, `adapter/out/geocode/NominatimGeocoder.java` (+eski dosya silindi), `adapter/in/web/{ConfigController,GeocodeController,ApiDtos}.java`, `infra/security/{SecurityConfig,RateLimitFilter}.java`, 5 Bruno dosyası, 3 test + 2 güncellenen test.
Mesaj: `feat(api): GET /api/config and POST /api/geocode (forward + reverse) with non-blocking throttle`

---

### Task 10: `RoutingPort`, OSRM, gerçek süre matrisi

**Files:**
- Create: `domain/port/RoutingPort.java`, `domain/geo/TravelLeg.java`
- Modify: `domain/geo/TravelMinutes.java`
- Create: `adapter/out/routing/OsrmRouting.java`
- Modify: `adapter/in/web/SessionViewAssembler.java`
- Test: `domain/geo/TravelMinutesTest.java` (mevcut), `adapter/out/routing/OsrmRoutingTest.java`, `adapter/out/routing/OsrmContractTest.java`

- [ ] **Step 1: Port ve değer nesnesi**

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;

import java.util.List;
import java.util.Optional;

/**
 * Kaynak x hedef sure matrisi (saniye). Servis yoksa/yavassa {@code Optional.empty()} —
 * cagiran haversine tahminine duser, oturum akar.
 */
public interface RoutingPort {

    Optional<int[][]> durationsSeconds(List<GeoPoint> sources, List<GeoPoint> destinations,
                                       TravelMode mode);
}
```

```java
package com.bumpinto.domain.geo;

/** @param estimated true = haversine tahmini (OSRM yok ya da TRANSIT). */
public record TravelLeg(int minutes, boolean estimated) {
}
```

- [ ] **Step 2: `TravelMinutes` matris testini yaz (kırmızı)**

```java
    /** Oturum basina MOD basina TEK matris: 2 yaya + 1 surucu = 2 cagri, 3 mekan icin de. */
    @Test
    void asksTheRoutingPortOncePerModeNotOncePerVenue() {
        List<GeoPoint> venues = List.of(V1, V2, V3);
        RecordingRouting routing = new RecordingRouting();

        TravelMinutes.byParticipant(List.of(walker1, walker2, driver), venues, routing);

        assertThat(routing.calls).extracting(c -> c.mode).containsExactlyInAnyOrder(
                TravelMode.WALK, TravelMode.CAR);
        assertThat(routing.calls).allSatisfy(c -> assertThat(c.destinations).hasSize(3));
    }

    /** OSRM saniyeleri 5 dk basamagina yuvarlanir, en az bir basamak; estimated=false. */
    @Test
    void usesRealDurationsWhenRoutingAnswers() {
        RecordingRouting routing = RecordingRouting.returning(new int[][]{{760, 60}});

        Map<UUID, TravelLeg> legs = TravelMinutes
                .byParticipant(List.of(walker1), List.of(V1, V2), routing).get(0);

        assertThat(legs.get(walker1.id())).isEqualTo(new TravelLeg(15, false));
    }

    /** EBIKE bisiklet profilini kullanir ve sureyi 16/24 ile olcekler. */
    @Test
    void ebikeScalesTheBicycleMatrix() {
        RecordingRouting routing = RecordingRouting.returning(new int[][]{{1800}});

        Map<UUID, TravelLeg> legs = TravelMinutes
                .byParticipant(List.of(ebiker), List.of(V1), routing).get(0);

        assertThat(routing.calls).extracting(c -> c.mode).containsExactly(TravelMode.BIKE);
        assertThat(legs.get(ebiker.id())).isEqualTo(new TravelLeg(20, false)); // 1800*16/24=1200 sn
    }

    /** OSRM bos donerse ve TRANSIT'te haversine; estimated=true, eski sayilarla ayni. */
    @Test
    void fallsBackToHaversineWhenRoutingIsAbsentOrModeIsTransit() {
        Map<UUID, TravelLeg> legs = TravelMinutes
                .byParticipant(List.of(walker1, rider), List.of(V1), EMPTY_ROUTING).get(0);

        assertThat(legs.get(walker1.id()).estimated()).isTrue();
        assertThat(legs.get(walker1.id()).minutes())
                .isEqualTo(TravelMinutes.between(walker1.location(), TravelMode.WALK, V1));
        assertThat(legs.get(rider.id()).estimated()).isTrue();
    }
```

- [ ] **Step 3: `TravelMinutes`'ı genişlet**

Mevcut `between`, `approx`, `byParticipant(located, venue)` **aynen kalır** (tek mekanlık yol hâlâ kullanılıyor). Eklenen:

```java
    /** e-bisiklet OSRM'de yok: bisiklet matrisi hiz oraniyla olceklenir (16/24). */
    private static final double EBIKE_FACTOR = TravelMode.BIKE.kmh() / TravelMode.EBIKE.kmh();

    /**
     * Oturum basina MOD basina TEK matris. Mekan basina cagri atsaydik 20 kartlik destede
     * 20x istek olurdu; OSRM {@code /table} zaten NxM icin tasarlandi.
     *
     * @return venues ile AYNI sirada, her mekan icin katilimci -> bacak
     */
    public static List<Map<UUID, TravelLeg>> byParticipant(List<Participant> located,
                                                           List<GeoPoint> venues,
                                                           RoutingPort routing) {
        List<Map<UUID, TravelLeg>> out = new ArrayList<>(venues.size());
        for (int i = 0; i < venues.size(); i++) {
            out.add(new LinkedHashMap<>());
        }
        Map<TravelMode, List<Participant>> byMode = located.stream()
                .collect(Collectors.groupingBy(Participant::travelMode, LinkedHashMap::new,
                        Collectors.toList()));
        byMode.forEach((mode, people) -> {
            List<GeoPoint> sources = people.stream().map(p -> approx(p.location())).toList();
            // TRANSIT'te rota servisi yok (GTFS ayri is): tahmin kalir.
            Optional<int[][]> matrix = mode == TravelMode.TRANSIT ? Optional.empty()
                    : routing.durationsSeconds(sources, venues, profileOf(mode));
            for (int p = 0; p < people.size(); p++) {
                Participant person = people.get(p);
                for (int v = 0; v < venues.size(); v++) {
                    out.get(v).put(person.id(), leg(matrix, mode, p, v, person, venues.get(v)));
                }
            }
        });
        return out;
    }

    private static TravelMode profileOf(TravelMode mode) {
        return mode == TravelMode.EBIKE ? TravelMode.BIKE : mode;
    }

    private static TravelLeg leg(Optional<int[][]> matrix, TravelMode mode, int p, int v,
                                 Participant person, GeoPoint venue) {
        if (matrix.isPresent() && matrix.get().length > p && matrix.get()[p].length > v
                && matrix.get()[p][v] >= 0) {
            double seconds = matrix.get()[p][v];
            if (mode == TravelMode.EBIKE) {
                seconds *= EBIKE_FACTOR;
            }
            return new TravelLeg(round(seconds / 60.0), false);
        }
        return new TravelLeg(between(person.location(), mode, venue), true);
    }

    /** 5 dk basamagi ve "~0 dk yoktur" kurali tek yerde. */
    private static int round(double minutes) {
        return Math.max(STEP, Math.round((float) minutes / STEP) * STEP);
    }
```

`between(...)` de `round(...)` kullanacak şekilde sadeleşir (davranış aynı).

- [ ] **Step 4: `OsrmRouting`'i yaz + testi**

```java
package com.bumpinto.adapter.out.routing;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.RoutingPort;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * OSRM {@code /table}: NxM sure matrisi tek istekte. Profil basina ayri base URL; bos =
 * o profil kapali. 1 sn'de cevap gelmezse bos doner — kart cizimi rota servisini BEKLEMEZ.
 */
@Component
public class OsrmRouting implements RoutingPort {

    private static final Logger log = LoggerFactory.getLogger(OsrmRouting.class);
    private static final int TIMEOUT_MS = 1000;

    private final UnirestInstance http;
    private final AppProps.Routing.Osrm urls;

    public OsrmRouting(UnirestInstance http, AppProps props) {
        this.http = http;
        this.urls = props.routing().osrm();
    }

    @Override
    public Optional<int[][]> durationsSeconds(List<GeoPoint> sources,
                                              List<GeoPoint> destinations, TravelMode mode) {
        String base = baseUrlOf(mode);
        if (base == null || base.isBlank() || sources.isEmpty() || destinations.isEmpty()) {
            return Optional.empty();
        }
        // OSRM koordinat sirasi lng,lat; kaynaklar once, hedefler sonra tek listede.
        String coordinates = java.util.stream.Stream.concat(sources.stream(),
                        destinations.stream())
                .map(p -> String.format(Locale.ROOT, "%s,%s", p.lng(), p.lat()))
                .collect(Collectors.joining(";"));
        String sourceIdx = indexes(0, sources.size());
        String destIdx = indexes(sources.size(), destinations.size());
        try {
            HttpResponse<JsonNode> response = http.get(
                            base.replaceAll("/+$", "") + "/table/v1/" + profile(mode)
                                    + "/" + coordinates)
                    .queryString("sources", sourceIdx)
                    .queryString("destinations", destIdx)
                    .queryString("annotations", "duration")
                    .connectTimeout(TIMEOUT_MS)
                    .requestTimeout(TIMEOUT_MS)
                    .asJson();
            if (!response.isSuccess() || response.getBody() == null) {
                log.warn("osrm {} returned {}", profile(mode), response.getStatus());
                return Optional.empty();
            }
            JSONArray rows = response.getBody().getObject().optJSONArray("durations");
            if (rows == null || rows.length() != sources.size()) {
                return Optional.empty();
            }
            int[][] matrix = new int[sources.size()][destinations.size()];
            for (int r = 0; r < rows.length(); r++) {
                JSONArray row = rows.getJSONArray(r);
                for (int c = 0; c < destinations.size(); c++) {
                    // null = ulasilamaz; -1 ile isaretlenir, cagiran tahmine duser.
                    matrix[r][c] = row.isNull(c) ? -1 : (int) Math.round(row.getDouble(c));
                }
            }
            return Optional.of(matrix);
        } catch (RuntimeException e) {
            log.warn("osrm {} failed: {}", profile(mode), e.getMessage());
            return Optional.empty();
        }
    }

    private static String indexes(int from, int count) {
        return IntStream.range(from, from + count).mapToObj(Integer::toString)
                .collect(Collectors.joining(";"));
    }

    private static String profile(TravelMode mode) {
        return switch (mode) {
            case CAR -> "car";
            case BIKE, EBIKE -> "bicycle";
            default -> "foot";
        };
    }

    private String baseUrlOf(TravelMode mode) {
        return switch (mode) {
            case CAR -> urls.car();
            case BIKE, EBIKE -> urls.bicycle();
            case WALK -> urls.foot();
            case TRANSIT -> null;
        };
    }
}
```

`OsrmRoutingTest` (Unirest MockClient): (a) `durations` matrisi 2×3 olarak okunur; (b) base URL boşsa istek **hiç atılmaz** (`mock.verifyNoUnmatchedRequests()`); (c) HTTP 500 → `Optional.empty()`; (d) `TRANSIT` → boş, istek yok; (e) `null` hücre → `-1`.

`OsrmContractTest` — `@EnabledIfEnvironmentVariable(named = "OSRM_CAR_URL", matches = ".+")`: iki kaynak, üç hedef (Eindhoven çevresi), dönen matris 2×3 ve her hücre 0 < x < 7200 sn.

- [ ] **Step 5: Assembler'ı matrise bağla**

`SessionViewAssembler` kurucusuna `RoutingPort routing` eklenir. Mekan döngüsünden **önce** tek matris:

```java
        List<GeoPoint> venuePoints = snap.venues().stream().map(Venue::location).toList();
        List<Map<UUID, TravelLeg>> legs = located.isEmpty() ? List.of()
                : TravelMinutes.byParticipant(located, venuePoints, routing);
```

Her mekan için `Map<UUID, TravelLeg> leg = legs.isEmpty() ? Map.of() : legs.get(index)`; `travelMinutes` = `leg` üzerinden `minutes` haritası (eski sözleşme korunur), `travel` = `TravelDto(id, minutes, estimated)` listesi, `fairness` aynı dakika haritasından. `SessionViewAssemblerTest` mock `RoutingPort` (her zaman `Optional.empty()`) ile derlenir; bir test gerçek matris döndürüp `estimated=false` doğrular.

`DeckFlow.fairnessOf` da matris sürümünü kullanır: `findVenues`/`shuffle` içinde tek çağrı ile tüm mekanların bacakları hesaplanır, `Fairness.of` dakika haritasını alır. `DeckFlow` kurucusuna `RoutingPort` eklenir; testler `(s, d, v, m) -> Optional.empty()` lambda'sı geçer.

- [ ] **Step 6: Testleri çalıştır**

Run: `MVN_TEST TravelMinutesTest,OsrmRoutingTest,SessionViewAssemblerTest,DeckFlowTest`
Expected: yeşil. `MVN_TEST OsrmContractTest` → env yoksa skipped.

- [ ] **Step 7: Değişen dosyaları listele**

`domain/port/RoutingPort.java`, `domain/geo/{TravelLeg,TravelMinutes}.java`, `adapter/out/routing/OsrmRouting.java`, `adapter/in/web/SessionViewAssembler.java`, `application/deck/DeckFlow.java`, 3 test + 2 güncellenen test.
Mesaj: `feat(routing): OSRM table matrix per mode with haversine fallback and travel[].estimated`

---

### Task 11: Sözleşme yeniden üretimi ve belgeler

**Files:**
- Modify: `frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts` (üretilir)
- Modify: `docs/CONFIGURATION.md`, `backend/ARCHITECTURE.md`, `docs/superpowers/plans/INDEX.md`

- [ ] **Step 1: Tüm paketi yeşil gör**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true mvn -o test`
Expected: hepsi yeşil (sözleşme testleri anahtar yoksa skipped).

- [ ] **Step 2: `openapi.json` ve `api-types.ts`'i yeniden üret** — `:8060`'ta kullanıcının kendi JVM'i çalışıyor olabilir, **hiçbir süreci öldürme**:

```bash
docker compose up -d postgres
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 \
  mvn -o spring-boot:run -Dspring-boot.run.arguments=--server.port=8061 > /tmp/bumpinto-8061.log 2>&1 &
echo $! > /tmp/bumpinto-8061.pid
until curl -sf http://localhost:8061/v3/api-docs > /dev/null; do sleep 2; done
curl -sf http://localhost:8061/v3/api-docs -o ../frontend/shared/openapi.json
cd .. && source ./init-nvm.sh && pnpm --filter @bumpinto/shared generate
kill $(cat /tmp/bumpinto-8061.pid)
```

Doğrulama: `grep -c "ConfigResponse\|GeocodeResponse\|ratingScale\|popularity" frontend/shared/src/api-types.ts` ≥ 4.
**Not:** `docker compose up -d postgres` V11'de patlarsa (`CREATE EXTENSION postgis` yetkisi/imajı yok), `docker-compose.yml`'deki imajı geçici olarak `postgis/postgis:16-3.4` yapıp yeniden dene; kalıcı değişiklik plan 32'nin (I-2) işidir ve kullanıcıya bildirilir.

- [ ] **Step 3: Web'in hâlâ derlendiğini doğrula**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b
```

Expected: hata yok — `travelMinutes` ve `mapsUrl` bilerek korundu; yeni alanların hepsi ek. Hata varsa W-12'ye devredilir, burada yalnız raporlanır.

- [ ] **Step 4: `docs/CONFIGURATION.md`**

§1 anahtar envanterine satırlar: `FOURSQUARE_API_KEY` (zorunlu, Premium), `FSQ_PREMIUM_MONTHLY_BUDGET` (varsayılan 5000), `GOOGLE_PLACES_API_KEY` (opsiyonel, `sources.google.enabled=true` ise zorunlu), `TRIPADVISOR_API_KEY` (aşama 1b), `MAP_ENGINE` (`maplibre`), `MAP_TILES_STYLE_URL`, `GEOCODE_ENGINE`, `GEOCODE_BASE_URL`, `NOMINATIM_CONTACT`, `OSRM_CAR_URL` / `OSRM_BICYCLE_URL` / `OSRM_FOOT_URL` (boş = tahmin), `RETENTION_ENABLED`. **Silinen anahtarlar:** `GOOGLE_MONTHLY_BUDGET`, `GOOGLE_PHOTO_MONTHLY_BUDGET`, `PROVIDER_QUOTA_REFRESH`.

§7 "Maliyet" **yeniden yazılır**: deste başına ~1,9 sent (yalnız FSQ Premium çağrısı), açık taban 0; 10k ziyaret ≈ $33–47/ay, 100k ≈ $250–470/ay; bütçe **güvenlik tavanıdır**, dolunca ürün `open`'a düşer ve çökmez; Google inaktif, açılırsa harita motoru da Google olmak zorunda; frenler = 3/dk rate limit + 30 dk sonuç önbelleği + 10 dk boş işareti + aylık bütçe. Referans: `2026-09-06-google-maps-cost-plan.md` §7.3 ve bu planın spec'i.

§8 kontrol listesindeki "Foursquare kategori ID'leri doğru" maddesi `FoursquarePremiumContractTest`'e bağlanır (elle curl yerine test).

- [ ] **Step 5: `backend/ARCHITECTURE.md`**

§10 "Dış mekan sağlayıcıları" yeniden yazılır: `VenueSource` SPI, `venue-sources/*.yml`, `bumpinto.venues.route` tablosu, tür bölme + küme başına sabit sıra, `BudgetGate` (`provider_usage`, `billingZone`), `ProviderQuotaCache` (429 → EXHAUSTED), 30 dk sonuç / 10 dk boş önbelleği, `RetentionRule` üç kuralı, "yeni sağlayıcı DoD" 6 maddesi (spec §3). §12 "Yapılandırma ve sırlar": `bumpinto.providers.*` ve `bumpinto.quota.*` kalktı, yerine `bumpinto.venues.sources.<id>.{enabled,key,budget}`; `map`, `geocode.engine/base-url`, `routing.osrm.*`, `retention.enabled`. §5'e üç yeni ArchUnit kuralı; §9'a `provider_usage` ve `venues_open` tabloları + PostGIS önkoşulu; §13'e "entegrasyon testleri `postgis/postgis:16-3.4` imajını kullanır".

- [ ] **Step 6: `INDEX.md`**

- B iz tablosuna satır:

```
| B-13 | **Açık hibrit mekan yığını** — `VenueSource` SPI + YAML kategori eşlemesi, tür başına yönlendirme, `provider_usage` bütçesi (V10), Foursquare Premium (foto/puan/popülerlik), açık taban `venues_open` (V11, PostGIS), `MapLinks`, saklama kuralı, `GET /api/config`, `POST /api/geocode`, OSRM matris rotalama | `2026-09-06-plan30-open-hybrid-backend.md` | Plan 30 | ready | B-8 ✓ | — | Spec `2026-09-06-open-hybrid-venue-stack-design.md` (aşama 1). Deste maliyeti 17,5¢ → ~2¢. `AppProps.Providers`/`Quota` silindi (12 test kurucusu → `TestProps`). Testcontainers imajı `postgis/postgis:16-3.4` — **tüm entegrasyon testlerini etkiler**. TripAdvisor (§5.3) ve MapLibre (W-12) kapsam dışı. Flyway: V10 = B-13, V11 = B-13/I-2 |
```

- B-4 satırının `status` alanı `deferred` → **`superseded`**, not sütununa: *"Plan 30 (B-13) bu işi devraldı: dinamik keşif yerine Overture + OSM ithali (I-2) ve `VenueSource` SPI'si. Self-host Overpass yürütülmeyecek."*
- Kural 9 (Flyway sicili) satırının sonuna: `· V8 = B-9 (multi_activity) · V9 = B-11 (anchor) · **V10 = B-13** · **V11 = B-13/I-2 (PostGIS)**`.
- K-görevleri: `K-B19`, `K-B20`, `K-B22`, `K-W4` → *"B-13'e devredildi"*; yeni `K-B26`: *"`VenueDto.travelMinutes` W-12 sonrası silinir (`travel[]` tek kaynak); `venues.maps_url` sütunu bir sonraki temizlikte düşer."*

- [ ] **Step 7: Değişen dosyaları listele**

`frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts`, `docs/CONFIGURATION.md`, `backend/ARCHITECTURE.md`, `docs/superpowers/plans/INDEX.md`.
Mesaj: `docs(venues): regenerate API types, rewrite cost section, architecture §10/§12, INDEX B-13`

---

## Kapsam DIŞI

- **TripAdvisor kaynağı** (spec §5.3, aşama 1b) — Terra API'nin canlı ölçümüne bağlı (spec §16.2); `venue-sources/tripadvisor.yml`, `adapter.out.tripadvisor` ve sözleşme testi kendi küçük planına gider. Bu planda yalnız `application.yml`'de `enabled: false` bir blok ve `RetentionRule.STRIP_AFTER_24H` altyapısı hazır durur.
- **MapLibre / harita motoru anahtarı / veri-güdümlü atıf / `formatRating` / istemci geocode taşınması** — W-12 (spec §7, aşama 2). Bu plan `/api/config`'i yayınlar, web onu okumaz.
- **Google foto optimizasyonu** ("yalnız nihai kısa liste", maliyet dokümanı §C.1) — Google inaktif olduğu sürece maliyet değil; açılırsa o zaman yapılır.
- **Overture / OSM / Wikidata ithal işleri, Nominatim NL, OSRM ×3 dağıtımı, PostGIS uzantısının kümede kurulması, docker-compose imajı, PMTiles yedeği** — I-2 (plan 32). Bu plan yalnız şemayı, sorguyu ve istemci adaptörlerini verir; boş `venues_open` ve boş OSRM URL'leri ile ürün çalışır (açık tür sonuçsuz kalır, süreler tahmin olur).
- **Mobil** — M planları bu spec'i miras alır (`react-native-maps` yerine MapLibre React Native).
- **Foto karuseli** (V7 spec'i, FSQ `photos[]` dizisi) ve **kullanıcı fotoğrafı** — ayrı iş.
- **Toplu taşıma rotalama** (Valhalla + GTFS) — `TRANSIT` haversine tahmini kalır.
- **`venues.maps_url` sütununun düşürülmesi** ve **`VenueDto.travelMinutes`'un silinmesi** — K-B26, W-12 sonrası temizlik.

---

## Plan öz-incelemesi

**Spec kapsamı:** §2 mimari + ArchUnit T1 · §3 SPI, YAML, config şeması, 5 doğrulama kuralı, DoD T1/T3 · §4 tür bölme, sıra, birleşme, önbellek, boş işareti, kalite kapısı T5/T7 · §5.1 FSQ Premium T3 · §5.2 open + PostGIS T6 · §5.4 Google inaktif T4 · §6 bütçe/`provider_usage`/`BudgetGate` T2 · §7 `/api/config` T9 (web tarafı W-12) · §8 geocode T9 · §9 OSRM + matris T10 · §10 `MapLinks` + `placeLink` T7 · §11 atıf (config'ten), puan ölçeği, saklama T7/T8/T9 · §12 API + Bruno T7/T9/T11 · §13 V10/V11 + config temizliği T2/T6/T11 · §14 testler her görevde · §15 aşama 1 tamamı. **Kapsanmayan spec maddeleri:** §5.3 TripAdvisor (ölçüme bağlı, ayrı plan — yukarıda gerekçeli), §7'nin `MapView`/`MapPicker` kısmı ve §11'in `Attribution` bileşeni (W-12), §5.2'nin ithal işleri ve §8/§9'un dağıtım kısmı (I-2), §16 açık soruları (kullanıcı kararı/ölçüm).

**Yer tutucu taraması:** "TBD/TODO/benzeri" yok; her adımda çalıştırılabilir Java/SQL/YAML var. İki yerde koşullu dal açıkça yazıldı ve ikisi de somut alternatif kod içeriyor: `ProviderUsageRepository.increment` (Hibernate `insert … returning` reddederse `@Modifying` + `current`), `docker compose` PostGIS imajı.

**Tip tutarlılığı:** `VenueSource.search(SearchRequest) → SearchResult` T1 = T3 = T4 = T5 = T6 = T8 sahteleri · `VenueSourceDescriptor(8 alan)` T1 = T3 = T4 = T6 = T8 · `ProviderQuota` domain'de T1'den itibaren, `SearchResult.quota` ve `ProviderQuotaCache` aynı tip · `ProviderUsagePort(increment/current)` T2 = T5 test sahtesi (`BudgetGateTest.FakeUsage`) · `BudgetGate(allows/record)` T2 = T5 · `ProviderOrchestrator(List<VenueSource>, AppProps, ProviderQuotaCache, BudgetGate, Clock)` T5 tek yerde · `VenueCandidate(17 bileşen, `mapsUrl` yok)` T3'te sabitlenir, T4/T5/T6/T7 aynı imzayı kullanır · `Venue(20 bileşen)` T7 · `TravelLeg(minutes, estimated)` T10 = assembler = DeckFlow · `RoutingPort.durationsSeconds` T10 tek yerde · `AppProps(11 bileşen)` T1'de sabitlenir, `TestProps` tek kurucu noktası.

**Bilinen riskler:** (1) `foursquare.yml`'daki 10 doğrulanmamış kimlik — T3 Step 8 bunları canlı istekle kırmızıya düşürür, düzeltme mekaniktir; (2) PostGIS imaj geçişi tüm entegrasyon testlerini ve yerel `docker compose`'u etkiler — T6 Step 1'de açıkça bildirilir; (3) `insert … returning` Hibernate davranışı — T2'de somut düşüş yolu yazılı.
