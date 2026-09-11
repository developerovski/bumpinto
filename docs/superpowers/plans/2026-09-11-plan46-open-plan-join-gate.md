# Açık Plan Davet-Linki Kapısı (K-B37) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keşfet'in herkese bastığı slug ile `POST /api/sessions/{slug}/participants` üzerinden açık plana host onayı, engel listesi ve kapasite atlanarak koltuk alınmasını kapatmak; yan bulgu olarak host'un kendi katılımcı çerezini taşırken seat-request panelinden 403 almasını düzeltmek.

**Architecture:** Kapı **uygulama katmanında, `SessionCommands.join` içinde** durur: açık planda (`session.isOpenPlan()`) davet-linki yolu yeni koltuk **açmaz**, makine kodlu 409 döner; koltuk yalnız `SeatRequests` üzerinden doğar (orada zaten hesap zorunluluğu, çift yönlü engel, mükerrer istek ve kapasite kapıları var). Kapı **koltuk kurtarmadan SONRA** gelir, böylece host ve onaylı üye aynı uçtan koltuğunu geri almaya devam eder (mobil token onarımı, K-M39). Yan bulgu için `WebPrincipals`'a hesabı principal **ya da** `details`'ten okuyan tek bir yardımcı eklenir; fail-closed korunur.

**Tech Stack:** Spring Boot 4 / Spring Security, JUnit 5 + AssertJ, MockMvc + Testcontainers (`DiscoverApiTest`), `FakeStores` bellek içi portlar.

---

## Kaynak bulgu (2026-09-11 güvenlik incelemesi)

`GET /api/discover` her açık planın **ham `slug`**'ını döndürüyor (`SessionViewAssembler.toDiscover` → `PlanCardDto.slug`). Slug bu daldan önce `SecureRandom` ile üretilen tahmin edilemez bir yetenek anahtarıydı; `POST /api/sessions/*/participants`'ın `permitAll` olması bu varsayıma dayanıyordu. `SessionCommands.join` ise yalnız dört şeye bakıyor: mevcut koltuk, `isSolo()`, `CLOSED_TO_NEW_SEATS`, konum verilmişse yayılım. `isOpenPlan`/`JoinPolicy`/`SeatRequest`/`BlockStorePort` bu yolda **hiç** yok. Sonuç: oturum açmış herhangi bir hesap (hatta slug'ı öğrenen anonim biri) `{"displayName":"x"}` ile 201 + katılımcı jetonu alıyor, ardından `GET /api/sessions/{slug}` tüm katılımcıların adını, ~1,1 km konumunu, etiketini, mekân listesini ve `joinCode`'u veriyor; `PUT /location`, oy, dürtme, ses açılıyor. Host'un atma yolu yok.

Yan bulgu: `SeatRequestController` `/api/sessions/{slug}/...` altında ve `ParticipantTokens.slugOf` o yolu eşliyor → kendi planının `bumpinto_pt_{slug}` çerezini taşıyan host'ta `@AuthenticationPrincipal Jwt` null gelir, `WebPrincipals.accountId(null)` 403 atar. Güvenlik açığı değil (kapalı biçimde başarısız) ama gerçek tarayıcıda host paneli çalışmaz; `DiscoverApiTest` görmüyor çünkü MockMvc çerezi sonraki isteğe taşımıyor.

---

## Kararlar (uygulamadan ÖNCE oku)

### K1. Açık planda koltuk YALNIZ `SeatRequests`'ten doğar; davet linki 409 döner

Alternatif "davet linkinden gelen de aynı kapılardan geçsin" (join içinde engel + kapasite + `JoinPolicy` dallanması) **reddedildi**: kapı zinciri iki yerde yaşardı ve `APPROVAL` politikasında zaten istek atmaktan başka yol yok. `JoinPolicy.OPEN` planda bile istek yolu anında koltuk veriyor (`SeatRequests.request` → `seat`), yani davet linkine ihtiyaç yok. `SeatRequests` javadoc'unun vaadi ("yabancı biri host onaylamadan oturumun içini göremez") tek yerden tutulur.

Hata: **409 `ConflictException("open_plan_seat_request_required")`** — mevcut `participants_too_far_apart` deseni (makine kodu, prose değil; web `apiErrorCode` ile eşliyor). 403 değil: sorun kimlik değil, oturumun türü.

### K2. Kartta opak kimlik AÇILMAZ (YAGNI)

K1'den sonra açık planın slug'ı artık bir yetenek değil: slug ile yapılabilen her şey ya zaten kamuya açık (`/preview`, `/og`) ya da hesap + engel + kapasite + onay kapılarının ardında (`seat-requests`). `PlanCardDto.slug` → opak id değişikliği yeni yol, codegen ve istemci sözleşmesi değişikliği getirir, kazancı sıfır. Yapılmaz.

### K3. Host 403 düzeltmesi hesabı `details`'ten okur; filtre ve rota DEĞİŞMEZ

`ParticipantTokenFilter` doğrulanmış hesap `Jwt`'sini zaten `details`'e asıyor ve `WebPrincipals.accountOf` onu okuyor (`callerOf`, `seatOf` bunu kullanıyor). Seat-request uçları da aynı okumayı kullanır. Fail-closed korunur: yalnız katılımcı çerezi taşıyan istekte `details` boştur → 403. Rota `/api/plans/...` gibi bir yere taşınmaz (openapi/Bruno/istemci sözleşmesi değişirdi).

### K4. İstemci tarafı bu planda YOK — W-17 / M-11'e devir

Bugün ne web ne mobil açık plan **kuramıyor** (`openPlan` yalnız `api-types.ts`'te), dolayısıyla canlı bir regresyon yok. Katılım sayfası (`/j/{slug}`) yeni 409'u genel "katılınamadı" olarak gösterir. W-17/M-11 plan detayı + katılım isteği ekranını yazarken **`open_plan_seat_request_required` → plan detayına yönlendir** kuralını uygular (aşağıda "Devir"). Bu planda i18n anahtarı eklenmez; `pnpm i18n:check` sayıları değişmez.

---

## Ön koşullar ve test komutları

- Docker çalışıyor olmalı (`DiscoverApiTest` Testcontainers/Postgres).
- Backend testleri ortam değişkenlerine duyarlı (bellek notu): her komutun başına `env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY` koy.
- `NoClassDefFoundError` / "Field 'postgres' must be a Container" gibi anlamsız hata görürsen `rm -rf backend/target/test-classes` (K-B36 c).
- Tek sınıf: `cd backend && env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY mvn -q test -Dtest=SessionCommandsTest`
- Tam regresyon: `cd backend && env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY mvn -q test` — baz **583 test** (6 env-gated skip). Bu plan **+4** test ekler.
- Commit geleneği: **commit'i kullanıcı atar.** Görev sonunda `git add` yapılır, mesaj hazırlanır, commit sorulur.

---

## Dosya haritası

| Dosya | Sorumluluk | Görev |
|---|---|---|
| `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java` | Kapı + makine kodu sabiti + javadoc | T1 |
| `backend/src/test/java/com/bumpinto/application/session/SessionCommandsTest.java` | Birim: yabancı 409, kurtarma çalışır | T1 |
| `backend/src/test/java/com/bumpinto/DiscoverApiTest.java` | Uçtan uca: Keşfet slug'ı → davet linki 409, oda kapalı, onaylı üye kurtarır; host paneli çerezle çalışır | T2, T3 |
| `backend/src/main/java/com/bumpinto/adapter/in/web/WebPrincipals.java` | `accountId(Authentication)` | T3 |
| `backend/src/main/java/com/bumpinto/adapter/in/web/SeatRequestController.java` | `Jwt` yerine `Authentication` | T3 |
| `backend/ARCHITECTURE.md` §8 | İki kural kaydı | T4 |
| `docs/superpowers/plans/INDEX.md` | K-B37 satırı + B-17 notu | T4 |

---

### Task 1: `SessionCommands.join` açık plan kapısı

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java:36-43` (sabit) ve `:151-175` (`join`)
- Test: `backend/src/test/java/com/bumpinto/application/session/SessionCommandsTest.java`

- [x] **Adım 1: Kırmızı testleri yaz**

`SessionCommandsTest.java` içinde `anOpenPlanSessionExpiresThreeHoursAfterTheMeeting` testinin hemen ÖNÜNE ekle (gerekli import'lar — `OpenPlan`, `JoinPolicy`, `TravelMode`, `ConflictException`, `Participant` — dosyada zaten var):

```java
    /**
     * K-B37: Kesfet slug'i HERKESE basar, yani acik planda slug gizli bir yetenek DEGILDIR.
     * Davet-linki yolu host onayini, cift yonlu engeli, kapasiteyi ve hesap zorunlulugunu
     * bilmez — acik planda koltuk YALNIZ SeatRequests'ten dogar. Konum verilmez: yayilim kapisi
     * calismaz, tek kapi bu. Kapi koltuk kurtarmadan SONRA calisir: host kendi koltugunu bu
     * uctan geri almaya devam eder (mobil token onarimi, K-M39).
     */
    @Test
    void anOpenPlanNeverOpensASeatThroughTheInviteLink() {
        UUID hostAccount = UUID.randomUUID();
        SessionCommands.CreateSessionResult r = commands.createSession(hostAccount, "Yürüyüş",
                List.of(ActivityType.HIKE), SessionType.GROUP, DEN_BOSCH, "Ayşe", null,
                TravelMode.BIKE, null,
                new OpenPlan(Instant.parse("2026-09-13T08:00:00Z"), 4, JoinPolicy.APPROVAL));
        String slug = r.session().slug();

        assertThatThrownBy(() -> commands.join(slug, Caller.account(UUID.randomUUID()),
                "Yabancı", SOMEREN, null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessage(SessionCommands.OPEN_PLAN_SEAT_REQUEST_REQUIRED);
        assertThatThrownBy(() -> commands.join(slug, Caller.ANONYMOUS, "Yabancı", null, null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessage(SessionCommands.OPEN_PLAN_SEAT_REQUEST_REQUIRED);
        assertThat(store.participantsOf(r.session().id())).hasSize(1);
        assertThat(events.published).isEmpty();

        Participant again = commands.join(slug, Caller.account(hostAccount), "Ayşe", null, null, null);
        assertThat(again.id()).isEqualTo(r.hostParticipant().id());
        assertThat(again.host()).isTrue();
    }

    /**
     * Onayli uye (SeatRequests.seat'in yazdigi gibi hesaba bagli Participant) davet-linki
     * ucundan koltugunu GERI ALIR — hem hesapla hem elindeki koltuk token'iyla. Bu yol kapansa
     * mobil, acik planda katilimci token'ini hicbir zaman onaramazdi (K-M39).
     */
    @Test
    void anApprovedMemberOfAnOpenPlanRecoversItsSeatThroughTheInviteLink() {
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(),
                "Yürüyüş", List.of(ActivityType.HIKE), SessionType.GROUP, DEN_BOSCH, "Ayşe", null,
                TravelMode.BIKE, null,
                new OpenPlan(Instant.parse("2026-09-13T08:00:00Z"), 4, JoinPolicy.APPROVAL));
        UUID priya = UUID.randomUUID();
        Participant seat = store.saveParticipant(new Participant(UUID.randomUUID(),
                r.session().id(), "Priya", SOMEREN, false, null, false, "Woensel",
                TravelMode.BIKE, priya));

        assertThat(commands.join(r.session().slug(), Caller.account(priya), "Priya", null, null, null)
                .id()).isEqualTo(seat.id());
        assertThat(commands.join(r.session().slug(), Caller.participant(seat.id()), "Priya",
                null, null, null).id()).isEqualTo(seat.id());
        assertThat(store.participantsOf(r.session().id())).hasSize(2);
        assertThat(events.published).isEmpty(); // kurtarma katilim DEGILDIR
    }
```

- [x] **Adım 2: Kırmızıyı gör**

Çalıştır: `cd backend && env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY mvn -q test -Dtest=SessionCommandsTest`
Beklenen: derleme hatası `cannot find symbol: variable OPEN_PLAN_SEAT_REQUEST_REQUIRED`. (Sabiti ekleyip kapıyı eklemeden koşarsan `anOpenPlanNeverOpensASeatThroughTheInviteLink` "Expecting code to raise a throwable" ile KIRMIZI, ikinci test yeşil olmalı — ikinci test bugünkü davranışı koruma testi.)

- [x] **Adım 3: Sabit + kapı + javadoc**

`SessionCommands.java`'da `CLOSED_TO_NEW_SEATS` tanımının hemen ALTINA ekle:

```java
    /**
     * Acik plana davet linkiyle koltuk ACILMAZ (K-B37): 409 govdesindeki makine kodu. Istemci
     * bunu gorunce katilim formunu degil plan detayini / katilim istegini acar (W-17, M-11).
     */
    public static final String OPEN_PLAN_SEAT_REQUEST_REQUIRED = "open_plan_seat_request_required";
```

`join` metodunda `if (session.isSolo()) {...}` bloğunun hemen ALTINA, `CLOSED_TO_NEW_SEATS` kontrolünden ÖNCE ekle:

```java
        if (session.isOpenPlan()) {
            // K-B37: Kesfet slug'i HERKESE basar; acik planda slug gizli bir yetenek DEGILDIR.
            // Bu yol host onayini, cift yonlu engeli, kapasiteyi ve hesap zorunlulugunu bilmez —
            // hepsi SeatRequests'te yasar ve acik planda koltuk YALNIZ oradan dogar. Kapi koltuk
            // kurtarmadan SONRA: host ve onayli uye kendi koltugunu buradan geri almaya devam
            // eder (mobil token onarimi, K-M39).
            throw new ConflictException(OPEN_PLAN_SEAT_REQUEST_REQUIRED);
        }
```

`join` javadoc'una, "Durum kapisi YALNIZ yeni koltuga uygulanir" paragrafından SONRA yeni paragraf:

```java
     *
     * <p>ACIK PLANDA yeni koltuk bu uctan hic acilmaz (K-B37): Kesfet slug'i herkese bastigi
     * icin davet linki orada bir sir degildir ve host onayi / engel / kapasite kapilari
     * {@code SeatRequests}'te yasar. Kurtarma yine calisir — kapi seatOf'tan SONRADIR.
```

- [x] **Adım 4: Yeşili gör**

Çalıştır: `cd backend && env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY mvn -q test -Dtest=SessionCommandsTest`
Beklenen: `Tests run: N, Failures: 0, Errors: 0` (N = önceki sayı + 2). Ayrıca `SeatRequestsTest` ve `MeetCheckinsTest` de koş (`-Dtest='SessionCommandsTest,SeatRequestsTest,MeetCheckinsTest'`) — `SeatRequests.seat` `store.saveParticipant`'ı doğrudan çağırır, `join`'den geçmez; hepsi yeşil kalmalı.

- [x] **Adım 5: Stage + commit mesajı**

```bash
git add backend/src/main/java/com/bumpinto/application/session/SessionCommands.java \
        backend/src/test/java/com/bumpinto/application/session/SessionCommandsTest.java
```
Mesaj (commit'i kullanıcı atar):
```
fix(session): open plans never open a seat through the invite link (K-B37)

Discover publishes the slug, so it is no longer a capability. All open-plan
gates (approval, blocks, capacity, account) live in SeatRequests; join now
returns 409 open_plan_seat_request_required after seat recovery.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 2: Uçtan uca kanıt — Keşfet slug'ı davet linkinden koltuk açmaz

**Files:**
- Test: `backend/src/test/java/com/bumpinto/DiscoverApiTest.java`

- [x] **Adım 1: Testi yaz**

`DiscoverApiTest.java`'da `seatRequestsRequireAnAccount` testinin ÖNÜNE ekle (`get`, `post`, `jsonPath`, `status`, `Cookie`, `Map`, `List` zaten import'lu):

```java
    /**
     * K-B37 (2026-09-11 guvenlik incelemesi): Kesfet slug'i herkese basar; davet-linki ucu
     * (POST /participants, PUBLIC) host onayini, engeli ve kapasiteyi bilmiyordu — slug'i
     * Kesfet'ten okuyan herkes 201 + katilimci jetonu alip SessionView'i okuyabiliyordu.
     * Simdi 409 + makine kodu; oda kapali kalir. Onayli uye ise ayni uctan koltugunu geri alir
     * (mobil token onarimi) ve koltuk sayisi degismez.
     */
    @Test
    void aSlugTakenFromDiscoverDoesNotOpenASeatThroughTheInviteLink() throws Exception {
        Cookie host = login("gid-op5-host", "host5-op@bumpinto.test", "Host");
        Cookie stranger = login("gid-op5-stranger", "stranger5-op@bumpinto.test", "Yabancı");
        Cookie priya = login("gid-op5-guest", "guest5-op@bumpinto.test", "Priya");

        String body = json.writeValueAsString(Map.of(
                "activityTypes", List.of("COFFEE"), "displayName", "Host",
                "lat", 51.44, "lng", 5.47, "openPlan", Map.of("meetAt", MEET_AT)));
        String slug = json.readTree(mvc.perform(post("/api/sessions").cookie(host)
                        .header("X-Client", "web").contentType(JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString()).get("slug").asString();

        // Slug Kesfet'ten okunur — kart onu basar, gizli degildir.
        mvc.perform(get("/api/discover").cookie(stranger).param("activity", "COFFEE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plans[?(@.slug == '" + slug + "')]").isNotEmpty());

        // Konum YOK: yayilim kapisi calismaz, tek kapi acik plan kapisidir.
        String join = "{\"displayName\":\"Yabancı\"}";
        mvc.perform(post("/api/sessions/" + slug + "/participants").cookie(stranger)
                        .header("X-Client", "web").contentType(JSON).content(join))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("open_plan_seat_request_required"));
        // Uc PUBLIC: anonim cagiran da ayni cevabi alir.
        mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .header("X-Client", "web").contentType(JSON).content(join))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("open_plan_seat_request_required"));
        // Oda KAPALI kaldi, koltuk acilmadi.
        mvc.perform(get("/api/sessions/" + slug).cookie(stranger))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/sessions/" + slug + "/preview"))
                .andExpect(jsonPath("$.participantCount").value(1));

        // Onayli uye: istek → onay → davet-linki ucundan kurtarma (mobil) 201 + jeton.
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests").cookie(priya)
                        .contentType(JSON).content("{\"displayName\":\"Priya\"}"))
                .andExpect(status().isCreated());
        String reqId = json.readTree(mvc.perform(get("/api/sessions/" + slug + "/seat-requests")
                        .cookie(host)).andExpect(status().isOk()).andReturn().getResponse()
                .getContentAsString()).get("requests").get(0).get("id").asString();
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests/" + reqId + "/approve")
                .cookie(host)).andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/participants").cookie(priya)
                        .header("X-Client", "mobile").contentType(JSON)
                        .content("{\"displayName\":\"Priya\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantToken").isString());
        mvc.perform(get("/api/sessions/" + slug + "/preview"))
                .andExpect(jsonPath("$.participantCount").value(2)); // kurtarma katilim degildir
    }
```

- [x] **Adım 2: Koş**

Çalıştır: `cd backend && env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY mvn -q test -Dtest=DiscoverApiTest`
Beklenen: Task 1 uygulandığı için doğrudan YEŞİL (`Tests run: 6, Failures: 0`). Kırmızıyı görmek istersen `SessionCommands.join`'deki `isOpenPlan` bloğunu geçici yorum satırına al: ilk `andExpect(status().isConflict())` `Status expected:<409> but was:<201>` ile düşer; bloğu geri aç. Bu mutasyon kontrolü ZORUNLU — test kapıyı sınadığını kanıtlamalı (B-17'de aynı disiplin uygulandı).

- [x] **Adım 3: Stage + commit mesajı**

```bash
git add backend/src/test/java/com/bumpinto/DiscoverApiTest.java
```
Mesaj:
```
test(api): prove a Discover slug cannot open a seat via the invite link (K-B37)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 3: Host paneli katılımcı çerezi taşırken çalışsın (fail-closed korunarak)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/WebPrincipals.java` (`accountId(Jwt)`'nin altına)
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SeatRequestController.java` (5 uç + import'lar + sınıf javadoc'u)
- Test: `backend/src/test/java/com/bumpinto/DiscoverApiTest.java`

- [x] **Adım 1: Kırmızı testi yaz**

`DiscoverApiTest.java`'da Task 2'nin testinin ALTINA ekle (`MvcResult` ve `assertThat` zaten import'lu):

```java
    /**
     * K-B37 yan bulgusu: seat-request uclari /api/sessions/{slug}/ altinda yasar ve
     * ParticipantTokenFilter o yolu eslestirir — kendi planinin katilimci cerezini tasiyan host
     * (gercek tarayici onu HER ZAMAN tasir; MockMvc tasimadigi icin gorulmemisti) hesap
     * principal'ini kaybediyor ve panelinden 403 aliyordu. Hesap details'ten okunur. Fail-closed
     * KORUNUR: yalniz katilimci cerezi tasiyan istek yine 403.
     */
    @Test
    void theHostPanelWorksWhileTheHostCarriesItsOwnParticipantCookie() throws Exception {
        Cookie host = login("gid-op6-host", "host6-op@bumpinto.test", "Host");
        Cookie guest = login("gid-op6-guest", "guest6-op@bumpinto.test", "Guest");

        MvcResult created = mvc.perform(post("/api/sessions").cookie(host)
                        .header("X-Client", "web").contentType(JSON)
                        .content(json.writeValueAsString(Map.of(
                                "activityTypes", List.of("COFFEE"), "displayName", "Host",
                                "lat", 51.44, "lng", 5.47,
                                "openPlan", Map.of("meetAt", MEET_AT)))))
                .andExpect(status().isCreated()).andReturn();
        String slug = json.readTree(created.getResponse().getContentAsString())
                .get("slug").asString();
        Cookie hostSeat = created.getResponse().getCookie("bumpinto_pt_" + slug);
        assertThat(hostSeat).isNotNull();

        mvc.perform(post("/api/sessions/" + slug + "/seat-requests").cookie(guest)
                        .contentType(JSON).content("{\"displayName\":\"Guest\"}"))
                .andExpect(status().isCreated());

        // Hesap + katilimci cerezi BIRLIKTE (gercek tarayici): panel acik, karar calisir.
        String reqId = json.readTree(mvc.perform(get("/api/sessions/" + slug + "/seat-requests")
                        .cookie(host, hostSeat)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString())
                .get("requests").get(0).get("id").asString();
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests/" + reqId + "/approve")
                        .cookie(host, hostSeat))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedSeats").value(2));

        // Onaylanan misafir de /mine'i ikinci kez (artik cerezli) cagirabilir.
        Cookie guestSeat = mvc.perform(get("/api/sessions/" + slug + "/seat-requests/mine")
                        .cookie(guest).header("X-Client", "web"))
                .andExpect(status().isOk()).andReturn().getResponse()
                .getCookie("bumpinto_pt_" + slug);
        assertThat(guestSeat).isNotNull();
        mvc.perform(get("/api/sessions/" + slug + "/seat-requests/mine")
                        .cookie(guest, guestSeat).header("X-Client", "web"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // YALNIZ katilimci cerezi: hesap yok → 403. Kapi gevsemedi.
        mvc.perform(get("/api/sessions/" + slug + "/seat-requests").cookie(hostSeat))
                .andExpect(status().isForbidden());
    }
```

- [x] **Adım 2: Kırmızıyı gör**

Çalıştır: `cd backend && env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY mvn -q test -Dtest=DiscoverApiTest#theHostPanelWorksWhileTheHostCarriesItsOwnParticipantCookie`
Beklenen: ilk `.cookie(host, hostSeat)` isteğinde `Status expected:<200> but was:<403>`.

- [x] **Adım 3: `WebPrincipals.accountId(Authentication)`**

`WebPrincipals.java`'da `static UUID accountId(Jwt jwt)` metodunun hemen ALTINA:

```java
    /**
     * OTURUM YOLU altinda yasayan hesap uclari icin "kim soruyor" (seat-requests, K-B37):
     * {@code ParticipantTokenFilter} o yolu eslestirir ve kendi planinin katilimci cerezini
     * tasiyan host'ta principal'i ezer — {@code @AuthenticationPrincipal Jwt} null gelir ve host
     * kendi paneline giremezdi. Hesap {@code details}'te durur, oradan okunur. Hesap hicbir yerde
     * yoksa yine 403: yalniz katilimci cerezi tasiyan istek hesap ucunu ACMAZ.
     */
    static UUID accountId(Authentication auth) {
        return accountId(accountOf(auth));
    }
```

- [x] **Adım 4: `SeatRequestController` `Jwt` → `Authentication`**

Import'lar: `org.springframework.security.core.annotation.AuthenticationPrincipal` ve `org.springframework.security.oauth2.jwt.Jwt` satırlarını SİL; `import org.springframework.security.core.Authentication;` EKLE.

Beş uçta parametre ve çağrıyı değiştir — her `@AuthenticationPrincipal Jwt jwt` → `Authentication auth`, her `WebPrincipals.accountId(jwt)` → `WebPrincipals.accountId(auth)`:

```java
    @PostMapping
    ResponseEntity<ApiDtos.SeatRequestDto> request(Authentication auth,
            @PathVariable String slug, @Valid @RequestBody ApiDtos.SeatRequestInput body) {
        GeoPoint location = body.lat() == null || body.lng() == null ? null
                : new GeoPoint(body.lat(), body.lng());
        SeatRequest r = seats.request(slug, new SeatRequests.Ask(WebPrincipals.accountId(auth),
                body.displayName(), location, body.locationLabel(), body.travelMode(),
                body.note()));
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(r));
    }

    @GetMapping
    ApiDtos.SeatRequestListResponse list(Authentication auth, @PathVariable String slug) {
        return listFor(slug, WebPrincipals.accountId(auth));
    }

    @GetMapping("/mine")
    ResponseEntity<ApiDtos.MySeatResponse> mine(Authentication auth, @PathVariable String slug,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        UUID me = WebPrincipals.accountId(auth);
        // ... govdenin kalani AYNEN kalir
    }

    @PostMapping("/{requestId}/approve")
    ApiDtos.SeatRequestListResponse approve(Authentication auth,
            @PathVariable String slug, @PathVariable UUID requestId) {
        UUID host = WebPrincipals.accountId(auth);
        seats.approve(slug, host, requestId);
        return listFor(slug, host);
    }

    @PostMapping("/{requestId}/decline")
    ApiDtos.SeatRequestListResponse decline(Authentication auth,
            @PathVariable String slug, @PathVariable UUID requestId) {
        UUID host = WebPrincipals.accountId(auth);
        seats.decline(slug, host, requestId);
        return listFor(slug, host);
    }
```

Sınıf javadoc'unun sonuna paragraf:

```java
 *
 * <p>Hesap {@code Authentication}'dan okunur, {@code @AuthenticationPrincipal Jwt} ile DEGIL
 * (K-B37): bu uclar {@code /api/sessions/{slug}/} altinda yasar ve {@code ParticipantTokenFilter}
 * kendi planinin katilimci cerezini tasiyan host'ta principal'i ezer — hesap {@code details}'te
 * durur ({@link WebPrincipals#accountId(Authentication)}). Yalniz katilimci cerezi → yine 403.
```

- [x] **Adım 5: Yeşili gör + tam sınıf**

Çalıştır: `cd backend && env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY mvn -q test -Dtest='DiscoverApiTest,WebSecuritySliceTest,SecurityPolicyTest'`
Beklenen: hepsi yeşil (`DiscoverApiTest` 7 test). `DiscoverController` `/api/discover` altında olduğu için `slugOf` eşlemez, dokunulmaz.

- [x] **Adım 6: Stage + commit mesajı**

```bash
git add backend/src/main/java/com/bumpinto/adapter/in/web/WebPrincipals.java \
        backend/src/main/java/com/bumpinto/adapter/in/web/SeatRequestController.java \
        backend/src/test/java/com/bumpinto/DiscoverApiTest.java
```
Mesaj:
```
fix(api): seat-request endpoints read the account from details when the participant cookie is present

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 4: Belge + tam regresyon

**Files:**
- Modify: `backend/ARCHITECTURE.md` §8 "Bilinçli istisna: katılım istekleri hesap JWT'siyle çalışır (B-17)" bölümü
- Modify: `docs/superpowers/plans/INDEX.md` (K-B tablosu sonu, satır ~232; B-17 satırı, satır ~190)

- [x] **Adım 1: ARCHITECTURE §8**

"`/api/discover` aynı sebeple hesap JWT'si ister..." paragrafından SONRA, "`POST /api/sessions/{slug}/checkin` ise kurala **uyar**" paragrafından ÖNCE ekle:

```markdown
**Davet linki açık planda koltuk açmaz (K-B37, 2026-09-11 güvenlik incelemesi).** Keşfet kartı slug'ı
herkese bastığı için açık planda slug bir yetenek anahtarı **değildir**. `POST /api/sessions/{slug}/participants`
(PUBLIC) açık planda koltuk kurtarmadan sonra **409 `open_plan_seat_request_required`** döner; koltuk yalnız
`SeatRequests` üzerinden doğar — hesap zorunluluğu, çift yönlü engel, mükerrer istek ve kapasite kapıları tek
yerdedir. Host ve onaylı üye aynı uçtan koltuğunu geri almaya devam eder (mobil token onarımı). Gizli oturumda
davranış değişmez.

**Seat-request uçları hesabı `Authentication`'dan okur**, `@AuthenticationPrincipal Jwt`'den değil: yol
`/api/sessions/{slug}/` altında olduğu için `ParticipantTokenFilter` kendi planının katılımcı çerezini taşıyan
host'ta principal'i ezer; hesap `details`'te durur (`WebPrincipals.accountId(Authentication)`). Yalnız katılımcı
çerezi taşıyan istek yine 403.
```

- [x] **Adım 2: INDEX — K-B37 satırı**

K-B36 satırının hemen ALTINA (K-B tablosunun sonuna) ekle:

```markdown
| K-B37 | **Keşfet slug'ı + PUBLIC davet-linki ucu = onaysız koltuk** — `PlanCardDto.slug` herkese basılıyor, `SessionCommands.join` açık planı tanımıyordu → oturum açmış (hatta anonim) herkes `POST /participants` ile host onayı, engel ve kapasiteyi atlayıp 201 + jeton alıyor, `SessionView`'ı (adlar, ~1,1 km konumlar, mekânlar, `joinCode`), konum yazma, oy, dürtme ve sesi açıyordu; host'un atma yolu yok | **done** (2026-09-11) | B-17 | 2026-09-11 güvenlik incelemesi (High, 9/10). Düzeltme `2026-09-11-plan46-open-plan-join-gate.md`: kapı `join`de koltuk kurtarmadan SONRA, 409 `open_plan_seat_request_required`; açık planda koltuk yalnız `SeatRequests`'ten. Opak kart kimliği AÇILMADI (slug artık yetenek değil, YAGNI). **Yan bulgu:** seat-request uçları `/api/sessions/{slug}/` altında → kendi katılımcı çerezini taşıyan host `@AuthenticationPrincipal Jwt` ile 403 alıyordu (MockMvc çerez taşımadığı için görünmedi); hesap `details`'ten okunur, fail-closed korunur. **Devir W-17/M-11:** katılım sayfası bu 409'u görünce plan detayına yönlendirir. +4 test |
```

- [x] **Adım 3: INDEX — B-17 satırına not**

B-17 satırının notlar hücresinin SONUNA (son `|` işaretinden önce) ekle:

```markdown
 **2026-09-11 güvenlik incelemesi → K-B37:** davet-linki ucu açık planı tanımıyordu, kapatıldı (plan46).
```

- [x] **Adım 4: Tam regresyon**

Çalıştır: `cd backend && env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY mvn -q test`
Beklenen: `Tests run: 587` (583 + 4), `Failures: 0, Errors: 0`, 6 env-gated skip. Sayı tutmuyorsa nedenini yaz, sayıyı "düzeltme".

- [x] **Adım 5: Stage + commit mesajı**

```bash
git add backend/ARCHITECTURE.md docs/superpowers/plans/INDEX.md \
        docs/superpowers/plans/2026-09-11-plan46-open-plan-join-gate.md
```
Mesaj:
```
docs: record K-B37 open-plan invite-link gate in ARCHITECTURE §8 and INDEX

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

## Devir (bu planın DIŞI)

1. **W-17 / M-11 — katılım sayfası.** `/j/{slug}` (web `JoinForm.tsx`, mobil `app/j/[slug].tsx`) `apiErrorCode(e) === "open_plan_seat_request_required"` görünce katılım formunu değil **plan detayı + katılım isteği** ekranını (POC P2) açar. `/preview` zaten `openPlan` taşıyor; istemci daha formu göstermeden `preview.openPlan != null` ise doğrudan P2'ye gidebilir, 409 yalnız yarış durumunun güvencesidir. i18n anahtarı o planlarda açılır.
2. **Ürün kararı (aday, güvenlik değil):** `/preview` açık planda katılımcı adlarını herkese basıyor (`PreviewParticipantDto`); kart zaten `hostDisplayName` gösteriyor. Keşfet'e yabancı için bunun istenip istenmediği W-17 tasarımında karara bağlanır.
3. **Test kurgusu:** MockMvc `Set-Cookie`'yi sonraki isteğe taşımaz; oturum-yolu altındaki hesap uçlarına test yazarken katılımcı çerezini ELLE ekle (Task 3 deseni), yoksa K-B37 yan bulgusu türü hatalar görünmez.

---

## Öz-denetim

- **Bulgu kapsamı:** kapı (T1) ✓ · uçtan uca kanıt + anonim + oda kapalı + kurtarma (T2) ✓ · host 403 yan bulgusu + fail-closed (T3) ✓ · belge (T4) ✓ · opak kimlik bilinçli olarak dışarıda (K2) ✓ · istemci devri (K4) ✓.
- **Tip tutarlılığı:** `SessionCommands.OPEN_PLAN_SEAT_REQUEST_REQUIRED` = `"open_plan_seat_request_required"` (T1 sabiti, T1 testi `hasMessage`, T2 `jsonPath("$.error")`, ARCHITECTURE, INDEX). `WebPrincipals.accountId(Authentication)` T3 Adım 3'te tanımlı, Adım 4'te kullanılıyor; `accountOf(Authentication)` dosyada zaten var (private). `Participant` 10-argümanlı kurucu `SeatRequests.seat` ile birebir. `Caller.account`/`Caller.participant`/`Caller.ANONYMOUS` mevcut.
- **Yer tutucu taraması:** yok.
