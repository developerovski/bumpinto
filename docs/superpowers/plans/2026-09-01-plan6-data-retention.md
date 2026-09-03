# Plan 6: Veri Saklama — süresi dolan oturumların kalıcı silinmesi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spec §6'nın "süresi dolan oturumlar 30 gün sonra kalıcı silinir" gereksinimini uygulamak.
Bu gereksinim Plan 2 kapanış denetiminde **hiçbir planda sahipsiz** bulundu: backend'de `@Scheduled`/cron
yok, Plan 5'te de yok — ama Plan 4'ün mobil arayüzü bunu kullanıcıya vaat ediyor. GDPR yükümlülüğü
ve kullanıcıya verilmiş bir söz.

**Architecture:** Hexagonal devamı — `domain.port.SessionRetentionPort` (saf),
`application.session.SessionRetention` (toplu silme döngüsü),
`adapter.out.persistence.SessionRetentionAdapter` (Spring Data),
`adapter.in.job.PurgeRunner` (profil kapsamlı tek atımlık giriş noktası).
Tetikleyici uygulamanın içinde değil, K8s CronJob'ında.

> **Paket notu:** `PurgeRunner` bir **driving** (içeri) adaptördür — use-case'i dışarıdan tetikler,
> tıpkı `adapter.in.web` controller'ları gibi. Bu yüzden `infra`'da değil `adapter.in.job`'da durur.
> `infra` yalnız `security` ve `config` barındırır.

**Tech Stack:** Plan 2 yığını. **Yeni bağımlılık YOK.**

**Ön koşul:** Plan 2 `done`. Task 1-4 Plan 5'ten BAĞIMSIZ yürütülebilir.
Yalnız Task 5, Plan 5 **Task 3'ün** (K8s manifest'leri) çıktısına dayanır — imaj ve secret adlarını
oradan alır. Görünürdeki kilitlenmeyi önlemek için sıra nettir:
**Plan 5 Task 1-3 → Plan 6 (tümü) → Plan 5 Task 4 (yayın kontrol listesi).**
Plan 5'in yayın kontrol listesi bu plan `done` olmadan işaretlenmez (kapı satırı oraya EKLENDİ).

---

## Bu plana özel kurallar

- **INDEX güncelle:** başlarken `in-progress`, her görev sonunda `Son adım`, bitince `done`.
- **Git yazma işlemi YOK** — commit adımları kullanıcıya bırakılır.
- Komutlar `rtk` önekiyle; `mvn` komutları `backend/` dizininden.
- Test komutu tam hali (jenv + ryuk ortam notları):
  `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true rtk mvn -o test`
- Entegrasyon testlerinde **her zaman** `com.bumpinto.support.PostgresContainer.shared()`;
  `new PostgreSQLContainer<>` / `@Container` / `@Testcontainers` KULLANMA (sonuncu ikisi no-op).
- Çalışma anında `Unresolved compilation problem` ya da tuhaf bean hatası görürsen: VSCode Java dil
  sunucusu `target/classes`'a yazmıştır. `rtk mvn -o compile` çalıştır, gerçek hata orada.
- Sır DEĞERLERİ asla dosyaya yazılmaz; `.env` OKUNMAZ.

## Kapsam kararları (BAĞLAYICI — uygulayan ajan bunları yeniden tartışmaz)

1. **Silme ölçütü:** `expires_at < now - 30 gün`. Sınır katı (`<`), Plan 2'deki
   `Session.isExpired` konvansiyonuyla aynı. Oturum durumu (DECIDED dahil) fark etmez.
2. **`users` SİLİNMEZ.** Hesap yaşam döngüsü oturum yaşam döngüsünden ayrıdır; host hesabı
   sonraki oturumlar için gerekir. Spec §6 yalnız oturumları kapsıyor. Katılımcı verisi
   (ad + koordinat) `participants` üzerinden cascade ile gider — spec'in koruduğu veri budur.
3. **Tetikleyici: K8s CronJob**, uygulama içi `@Scheduled` DEĞİL.
   Gerekçe: çok pod'da `@Scheduled` her pod'da çalışır; tekilleştirmek için leader election ya da
   ShedLock/advisory lock gerekir — yeni bağımlılık ve yeni hata sınıfı. CronJob
   `concurrencyPolicy: Forbid` ile bunu bedavaya verir, ayrıca retry/geçmiş K8s'te görünür.
   Admin HTTP ucu + curl seçeneği REDDEDİLDİ: yeni saldırı yüzeyi açar.
4. **Toplu silme (batch).** Birikmiş backlog tek transaction'da silinirse `sessions` tablosu
   uzun süre kilitlenir. 500'lük partiler hâlinde, boş parti gelene kadar.
5. **Purge job'u backend Deployment ile AYNI secret'ı mount eder.** `AppProps` açılışta dört sırrı da
   fail-fast doğruluyor; job için bu doğrulamayı GEVŞETME — secret'ı ver, kontrolü koru.
6. **Yeni port, `SessionStorePort`'a ekleme DEĞİL.** Saklama farklı bir ilgi alanıdır; sıcak porta
   metot eklemek tüm implementasyonları ve test fake'lerini purge taşımaya zorlar.

---

> **2026-09-03 revizyonu (INDEX):** Bu planın migration numarası **V6**'dır (V5 = B-7) — V3 B-5'e
> (oturum tipi / elle konum), V4 B-6'ya (kullanıcı tercihleri) verildi. Flyway `outOfOrder`
> kapalı; bu plan B-5 ve B-6'dan SONRA koşar. Aşağıdaki `V3__` geçen her yer `V6__` okunur.

### Task 1: V6 migration + cascade davranışının kanıtı

- Create: `backend/src/main/resources/db/migration/V6__session_retention.sql`
- Modify: `backend/src/test/java/com/bumpinto/SchemaMigrationTest.java` (index doğrulaması)

- [ ] **Step 1: V6__session_retention.sql**

```sql
create index idx_sessions_expires_at on sessions (expires_at);
```

Gerekçe: purge `expires_at` üzerinden tarar; index yoksa her koşu seq-scan olur.

- [ ] **Step 2: Cascade'i KANITLAYAN test yaz** —
`backend/src/test/java/com/bumpinto/adapter/out/persistence/SessionCascadeDeleteTest.java`

Şema `participants/venues/swipes/votes` için `on delete cascade` taşıyor ama bu hiçbir testte
doğrulanmadı. Ayrıca V2'nin `sessions.decided_venue_id → venues(id)` FK'si, oturum silinirken
aynı ifadede silinen venue'lara referans veriyor — bu döngüsel görünümün gerçekten sorun
çıkarmadığı kanıtlanmalı.

Test: bir oturum kur; 2 katılımcı, 2 venue, 2 swipe, 1 vote ekle; `decided_venue_id`'yi bu
venue'lardan birine set et. `SessionRepository.deleteAllByIdInBatch(List.of(id))` çağır.
Doğrula: dört alt tabloda o oturuma ait satır kalmadı, **ikinci bir oturumun satırları duruyor**,
`users` tablosu etkilenmedi.

- [ ] **Step 3: PASS doğrula** — Run: `rtk mvn -o test -Dtest='SchemaMigrationTest,SessionCascadeDeleteTest'`
→ `Failures: 0, Errors: 0`

- [ ] **Step 4: INDEX güncelle + Commit (kullanıcı)** — `feat(retention): v3 index + cascade kaniti`

---

### Task 2: Saklama portu + `SessionRetention` use-case (TDD)

- Create: `backend/src/main/java/com/bumpinto/domain/port/SessionRetentionPort.java`
- Create: `backend/src/main/java/com/bumpinto/application/session/SessionRetention.java`
- Create: `backend/src/test/java/com/bumpinto/application/session/SessionRetentionTest.java`

- [ ] **Step 1: Portu yaz** (saf — framework importu YOK)

```java
package com.bumpinto.domain.port;

import java.time.Instant;

public interface SessionRetentionPort {

    /** expiresAt'i cutoff'tan once olan oturumlardan en fazla batchSize kadarini siler. */
    int deleteSessionsExpiredBefore(Instant cutoff, int batchSize);
}
```

- [ ] **Step 2: Failing testi yaz** — sahte port ile:
  - 30 günden eski oturum siliniyor; tam 30 gün olan **silinmiyor** (sınır katı)
  - dolu parti dönerse döngü devam ediyor, eksik parti dönerse duruyor (toplam sayı doğru)
  - hiçbir şey yoksa 0 döner ve porta tek çağrı yapılır
  - `MAX_BATCHES` guard'ı: port her seferinde dolu parti dönerse döngü sonsuza gitmiyor

- [ ] **Step 3: FAIL doğrula** — Run: `rtk mvn -o -q test -Dtest=SessionRetentionTest` → derleme hatası.

- [ ] **Step 4: Implementasyonu yaz**

```java
package com.bumpinto.application.session;

import com.bumpinto.domain.port.SessionRetentionPort;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

@Service
public class SessionRetention {

    static final Duration RETENTION = Duration.ofDays(30);
    private static final int BATCH_SIZE = 500;
    private static final int MAX_BATCHES = 1000;

    private final SessionRetentionPort port;
    private final Clock clock;

    public SessionRetention(SessionRetentionPort port, Clock clock) {
        this.port = port;
        this.clock = clock;
    }

    public int purgeExpired() {
        Instant cutoff = clock.instant().minus(RETENTION);
        int total = 0;
        for (int batch = 0; batch < MAX_BATCHES; batch++) {
            int deleted = port.deleteSessionsExpiredBefore(cutoff, BATCH_SIZE);
            total += deleted;
            if (deleted < BATCH_SIZE) {
                return total;
            }
        }
        return total;
    }
}
```

`MAX_BATCHES` bozuk bir adapter'ın döngüyü sonsuza sürüklemesini engeller — sessiz sonsuz
döngü yerine sınırlı iş.

- [ ] **Step 5: PASS doğrula** — Run: `rtk mvn -o -q test -Dtest=SessionRetentionTest` → `Failures: 0`

- [ ] **Step 6: ArchUnit yeşil** — Run: `rtk mvn -o -q test -Dtest=HexagonalArchitectureTest` → `Tests run: 3`

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(retention): saklama portu + use-case`

---

### Task 3: JPA saklama adaptörü

- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionRetentionAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionRepository.java`
- Create: `backend/src/test/java/com/bumpinto/adapter/out/persistence/SessionRetentionAdapterTest.java`

- [ ] **Step 1: Repository'ye sayfalı id sorgusu ekle**

```java
    @Query("select s.id from SessionEntity s where s.expiresAt < :cutoff order by s.expiresAt")
    List<UUID> findIdsExpiredBefore(@Param("cutoff") Instant cutoff, Pageable page);
```

Neden iki adım (önce id'ler, sonra silme): JPQL toplu `delete` LIMIT almaz; partileme için
önce sınırlı id kümesi çekilir. `deleteAllByIdInBatch` tek `delete ... where id in (...)`
üretir, DB'deki `on delete cascade` böylece çalışır (Task 1 bunu kanıtladı).

- [ ] **Step 2: Failing testi yaz** (gerçek Postgres, `PostgresContainer.shared()`):
  - 3 eski + 2 güncel oturum → `batchSize=2` ile çağrı 2 döner, ikinci çağrı 1, üçüncü 0
  - güncel oturumlar ve `users` satırları duruyor
  - silinen oturumların alt satırları (participants/venues/swipes/votes) gitmiş

- [ ] **Step 3: FAIL doğrula** — Run: `rtk mvn -o -q test -Dtest=SessionRetentionAdapterTest` → derleme hatası.

- [ ] **Step 4: Adaptörü yaz**

```java
package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.SessionRetentionPort;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
class SessionRetentionAdapter implements SessionRetentionPort {

    private final SessionRepository sessions;

    SessionRetentionAdapter(SessionRepository sessions) {
        this.sessions = sessions;
    }

    @Override
    @Transactional
    public int deleteSessionsExpiredBefore(Instant cutoff, int batchSize) {
        List<UUID> ids = sessions.findIdsExpiredBefore(cutoff, PageRequest.of(0, batchSize));
        if (ids.isEmpty()) {
            return 0;
        }
        sessions.deleteAllByIdInBatch(ids);
        return ids.size();
    }
}
```

- [ ] **Step 5: PASS + regresyon** — Run: `rtk mvn -o -q test -Dtest=SessionRetentionAdapterTest`
→ `Failures: 0`, sonra `rtk mvn -o test` → `BUILD SUCCESS`

- [ ] **Step 6: INDEX güncelle + Commit (kullanıcı)** — `feat(retention): jpa saklama adapteri`

---

### Task 4: Purge giriş noktası (profil kapsamlı, tek atımlık)

- Create: `backend/src/main/java/com/bumpinto/adapter/in/job/PurgeRunner.java`
- Create: `backend/src/test/java/com/bumpinto/adapter/in/job/PurgeRunnerTest.java`

- [ ] **Step 1: Runner'ı yaz**

```java
package com.bumpinto.adapter.in.job;

import com.bumpinto.application.session.SessionRetention;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("purge")
class PurgeRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PurgeRunner.class);

    private final SessionRetention retention;
    private final ApplicationContext context;

    PurgeRunner(SessionRetention retention, ApplicationContext context) {
        this.retention = retention;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        int purged = retention.purgeExpired();
        log.info("retention purge finished: {} sessions deleted", purged);
        System.exit(SpringApplication.exit(context, () -> 0));
    }
}
```

Log satırı yalnız SAYI içerir — slug, ad, koordinat ya da token loglanmaz.

- [ ] **Step 2: Test yaz** — `System.exit` çağıran bir sınıf doğrudan koşturulamaz; sözleşmeyi
bean seviyesinde sabitle:
  - `purge` profili AKTİF DEĞİLKEN `PurgeRunner` bean'i context'te YOK
  - `purge` profili aktifken bean VAR
  - `SessionRetention.purgeExpired()`'in gerçek davranışı Task 2'de zaten testli

Bu bilinçli bir kapsam sınırıdır: silme mantığı use-case ve adapter testlerinde kanıtlanır,
runner yalnız "doğru profilde var / yanlış profilde yok" sözleşmesini taşır.

- [ ] **Step 3: PASS + regresyon** — Run: `rtk mvn -o -q test -Dtest=PurgeRunnerTest` → `Failures: 0`,
sonra `rtk mvn -o test` → `BUILD SUCCESS`

- [ ] **Step 4: Yerel duman testi (kullanıcı onaylı, opsiyonel)** — compose ayaktayken:
`SPRING_PROFILES_ACTIVE=local,purge rtk mvn -o spring-boot:run` → log'da
`retention purge finished: N sessions deleted` görünür ve süreç 0 ile çıkar.

- [ ] **Step 5: INDEX güncelle + Commit (kullanıcı)** — `feat(retention): purge giris noktasi`

---

### Task 5: K8s CronJob + Plan 5 kapısı

**Ön koşul:** Plan 5 `done`. İmaj adı, tag stratejisi ve secret adı Plan 5 Task 3'teki
backend Deployment'tan AYNEN alınır — burada yeni isim uydurma, oradaki değerleri oku.

- Create: `k8s/retention-cronjob.yaml` (Plan 5'in manifest dizini neyse orası)
- Modify: `docs/superpowers/plans/2026-09-01-plan5-ci-deploy.md` (yayın kontrol listesine kapı satırı)

- [ ] **Step 1: CronJob manifest'i**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: bumpinto-retention-purge
  namespace: bumpinto
spec:
  schedule: "30 3 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: purge
              image: <Plan 5 Task 3'teki backend imajının AYNISI>
              args: ["--spring.main.web-application-type=none"]
              env:
                - name: SPRING_PROFILES_ACTIVE
                  value: "prod,purge"
              envFrom:
                - secretRef:
                    name: <Plan 5 Task 3'teki secret'ın AYNISI>
```

`concurrencyPolicy: Forbid` — uzun süren bir purge ertesi gün üst üste binmez.
`envFrom` aynı secret'ı verir; `AppProps` fail-fast doğrulaması korunur (Kapsam kararı 5).

- [ ] **Step 2: Plan 5 kapı satırını DOĞRULA** (eklemek gerekmiyor — zaten eklendi).
`2026-09-01-plan5-ci-deploy.md` Task 4 Step 1 listesinde "Plan 6 (veri saklama) `done`" kutusu
duruyor olmalı. Yoksa ekle. Kapı, Plan 5 Plan 6'dan önce yürütülse bile maddenin açık
kalmamasını garanti eder.

- [ ] **Step 3: Kullanıcı doğrulaması** (ajan komutu sunar, kullanıcı çalıştırır):
`kubectl -n bumpinto create job --from=cronjob/bumpinto-retention-purge purge-manual-1`
→ pod `Completed`, log'da `retention purge finished: N sessions deleted`.

- [ ] **Step 4: INDEX'te Plan 6'yı `done` yap + Commit (kullanıcı)** —
`feat(retention): k8s cronjob + plan5 kapisi`

---

## Plan sonu doğrulaması

- [ ] Spec §6 eşlemesi: "süresi dolan oturumlar 30 gün sonra kalıcı silinir" gerçekten uygulanıyor;
  katılımcı verisi (ad + koordinat) cascade ile gidiyor; `users` bilinçli olarak korunuyor.
- [ ] `rtk mvn -o test` tümü yeşil; ArchUnit 3 kural yeşil (domain saflığı + parametrik sorgu).
- [ ] Purge idempotent: arka arkaya iki koşu ikincide 0 döndürüyor.
- [ ] Log hijyeni: purge log'unda slug/ad/koordinat/token YOK, yalnız sayı.
- [ ] CronJob backend Deployment ile aynı imaj ve secret'ı kullanıyor; `AppProps` fail-fast korundu.
- [ ] Plan 5'in yayın kontrol listesinde "Plan 6 done" kapısı duruyor.
- [ ] Kullanıcıya bildir: GDPR saklama gereksinimi kapandı, sahipsiz madde kalmadı.
