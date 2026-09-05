# Çapalı oturum — doğrulama bulgularının kapatılması Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** B-10/W-9 birleşik doğrulamasından kalan iki blocking ve dört important bulguyu
kapatmak. Hepsi onaylanmış davranışın eksik uygulanması — yeni tasarım kararı yok.

**Architecture:** Beş bağımsız düzeltme. Backend tarafı iki (yarım koordinat 400 olmalı,
arama merkezini tutan test yok); web tarafı üç (çapa adresi yarışı, `MapPicker` yükleme
hatası, `MidpointCard`'ın çapalıda yalan söyleyen notu).

**Tech Stack:** Java 21, Spring Boot 4.1, JUnit 5 + AssertJ · React 19, TypeScript, Vitest.

**Kaynak:** B-10 + W-9 birleşik doğrulaması (2026-09-05), onaylanmış 16 bulgudan 6'sı.
Kapsanan spec maddeleri: [çapalı oturum](../specs/2026-09-05-anchored-session-design.md) §4, K6.

---

## Doğrulanmış bulgular

Her biri koda bakılarak teyit edildi; ajan raporundan aktarılmadı.

| # | Yer | Kanıt |
|---|---|---|
| **B1** | `NewSessionPage` çapa adresi | `resolveAnchor` yalnız `onBlur`; `create()` onu beklemiyor ve `anchor`ı render closure'ından okuyor → ilk gönderim `errNoAnchor` ile düşer ya da BAYAT çapa gider |
| **B2** | aynı yer | `anchorQuery` ile store'daki `anchor` senkron değil (B1'in aynı kökü) |
| **I1** | `SessionController` | `request.lat() == null && request.lng() == null ? null : new GeoPoint(...)` — `&&` yüzünden yarım koordinat unboxing NPE → **500** |
| **I2** | `MapPicker` | `loadMaps` reddedilirse boş `catch`; "Burayı seç" ETKİN kalıyor, kullanıcı hiç görmediği koordinatı onaylıyor |
| **I3** | `MidpointCard` | `sideNote` ("Orta nokta {{name}} tarafında") `anchored`e bakmıyor — çapalıda merkez sabit, bu cümle yalan |
| **I4** | `DeckFlowTest` | Provider fake yalnız `radiusKm` kaydediyor; arama MERKEZİNİ hiçbir test tutmuyor — çapanın tek vaadi testsiz |

**Başlangıç referansı:** backend **321** · web **331 / 57 dosya** · `tr 367 · en 375 · nl 375`.
**Beklenen yol:** backend 321 → **322** (T1) → **324** (T2) · web 331 → **333** (T3) →
**334** (T4) → **335** (T5). i18n **değişmez**.

---

# G1 — Backend

### Task 1: Yarım koordinat 400 döner (I1)

`&&`'i `||` yapmak NPE'yi kaldırır ama yarım koordinatı **sessizce düşürür**. Bozuk istek
sessizce yutulmamalı: `AnchorDto` zaten lat/lng ikisini de `@NotNull` ile zorunlu tutuyor;
`CreateSessionRequest` için aynı değişmez çapraz doğrulamayla kurulur.

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java`
- Test: `backend/src/test/java/com/bumpinto/ApiHappyPathTest.java`

- [ ] **Step 1: Önce testi yaz** (`ApiHappyPathTest`, `createWithoutLocationOrAnchorIsRejected`'in yanına)

Aynı dosyadaki mevcut desen: `google` mock'u + `GoogleUser(email, name)` + benzersiz idToken.

```java
    /** Yarim koordinat BOZUK istektir, sessizce dusurulmez: lat/lng birlikte gelir ya da hic
        gelmez (AnchorDto'nun @NotNull ciftiyle ayni degismez). Onceden `&&` yuzunden
        new GeoPoint(lat, null) unboxing NPE atip 500 doner idi. */
    @Test
    void createWithHalfACoordinateIsRejected() throws Exception {
        when(google.verify("gid-half")).thenReturn(
                new GoogleIdVerifier.GoogleUser("half@bumpinto.test", "Mehmet"));
        String loginBody = mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"gid-half\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String accessToken = json.readTree(loginBody).get("accessToken").asString();

        mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"displayName\":\"Mehmet\","
                                + "\"lat\":52.3676,"
                                + "\"anchor\":{\"lat\":52.3676,\"lng\":4.9041,"
                                + "\"label\":\"Amsterdam\"}}"))
                .andExpect(status().isBadRequest());
    }
```

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 \
  TESTCONTAINERS_RYUK_DISABLED=true mvn -o test -Dtest=ApiHappyPathTest`
Expected: FAIL — 400 yerine **500** (unboxing NPE).

- [ ] **Step 3: Çapraz doğrulamayı ekle**

`ApiDtos.CreateSessionRequest` gövdesine, `isOriginPresent()`'ın yanına:

```java
        /**
         * lat/lng birlikte gelir ya da hic gelmez. Yarim koordinat bozuk ISTEKTIR: sessizce
         * dusurulurse host konumsuz sayilir ve bunu kimse fark etmez; controller'da
         * new GeoPoint(lat, null) ise unboxing NPE ile 500 verirdi.
         */
        @AssertTrue(message = "lat and lng must be given together")
        public boolean isLocationWhole() {
            return (lat == null) == (lng == null);
        }
```

- [ ] **Step 4: Controller'daki `&&`'i `||` yap** (savunma katmanı)

Doğrulama artık isteği geçirmiyor, ama controller tek başına da güvenli olmalı:

```java
        GeoPoint hostLocation = request.lat() == null || request.lng() == null
                ? null : new GeoPoint(request.lat(), request.lng());
```

- [ ] **Step 5: Koş**

Run: tam backend komutu.
Expected: PASS, **322 test** (321 + 1).

---

### Task 2: Arama merkezini tutan test (I4)

**Files:**
- Test: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`

- [ ] **Step 1: Provider fake'ine merkez kaydını ekle**

Alan bildirimine (`List<Double> requestedRadii;` yanına):

```java
    List<GeoPoint> requestedCenters;
```

`setUp()` içinde:

```java
        requestedCenters = new ArrayList<>();
        VenueProviderPort provider = (center, radiusKm, type, limit) -> {
            requestedRadii.add(radiusKm);
            requestedCenters.add(center);
            return List.copyOf(providerResult);
        };
```

`requestedRadii = new ArrayList<>();` satırının hemen ardına
`requestedCenters = new ArrayList<>();` eklenir.

- [ ] **Step 2: İki testi yaz** (sınıfın sonuna)

```java
    /** Capanin TEK vaadi: mekanlar CAPANIN cevresinde aranir. Bu tutulmazsa capa yalnizca
        bir etiket olur ve merkez sessizce baska bir yere kayabilir. */
    @Test
    void anchoredSearchUsesTheAnchorAsCentre() {
        Session anchored = anchoredSession("centre1");
        Participant h = memberOf(anchored, "Mehmet", null, true);
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));

        flow.findVenues("centre1", h.id());

        assertThat(requestedCenters).isNotEmpty();
        assertThat(requestedCenters.get(0)).isEqualTo(new GeoPoint(52.3676, 4.9041));
    }

    /** Capasizda merkez AGIRLIKLI ORTA NOKTADIR — gerileme korumasi: capa dali yanlislikla
        capasiz oturuma da uygulanmasin. */
    @Test
    void unanchoredSearchUsesTheParticipantMidpoint() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));

        flow.findVenues("s1", host.id());

        assertThat(requestedCenters).isNotEmpty();
        GeoPoint centre = requestedCenters.get(0);
        // Den Bosch (51.6978) ile Someren (51.3855) ARASINDA; ikisinin de kendisi degil.
        assertThat(centre.lat()).isBetween(51.39, 51.70);
        assertThat(centre).isNotEqualTo(DEN_BOSCH).isNotEqualTo(SOMEREN);
    }
```

- [ ] **Step 3: Mutasyonla doğrula (kapının gerçekten tuttuğunu gör)**

`DeckFlow.findVenues`'ta `provider.search(center.point(), ...)` yerine geçici olarak
`provider.search(new GeoPoint(0, 0), ...)` yaz, testi koş, **ikisinin de kırmızı** olduğunu
gör, sonra GERİ AL ve suite'in yine yeşil olduğunu doğrula.

- [ ] **Step 4: Koş**

Run: tam backend komutu.
Expected: PASS, **324 test** (322 + 2).

---

# G2 — Web

### Task 3: Çapa adresi yarışı (B1 + B2)

**Files:**
- Modify: `frontend/web/src/pages/NewSessionPage.tsx`
- Test: `frontend/web/src/pages/NewSessionPage.test.tsx`

- [ ] **Step 1: Önce iki testi yaz**

`geocode` bu dosyada zaten mock'lanıyor; mevcut deseni kullan.

```tsx
  /** Kullanici adresi yazip DOGRUDAN "Bulusmayi kur"a basarsa blur ile submit ayni tikta
      yarisir. create() bekleyen cozumu beklemezse ilk gonderim bosa gider (errNoAnchor) ya da
      BAYAT capa gonderilir — kullanici sectiginden baska bir yerde bulusma kurar. */
  it("adres yazıp doğrudan gönderince çapa çözülür ve isteğe girer", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } as never });
    vi.mocked(geocode).mockResolvedValueOnce({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    fireEvent.change(screen.getByLabelText("Buluşma yeri"), { target: { value: "Amsterdam" } });
    fireEvent.click(screen.getByRole("button", { name: "Buluşmayı kur" }));

    await vi.waitFor(() =>
      expect(useNewSessionStore.getState().anchor)
        .toEqual({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" }));
  });

  /** Adres DEGISTIRILIRSE eski capa gonderilmez. */
  it("adres değiştirilince eski çapa gönderilmez", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } as never });
    vi.mocked(geocode)
      .mockResolvedValueOnce({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" })
      .mockResolvedValueOnce({ lat: 51.4416, lng: 5.4697, label: "Eindhoven" });
    render(<MemoryRouter><NewSessionPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole("radio", { name: "Belli bir yerde" }));
    const field = screen.getByLabelText("Buluşma yeri");
    fireEvent.change(field, { target: { value: "Amsterdam" } });
    fireEvent.blur(field);
    await vi.waitFor(() => expect(useNewSessionStore.getState().anchor?.label).toBe("Amsterdam"));

    fireEvent.change(field, { target: { value: "Eindhoven" } });
    fireEvent.click(screen.getByRole("button", { name: "Buluşmayı kur" }));

    await vi.waitFor(() =>
      expect(useNewSessionStore.getState().anchor?.label).toBe("Eindhoven"));
  });
```

> Seçici metinlerini (`"Belli bir yerde"`, `"Buluşma yeri"`, `"Buluşmayı kur"`) dosyadaki
> mevcut testlerden DOĞRULA; farklıysa mevcut olanı kullan. `getByLabelText` çalışmazsa
> `getByRole("textbox", { name: "Buluşma yeri" })` dene — dosyanın baskın deseni bu.

- [ ] **Step 2: Kırmızı olduğunu gör**

Expected: FAIL — ilki `anchor` `null` kalır, ikincisi `"Amsterdam"`da takılır.

- [ ] **Step 3: `resolveAnchor`'ı çözülen değeri döndürür yap ve çözülmüş sorguyu izle**

```tsx
  /** En son BASARIYLA cozulmus sorgu. create() bunu anchorQuery ile karsilastirir: alan
      degismisse (ya da hic cozulmemisse) gondermeden ONCE cozer. Ayni sorgu icin ikinci bir
      Nominatim cagrisi yapilmaz — politika "onayda bir kez". */
  const resolvedQuery = useRef("");

  async function resolveAnchor(): Promise<Loc | null> {
    const q = anchorQuery.trim();
    const gen = ++anchorReq.current;
    if (!q) {
      setAnchor(null);
      resolvedQuery.current = "";
      return null;
    }
    const found = await geocode(q);
    if (anchorReq.current !== gen) return null; // bayat cevap
    if (found) {
      setAnchor(found);
      resolvedQuery.current = q;
      setLocalError(null);
      return found;
    }
    setLocalError(t("join.errGeocode"));
    return null;
  }
```

`setAnchor(picked)` yapan harita dalına da (satır ~225) `resolvedQuery.current = picked.label ?? "";`
eklenir — haritadan seçim de "çözülmüş" sayılır, yoksa gönderimde gereksiz yere yeniden
geocode edilir.

- [ ] **Step 4: `create()`'i bekletmeyi öğret**

`anchorMode === "ANCHOR" && !anchor` kontrolünü şununla değiştir:

```tsx
      let effectiveAnchor = anchor;
      if (anchorMode === "ANCHOR" && anchorQuery.trim() !== resolvedQuery.current) {
        // Blur ile submit ayni tikta yarisiyor: bekleyen cozumu BEKLE, yoksa bayat capa gider.
        effectiveAnchor = await resolveAnchor();
      }
      if (anchorMode === "ANCHOR" && !effectiveAnchor) {
        setLocalError(t("newSession.errNoAnchor"));
        return;
      }
```

> `submit()` çapayı store'dan okur ve `resolveAnchor` `setAnchor` ile store'u güncellemiştir,
> dolayısıyla `effectiveAnchor`'ı ayrıca `submit`'e geçirmeye gerek yok — kapıda kullanılır.

- [ ] **Step 5: Koş**

Expected: PASS, **333 test** (331 + 2).

---

### Task 4: `MapPicker` yükleme hatası (I2)

**Files:**
- Modify: `frontend/web/src/components/organisms/MapPicker.tsx`
- Test: `frontend/web/src/components/organisms/MapPicker.test.tsx`

- [ ] **Step 1: Mock'u değiştirilebilir yap ve testi yaz**

Dosyanın başındaki mock:

```tsx
vi.mock("../../lib/maps", () => ({
  mapsConfigured: vi.fn(() => false),
  loadMaps: vi.fn(),
  trackMapInstance: vi.fn(),
  MAP_ID: "test-map",
}));

import { loadMaps, mapsConfigured } from "../../lib/maps";
```

Yeni test:

```tsx
  /** Harita YUKLENEMEZSE onay dugmesi etkin kalmamali: kullanici hic gormedigi bir koordinati
      onaylar ve oturum yanlis yerde kurulur. */
  it("harita yüklenemezse 'Burayı seç' kilitlenir", async () => {
    vi.mocked(mapsConfigured).mockReturnValue(true);
    vi.mocked(loadMaps).mockRejectedValueOnce(new Error("no key"));

    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "Burayı seç" })).toBeDisabled();
    vi.mocked(mapsConfigured).mockReturnValue(false);
  });
```

- [ ] **Step 2: Kırmızı olduğunu gör**

Expected: FAIL — düğme etkin (`toBeDisabled` başarısız).

- [ ] **Step 3: `failed` durumunu ekle**

`const [busy, setBusy] = useState(false);` yanına:

```tsx
  const [failed, setFailed] = useState(false);
```

`loadMaps(...).catch(...)` bloğu:

```tsx
      .catch(() => {
        // Bos catch, kullaniciya GORMEDIGI bir koordinati onaylatirdi.
        if (alive) setFailed(true);
      });
```

Onay düğmesi:

```tsx
        <Button type="button" size="fit" onClick={() => void confirm()}
                disabled={busy || !configured || failed}>
```

Ve harita kutusunun içinde, `configured` dalında `failed` ise not göster:

```tsx
        {configured && !failed ? (
          <div ref={box} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Note center>{t("map.notConfigured")}</Note>
          </div>
        )}
```

> Yeni i18n anahtarı YOK: `map.notConfigured` ("Harita bu ortamda yapılandırılmadı.") her iki
> durumu da doğru anlatıyor — kullanıcı için ikisi de "harita yok" demek.

- [ ] **Step 4: Koş**

Expected: PASS, **334 test** (333 + 1). `i18n:check` DEĞİŞMEZ.

---

### Task 5: `MidpointCard` çapalıda yan not basmaz (I3)

**Files:**
- Modify: `frontend/web/src/components/molecules/MidpointCard.tsx`
- Test: `frontend/web/src/components/molecules/MidpointCard.test.tsx`

- [ ] **Step 1: Önce testi yaz**

```tsx
  /** "Orta nokta {{name}} tarafinda" merkezin katilimcilardan TUREDIGINI soyler. Capalida
      merkez host'un sectigi sabit noktadir — bu cumle orada yalandir (spec K6 ile ayni sinif:
      capalida kiyas anlatan metinler susar). */
  it("çapalı oturumda 'orta nokta ... tarafında' notu basılmaz", () => {
    render(<MidpointCard view={{ ...anchoredView } as never} />);
    expect(screen.queryByText(/tarafında/)).not.toBeInTheDocument();
  });
```

> `anchoredView` fikstürünü dosyanın mevcut çapalı test fikstüründen al; `near` hesabının
> dolması için `participants` içinde CAR OLMAYAN bir `travelMode` taşıyan konumlu bir
> katılımcı bulunmalı, yoksa test uygulamadan ÖNCE de yeşil olur ve hiçbir şey tutmaz.
> Kırmızıyı gördükten sonra devam et.

- [ ] **Step 2: Kırmızı olduğunu gör**

Expected: FAIL — not basılıyor.

- [ ] **Step 3: Notu `anchored`e bağla**

```tsx
        {!anchored && near?.travelMode && near.travelMode !== "CAR" && (
```

- [ ] **Step 4: Dört kapıyı da koş**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto
pnpm exec tsc --noEmit -p frontend/web
bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm test:web'
bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm i18n:check'
bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm build:web'
```

Expected: tsc temiz · **335 passed (335)** · `tr 367 · en 375 · nl 375` (DEĞİŞMEZ) · built.

---

## Öz-inceleme notları

**Bulgu kapsaması:** B1+B2 → T3; I1 → T1; I2 → T4; I3 → T5; I4 → T2.

**Yeni i18n anahtarı yok** — dolayısıyla `i18n:check` sayıları değişmemeli. Değişiyorsa
yanlışlıkla bir anahtar eklenmiştir.

**T2 Step 3 (mutasyon) atlanamaz:** `requestedCenters` eklemek testi otomatik olarak
değerli yapmaz; merkezi bozup kırmızıyı görmeden kapının tuttuğu kanıtlanmış olmaz.

**T5'te fikstür uyarısı:** `sideNote` yalnız CAR olmayan bir yakın katılımcı varsa basılıyor.
Fikstür bunu sağlamazsa test uygulamadan önce de yeşil olur — bu yüzden Step 2'de kırmızıyı
görmek şart.

**Kapsam dışı (doğrulamadan kalan, bilinçli):** `MapPicker` cleanup'ının harita örneğini
sökmemesi (spec §9 R3 kapsam dışı ilan ediyor) · `markerRef`'in okunmaması · `originPresent`
alanının OpenAPI'ye sızması · `LikedList` çapa dalının testsizliği · `SoloSetupPage`
önizleme haritasının çapalıda hâlâ katılımcı centroid'i çizmesi.
