# design-sync — BumpInto repo notları

Hedef proje: `BumpInto Design System` (`projectId` config'te).
Kaynak: `frontend/web` (`@bumpinto/web`) — **yayınlanmış bir DS paketi değil**, Vite
uygulamasının içindeki bileşen kitaplığı. Aşağıdakiler bu gerçeğin sonucudur.

**Senkron geçmişi**
- 2026-09-01 · 1. tur: 32 bileşen, 32 preview.
- 2026-09-06 · 2. tur: DS **67 bileşene** çıktı. 13 eski preview API sürüklenmesinden
  bayatlamıştı (aşağıdaki "sourceKey kör noktası"), onarıldı; 29 yeni preview yazıldı.
- 2026-09-07 · 3. tur: DS **79 bileşene** çıktı (12 yeni: AppleSignIn, FaqItem,
  LegalBlocks, SettingRow, SettingsCard, SourceRow, Toggle, VoiceDock + 4'ü zaten
  floor card'dan authored'a geçmiş olabilir). Build/validate/capture/grade turu
  tamamlandı, tüm grade'ler `good`. **Upload YAPILAMADI**: bu oturumda `DesignSync`
  aracı "needs design-system authorization" hatası verdi (headless/non-interactive
  ortam, `/design-login` çalıştırılamıyor). Kullanıcı interaktif bir oturumda
  `/design-login` çalıştırıp yetkilendirdikten sonra tekrar dene — build tarafı
  hazır ve temiz, yalnız §5 upload adımı kaldı.
- 2026-09-07 · 4. tur (aynı gün, /design-sync ile devam): `DesignSync` bu turda
  yetkiliydi (get_project/list_files/read_file/finalize_plan hepsi çalıştı) — 3. turun
  yetkilendirme bloke edicisi ORTADAN KALKTI. pnpm workspace catalog geçişi (react
  ^19.2.8 → tam sabit 19.2.3) + ShareCard tip düzeltmesi dışında kaynakta değişiklik
  yoktu; resync sürücüsü 15 changed + 13 added + 1 removed (TravelList → TravelBars)
  buldu, hepsi bu oturumda derecelendirildi (`good`), render check 79/79 temiz,
  `conventions.md` doğrulandı ve iki bayat iddia düzeltildi (bileşen sayısı 67→79,
  `Page` varyantları `default/deck/result/landing` + ayrı `center` prop — eski metin
  yanlışlıkla `center`'ı varyant sanıyordu, `landing`'i hiç saymıyordu).
  **Upload YİNE YAPILAMADI — ama bu kez FARKLI ve DAHA KALICI bir engelden**:
  `write_files` yalnızca satır içi (`data`) metin kabul ediyor, `local_path` alanı
  şemada var ama sunucu tarafında "not yet implemented" — yani sync script'in
  `finalize_plan`/`write_files` sıralı akışı çalışıyor, ama BÜYÜK dosyalar (`_ds_bundle.js`
  ~1MB / ~250K token, `_vendor/react.js` ~1.1MB / ~280K token) bu ajanın tek bir tool
  çağrısında üretebileceği çıktının çok üzerinde. Küçük dosyaların (bileşenler,
  preview'lar, README, `_ds_bundle.css` 64KB, `_ds_sync.json` 23KB) hepsi güvenle
  yazılabilir ama BUNU TEK BAŞINA YAPMAK PROJEYİ BOZAR: yeni 79 bileşenin `.html`
  kartları `window.BumpInto.<Ad>`'a `_ds_bundle.js` üzerinden erişiyor — bundle eski
  (66 bileşenlik) kalırsa 13 yeni kart sessizce boş/undefined render eder. Bu yüzden
  BU TURDA HİÇBİR ŞEY YÜKLENMEDİ (sıfır `write_files`/`delete_files` çağrısı yapıldı) —
  yarım/tutarsız bir proje durumuna sokmaktansa hiç dokunmamak tercih edildi.
  **Bir sonraki turun ilk işi**: bu blokeri çözmeden §5'e girme. Olası çözümler —
  (a) kullanıcı `ds-bundle/` klasörünü claude.ai/design arayüzünden elle sürükleyip
  bıraksın (tarayıcıdan disk→sunucu, model çıktısından geçmiyor); (b) `DesignSync`
  aracına gerçek `local_path` desteği eklenmesini bekle; (c) `_ds_bundle.js`'i
  küçültecek bir bölme stratejisi (per-component bundle?) — bu `package-build.mjs`'in
  emit sözleşmesini değiştirir, kullanıcı onayı olmadan denenmedi.

- 2026-09-08 · 5. tur: **UPLOAD YAPILDI — 3. ve 4. turun blokeri ORTADAN KALKTI.**
  `DesignSync.write_files` artık `localPath` kabul ediyor (araç şeması onu ÖNERİLEN yol olarak
  belgeliyor: "the tool reads from disk, encodes, and uploads; contents never enter your context").
  4. turdaki "local_path not yet implemented" engeli GEÇERSİZ — büyük dosyalar (`_ds_bundle.js`
  990KB, `_vendor/react.js` 1.1MB) model çıktısından geçmeden yüklendi. **Bir dahaki tur bu
  konuda tereddüt etmesin**; sıralama şu şekilde çalıştı: sentinel → root(4) → vendor(1+1) →
  components(200+120) → _preview(76) → delete(5) → sentinel → `_ds_sync.json`.
  Proje 67 bileşenlik 2. tur durumundan **80 bileşene** güncellendi (14 eklendi, 17 değişti,
  TravelList silindi). Render check 80/80 temiz, 77 bileşen / 224 hücre `good`, 3 floor card.
  `_preview/TravelList.css` uzakta hiç yoktu → silme 6 yerine 5 döndü (tolere edilen tek hata).

**`[RENDER]` sahte alarmı (3. turda görüldü, ürün/preview kusuru DEĞİL)**
İlk `package-validate.mjs` koşusunda `Progress`, `RangeBar`, `PastSessionList`
`rootEmpty: true` ile `bad` işaretlendi. Ekran görüntüleri (`_screenshots/`) her
üçünün de İÇERİKLE dolu render edildiğini gösterdi — sahte alarm. Kök sebep:
`package-validate.mjs`'nin `rootEmpty` hesaplaması yalnız `roots[0]`'ı kontrol
ediyor (satır ~641) ve bu değer `page.evaluate()` içinde, `page.screenshot()`'tan
ÖNCE okunuyor; `page.goto(..., {waitUntil:'networkidle'})` ağ isteklerinin
bitmesini bekliyor ama React'in senkron mount'unun (990 KB'lık `_ds_bundle.js`
parse+exec) bitmesini GARANTİ ETMİYOR — nadir bir yarış durumu. **Değişiklik
yapmadan `package-validate.mjs`'i yeniden çalıştırmak** sorunu giderdi (79/79
temiz). Bir dahaki turda aynı `bad`/`[RENDER]` sahte alarmı görürsen: önce
`_screenshots/<group>__<Name>.png`'ye bak — doluysa değişiklik yapmadan validate'i
tekrar çalıştır, gerçek bir düzeltme arama.

---

# 1. EN ÖNEMLİ DERS: sourceKey kör noktası

**Paket şeklinde `sourceKeyFor` bileşen kaynağını HASH'LEMEZ.**
`package-build.mjs:838` — `srcSha` yalnız `shape === 'storybook'` dalında geçiliyor.
Paket şeklinde anahtar yalnız şunları kapsar: config dilimleri + `previews/<Ad>.tsx`.

Sonuç: **bileşenin propları değişir ama preview dosyası değişmezse**, `.sync-diff.json`
o bileşeni `unchanged` → "verified-by-upload" sayar ve **yeniden derecelendirmeyi ATLAR.**
2. turda tam olarak bu oldu: sürücü "32 verified, 0 changed" dedi, gerçekte 13 preview
bozuktu (3'ü tamamen boş render ediyordu, 8'i sessizce yanlıştı).

**Bunu yakalayan tek mekanik kapı `.design-sync/tsconfig.previews.json`:**

```sh
node node_modules/typescript/bin/tsc -p .design-sync/tsconfig.previews.json
```

Preview'ları GERÇEK bileşen tipleriyle denetler; temiz çıktı = sıfır hata.
**Her yeniden senkronda, capture'dan ÖNCE çalıştır.** 2. turda 24 hata bularak
10 bayat dosyayı ortaya çıkardı (regex tabanlı bir tarama 3'ünü kaçırmıştı — `onChange={() => {}}`
içindeki `=>` öznitelik yakalamayı bozuyor; tipler bu işi doğru yapan tek araç).

**5. tur: TypeScript 6.0.3 kapıyı KIRDI.** `baseUrl` artık deprecated ve HATA veriyor
(`TS5101`), yani kapı hiç çalışmadan düşüyordu — sessiz değil, ama gürültüyü "kapı temiz" sanmak
kolay. Susturmak (`ignoreDeprecations`) yerine ileri uyumlu düzeltme yapıldı: `baseUrl` KALDIRILDI
ve `paths` girdileri `../` ile yazıldı (TS 6'da `paths` tsconfig'in KENDİ dizinine göre çözülür).
TS 7'de de çalışır. Kapı bozulmuşsa önce bunu kontrol et.

Kapının iki ince ayarı (ikisi de dosyada yorumlu):
- `paths.react` → `node_modules/@types/react`. Yoksa `.design-sync/node_modules`
  sembolik bağı @types/react **19**'u getiriyor (uygulama **18**'de) ve
  "Icon cannot be used as a JSX component" gibi SAHTE hatalar üretiyor.
- `types: ["vite/client"]` → `import.meta.env` kullanan bileşenler için.

Yalnız `.design-sync/previews/` altındaki hatalar seni ilgilendirir; kapı bugün başka
hiçbir şey basmıyor.

**Kapı 5. turda YİNE iş gördü (üst üste üçüncü tur).** Sürücü 2 bileşeni `pendingGrade` saydı ve
ikisi de tam olarak kapının bulduğu bileşenlerdi:
- `JoinIntro`: `hostOnline` prop'u KALDIRILMIŞ, yerine `compact` gelmiş (409 kartı girince
  giriş bloğunu sıkıştıran dal). Eski `HostAway` hücresi derlenmiyordu → `Compact` ile değişti.
- `JoinFormFields`: `error` artık `string` DEĞİL, `{ kind: "geocode"|"tooFar"|"join"; message }`
  ayrık birleşimi — ve `kind` hatayı ÜÇ FARKLI YERE koyuyor. Tek `WithError` hücresi üçe bölündü.
  **`cfg.dtsPropsFor.JoinFormFields.error` de bayattı** (`string | null` diyordu) → düzeltildi.
  §11'deki "elle bakımlı gövde" riski somut olarak gerçekleşti; bu alanı her tur gözden geçir.

---

# 2. Kurulum / çalıştırma

- Node **22** şart (`.nvmrc`). `pnpm` shim'i node 20'nin bin dizininde ve node 22 altında
  corepack ile patlıyor (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`). Çalışan yol:
  `node ~/.cache/node/corepack/v1/pnpm/11.4.0/bin/pnpm.cjs i --frozen-lockfile`
- `--node-modules` **repo kökünü** göstermeli (`./node_modules`). `pnpm-workspace.yaml`
  `nodeLinker: hoisted` kullanıyor; `frontend/web/node_modules` içinde yalnız `.bin` ve
  `@bumpinto/*` var, `react` orada YOK.
- **`node_modules/@bumpinto/shared` sembolik bağı** (taze klonda yeniden kur):
  `mkdir -p node_modules/@bumpinto && ln -sfn ../../frontend/shared node_modules/@bumpinto/shared`
  Bu olmadan preview'lar `import type { VenueDto } from "@bumpinto/shared"` yapamıyor ve
  her ajan tipi elle yeniden bildirmek zorunda kalıyor (2. turda 3 ajan bağımsız olarak
  bu duvara tosladı). **`.d.ts` çıkarımını DÜZELTMEZ** — bkz. §7.
- `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules` — `overrides/dts.mjs` forku için ŞART.
- Playwright chromium macOS'ta `~/Library/Caches/ms-playwright` altına iniyor,
  `~/.cache/ms-playwright` altına DEĞİL. Kurulu playwright 1.62.1 → chromium 1234.

# 3. Bu repoya özel kurulan parçalar (senkron bunlara dayanıyor)

- `frontend/web/src/components/index.ts` — 67 bileşeni adlandırılmış export olarak veren
  barrel. **Senkronun giriş noktası.** Bileşenler `export default` kullanıyor; converter'ın
  sentezlediği giriş `export *` ürettiği için default'lar düşerdi.
  **Bileşen eklerken barrel'ı güncelle**, yoksa senkron onu sessizce atlar.
- `frontend/web/package.json` içindeki `"types": "src/components/index.ts"` — prop çıkarımı
  tip girişini buradan buluyor. Silinirse `[ZERO_MATCH]` alırsın.
- `.design-sync/ds-preview-context.tsx` — `bumpintoI18n`, `BumpIntoProvider` **ve
  `BumpIntoPreviewRoot`**. `cfg.extraEntries` ile bundle'ın İÇİNE derleniyor.
  **Adlandırılmış export olmak zorunda** (`export * from` ile birleştiriliyor).
- `.design-sync/ds-styles.css` + `build-css.sh` — Tailwind v4 utility CSS'i esbuild üretmez.
  `--cwd` **`frontend/web`** olmalı (repo kökü verilirse CSS backend/docs taranıp şişiyor).
  Çıktı `frontend/web/.ds-css/ds-styles.css` (gitignore'da).
- `.design-sync/tsconfig.previews.json` — §1'deki kapı.
- `.design-sync/previews/_fixtures.ts` — 67 preview'ın ortak verisi (katılımcılar, mekânlar,
  `TRAVEL`, aktiviteler). Converter preview'ı yalnız `previews/<BileşenAdı>.tsx` olarak
  aradığı için (`lib/emit.mjs:443`) bu dosya bileşen sanılmaz.
  **UYARI:** `sourceKeyFor` de yalnız `<Ad>.tsx`'i hash'ler → bu dosyayı değiştirmek ona
  bağlı grade'leri DÜŞÜRMEZ. Burada veri değiştirirsen ilgili bileşenleri elle yeniden çek.

# 4. Provider — neden `BumpIntoPreviewRoot`

`cfg.provider.component = "BumpIntoPreviewRoot"` (eskiden `BumpIntoProvider`).
`MemoryRouter` + `BumpIntoProvider` sarmalıyor.

**Neden:** TopBar / LangMenu / GoogleSignIn / AvatarMenu / AppShell / RequireAuth
`react-router-dom` kancalarını koşulsuz çağırıyor. **Her preview AYRI bir esbuild
bundle'ı olarak derleniyor**, dolayısıyla preview dosyasına yazılan bir `<MemoryRouter>`
BAŞKA bir modül örneği (ve başka bir Context kimliği) üretir — bileşenin kancası onu asla
göremez, `useLocation() may be used only in the context of a <Router>` atar.
`react`/`react-dom`/`react-is` `lib/bundle.mjs`'in `reactShim`'inde tekilleştiriliyor,
`react-router-dom` **değil**.

Çözüm `bundle.mjs`'i FORK ETMEK DEĞİL (skill bunu açıkça yasaklıyor): router'ı
`extraEntries` modülüne koymak yeterli — o modül bundle'ın içine derlendiği için oradaki
`react-router-dom` bileşenlerin kullandığı AYNI örnek. Bu düzeltme 4 bileşeni açtı
(TopBar, LangMenu, GoogleSignIn, AppShell floor card'dan çıktı).

`BumpIntoProvider` KASITLI olarak temiz bırakıldı — tasarım ajanı uygulamada onu
kullanıyor ve orada kendi router'ı oluyor; iç içe iki router bozardı.

# 5. Fontlar

Marka fontları (Bricolage Grotesque / Figtree / Caveat) `ds-styles.css`'te
`@import url(...)` ile geliyor → validate `[FONT_REMOTE]` basıyor (bilgilendirme).
Headless chromium'da uygulandıkları görsel olarak doğrulandı.
**Risk:** render ortamı dış istekleri engellerse tüm kartlar yedek fontla çıkar ve bunu
hiçbir kontrol yakalamaz. Kalıcı çözüm: woff2'leri repoya indirip `cfg.extraFonts`'a bağla
(fontlar OFL, dağıtımı serbest).

# 6. Bilinen render uyarıları

**2. tur sonunda validate SIFIR uyarıyla çıktı.** Aşağıdakiler geçmişte görülüp
kapatılanlar; yeniden çıkarlarsa "yeni bulgu" sanma:

- `[FONT_REMOTE]` — §5. Aksiyon yok, kalıcı.
- `[GRID_OVERFLOW]` — 27 bileşende `cfg.overrides.<Ad>.cardMode: "column"` ile çözüldü.
  Ürün kolonu (27.75rem) kart ızgarasından geniş olduğu için bu **beklenen** akış:
  yeni bir tam genişlik bileşeni eklersen büyük olasılıkla aynı override gerekir.
- `[RENDER_THIN]` (MobileCta) — kökü `mt-auto`; gerçek ebeveyni `Page` (min-h-dvh flex
  kolon). Düz bir div'de itilecek boşluk olmadığı için ölçülen yükseklik 0'dı.
  Preview çerçevesi Page'in kolon geometrisini tekrar edince çözüldü.
- `[DTS] parsed 0 .d.ts files` — beklenen: tip girişi `.d.ts` ağacı değil, TS kaynağı.
- `docs: 0/67` — repoda bileşen başına doküman yok; `.prompt.md`'ler `.d.ts` + JSDoc +
  preview'lardan sentezleniyor.
- **5. turun tam warn kümesi (bu ikisi dışında hiçbir şey çıkmadı):** `[FONT_REMOTE]`,
  `[OVERRIDE]` (dts.mjs forku — beklenen), `[SPOT_CHECK]` (canary), `[DTS]`/`[CAPTURE]`/`[DETECT]`
  (bilgilendirme). `[GRID_OVERFLOW]` HİÇ çıkmadı — `cfg.overrides` kapsamı güncel demektir.
  Bu listede olmayan bir warn görürsen YENİdir.

# 7. Converter sınırı: `unknown` proplar

**29 prop / 28 bileşen `unknown` tipinde.** `VenueDto` (venue/venues/finalists) ve
`ParticipantDto` (participant/participants) HER YERDE siliniyor; ayrıca `TravelInfo`
6 dosyada tanımsız/import edilmemiş bir ad olarak geçiyor.

Kök sebep converter'ın paket DIŞI tip adlarını satır içine alamaması (skill'in belgelediği
sınır). **`node_modules/@bumpinto/shared` bağını kurmak bunu DÜZELTMİYOR** — denendi,
ölçüldü, `.d.ts` değişmedi. Tek çare `cfg.dtsPropsFor` ile elle gövde yazmak.

2. turda yalnız **gerçekten yanlış olan ikisi** düzeltildi (`JoinFormFields` 6 prop
eksikti; `JoinedCard` `self.name` diyordu, gerçek alan `displayName`). Kalan `unknown`'lar
eksik ama YANLIŞ değil. 20+ gövdeyi elle yazmak tercih EDİLMEDİ: her biri bileşen
değişince sessizce bayatlar — yani §1'deki tuzağın aynısını config'e taşır.
Bir dahaki turda birinin elle gövde yazması gerekirse, önce o gövdenin nasıl
doğrulanacağını düşünsün.

# 8. Üründe bulunan boşluklar (senkron kusuru DEĞİL)

- **`VenueDeck` ön kartı aksiyon düğmelerinin üstüne biniyor.** Deste yuvası sabit
  `h-[27.5rem] flex-none`, ön kart mutlak konumlu ve doğal yüksekliğinde; yol rozetleri +
  uyum satırı render olunca yuvayı aşıyor. `DeckScreen.tsx:153` aynı propları geçiyor —
  **üründe de böyle.** 1. turda görünmüyordu çünkü `travelLabels` o zaman geçersiz bir
  proptu ve rozetler hiç çizilmiyordu. Kullanıcıya bildirildi, düzeltme ERTELENDİ
  (geometri swipe yığını için yük taşıyor, ayrı inceleme istiyor).
- **`RunoffList` `disabled` hâlinin görsel karşılığı yok** — kilitli kart seçili karttan
  ayırt edilemiyor (bileşen bunu bilerek yapıyor: kilitliyken de kartları gösteriyor).
  Bu yüzden `Locked` hücresi preview'dan çıkarıldı, `PickedSecond`'ın kopyasıydı.
- **`TextInput`'ün `disabled` stili yok** (`Button`'da `disabled:opacity-45` var).
  Aynı boşluk `aria-invalid` için de geçerli.
- **`ErrorText` token dışı renk kullanıyor** — `text-[#c0392b]` gömülü.
- **`WinnerCard` çıkartması `Highlight` ile çakışıyor** — mekan adı ikinci satıra taşınca.
- **Barrel dışı kalan store'lar**: `useAuthStore` ve `useSessionStore` export edilmiyor.
  Sonuç: `AvatarMenu` (propsuz, `me`'yi store'dan okuyor) ve `RequireAuth`'un "signed"
  dalı preview'dan sürülemiyor → **ikisi bilerek floor card'da kaldı.**
  `TopBar`'ı BLOKLAMIYOR: `status` preview harness'ında hep `"unknown"` kalıyor
  (`load()` yalnız `main.tsx`'te çağrılıyor) ve bu görsel olarak `"anon"` ile aynı —
  yani kartta gösterilen dal gerçek ürün dalı. Ama durum bağımlı yeni bir bileşen
  aynı tavana toslar.
- **`AppShell` preview'lanamıyor (floor card, bilinçli).** `<Outlet/>` rota bağlamını
  `_ds_bundle.js`'in içindeki react-router örneğinden okuyor; `Routes`/`Route`/`Outlet`
  barrel'dan export EDİLMİYOR, dolayısıyla preview'dan gerçek sayfa içeriği enjekte
  edilemiyor. `useOutlet()` çökmüyor, sessizce `null` dönüyor — ve asıl sorun bu:
  `flex-1` boşluğu oluşmadığı için OSM atıf altbilgisi başlığın hemen altına çöküyor,
  altında büyük ölü bir alan kalıyor. **Hiçbir gerçek sayfanın göstermediği bir düzen**,
  o yüzden yayınlanmadı. Açmak isteyen: `Outlet`'i (veya bir `children` prop'unu)
  barrel'dan export etsin.
- **Barrel dışı kalan moleküller** (Lobi/Bekle/Landing bileşimlerinin 1:1 taşınmasını
  sınırlıyor): `MidpointCard`, `ActivityStrip`, `SessionSteps`, `InviteCard`,
  `ActivityBadges`, `SignInBlock`.
- ~~`PastSessionRow` küçük görseli 0 yüksekliğe çöküyor~~ — **2. turda DÜZELTİLDİ**
  (kullanıcı onayıyla): `photoOnly` dalında foto kutusu `height:100%`
  (`VenueCard.tsx:167`) ve `photoHeight`'ı yok sayıyor; belirli yükseklikli ata olmadan
  0'a çöküyordu. `PastSessionRow`'daki `VenueCard` çağrısına `className="h-full"` eklendi.
  336 testin tamamı geçiyor.

- **`JoinFormFields` geocode hatasının yeri: KAYNAK YORUMU KODU YALANLIYOR.** Bileşenin kendi
  yorumu "Adres alanına bağlı hata alanın hemen altında kalır (artboard 1391–1393)" diyor, ama
  kod `ErrorText`i `TravelModeField`ten SONRA basıyor — render bunu doğruluyor (hata, ulaşım
  türü satırının altında, CTA bloğunun üstünde). Preview JSDoc'u önce yorumu tekrar ediyordu;
  `.prompt.md` bu JSDoc'tan sentezlendiği ve tasarım ajanına gittiği için gerçek render'a göre
  düzeltildi. **Ders: bir yerleşim iddiasını kaynak yorumundan değil, ekran görüntüsünden yaz.**
  (Ürün tarafında ya yorum ya da yerleşim yanlış — kullanıcı kararı bekliyor, senkron kusuru değil.)

# 9. Preview yazım teknikleri (çalıştığı doğrulanmış)

- **Çekim ortamı**: 900×700, `fullPage: false` — uzun hücreler **kırpılır**. Hücre başına
  ~620px içerik bütçesi. Ürün kolonu 27.75rem; gerçek ebeveyni `Page` olan her bileşenin
  preview'ı bu geometriyi tekrar eden bir sarmalayıcı ister.
- **Tailwind tuzağı**: `build-css.sh`'i converter ÇALIŞTIRMAZ. `@source "./previews"`
  ancak sen yeniden koşarsan etkili olur. Preview'a özel düzen tutkalını **satır içi
  stille** yaz; yeni arbitrary sınıf uydurma. (2. turda preview'lar hiç yeni sınıf
  sokmadı, CSS bayt bayt aynı kaldı — kural işe yarıyor.)
- **`lg:` (1024px) eşiği 900px çekimde asla aşılmaz.** Ayrım şu:
  bileşenin yalnız bir ALT SATIRI `hidden lg:block` ise bu gerçek responsive davranış,
  dokunma (`DeckProgressNote`). Bileşenin **KÖKÜ** `lg:`-gated ise kart tamamen boş çıkar
  ve `cfg.overrides.<Ad>.viewport` şart (`PolaroidFan` → `1120x560`,
  `DesktopOnly` → `1280x700`). `!important` ile görünürlük zorlama — kart yalan söyler.
- **İçsel state'i olan bileşenler**: gerçek tıklama ile sür (`useEffect` + ref +
  `.click()`), markup taklit etme. **İki ardışık tıklama gerekiyorsa** ikincisini
  `setTimeout(fn, 0)` ile ertele — aynı tick'te ilkinin DOM güncellemesini kaçırır
  (`IdentityCard.SaveError`).
- **`forwards` + sonu opaklık 0 animasyonlar** (`DecisionBurst`, `SwipeCard.enter`):
  doğal bitişte sahne TAMAMEN boşalır. Çözüm: `ref` callback'inde (ilk boyamadan önce)
  `animationPlayState:"paused"` + negatif `animationDelay`. **Tek bir gecikme değeri tüm
  parçacık türlerine uymaz** — `confetti`/`pop` `-0.3s`, `poof` `-0.12s` istedi.
- **`travel[]`in her bacağındaki `participantId` ile `TRAVEL.labels` anahtarları AYNI olmalı**
  (K-B26: eski dakika-haritası alanı W-13'te düştü, `VenueDto.travel[]` tek kaynak oldu),
  yoksa satır etiketi/nokta harfi sessizce `t("travel.friend")` ("Arkadaşın") fallback'ine düşer.
- **Fixture nit**: `BEBEK` ("Bebek Kahve") ve `BALAT` ("Balat Kahvesi") aynı monogramı
  ("bk") üretiyor — iki mekânı yan yana basan kartlarda (`LikedList`) ikisi tıpatıp aynı
  görünüyor. Render kusuru değil, veri seçimi. Düzeltmek isteyen `_fixtures.ts`'te BALAT'ı
  farklı baş harflere sahip bir adla değiştirsin — ama bu dosya grade anahtarına GİRMEDİĞİ
  için (§3) etkilenen bileşenleri elle yeniden çekmek gerekir.
- `photoUrl` her yerde bilerek boş: repoda yerel görsel yok, dış URL sandbox'ta yüklenmez.

# 9b. Derecelendirme turunun yakaladıkları (2. tur)

Kartları körlemesine "good" saymamak işe yaradı — dört gerçek sorun buradan çıktı:

- **`Button.RoundControls` bayat preview'dı.** Kaldırılmış `c-ico-undo`/`c-ico-x`/
  `c-ico-heart` gliflerini kullanıyordu → üç yuvarlak buton BOŞ daire basıyordu.
  Üründeki `DeckActions` deseniyle değiştirildi (Phosphor `ArrowCounterClockwise`/`X`/
  `Heart`, `size={24}`). **Aynı kök sebep `conventions.md`'de de vardı (§11b)** — bir
  sınıf silindiğinde onu adlandıran HER yeri (preview + conventions) tara.
- **`Overline` Türkçe büyütmesi harness kusuruydu, ürün kusuru DEĞİL.** CSS
  `text-transform: uppercase` dile duyarlıdır; uygulamada `i18n/index.ts:11`
  `document.documentElement.lang`i kuruyor, preview kartlarında o kod yolu koşmuyordu ve
  `<html>` dilsiz kalıp "KIMLER VAR" (noktasız I) basıyordu. `BumpIntoPreviewRoot` artık
  `lang="tr"` sabitliyor → "KİMLER VAR". **Yeni bir preview kökü yazan bunu korusun.**
- **`PageHeader.WithAction`** hiçbir aksiyon göstermiyordu: `action` üründe
  `hidden lg:block`. `cfg.overrides.PageHeader.viewport = "1280x700"` ile gerçek dal
  render oluyor. (§9'daki `lg:` kuralının bir örneği daha.)
- **`StatCard` eğimi GERÇEKTEN uygulanıyor** ama yalnız 1° ("hafif eğik"); piksel
  ölçümüyle yanlışlıkla "eğim yok" sanıldı. `transform-[rotate(±1deg)]` sınıfları
  derlenmiş durumda. Kusur değil.

İki "bulgu" ise yanlış alarmdı, bir dahaki tur aynı tuzağa düşmesin:
- **"Kuran" rozeti** = `waiting.host`, yani buluşmayı KURAN kişi (fiil `kurmak`).
  Türkçe bilmeyen bir derecelendirici bunu dinî bir metin sanabiliyor.
- **`PastSessionRow`/`PastSessionList` monogramı yok** — `photoOnly` dalının tasarımı
  (`VenueCard.tsx:182` monogramı `!photoOnly` ile kapıyor, çünkü `VenueDeck`'in hayalet
  kartlarında metin istenmiyor). Yükseklik çökmesi ayrı bir konuydu ve düzeltildi (§8).

**Ders:** derecelendiriciye ürünün dilini ve bilinen ürün boşluklarını brifingde ver,
yoksa gerçek bulgularla yanlış alarmlar aynı kutuda gelir.

# 10. Statik render edilemeyen, bilinçli atlanan hâller

- `VenueDeck` kaydırma/sürükleme/çıkış animasyonu; `SwipeCard` pointer jesti.
- Hover / focus-visible / basılı hâller.
- `WhoIsHere`'ın `children`'ı (lazy `MapView`) — ağ bağımlı.
- `AvatarMenu` ve `RequireAuth` — §8'deki barrel boşluğu.
- **`LegalMeta` (5. turda eklendi) — floor card, HENÜZ YAZILMADI (bilinçli bir karar değil,
  sadece sıra gelmedi).** `general` grubunun üçüncü üyesi. Bir dahaki tur preview yazmak isterse
  ilk aday budur; 80 bileşenin geri kalanının hepsinin authored preview'ı var.

# 11. Re-sync riskleri

- **§1'i oku.** Sürücünün "0 changed" demesi preview'ların doğru olduğu ANLAMINA GELMEZ.
  Tip kapısını çalıştırmadan yükleme yapma.
- `.ds-css/` ve `ds-bundle/` gitignore'da; taze klonda önce `sh .design-sync/build-css.sh`.
- Taze klonda iki sembolik bağı da yeniden kur (§2).
- i18n dili preview'larda `tr`'ye sabit (`ds-preview-context.tsx`) — ürünün varsayılanı.
- `cfg.dtsPropsFor`'daki iki gövde ELLE bakımlı; ilgili bileşenin propları değişirse
  config'i güncelle (2. turda ikisi de bayattı ve YANLIŞ sözleşme yayınlıyordu).
- `.ds-sync/` gitignore'da ama **geniş bir `git add` onu index'e sokabiliyor**.
  Commit öncesi `git diff --cached --name-only` ile bak.
- **Araç sürümü sürprizleri iki turdur BLOKER oldu** (4. tur: `write_files` `local_path`;
  5. tur: TypeScript 6 `baseUrl`). İkisi de "geçen tur çalışıyordu" varsayımıyla vakit kaybettirdi.
  Tur başında iki şeyi ölç: `node node_modules/typescript/bin/tsc -v` ve `DesignSync` şemasında
  `write_files.localPath` alanının açıklaması. Bir engel notta "kalıcı" yazsa bile ÖNCE test et —
  4. turun "kalıcı" dediği engel bir sonraki turda yoktu.
- **`cfg.dtsPropsFor` elle bakımlı ve 5. turda YİNE bayattı** (`JoinFormFields.error`).
  Bu iki gövde (`JoinFormFields`, `JoinedCard`) tip kapısının denetlemediği TEK yüzey:
  kapı preview'ları bileşen tipine karşı denetler, config gövdesini DENETLEMEZ. Her tur ilgili
  bileşenin kaynak proplarıyla gözle karşılaştır.
- **`conventions.md` ölçü iddiaları en tehlikeli türden.** 5. turda "480px sütun, asla geniş
  düzen yok" yazıyordu; gerçek `max-w-[30rem]` + **`lg:max-w-[70rem]` (1120px)**. Tasarım ajanı
  buna güvenip masaüstü ekranları yanlış genişlikte kurardı ve hiçbir kontrol yakalamazdı.
  Sınıf/token adları grep'lenebilir, ÖLÇÜLER grep'lenemez — `Page.tsx`'in gerçek sınıf listesini
  her tur oku.
- **Bu repoda paralel çalışma oluyor.** 2. tur sırasında kullanıcı aynı ağaçta
  backend/docs (voice-chat) değişiklikleri yapıyordu. Commit ederken YALNIZ
  `.design-sync/` (+ onaylanmışsa ilgili `frontend/web` düzeltmesi) sahnele.

# 11b. conventions.md doğrulaması (her turda ZORUNLU)

`conventions.md` tasarım ajanının sistem istemine gömülüyor: içindeki her sınıf/token/prop
adı **gerçekten var olmalı**, yoksa ajan ona güvenip çözülmeyen sözcük dağarcığı yazıyor ve
sessizce stilsiz çıktı üretiyor. Dosya YENİDEN YAZILMAZ; her turda taze derlemeye karşı
doğrulanır ve yalnız yanlışlanan adlar düzeltilir.

2. turda üç iddia bayatlamıştı, düzeltildi:
- `c-ico-undo` / `c-ico-x` / `c-ico-heart` **artık yok** — `DeckActions.tsx:1`'in kendi
  yorumu söylüyor: "ikonlar Phosphor (el yapımı CSS glifleri değiştirdi)". Derlenmiş CSS'te
  kalan gerçek glifler: `c-check`, `c-mark*`, `c-dv-text`.
- Grup listesi: `atoms/molecules/organisms`'a ek olarak **`general`** var
  (`HeaderButton`, `DesktopOnly`).
- "15 of the 32 components" → 67 bileşen.

Doğrulama komutları §1'deki tip kapısının yanında; tokenlar için
`grep -- "--<token>:" frontend/web/.ds-css/ds-styles.css`, sınıflar için `grep -F ".<sınıf>"`,
bileşenler için `ds-bundle/components/*/<Ad>/` dizini (yoksa `_ds_bundle.js` metni).

# 12. Kalıcı set (commit edilen)

`.design-sync/`: `config.json`, `NOTES.md`, `conventions.md`, `tsconfig.previews.json`,
`previews/` (61 dosya + `_fixtures.ts`), `overrides/dts.mjs`, `ds-preview-context.tsx`,
`ds-styles.css`, `build-css.sh`.
Repo tarafı: `frontend/web/src/components/index.ts`, `frontend/web/package.json#types`,
`.gitignore` girdileri.
Gitignore'da (commit EDİLMEZ): `.design-sync/.cache/`, `.design-sync/learnings/`,
`.design-sync/node_modules`, `.ds-sync/`, `ds-bundle/`, `frontend/web/.ds-css/`.

# 13. Bir sonraki koşu için hızlı reçete

```sh
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22
node ~/.cache/node/corepack/v1/pnpm/11.4.0/bin/pnpm.cjs i --frozen-lockfile   # taze klonda
mkdir -p .ds-sync && cp -r "<skill-base>"/package-*.mjs "<skill-base>"/resync.mjs \
  "<skill-base>"/lib "<skill-base>"/storybook .ds-sync/
echo '{"name":"ds-sync-deps","private":true}' > .ds-sync/package.json
(cd .ds-sync && npm i esbuild ts-morph @types/react playwright)
ln -sfn ../.ds-sync/node_modules .design-sync/node_modules
mkdir -p node_modules/@bumpinto && ln -sfn ../../frontend/shared node_modules/@bumpinto/shared
sh .design-sync/build-css.sh                                   # CSS'i ÖNCE derle
node node_modules/typescript/bin/tsc -p .design-sync/tsconfig.previews.json   # ← §1 KAPISI
# projeden _ds_sync.json'ı .design-sync/.cache/remote-sync.json'a çek, sonra:
node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules \
  --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json
```
