# Faz A — Çapalı oturumda "Mekanları bul" kapıları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Çapalı bir oturumda host, hiç kimse konum paylaşmamış olsa bile "Mekanları bul"a
basabilsin — bugün basamıyor ve oturum `COLLECTING`'de kilitli kalıyor.

**Architecture:** Saf hata düzeltmesi, yeni tasarım yok. B-10 backend'de `find-venues`
önkoşulunu çapalı oturumda kaldırdı (`DeckFlow.findVenues` artık `SessionCenter.of(...)` null
mı diye bakıyor ve çapa varsa asla null olmuyor), ama o ucu açan **web kapıları** eski
varsayımda kaldı. İki düğme `view.anchored`'ı okuyacak. Backend'e, i18n'e, API sözleşmesine
dokunulmaz.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library.

**Kaynak spec:** [2026-09-05-anchored-session-design.md](../specs/2026-09-05-anchored-session-design.md)
§2 K1 — *"Çapalı modda katılımcı konumu isteğe bağlı."*

---

## Bu düzeltme neyi kapatır, neyi kapatmaz

**Kapatır:** Çapalı + konumsuz oturum artık `COLLECTING`'de kilitli kalmaz; host deste
kurabilir ve `VenuesPage`'ten "Bunu seç" ile karara varabilir.

**KAPATMAZ (Faz B):** Grup kaydırma akışı hâlâ kapalı — `DeckFlow.shuffle` konumu olan ≥2
katılımcı istiyor (`votingPopulation`) ve `requireDeckParticipant` konumsuz kişinin
kaydırmasını engelliyor. Bu ikisi `DecisionEngine`'in girdisini de değiştirdiği için ayrı bir
tasarım kararı gerektirir ve bu planın **kapsamı dışındadır**.

---

## Doğrulanmış zemin

- İki sayfa da `view: SessionView` alıyor → `view.anchored` doğrudan elde
  (`api-types.ts:432`, W-G1 codegen'iyle geldi, `anchored?: boolean`).
- İzlenecek desen **zaten yazılı**: `NewSessionPage.tsx:243`
  `disabled={busy || submitting || (anchorMode !== "ANCHOR" && count < 2)}` ve hemen altındaki
  yorum — *"Not, düğmeyle AYNI kapıya bağlı: çapalı modda iki nokta şartı düştüğü için
  'En az 2 konum gerekir.' açık bir düğmenin altında yalan olurdu."*
- `lobby.late` notuna DOKUNULMAZ: metni *"{{name}} yetişemezse sonradan katılır, sorun olmaz."*
  — güven verici, çapalı modda da doğru.

**Başlangıç referansı:** 322 test / 56 dosya · `tr 366 · en 374 · nl 374` · `tsc` temiz ·
`build:web` ok.

**Beklenen test yolu:** 322 → **323** (T1) → **325** (T2). i18n **değişmez**.

---

## Dosya haritası

**Değişecek**
- `frontend/web/src/pages/LobbyPage.tsx:93` — GROUP host kapısı
- `frontend/web/src/pages/LobbyPage.test.tsx` — +1 test
- `frontend/web/src/pages/SoloSetupPage.tsx:78-80` — SOLO host kapısı + not
- `frontend/web/src/pages/SoloSetupPage.test.tsx` — +2 test

**Dokunulmaz:** backend, i18n locale dosyaları, `NewSessionPage` (zaten doğru), Bruno.

---

### Task 1: `LobbyPage` kapısı

**Files:**
- Modify: `frontend/web/src/pages/LobbyPage.tsx:93`
- Test: `frontend/web/src/pages/LobbyPage.test.tsx`

- [ ] **Step 1: Önce kırılan testi yaz** (`LobbyPage.test.tsx`, `describe` bloğunun sonuna,
  son `it`'ten sonra)

Dosyanın üstündeki `base`, `host`, `kerem` sabitleri ZATEN VAR; yeniden tanımlama. `kerem`
konumsuz (`hasLocation: false`), yani bu görünümde `located === 0`.

```tsx
  /** B-10 çapalı oturumda `find-venues` önkoşulunu kaldırdı (DeckFlow.findVenues artık
      SessionCenter.of null mı diye bakar ve çapa varsa asla null olmaz). Kapı bunu bilmezse
      oturum COLLECTING'de kilitli kalır: backend kabul eder, düğme basılamaz. */
  it("çapalı oturumda hiç konum olmasa da CTA açık", () => {
    const view = { ...base, anchored: true, participants: [kerem] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeEnabled();
  });
```

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm test:web'`
Expected: FAIL — `çapalı oturumda hiç konum olmasa da CTA açık` düşer,
`expect(element).toBeEnabled()` ... `element is disabled`. Diğer testler yeşil kalır.

> Yalnız bu tek testin kırmızı olduğunu doğrula. Başka bir test de kırmızıysa DUR.

- [ ] **Step 3: Kapıyı düzelt**

`LobbyPage.tsx:93` satırını şu hâle getir:

```tsx
            {/* Çapalı oturumda merkez katılımcılardan türemez, bu yüzden backend'in konum
                önkoşulu B-10'da DÜŞTÜ (DeckFlow.findVenues). Kapı da bilmeli — yoksa backend
                kabul ederken düğme kapalı kalır ve oturum COLLECTING'de asılı kalır. */}
            <Button
              onClick={() => void run(findVenues, "lobby.errFind")}
              disabled={(!view.anchored && located < 2) || busy}
            >
              {t("newSession.findVenues")}
            </Button>
```

- [ ] **Step 4: Yeşil olduğunu gör**

Run: `bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm test:web'`
Expected: PASS, **323 test** (322 + 1). `LobbyPage.test.tsx` 5 test.

> Mevcut `"1 konum: CTA kapalı"` testi hâlâ YEŞİL olmalı — çapasız davranış değişmedi.
> Kırmızıysa `!view.anchored` yerine yanlış bir koşul yazılmıştır.

- [ ] **Step 5: Commit**

```
fix(web): lobby find-venues gate ignored the anchor

B-10 dropped the "2 located participants" precondition for anchored
sessions on the server, but the button that calls it kept the old gate,
so an anchored session with no shared locations hung in COLLECTING.
```

---

### Task 2: `SoloSetupPage` kapısı ve notu

**Files:**
- Modify: `frontend/web/src/pages/SoloSetupPage.tsx:78-80`
- Test: `frontend/web/src/pages/SoloSetupPage.test.tsx`

Bu ekran bir **kurtarma** yoludur: `newSessionStore.ts:107-109` oturum kurulduktan sonra
`findVenues` patlarsa hatayı yutup buraya düşürüyor (`// oturum kuruldu; eksikler SoloSetup
ekranında sunucu durumundan görülür`). Kapı çapayı bilmezse çapalı SOLO host burada kilitli
kalır.

- [ ] **Step 1: Önce kırılan iki testi yaz** (`SoloSetupPage.test.tsx`, `describe` sonuna)

Dosyanın üstündeki `view` sabiti konumlu bir host içeriyor; çapalı senaryo için konumsuz host
gerekiyor, o yüzden ayrı bir sabit kuruluyor (mevcut `view`'ı DEĞİŞTİRME — diğer üç test ona
bağlı).

```tsx
  /** Çapalı SOLO: host konum vermemiş, elle nokta yok. Backend bu oturumda find-venues'u
      KABUL EDER (SessionCenter.of çapa varsa asla null dönmez), dolayısıyla düğme açık olmalı. */
  const anchoredView = {
    ...view,
    anchored: true,
    participants: [
      { id: "h", displayName: "Mehmet", host: true, hasLocation: false, manual: false },
    ],
  } as const;

  it("çapalı oturumda hiç konum olmasa da CTA açık", () => {
    useSessionStore.setState({ slug: "s9k2m", view: anchoredView as never });
    render(<SoloSetupPage view={anchoredView as never} />);
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeEnabled();
  });

  /** Not düğmeyle AYNI kapıya bağlı olmalı: açık bir düğmenin altında "En az 2 konum
      gerekir." yazmak yalandır (NewSessionPage.tsx:245 aynı gerekçeyi taşıyor). */
  it("çapalı oturumda 'en az 2 konum' notu basılmaz", () => {
    useSessionStore.setState({ slug: "s9k2m", view: anchoredView as never });
    render(<SoloSetupPage view={anchoredView as never} />);
    expect(screen.queryByText("En az 2 konum gerekir.")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm test:web'`
Expected: FAIL — İKİSİ de düşer: birincisi `element is disabled`, ikincisi
`expected element not to be in the document` ("En az 2 konum gerekir." basılıyor).

- [ ] **Step 3: Kapıyı ve notu düzelt**

`SoloSetupPage.tsx`'te `<Button ...>` ve altındaki `<Note>` satırlarını şu hâle getir:

```tsx
            {/* Çapalı oturumda konum önkoşulu B-10'da düştü (DeckFlow.findVenues). */}
            <Button
              onClick={() => void run(findVenues, "lobby.errFind")}
              disabled={(!view.anchored && count < 2) || busy}
            >
              {t("newSession.findVenues")}
            </Button>
            {/* Not, düğmeyle AYNI kapıya bağlı: açık bir düğmenin altında "En az 2 konum
                gerekir." yalan olurdu. */}
            {!view.anchored && (
              <Note>{count < 2 ? t("newSession.needTwo") : t("newSession.findHint", { count })}</Note>
            )}
```

- [ ] **Step 4: Yeşil olduğunu gör**

Run: `bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm test:web'`
Expected: PASS, **325 test** (323 + 2). `SoloSetupPage.test.tsx` 5 test.

> Mevcut `"host konumlu, manuel nokta yok: ... 1 / en az 2, CTA kapalı"` testi hâlâ YEŞİL
> olmalı — çapasız davranış değişmedi.

- [ ] **Step 5: Dört kapıyı da koş**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto
pnpm exec tsc --noEmit -p frontend/web
bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm test:web'
bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm i18n:check'
bash -lc 'source ./init-nvm.sh >/dev/null 2>&1 && pnpm build:web'
```

Expected:
- `tsc` → "TypeScript: No errors found"
- `test:web` → **Tests 325 passed (325)** · Test Files 56 passed (56)
- `i18n:check` → **tr 366 · en 374 · nl 374** (DEĞİŞMEDİ — yeni anahtar eklenmedi)
- `build:web` → built

> `pnpm` çağrılarında `bash -lc 'source ./init-nvm.sh ...'` öneki ZORUNLU: varsayılan node v20,
> repo v22 istiyor (`.nvmrc`). Öneksiz çağrı `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` verir ve
> bu senin kodunla ilgili değildir. `pnpm exec tsc` istisna, öneksiz de çalışır.

> **Flake uyarısı:** soğuk başlangıçta 1-2 test zaman aşımına düşebiliyor (ilk koşu ~120 sn,
> sonrakiler ~19 sn). Kırmızı görürsen bir kez daha koş; ikinci koşuda da kırmızıysa gerçektir.

- [ ] **Step 6: Commit**

```
fix(web): solo setup find-venues gate ignored the anchor

Same gate as the lobby, on the recovery screen a failed post-create
find-venues drops into. The "at least 2 locations" note is bound to the
same condition — under an enabled button it would be a lie.
```

---

## Öz-inceleme notları

**Spec kapsaması:** §2 K1 (*"çapalı modda katılımcı konumu isteğe bağlı"*) → T1 + T2. Bu planın
kapsadığı tek spec maddesi budur.

**Bilerek kapsam dışı bırakılanlar:**
- `DeckFlow.shuffle` konum kapısı ve `requireDeckParticipant` — Faz B; `DecisionEngine`
  girdisini değiştirdiği için tasarım kararı gerektirir.
- `lobby.late` notu — metni çapalı modda da doğru, dokunulmadı.
- `NewSessionPage` — kapısı zaten `anchorMode`'a bağlı, doğru.

**Tip tutarlılığı:** `view.anchored` her iki dosyada da aynı ad ve tiple okunuyor
(`boolean | undefined`); `!view.anchored` `undefined` için `true` verir → çapasız davranış
korunur, bu bilinçli.

**Yeni anahtar yok**, dolayısıyla `i18n:check` sayıları değişmemeli. Değişiyorsa bir anahtar
yanlışlıkla eklenmiştir.
