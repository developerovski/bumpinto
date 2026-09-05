# Maksimum yayılım kuralı (100 km) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Çapasız bir oturumda hiçbir iki konum birbirinden 100 km'den uzak olamasın —
Hollanda'daki host ile Türkiye'den katılan biri arasında orta nokta hesaplanmasın.

**Architecture:** Kural bir **yazma-zamanı değişmezi**dir: dört konum yazma yolu tek bir özel
yardımcıdan geçer, ihlal 409 ile reddedilir. Bu sayede ihlal eden oturum hiç oluşamaz ve okuma
tarafı (`SessionCenter`, `SessionView`, Lobi kapıları) kuraldan habersiz kalır — B-10'un beş
yere kopyalanmış önkoşulunun ürettiği hata sınıfı yeniden açılmaz.

**Tech Stack:** Java 21, Spring Boot 4.1, JUnit 5 + AssertJ · React 19, TypeScript, Vitest.

**Kaynak spec:** [2026-05-max-spread-rule-design.md](../specs/2026-09-05-max-spread-rule-design.md)

---

## Yürütme grupları

| Grup | Görev | Neden bu sınır |
|---|---|---|
| **G1** | T1 | `SpreadLimit` saf ekleme; kimse çağırmıyor. Tek başına yeşil. |
| **G2** | T2 | Dört yazma yolu + testler. Tek görevde, çünkü kural hepsinde aynı anda geçerli olmalı. |
| **G3** | T3 | Web: hata kodunu yüzeye çıkarmak. Backend'den bağımsız sevk edilebilir. |

**Başlangıç referansı:** backend **311 test** · web **325 test / 56 dosya** ·
`tr 366 · en 374 · nl 374`.

**Beklenen yol:** backend 311 → **315** (T1) → **321** (T2) · web 325 → **330** (T3) ·
i18n → **tr 367 · en 375 · nl 375** (+1 anahtar × 3 dil).

**Test komutları:**

```bash
# backend (env öneki ZORUNLU)
cd /Users/mehmetserefoglu/projects/bumpinto/backend && \
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o clean test

# web (node öneki ZORUNLU: varsayılan v20, repo v22 istiyor)
cd /Users/mehmetserefoglu/projects/bumpinto
pnpm exec tsc --noEmit -p frontend/web
bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm test:web'
bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm i18n:check'
bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm build:web'
```

---

## Doğrulanmış mesafeler (haversine, `GeoMath.distanceKm` ile aynı formül)

Testlerin kurgusu bu sayılara dayanıyor — uydurma değil, hesaplandı:

| Çift | km | |
|---|---|---|
| Amsterdam–Utrecht | 34,16 | içinde |
| Utrecht–Eindhoven | 76,05 | içinde |
| **Amsterdam–Eindhoven** | **110,03** | **aşar** |
| Den Bosch–Someren | 44,76 | içinde (mevcut fikstürler güvende) |
| Den Bosch–İstanbul | 2156,02 | aşar |

Kendini-dışlama testi bu üçgeni gerektiriyor: Utrecht ortada; Amsterdam ve Eindhoven ikisi de
Utrecht'e yakın ama birbirinden 110 km uzak. Aksi hâlde kurulacak durum değişmezin kendisi
tarafından engellenirdi.

---

## Dosya haritası

**Oluşturulacak**
- `backend/src/main/java/com/bumpinto/domain/geo/SpreadLimit.java`
- `backend/src/test/java/com/bumpinto/domain/geo/SpreadLimitTest.java`
- `frontend/web/src/lib/apiError.ts`
- `frontend/web/src/lib/apiError.test.ts`

**Değişecek**
- `application/session/SessionCommands.java` — özel yardımcı + dört çağrı yeri
- `test/.../application/session/SessionCommandsTest.java` — +6 test
- `frontend/web/src/pages/JoinForm.tsx` — hata dalı
- `frontend/web/src/pages/JoinForm.test.tsx` — +1 test
- `frontend/web/src/pages/WaitingRoom.tsx` — hata dalı
- `frontend/web/src/pages/WaitingRoom.test.tsx` — +1 test
- `frontend/web/src/i18n/locales/{tr,en,nl}.json` — 1 anahtar
- `backend/.infra/bumpinto-collection/participants/{join-session,update-location}.yml`

**`NewSessionPage` DEĞİŞMEZ:** `createSession`'da karşılaştırma kümesi her zaman boştur
(oturum yeni, katılımcı yok), dolayısıyla `participants_too_far_apart` o uçtan **hiç dönemez**.
Spec §6 üç çağrı yeri sayıyordu; gerçek sayı ikidir.

---

# G1 — Kural

### Task 1: `SpreadLimit`

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/geo/SpreadLimit.java`
- Create: `backend/src/test/java/com/bumpinto/domain/geo/SpreadLimitTest.java`

- [ ] **Step 1: Önce testi yaz**

```java
package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SpreadLimitTest {

    private static final GeoPoint AMSTERDAM = new GeoPoint(52.3676, 4.9041);
    private static final GeoPoint UTRECHT = new GeoPoint(52.0907, 5.1214);
    private static final GeoPoint EINDHOVEN = new GeoPoint(51.4416, 5.4697);
    private static final GeoPoint ISTANBUL = new GeoPoint(41.0082, 28.9784);

    /** Bos kume: kiyaslanacak kimse yok, ilk konum HER ZAMAN kabul edilir. */
    @Test
    void emptyGroupNeverExceeds() {
        assertThat(SpreadLimit.exceeded(ISTANBUL, List.of())).isFalse();
    }

    /** Sinirin altindaki grup kabul edilir (Amsterdam-Utrecht 34 km). */
    @Test
    void nearbyPointIsAccepted() {
        assertThat(SpreadLimit.exceeded(AMSTERDAM, List.of(UTRECHT))).isFalse();
    }

    /** Uzak nokta reddedilir (Den Bosch-Istanbul 2156 km). */
    @Test
    void farAwayPointExceeds() {
        assertThat(SpreadLimit.exceeded(ISTANBUL, List.of(UTRECHT))).isTrue();
    }

    /** TEK bir uzak uye yeter: aday gruptaki HERKESE yakin olmali (cap kurali, spec S1). */
    @Test
    void oneFarMemberIsEnoughToExceed() {
        assertThat(SpreadLimit.exceeded(EINDHOVEN, List.of(UTRECHT, AMSTERDAM))).isTrue();
        // Ayni aday yalniz Utrecht ile olculseydi (76 km) gecerdi — Amsterdam 110 km ile reddediyor.
        assertThat(SpreadLimit.exceeded(EINDHOVEN, List.of(UTRECHT))).isFalse();
    }
}
```

- [ ] **Step 2: Derlenmediğini gör**

Run: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 mvn -o -q test-compile`
Expected: FAIL — `cannot find symbol: class SpreadLimit`.

- [ ] **Step 3: `SpreadLimit`'i yaz**

```java
package com.bumpinto.domain.geo;

import java.util.List;

/**
 * Capasiz oturumda grubun izin verilen yayilimi. Hollanda'daki host ile Turkiye'den katilan
 * biri arasindaki "orta nokta" Balkanlar'da bir tarladir; sessizce uretilen anlamsiz bir
 * merkez hatanin en pahali bicimidir.
 *
 * <p>Olcu CAP'tir (en uzak ikili mesafe), centroid'e uzaklik degil: agirlikli centroid ulasim
 * moduna gore kayar ve yuruyen biri katilinca HIC KIMILDAMAMIS bir arabali menzil disina
 * dusebilirdi (spec S1).
 */
public final class SpreadLimit {

    public static final double MAX_SPREAD_KM = 100.0;

    /**
     * Degismez ZATEN gecerli oldugu icin tam cap hesabina gerek yok: yalniz ADAYI mevcut
     * noktalara olcmek yeter. O(n), O(n^2) degil (spec S3).
     */
    public static boolean exceeded(GeoPoint candidate, List<GeoPoint> existing) {
        return existing.stream().anyMatch(p -> GeoMath.distanceKm(candidate, p) > MAX_SPREAD_KM);
    }

    private SpreadLimit() {
    }
}
```

- [ ] **Step 4: Koş**

Run: tam backend komutu.
Expected: PASS, **315 test** (311 + 4).

- [ ] **Step 5: Commit**

```
feat(geo): add SpreadLimit, the 100 km group spread rule

Measured as the diameter (farthest pair), not distance from the centroid:
the weighted centroid shifts with travel mode, so a walker joining could
push a driver who never moved out of range. Not wired in yet.
```

---

# G2 — Değişmez

### Task 2: Dört yazma yolunu tek kapıdan geçir

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java`
- Test: `backend/src/test/java/com/bumpinto/application/session/SessionCommandsTest.java`

- [ ] **Step 1: Önce altı testi yaz** (`SessionCommandsTest.java`, sınıfın sonuna)

Sınıfta `DEN_BOSCH` ve `SOMEREN` sabitleri ZATEN VAR (44,76 km — sınır içinde, mevcut testler
etkilenmez). Yeni sabitler eklenir.

```java
    private static final GeoPoint AMSTERDAM = new GeoPoint(52.3676, 4.9041);
    private static final GeoPoint UTRECHT = new GeoPoint(52.0907, 5.1214);
    private static final GeoPoint EINDHOVEN = new GeoPoint(51.4416, 5.4697);
    private static final GeoPoint ISTANBUL = new GeoPoint(41.0082, 28.9784);

    /** Capasiz oturumda 100 km'yi asan katilim REDDEDILIR: orta nokta Balkanlar'da bir tarla
        olurdu ve urun tezi grup uzlasmasi. */
    @Test
    void joiningFromTooFarAwayIsRejected() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                DEN_BOSCH, "Mehmet", null, null, null);

        assertThatThrownBy(() -> commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe",
                ISTANBUL, null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("participants_too_far_apart");
    }

    /** Sinir icindeki katilim etkilenmez (Den Bosch-Someren 44,76 km) — pozitif kontrol,
        yoksa test "her katilimi reddet" mutasyonuna karsi kor olurdu. */
    @Test
    void joiningFromWithinTheLimitStillWorks() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                DEN_BOSCH, "Mehmet", null, null, null);

        assertThat(commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN, null, null)
                .hasLocation()).isTrue();
    }

    /** CAPALI oturumda kural ISLEMEZ: capa sabit bir yerdir, uzaktan katilmak katilanin
        bileceği istir (spec S4). */
    @Test
    void anchoredSessionAcceptsFarAwayParticipants() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                DEN_BOSCH, "Mehmet", null, null,
                new SessionCommands.Anchor(DEN_BOSCH, "Den Bosch"));

        assertThat(commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", ISTANBUL, null, null)
                .hasLocation()).isTrue();
    }

    /** updateLocation KENDINI DISLAR: kisi kendi eski konumuyla kisitlanamaz.
        Utrecht ortada; Amsterdam ve Eindhoven ikisi de ona yakin (34 / 76 km) ama birbirinden
        110 km uzak. Kendi eskisi kumede kalsaydi bu MESRU tasinma haksiz yere reddedilirdi. */
    @Test
    void updatingOwnLocationIgnoresYourPreviousPosition() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                AMSTERDAM, "Mehmet", null, null, null);
        commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", UTRECHT, null, null);

        commands.updateLocation(r.session().slug(), r.hostParticipant().id(), EINDHOVEN,
                null, null);

        assertThat(store.participantsOf(r.session().id()).stream()
                .filter(p -> p.id().equals(r.hostParticipant().id())).findFirst().orElseThrow()
                .location()).isEqualTo(EINDHOVEN);
    }

    /** Ama BASKASINDAN uzaklasan tasinma yine reddedilir. */
    @Test
    void updatingOwnLocationBeyondTheGroupIsRejected() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                DEN_BOSCH, "Mehmet", null, null, null);
        commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN, null, null);

        assertThatThrownBy(() -> commands.updateLocation(r.session().slug(),
                r.hostParticipant().id(), ISTANBUL, null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("participants_too_far_apart");
    }

    /** SOLO elle nokta da ayni kuraldan gecer — hatayi ekleyen host gorur (spec R3). */
    @Test
    void addingAFarAwayManualPointIsRejected() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, List.of(ActivityType.COFFEE), SessionType.SOLO,
                DEN_BOSCH, "Mehmet", null, null, null);

        assertThatThrownBy(() -> commands.addPoint(r.session().slug(),
                r.hostParticipant().id(), "Ayşe", null, ISTANBUL, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("participants_too_far_apart");
    }
```

Gerekirse import ekle: `com.bumpinto.domain.geo.GeoPoint` (muhtemelen var),
`static org.assertj.core.api.Assertions.assertThatThrownBy`.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 \
  TESTCONTAINERS_RYUK_DISABLED=true mvn -o test -Dtest=SessionCommandsTest`
Expected: FAIL — `joiningFromTooFarAwayIsRejected`,
`updatingOwnLocationBeyondTheGroupIsRejected` ve `addingAFarAwayManualPointIsRejected` düşer
(istisna atılmadı). Diğer üçü (pozitif kontroller ve çapalı) ZATEN YEŞİLdir.

- [ ] **Step 3: Kapıyı yaz**

`SessionCommands`'a özel yardımcı ekle (sınıfın sonuna, diğer private yardımcıların yanına):

```java
    /**
     * Capasiz oturumda hicbir iki konum birbirinden {@link SpreadLimit#MAX_SPREAD_KM}'den uzak
     * olamaz. Dort yazma yolu da buradan gecer: kural bir DEGISMEZ'dir, ihlal eden oturum hic
     * olusamaz, dolayisiyla okuma tarafi bundan habersiz kalabilir (spec S3).
     *
     * <p>KENDINI DISLAR: kisi kendi eski konumuyla kisitlanamaz. A Amsterdam'dan Eindhoven'e
     * tasiniyorsa ve B Utrecht'teyse tasinma mesrudur (76 km), ama A'nin eskisi kumede kalirsa
     * Amsterdam-Eindhoven (110 km) olculur ve haksiz yere reddedilirdi.
     */
    private void requireWithinSpread(Session session, GeoPoint candidate, UUID selfId) {
        if (candidate == null || session.anchor() != null) {
            return;
        }
        List<GeoPoint> existing = store.participantsOf(session.id()).stream()
                .filter(p -> !p.id().equals(selfId))
                .map(Participant::location)
                .filter(Objects::nonNull)
                .toList();
        if (SpreadLimit.exceeded(candidate, existing)) {
            throw new ConflictException("participants_too_far_apart");
        }
    }
```

Import ekle: `import com.bumpinto.domain.geo.SpreadLimit;` ve `import java.util.Objects;`
(ikisi de yoksa).

- [ ] **Step 4: Dört çağrı yerini bağla**

`createSession` — `Session` kaydedildikten SONRA, host katılımcısı kaydedilmeden ÖNCE:

```java
        requireWithinSpread(session, hostLocation, null);
```

`join` — koltuk kurtarma ve statü kapısından SONRA, `saveParticipant`'tan ÖNCE:

```java
        requireWithinSpread(session, location, null);
```

`updateLocation` — `participant` bulunduktan SONRA, `saveParticipant`'tan ÖNCE:

```java
        requireWithinSpread(session, location, participantId);
```

`addPoint` — statü kapısından SONRA, `saveParticipant`'tan ÖNCE:

```java
        requireWithinSpread(session, location, null);
```

> `createSession`'da küme her zaman boştur (oturum yeni), yani kapı orada asla tetiklenmez.
> Yine de çağrılır: dört yazma yolundan biri kapıyı atlarsa değişmez yalan olur ve bunu
> derleyici yakalamaz. Bedeli oturum başına bir sorgu.

- [ ] **Step 5: Koş**

Run: tam backend komutu.
Expected: PASS, **321 test** (315 + 6).

> Mevcut 25 `SessionCommandsTest` testi ve `ApiHappyPathTest` yeşil kalmalı — bütün mevcut
> fikstürler Hollanda içinde (en uzak çift Den Bosch–Someren, 44,76 km). Kırmızı çıkan varsa
> DUR: ya bir fikstür 100 km'yi aşıyordur ya da kapı yanlış yere kondu.

- [ ] **Step 6: Bruno `docs:` bloklarını güncelle**

`participants/join-session.yml` ve `participants/update-location.yml` `docs.content`'ine:

```markdown
    **409 `participants_too_far_apart`** — capasiz oturumda gonderilen konum, gruptaki mevcut
    konumlardan birine 100 km'den uzaksa reddedilir. Orta nokta katilimci konumlarindan
    turedigi icin cok dagilmis bir grupta anlamsiz bir merkez uretirdi. Cikis yolu capadir:
    host sabit bir bulusma yeri secerse kural islemez ve ayni konum kabul edilir.
    Konum GUNCELLEMEDE kisi kendi eski konumuyla kiyaslanmaz.
```

- [ ] **Step 7: Commit**

```
feat(session): reject locations that spread the group beyond 100 km

Enforced at every write path, so "diameter <= 100 km" is an invariant and
the read side never has to know about it. Anchored sessions are exempt:
the anchor is a fixed place, so joining from far away is the joiner's call.
```

---

# G3 — Web

### Task 3: Hata kodunu yüzeye çıkar

**Files:**
- Create: `frontend/web/src/lib/apiError.ts`
- Create: `frontend/web/src/lib/apiError.test.ts`
- Modify: `frontend/web/src/pages/JoinForm.tsx:87-88`
- Modify: `frontend/web/src/pages/JoinForm.test.tsx`
- Modify: `frontend/web/src/pages/WaitingRoom.tsx:59-60`
- Modify: `frontend/web/src/pages/WaitingRoom.test.tsx`
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`

- [ ] **Step 1: i18n anahtarını üç dile birden ekle**

`join` bloğuna, `errJoin`'in yanına:

- tr: `"errTooFar": "Bu buluşma katılımcıların orta noktasında yapılıyor ve sen gruptan çok uzaktasın. Host'tan sabit bir buluşma yeri seçmesini iste."`
- en: `"errTooFar": "This meetup is held at the participants' midpoint and you are too far from the group. Ask the host to pick a fixed meeting place."`
- nl: `"errTooFar": "Deze afspraak vindt plaats op het middelpunt van de deelnemers en jij bent te ver van de groep. Vraag de host om een vaste ontmoetingsplek te kiezen."`

- [ ] **Step 2: `apiError` testini yaz**

`frontend/web/src/lib/apiError.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { apiErrorCode } from "./apiError";

describe("apiErrorCode", () => {
  it("backend ApiError kodunu çıkarır", () => {
    expect(apiErrorCode({ response: { data: { error: "participants_too_far_apart" } } }))
      .toBe("participants_too_far_apart");
  });

  /** Ağ hatası / iptal: response yok. Dallanma bunu genel mesaja düşürmeli. */
  it("response yoksa null döner", () => {
    expect(apiErrorCode(new Error("network"))).toBeNull();
  });

  /** Gövde beklenen şekilde değilse uydurmaz — string olmayan her şey null. */
  it("error alanı string değilse null döner", () => {
    expect(apiErrorCode({ response: { data: { error: { code: 1 } } } })).toBeNull();
  });
});
```

- [ ] **Step 3: Kırmızı olduğunu gör**

Run: `bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm test:web'`
Expected: FAIL — `Failed to resolve import "./apiError"`.

- [ ] **Step 4: `apiError.ts`'i yaz**

```ts
/** Backend'in ApiError kodu (ApiExceptionHandler: `record ApiError(String error)`).
    Kod, prose değil: istemci dile bağlı olmayan bir şeye dallanabilsin diye —
    `invalid_token` bu deseni zaten kuruyor. Tek yerde durur ki üç çağrı yeri
    axios'un gövde şeklini ayrı ayrı bilmek zorunda kalmasın. */
export function apiErrorCode(e: unknown): string | null {
  const code = (e as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof code === "string" ? code : null;
}
```

- [ ] **Step 5: İki sayfa testini yaz**

`JoinForm.test.tsx` — mevcut `describe("JoinForm — haritadan seç")` bloğunun ALTINA yeni
bir `describe` olarak. Store'un `join`'ini reddettirip mesajı yokla; dosyadaki mevcut
`useSessionStore.setState` deseni taklit edilir.

```tsx
describe("JoinForm — çok uzak", () => {
  it("participants_too_far_apart özel mesajı basar", async () => {
    useSessionStore.setState({
      join: () => Promise.reject({ response: { data: { error: "participants_too_far_apart" } } }),
    } as never);
    render(<MemoryRouter><JoinForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Adın"), { target: { value: "Ayşe" } });
    fireEvent.click(screen.getByRole("button", { name: "Katıl" }));
    expect(await screen.findByText(
      "Bu buluşma katılımcıların orta noktasında yapılıyor ve sen gruptan çok uzaktasın. Host'tan sabit bir buluşma yeri seçmesini iste.",
    )).toBeInTheDocument();
  });
});
```

> `getByLabelText("Adın")` ve `name: "Katıl"` metinlerini dosyadaki mevcut testlerden
> DOĞRULA; farklıysa mevcut olanı kullan (ev kuralı: birebir Türkçe metin, regex yok).

`WaitingRoom.test.tsx` — aynı desen, `updateLocation` reddedilir ve aynı anahtar beklenir.

- [ ] **Step 6: Kırmızı olduğunu gör**

Run: `bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm test:web'`
Expected: FAIL — iki test de genel mesajı bastığı için özel metni bulamaz.

- [ ] **Step 7: İki dalı yaz**

`JoinForm.tsx`:

```tsx
    } catch (e) {
      // Kod, prose değil: backend 409'u `participants_too_far_apart` ile işaretliyor.
      setError(t(apiErrorCode(e) === "participants_too_far_apart"
        ? "join.errTooFar" : "join.errJoin"));
    } finally {
```

`WaitingRoom.tsx`:

```tsx
    } catch (e) {
      setError(t(apiErrorCode(e) === "participants_too_far_apart"
        ? "join.errTooFar" : "waiting.errUpdate"));
    } finally {
```

İki dosyaya da `import { apiErrorCode } from "../lib/apiError";` eklenir.

- [ ] **Step 8: Dört kapıyı da koş**

Expected:
- `tsc` → "TypeScript: No errors found"
- `test:web` → **330 passed (330)**, 58 dosya
- `i18n:check` → **tr 367 · en 375 · nl 375**
- `build:web` → built

- [ ] **Step 9: Commit**

```
feat(web): tell a too-far joiner to ask for a fixed meeting place

The 409 is machine-readable, so the client can branch without matching
prose. Both call sites read it through one helper instead of each poking
at the axios body shape.
```

---

## Öz-inceleme notları

**Spec kapsaması:** S1/S2 (çap ölçüsü) → T1 `oneFarMemberIsEnoughToExceed`; S3 (yazma-zamanı
değişmez) → T2 Step 3-4; S4 (çapalı muaf) → `anchoredSessionAcceptsFarAwayParticipants`;
S5 (409 reddi) → üç ret testi; S6 (100 km) → `SpreadLimit.MAX_SPREAD_KM`; S7 (mevcut oturumlar
etkilenmez) → okuma tarafına hiç dokunulmadığı için yapısal olarak sağlanır;
§4 kendini-dışlama → `updatingOwnLocationIgnoresYourPreviousPosition`; §6 web → T3.

**Spec düzeltmesi:** §6 üç web çağrı yeri sayıyor (`JoinForm`, `NewSessionPage`,
`WaitingRoom`). `NewSessionPage` bu hatayı **alamaz** — `createSession`'da karşılaştırma kümesi
her zaman boştur. Gerçek sayı ikidir; plan buna göre yazıldı.

**`createSession` test kapısı:** spec §7 ayrı bir test istiyordu; eklenmedi çünkü mevcut 25
`SessionCommandsTest` testinin ve `ApiHappyPathTest`'in HEPSİ oturum kurarak bu kapıdan
geçiyor — boş kümede ihlal üretilemediğinin kanıtı zaten her koşuda var.

**Tip tutarlılığı:** `SpreadLimit.exceeded(GeoPoint, List<GeoPoint>)` ve
`requireWithinSpread(Session, GeoPoint, UUID)` argüman sırası dört çağrı yerinde de aynı.
`apiErrorCode(unknown): string | null` iki çağrı yerinde de aynı.
