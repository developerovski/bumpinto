# design-sync — BumpInto repo notları

Hedef proje: `BumpInto Design System` (`projectId` config'te).
Kaynak: `frontend/web` (`@bumpinto/web`) — **yayınlanmış bir DS paketi değil**, Vite
uygulamasının içindeki bileşen kitaplığı. Aşağıdakiler bu gerçeğin sonucudur.

## Kurulum / çalıştırma

- Node **22** şart (`.nvmrc`). `pnpm` shim'i node 20'nin bin dizininde ve node 22 altında
  corepack ile patlıyor (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`). Çalışan yol:
  `node ~/.cache/node/corepack/v1/pnpm/11.4.0/bin/pnpm.cjs i --frozen-lockfile`
- `--node-modules` **repo kökünü** göstermeli (`./node_modules`). `pnpm-workspace.yaml`
  `nodeLinker: hoisted` kullanıyor; `frontend/web/node_modules` içinde yalnız `.bin` ve
  `@bumpinto/*` var, `react` orada yok.
- Playwright chromium macOS'ta `~/Library/Caches/ms-playwright` altına iniyor,
  `~/.cache/ms-playwright` altına DEĞİL. "Kurulu mu?" kontrolünü oraya bakarak yapma.

## Bu repoya özel kurulan parçalar (senkron bunlara dayanıyor)

- `frontend/web/src/components/index.ts` — 32 bileşeni adlandırılmış export olarak veren
  barrel. **Senkronun giriş noktası.** Bileşenler `export default` kullanıyor; converter'ın
  sentezlediği giriş `export *` ürettiği için default'lar düşerdi — barrel bu yüzden şart.
- `frontend/web/package.json` içindeki `"types": "src/components/index.ts"` — prop çıkarımı
  (ts-morph) tip girişini buradan buluyor. Bu alan silinirse `[ZERO_MATCH]` alırsın:
  `findTypesRoot` yalnız `pkgJson.types` / `build/ts` / `dist/types` / `types` / `lib` /
  `dist` sırasına bakıyor, hiçbiri yoksa bileşen listesi boş kalıyor.
- `.design-sync/ds-preview-context.tsx` — `BumpIntoProvider` + `bumpintoI18n`.
  32 bileşenin 15'i `useTranslation()` çağırıyor; context olmadan ham çeviri anahtarı
  basıyorlar. `cfg.extraEntries` ile bundle'a giriyor, `cfg.provider` ile her preview'ı
  sarıyor. **Adlandırılmış export olmak zorunda** — `extraEntries` `export * from` ile
  birleştiriliyor, default export'lar düşer.
- `.design-sync/ds-styles.css` + `.design-sync/build-css.sh` — `cfg.buildCmd`.
  Tailwind v4 utility CSS'i esbuild üretmez; reponun kendi Tailwind 4.3.3'ü ile
  derleniyor. Çıktı `frontend/web/.ds-css/ds-styles.css` (gitignore'da).
  - `--cwd` **`frontend/web`** olmalı. Repo kökü verilince Tailwind'in otomatik kaynak
    taraması backend/docs'u da tarayıp CSS'i 35 KB yerine 77 KB'a şişiriyor.
  - Preview'ların layout tutkalı için `@source "./previews"` bilinçli olarak var.

## Fontlar

Marka fontları (Bricolage Grotesque / Figtree / Caveat) uygulamada `index.html`'deki
Google Fonts `<link>` ile geliyor; repoda yerel `@font-face` veya woff2 YOK. `ds-styles.css`
aynısını `@import url(...)` ile yapıyor → validate `[FONT_REMOTE]` basıyor (bilgilendirme,
bloklamaz). Headless chromium'da fontların gerçekten uygulandığı görsel olarak doğrulandı.

## Bilinen render uyarıları (yeniden senkronda BEKLENİR, yeni değildir)

- `[FONT_REMOTE]` — yukarıdaki uzak font `@import`'u. Aksiyon yok.
- `[GRID_OVERFLOW]` — 4 bileşende `cfg.overrides.cardMode: "column"` ile çözüldü; bir daha çıkmamalı.
- `[DTS] parsed 0 .d.ts files` — beklenen: tip girişi `.d.ts` ağacı değil, TS kaynağı
  (`src/components/index.ts`). Prop çıkarımı yine de 32/32 çalışıyor.
- `docs: 0/32` — repoda bileşen başına doküman yok; `.prompt.md`'ler `.d.ts` + JSDoc +
  preview'lardan sentezleniyor. JSDoc'lar Türkçe ve zengin, bu yeterli.

## Re-sync riskleri

- **Repo Plan 8 (tailwind + i18n) migrasyonunun ortasındayken senkronlandı** ve o
  değişiklikler o an commit EDİLMEMİŞTİ (staged). Bir sonraki senkronda bileşen kaynakları
  bu koşuda görülenden farklı olabilir — `.sync-diff.json`'ın `changed` bölümü büyük çıkarsa
  sebebi budur, panik yok.
- `cfg.entry` barrel'a bağlı. Yeni bir bileşen eklenir ama `index.ts`'e yazılmazsa
  senkron onu sessizce atlar. **Bileşen eklerken barrel'ı güncelle.**
- Fontlar ağdan geliyor. Render ortamı dış istekleri engellerse bütün kartlar yedek fontla
  çıkar ve bunu hiçbir kontrol yakalamaz — kartlara gözle bak. Kalıcı çözüm gerekirse
  woff2'leri repoya indirip `cfg.extraFonts`'a bağla (fontlar OFL, dağıtımı serbest).
- `.ds-css/` ve `ds-bundle/` gitignore'da; taze klonda önce `sh .design-sync/build-css.sh`
  çalıştır, yoksa `[CSS_*]` hataları alırsın.
- i18n dili preview'larda `tr`'ye sabit (`ds-preview-context.tsx`). Ürünün varsayılanı bu.
  Kartlarda İngilizce metin isteniyorsa değiştirilecek tek yer orası.

---

# Preview yazımı — wave notları (2026-09-01, ilk senkron)

32 bileşenin hepsi elle yazılmış preview'a sahip (`.design-sync/previews/`), toplam 91 hücre.
Yazım 5 paralel ajanla yapıldı; aşağısı o turun kalıcı çıktısı.

## ⚠️ EN ÖNEMLİ TUZAK: CSS bayatlaması

`cfg.buildCmd` **converter tarafından çalıştırılmıyor** — sadece bir config notu, koşacak
olan sensin. `preview-rebuild.mjs` de kendi başlığında yazdığı gibi `styles.css`/
`_ds_bundle.css`'e dokunmuyor. Sonuç: `ds-styles.css`'teki `@source "./previews"` ancak
`build-css.sh` yeniden koşarsa etkili olur.

**Bunun anlamı: bir preview'ın soktuğu, `frontend/web/src` içinde hiç geçmeyen her Tailwind
sınıfı sessizce hiçbir şey yapmaz.** Kart makul görünür ama yanlış render olur. İlk turda
tam olarak bu oldu: `bg-paper`, `gap-[0.9375rem]`, `max-w-[27.75rem]`, `h-[25rem]`,
`transform-[rotate(...)]`, `z-1/z-2` derlenmemişti ve beş ajanın da çekimleri etkilendi.

**Kural: preview yazımı bittikten sonra, çekim yapmadan ÖNCE `sh .design-sync/build-css.sh`
koş, sonra tam `package-build.mjs`.** Paralel ajanlar varken bunu ortada yapma — yarışır.

## Çekim ortamının sınırları

- Görüntü alanı sabit **900×700, `fullPage: false`** — uzun hücreler kaydırılmaz, **kırpılır**.
  Kart html'inin 24px gövde dolgusu ve 16px çerçeve düşünce hücre başına
  **~620px içerik** bütçesi kalıyor.
- `?story=` tek hikâyeyi 900px genişlikte basıyor. Gerçek ürün kolonu 480px
  (`Page`: `max-w-[30rem]` + `px-[1.125rem]` → 27.75rem içerik). **Gerçek ebeveyni `Page`
  olan her bileşenin preview'ı bu geometriyi tekrar eden bir sarmalayıcıya ihtiyaç duyar**,
  yoksa 852px'e yayılır ve inandırıcılığını kaybeder.
- `.ds-cell` / `.ds-single` ikisi de `transform: translateZ(0)` taşıyor, yani mutlak
  konumlu süsleme hücreden kaçmıyor, içinde kalıyor.
- 4 bileşen ürün kartını taşıyordu → `cfg.overrides` ile `cardMode: "column"`:
  `ParticipantRow`, `VenueCard`, `VenueCheckRow`, `WinnerCard`.

## Preview yazarken işe yarayan teknikler

- `import { useEffect, useRef } from "react"` preview'larda çalışıyor (`reactShim` `react`'i
  bundle'ın kullandığı `window.React`'e bağlıyor). Tip-only import'lar da sorunsuz.
- **İçsel state'i olan bileşenler**: `RunoffList`'in `selected`'ı prop değil, yerel `useState`.
  Mount'ta gerçek tıklama ile sürülüyor
  (`ref.current.querySelectorAll("button[aria-pressed]")[n].click()` bir `useEffect` içinde).
  Markup taklit edilmiyor, bileşenin kendi `onClick`'i koşuyor.
- `VenueDeck` `useDeckStore` modül singleton'ını okuyor; her hücre kendi sayfa yüklemesi
  olduğu için `index` hep 0. Statik olarak tek eksen mekan dizisinin uzunluğu.
- `travelMinutes` katılımcı UUID'siyle anahtarlı, `travelLabels` aynı UUID'leri etikete
  eşliyor. **İkisi aynı anahtarı kullanmazsa** rozet `deck.travelFallback` ("Yol")'a düşer.
- `VenueCard.deckOrder % 3` ortam gradyanını seçiyor (0 sıcak, 1 yeşil, 2 mor) ve `row`
  varyantının ±2° eğimini çeviriyor.
- `photoUrl` her yerde bilerek boş: repoda yerel görsel yok, dış URL sandbox'ta yüklenmez,
  ve boş hâl "foto · Places" rozetinin doğru şekilde görünmediği tek durum.
- `Confetti`'nin kendi kutusu yok — üç mutlak konumlu span. **Konumlanmış, paper zeminli bir
  sayfa sarmalayıcısı olmadan boş beyaz üstünde üç zerreye düşer.** Preview'ı gerçek
  `ResultScreen` çerçevesini taşıyor; yeniden üretilirse bu sarmalayıcı korunmalı.

## Statik render edilemeyen, bilinçli atlanan hâller

- `VenueDeck` kaydırma/sürükleme/çıkış animasyonu (`decide`/`undo` `api.swipe`'a gider).
- `RunoffList` "kilitli" hâli — yalnız `api.runoffVote` çözüldükten sonra erişilebilir,
  harness'ta backend yok. Taklit edilmedi, kayda geçti.
- Hover / focus-visible / basılı hâller (`LinkButton`, `TextInput`, `DeckActions`).
- `ParticipantList`'te "(sen)" satırı — aşağıdaki mimari boşluk.

## Üründe bulunan boşluklar (senkron kusuru DEĞİL — ürün kararı)

- **`TextInput`'ün `disabled` stili yok.** `Button`'da `disabled:opacity-45` var, `TextInput`'te
  yok ve `app.css`'te `input:disabled` kuralı da yok; yazar utility'leri (`bg-card`/`text-ink`)
  tarayıcının varsayılan disabled görünümünü eziyor. Devre dışı input dolu input'tan
  ayırt edilemiyor. Aynı boşluk `aria-invalid` için de geçerli — `Field` prop'u geçiriyor,
  hiçbir şey stillemiyor.
- **`LinkButton`'da `shape` prop'u yok**, yani her örneği tam genişlik metin pill'i; DS kural 1
  gradyan üstüne metin koymayı yasakladığı için `kind="grad"` bu bileşende kullanılamaz.
  Taraması bilinçli olarak 2 `kind` × 2 `size`.
- **`useSessionStore` barrel'dan export edilmiyor.** `ParticipantList` `isSelf`'i ve kendi
  satırının konum alt yazısını o store'dan türetiyor, dolayısıyla preview'da `self` hep `null`
  ve liste kartı "(sen)" işaretini gösteremiyor. Affordance `ParticipantRow`'un `Self`
  hücresinde belgeleniyor (o molekül `isSelf`'i prop olarak alıyor). Alternatif: store'ları
  barrel'a eklemek.
- **`Badge` ton semantiği**: brief "flame = yol süresi" varsaymıştı; gerçekte `VenueCard`
  yol rozetlerini varsayılan `neutral` ile basıyor. `violet` tonunun üründe hiç kullanımı yok.

## `.d.ts` çıkarımının sınırı

ts-morph çıkarımı **nullability'yi düşürüyor** (`string | null` → `string`) ve paket dışı tip
adlarını çözemiyor. İki bileşende sözleşme gerçekten bozuktu, `cfg.dtsPropsFor` ile elle
yazıldı: `JoinedCard` (`self: Self` — `Self` hiç import edilmiyordu) ve `JoinFormFields`
(`FormEvent` tanımsız + iki nullable prop). **Bu iki gövde elle bakımlı — bileşenin propları
değişirse config'i güncelle.** `ParticipantRow.locationLabel` hâlâ `string | null` yerine
`string` diyor; bozuk değil, yalnız gevşek, bilerek elle yazılmadı.

## Yeniden notlandırma turunda çıkan ürün gözlemleri

Aşağısı senkron kusuru değil, kartlarda görünen ürün gerçekleri. Bir dahaki turda
"yeni bulgu" sanılmasın diye kayda geçiyor.

- **`ErrorText` token dışı renk kullanıyor** — `text-[#c0392b]` (tuğla kırmızısı) gömülü;
  `--color-flame-deep` marka kırmızısı değil. DS'te token disiplininin dışında kalan tek renk.
- **`WinnerCard` çıkartması `Highlight` ile çakışıyor** — mekan adı ikinci satıra taştığında
  "Karar verildi!" çıkartmasının sol üst köşesi arkadaki sarı `Highlight` bandına değiyor.
  Sarı üstüne sarı; hiçbir glif örtülmüyor ama iki şekil birbirine giriyor.
- **`VenueCheckRow` yerel `<input type="checkbox">` kullanıyor** — DS yalnız `accent-flame-deep`
  rengini veriyor, kutu şekli işletim sisteminin. Özel bir kontrol yok.
- **`VenueDeck` / `WithoutTravelBadges`**: rozetler kalkınca ön kart kısalıyor ama D2/D3 sabit
  yükseklikte (`h-[25rem]` / `h-[24.375rem]`), bu yüzden arka katmanlar altta kalın bir kama
  olarak taşıyor. Bileşenin kendi geometrisi; kısa ön kartla gerçekten böyle görünüyor.
- **`Progress` / `TextInput` / `LinkButton` kartta tam genişlikte render oluyor** —
  `cardMode: "column"` verilmedi. Bunlar genişliği kapsayıcıdan alan `w-full` primitifleri ve
  `[GRID_OVERFLOW]` onları işaretlemiyor. Bilinçli tercih, düzeltilecek bir şey değil.
- **`Confetti` preview'ı `ViralCard`'ı bilerek dışarıda bırakıyor** — tam W4 ekranı 700px
  çekim görüntü alanını aşıyor ve alt kısmı kırpılıyordu.
- `.design-sync/previews/RunoffList.tsx` içindeki bir yorum, finalist *kartlarının* eğildiğini
  söylüyor; gerçekte `VenueCard` `row` varyantında eğim yalnız 74px küçük görsele uygulanıyor.
  Render doğru, yorum abartıyor.

## Bir sonraki koşu için hızlı reçete

```sh
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22
node ~/.cache/node/corepack/v1/pnpm/11.4.0/bin/pnpm.cjs i --frozen-lockfile   # taze klonda
mkdir -p .ds-sync && cp -r "<skill-base>"/package-*.mjs "<skill-base>"/resync.mjs \
  "<skill-base>"/lib "<skill-base>"/storybook .ds-sync/
echo '{"name":"ds-sync-deps","private":true}' > .ds-sync/package.json
(cd .ds-sync && npm i esbuild ts-morph @types/react playwright)
ln -sfn ../.ds-sync/node_modules .design-sync/node_modules   # overrides/dts.mjs forku için ŞART
sh .design-sync/build-css.sh                                  # CSS'i ÖNCE derle
# projeden _ds_sync.json'ı .design-sync/.cache/remote-sync.json'a çek, sonra:
node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules \
  --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json
```

`.ds-sync/` gitignore'da ama **geniş bir `git add` onu index'e sokabiliyor** — ilk senkronda
tam olarak bu oldu (8500 satır vendored script sahnelendi). Commit öncesi
`git diff --cached --name-only` ile bak.

## Kalıcı set (commit edilen)

`.design-sync/`: `config.json`, `NOTES.md`, `conventions.md`, `previews/` (32 dosya),
`overrides/dts.mjs`, `ds-preview-context.tsx`, `ds-styles.css`, `build-css.sh`.
Repo tarafı: `frontend/web/src/components/index.ts`, `frontend/web/package.json#types`,
`.gitignore` girdileri.
