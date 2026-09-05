# Faz B — Çapalı oturumda oy veren kim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Çapalı bir oturumda konum paylaşmamış katılımcı da kaydırabilsin ve karara katılsın —
bugün kaydıramıyor ve `shuffle` `BROWSING → SWIPING` geçişini engelliyor.

**Architecture:** "Oy veren kim?" sorusu bugün iki yerde ayrı ayrı cevaplanıyor
(`DeckFlow.votingPopulation` ve `SessionQueries`). Yeni `domain/session/Voters` bu kopyayı tek
fonksiyonda birleştirir ve çapayı orada karara bağlar — `SessionCenter`'ın merkez için yaptığının
aynısı. `Participant.votes()` silinir; oturumu görmeyen bir tip bu soruyu doğru cevaplayamaz.

**Tech Stack:** Java 21, Spring Boot 4.1, JUnit 5 + AssertJ, Testcontainers, ArchUnit.

**Kaynak spec:** [2026-09-05-anchored-voters-design.md](../specs/2026-09-05-anchored-voters-design.md)

---

## Yürütme grupları

Maven tüm main kaynaklarını derler: bir tip değişirse hiçbir test koşmaz. Task 1 saf eklemedir
ve tek başına yeşildir. Task 2'de `Participant.votes()`'un silinmesi `DeckFlow` ve
`SessionQueries`'i **aynı anda** kırar — ikisi tek görevde onarılır.

**Başlangıç referansı:** backend `mvn -o clean test` → **303 test**, BUILD SUCCESS.
**Beklenen yol:** 303 → **307** (T1) → **311** (T2).

> **Test sayısını kontrol et, `BUILD SUCCESS`e güvenme.** İçi boşalmış bir test dosyası da
> derlenir ve build yeşil raporlar.

**Test komutu (env öneki ZORUNLU):**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend && \
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o clean test
```

---

## Dosya haritası

**Oluşturulacak**
- `backend/src/main/java/com/bumpinto/domain/session/Voters.java`
- `backend/src/test/java/com/bumpinto/domain/session/VotersTest.java`

**Değişecek**
- `domain/session/Participant.java` — `votes()` silinir, yerine yönlendiren javadoc notu
- `application/deck/DeckFlow.java` — `votingPopulation(Session)`, `requireDeckParticipant`
- `application/session/SessionQueries.java` — iki `p.votes()` çağrısı
- `test/.../application/deck/DeckFlowTest.java` — +4 test

---

### Task 1: `Voters` — oy verenin tek kaynağı

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/session/Voters.java`
- Create: `backend/src/test/java/com/bumpinto/domain/session/VotersTest.java`

- [ ] **Step 1: Önce testi yaz**

`VotersTest.java`:

```java
package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class VotersTest {

    private static final GeoPoint AMSTERDAM = new GeoPoint(52.3676, 4.9041);

    private static Session session(GeoPoint anchor) {
        return new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-05T10:00:00Z"), null, List.of(),
                null, null, null, null, anchor);
    }

    private static Participant person(GeoPoint location, boolean manual) {
        return new Participant(UUID.randomUUID(), UUID.randomUUID(), "Ali", location, false,
                null, manual, null, TravelMode.CAR, null);
    }

    /** Capali oturumda merkez katilimcilardan turemiyor: konum artik uyeligin degil yalniz
        gosterimin girdisi, dolayisiyla konumsuz kisi TAM uyedir (spec K1). */
    @Test
    void anchoredSessionCountsParticipantWithoutLocation() {
        assertThat(Voters.votes(person(null, false), session(AMSTERDAM))).isTrue();
    }

    /** Capasizda orta nokta konumlardan turedigi icin konumsuz kisi temsil EDILEMEZ. */
    @Test
    void unanchoredSessionStillRequiresLocation() {
        assertThat(Voters.votes(person(null, false), session(null))).isFalse();
    }

    /** Elle eklenen nokta HICBIR modda oy vermez: token tasimaz, kaydirmaz. */
    @Test
    void manualPointNeverVotes() {
        assertThat(Voters.votes(person(AMSTERDAM, true), session(AMSTERDAM))).isFalse();
        assertThat(Voters.votes(person(AMSTERDAM, true), session(null))).isFalse();
    }

    /** of(...) ayni kurali listeye uygular — cagiranlar kendi filtresini yazmasin diye. */
    @Test
    void ofFiltersWithTheSameRule() {
        Participant located = person(AMSTERDAM, false);
        Participant locationless = person(null, false);
        Participant manual = person(AMSTERDAM, true);

        assertThat(Voters.of(session(AMSTERDAM), List.of(located, locationless, manual)))
                .containsExactly(located, locationless);
        assertThat(Voters.of(session(null), List.of(located, locationless, manual)))
                .containsExactly(located);
    }
}
```

- [ ] **Step 2: Derlenmediğini gör**

Run: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 mvn -o -q test-compile`
Expected: FAIL — `cannot find symbol: class Voters`.

- [ ] **Step 3: `Voters`'ı yaz**

`Voters.java`:

```java
package com.bumpinto.domain.session;

import java.util.List;

/**
 * Oy veren kim — TEK kaynak. Once DeckFlow.votingPopulation ve SessionQueries ayni soruyu
 * kendi filtreleriyle cevapliyordu; capayi iki yere birden eklemek ayrisma riskini ikiye
 * cikarirdi (SessionCenter'in merkez icin cozdugu problemin aynisi).
 */
public final class Voters {

    /**
     * Elle eklenen noktalar ASLA oy vermez: token tasimazlar, kaydirmazlar, yalniz geometriye
     * girerler. Konum ise yalniz CAPASIZ oturumda sarttir — capali oturumda merkez
     * katilimcilardan turemedigi icin konumsuz kisi de tam uyedir (spec K1).
     */
    public static boolean votes(Participant p, Session session) {
        return !p.manual() && (session.anchor() != null || p.hasLocation());
    }

    public static List<Participant> of(Session session, List<Participant> participants) {
        return participants.stream().filter(p -> votes(p, session)).toList();
    }

    private Voters() {
    }
}
```

- [ ] **Step 4: Koş**

Run: tam test komutu (yukarıda).
Expected: PASS, **307 test** (303 + 4).

> Sayı 307 değilse dur ve nedenini bul.

- [ ] **Step 5: Commit**

```
feat(session): add Voters as the single source of who votes

Anchored sessions do not derive their centre from participants, so a
participant without a location is a full member there. Not wired in yet.
```

---

### Task 2: `Voters`'ı bağla, `Participant.votes()`'u sil

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/domain/session/Participant.java`
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionQueries.java`
- Test: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`

- [ ] **Step 1: Önce dört davranış testini yaz** (`DeckFlowTest.java`, sınıfın sonuna)

`setUp()` çapasız `session`/`host`/`ayse`'yi kuruyor ve ikisini de odaya sokuyor; çapalı
senaryolar için ayrı bir oturum kurulur. Alan adları (`store`, `deck`, `flow`, `presence`,
`hostUser`, `providerResult`, `cand`) dosyada mevcuttur.

```java
    /** Capali oturumda konum uyeligin sarti DEGIL: konumsuz katilimci kaydirabilir (spec K1). */
    @Test
    void anchoredSessionLetsLocationlessParticipantSwipe() {
        Session anchored = store.saveSession(new Session(UUID.randomUUID(), "vote1", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
        Participant h = store.saveParticipant(new Participant(UUID.randomUUID(), anchored.id(),
                "Mehmet", null, true, null, false, null, TravelMode.CAR, hostUser));
        Participant k = store.saveParticipant(new Participant(UUID.randomUUID(), anchored.id(),
                "Kerem", null, false, null, false, null, TravelMode.CAR, null));
        presence.arrived(anchored.id(), h.id(), "ws-h");
        presence.arrived(anchored.id(), k.id(), "ws-k");
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));

        List<Venue> venues = flow.findVenues("vote1", h.id());
        flow.shuffle("vote1", h.id());
        flow.swipe("vote1", k.id(), venues.get(0).id(), true);

        assertThat(deck.likesByParticipant(anchored.id()).get(k.id()))
                .containsExactly(venues.get(0).id());
    }

    /** Capasiz oturumda kural AYNEN durur: orta nokta konumlardan turedigi icin konumsuz
        kisi orada temsil edilemez. */
    @Test
    void unanchoredSessionStillRequiresLocationToSwipe() {
        Participant kerem = store.saveParticipant(new Participant(UUID.randomUUID(),
                session.id(), "Kerem", null, false, null, false, null, TravelMode.CAR, null));
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());

        assertThatThrownBy(() -> flow.swipe("s1", kerem.id(), venues.get(0).id(), true))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("share your location");
    }

    /** shuffle'in "odada 2 oy veren" kapisi capalida konumdan bagimsiz doyar — kapinin
        kendisi degismedi, besledigi kume degisti (spec V6). */
    @Test
    void anchoredShuffleWorksWithoutAnyLocation() {
        Session anchored = store.saveSession(new Session(UUID.randomUUID(), "vote2", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
        Participant h = store.saveParticipant(new Participant(UUID.randomUUID(), anchored.id(),
                "Mehmet", null, true, null, false, null, TravelMode.CAR, hostUser));
        Participant k = store.saveParticipant(new Participant(UUID.randomUUID(), anchored.id(),
                "Kerem", null, false, null, false, null, TravelMode.CAR, null));
        presence.arrived(anchored.id(), h.id(), "ws-h");
        presence.arrived(anchored.id(), k.id(), "ws-k");
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("vote2", h.id());

        flow.shuffle("vote2", h.id());

        assertThat(store.sessionBySlug("vote2").orElseThrow().status())
                .isEqualTo(SessionStatus.SWIPING);
    }

    /** Kabul edilen bedel (spec §5): karar artik konumsuz kisiyi de BEKLER. */
    @Test
    void anchoredDeckWaitsForTheLocationlessParticipant() {
        Session anchored = store.saveSession(new Session(UUID.randomUUID(), "vote3", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
        Participant h = store.saveParticipant(new Participant(UUID.randomUUID(), anchored.id(),
                "Mehmet", new GeoPoint(52.36, 4.90), true, null, false, null, TravelMode.CAR,
                hostUser));
        Participant k = store.saveParticipant(new Participant(UUID.randomUUID(), anchored.id(),
                "Kerem", null, false, null, false, null, TravelMode.CAR, null));
        presence.arrived(anchored.id(), h.id(), "ws-h");
        presence.arrived(anchored.id(), k.id(), "ws-k");
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("vote3", h.id());
        flow.shuffle("vote3", h.id());

        flow.swipe("vote3", h.id(), venues.get(0).id(), true);
        flow.finishDeck("vote3", h.id());
        // Konumsuz Kerem sayildigi icin karar HENUZ cikmaz.
        assertThat(store.sessionBySlug("vote3").orElseThrow().status())
                .isEqualTo(SessionStatus.SWIPING);

        flow.swipe("vote3", k.id(), venues.get(0).id(), true);
        flow.finishDeck("vote3", k.id());

        assertThat(store.sessionBySlug("vote3").orElseThrow().status())
                .isEqualTo(SessionStatus.DECIDED);
    }
```

Gerekirse import ekle: `com.bumpinto.domain.geo.TravelMode`,
`static org.assertj.core.api.Assertions.assertThatThrownBy`.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 \
  TESTCONTAINERS_RYUK_DISABLED=true mvn -o test -Dtest=DeckFlowTest`
Expected: FAIL. `anchoredSessionLetsLocationlessParticipantSwipe`,
`anchoredShuffleWorksWithoutAnyLocation` ve `anchoredDeckWaitsForTheLocationlessParticipant`
düşer (`shuffle` "need at least 2 participants present" ya da `swipe` "share your location").
`unanchoredSessionStillRequiresLocationToSwipe` ZATEN YEŞİLdir — o bir gerileme koruması.

- [ ] **Step 3: `Participant.votes()`'u sil**

`Participant.java`'da şu metodu SİL:

```java
    public boolean votes() {
        return hasLocation() && !manual;
    }
```

Yerine, `hasLocation()`'ın hemen altına yönlendiren not ekle:

```java
    /* votes() BURADA DEGIL: cevap oturuma baglidir (capali oturumda konum gerekmez) ve
       Participant oturumu gormez. Bkz. domain/session/Voters. */
```

- [ ] **Step 4: `DeckFlow`'u bağla**

`votingPopulation` imzasını değiştir:

```java
    private List<Participant> votingPopulation(Session session) {
        return Voters.of(session, store.participantsOf(session.id()));
    }
```

Dört çağrı yerinin hepsinde `votingPopulation(session.id())` → `votingPopulation(session)`
yap (shuffle kapısı, `finishDeck`'teki done/total, runoff finishers, `evaluate`).

`evaluate(Session session, boolean interactive)` zaten `session` alıyor — orada da
`votingPopulation(session)` olur.

`requireDeckParticipant`'ta konum kontrolünü çapaya bağla:

```java
    private Participant requireDeckParticipant(Session session, UUID participantId) {
        Participant participant = requireMember(session, participantId);
        // Capali oturumda konum uyeligin sarti degil (spec K1): merkez katilimcilardan
        // turemedigi icin konumsuz kisi de kaydirir.
        if (session.anchor() == null && !participant.hasLocation()) {
            throw new ConflictException("share your location before joining the deck");
        }
        if (participant.manual()) {
            throw new ConflictException("manual points do not swipe");
        }
        return participant;
    }
```

Import ekle: `import com.bumpinto.domain.session.Voters;`

- [ ] **Step 5: `SessionQueries`'i bağla**

Satır 62'deki filtre:

```java
        long finishers = participants.stream()
                .filter(p -> Voters.votes(p, session) && p.deckDone()).count();
```

`tallyLikes` çağrısına `session` ekle ve imzasını genişlet:

```java
        Map<UUID, Long> likeCounts = session.status() == SessionStatus.DECIDED
                ? tallyLikes(session, participants, deck.likesByParticipant(session.id()))
                : Map.of();
```

```java
    /** Mekan -> desteyi bitirmis kac oy popülasyonu uyesi begendi. */
    private static Map<UUID, Long> tallyLikes(Session session, List<Participant> participants,
                                              Map<UUID, Set<UUID>> likesByParticipant) {
        Set<UUID> counted = participants.stream()
                .filter(p -> Voters.votes(p, session) && p.deckDone())
                .map(Participant::id)
                .collect(Collectors.toSet());
```

Import ekle: `import com.bumpinto.domain.session.Voters;`

- [ ] **Step 6: Tam koşu**

Run: tam test komutu.
Expected: PASS, **311 test** (307 + 4). `HexagonalArchitectureTest` 4/4 yeşil.

> Sayı 311 değilse ya da herhangi bir mevcut test kırmızıysa DUR. Özellikle
> `fullSwipeFlowAutoDecidesWhenEveryoneFinishes` yeşil kalmalı — çapasız davranış değişmedi.

- [ ] **Step 7: Commit**

```
feat(deck): a location is no longer required to vote in an anchored session

Voters replaces Participant.votes(): the answer depends on the session,
and a Participant cannot see one. In an anchored session the centre is not
derived from participants, so a member without a location is a full voter —
which also means the decision now waits for them.
```

---

## Öz-inceleme notları

**Spec kapsaması:** V1 → T1 `anchoredSessionCountsParticipantWithoutLocation`; V2 →
`unanchoredSessionStillRequiresLocation` + T2 gerileme testi; V3 → `manualPointNeverVotes`;
V4 → `Voters` + T2 Step 4/5 bağlama; V5 → T2 Step 3; V6 → `anchoredShuffleWorksWithoutAnyLocation`;
§5 bedeli → `anchoredDeckWaitsForTheLocationlessParticipant`.

**Tip tutarlılığı:** `Voters.votes(Participant, Session)` ve `Voters.of(Session, List<Participant>)`
argüman sırası her çağrı yerinde aynı. `votingPopulation` her yerde `Session` alır, `UUID` değil.

**Kapsam dışı:** web (sözleşme değişmiyor, `SessionView` şekli aynı) · `Fairness`
(`geometryPopulation`'dan besleniyor, dokunulmadı) · 100 km yayılım kuralı (ayrı spec).
