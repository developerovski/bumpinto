# Web UI Revizyonu: Tailwind v4 + i18n + rem Token Sistemi — Tasarım

Tarih: 2026-09-01 · Durum: kullanıcı onaylı tasarım (spec incelemesi bekliyor)
Kapsam: yalnız `frontend/web` (+ kök bağımlılıklar). Backend, `frontend/shared` API yüzeyi ve
ekran akışları DEĞİŞMEZ. Bu bir stil-mekanizması + yerelleştirme migrasyonudur; davranış ve
DOM yapısı korunur.

## 1. Karar günlüğü (2026-09-01, kullanıcı ile)

| Karar | Seçim | Not |
|---|---|---|
| Stil stratejisi | **Tam Tailwind utility-first** | Alternatifler (token-only, hibrit) sunuldu; kullanıcı tam Tailwind'i seçti |
| Tailwind sürümü | **v4** (`@tailwindcss/vite`) | v4 Sass'ı resmen desteklemiyor → **SCSS iptal** (kullanıcı onayı ile; v4'ün kendisi preprocessor) |
| Mimari kural revizyonu | **Utility yalnız bileşenlerde** | Pages salt kompozisyon kalır; sayfada utility de yasak |
| i18n | **react-i18next; tr taban + en + nl** | tr = artboard mikro-kopyası birebir; en/nl çevirileri tasarım onayına tabi |
| Ölçü birimi | **rem** (tipografi/spacing/sizing) | Artboard px değerleri /16; border/hairline/gölge px kalır |

## 2. Stack

Eklenen: `tailwindcss@^4`, `@tailwindcss/vite`, `i18next`, `react-i18next`,
`i18next-browser-languagedetector`. Çıkan: `src/styles/tokens.css`, `src/styles/ui.css`
(dosyalar silinir). SCSS/sass paketi EKLENMEZ.

## 3. Token sistemi — `src/styles/app.css`

Tek global stylesheet:

```css
@import "tailwindcss";
@theme { /* Design System v2 → token'lar */ }
@layer base { /* reset, body, font yüklemesi, prefers-reduced-motion */ }
@layer components { /* yalnız ::before/::after gerektiren 3-4 desen (bkz. §4) */ }
```

- **Kaynak Design System v2'dir** (Claude Design, proje `b536b3aa-…`, `Design System v2.dc.html`);
  çelişkide o kazanır. Mevcut `tokens.css` değerleri zaten DS-doğrulanmış — birebir taşınır:
  renkler `--color-*` (paper, card, ink, ink2, ink3, flame, flame2, flame-deep, flame-wash, sun,
  hl, grass, grass-wash, violet, violet-wash, amber, amber-wash, line, line2, line-in),
  fontlar `--font-head/body/hand`, gradyanlar (`--grad`, `--story-ring`), gölgeler `--shadow-sh1/sh2`,
  radius `--radius-card: 1.375rem`.
- **rem kuralı (normatif):** font-size, spacing, width/height, radius, offset → `px/16` rem
  (34→2.125, 26→1.625, 21→1.3125, 20→1.25, 19→1.1875, 17→1.0625, 15→0.9375, 14→0.875,
  13→0.8125, 12→0.75, 11→0.6875, 10→0.625; 52→3.25, 62→3.875, 60→3.75, 46→2.875, 44→2.75 …).
  Tam bölünmeyen değer yok; yenisi çıkarsa tam kesirli rem yazılır, yuvarlanmaz.
- **px kalanlar (bilinçli):** border/hairline kalınlıkları (1, 1.5, 2, 2.5px), gölge offset'leri,
  `transform: rotate(…)` dereceleri. Border'ların font ölçeğiyle büyümesi istenmez.
- **Kök font-size'a dokunulmaz** (16px). Kullanıcının tarayıcı font ölçeği artık tüm UI'a işler.
- Tipografi ölçeği `--text-*` token'ları olarak tanımlanır (display 2.125rem/1.05/-0.02em,
  h2 1.3125rem/700, h3 1.0625rem/700, body 1rem/1.55, muted 0.8125rem/1.5 …).
- Breakpoint'ler Tailwind v4 varsayılanları (rem tabanlı); sayfa kolonu `max-w-[30rem]`.

## 4. Bileşen migrasyonu — revize mimari kural (BAĞLAYICI)

- **Utility sınıfları YALNIZ `components/atoms|molecules|organisms` içinde yaşar.**
  `pages/` salt kompozisyon + store bağlama; sayfada utility sınıfı, inline style ve ham
  `<button>/<input>` YASAK (mevcut plan-onaylı istisnalar korunur: JoinForm `<form>`,
  DeckScreen liste-modu checkbox'ı, RunoffList reset sarmalayıcısı — hepsi organizm/molekül
  içine çekilir ya da mevcut konumunda kalırsa gerekçesi yorumda durur).
  Sayfaların bugün taşıdığı plan-kaynaklı inline layout stilleri (`gap`, `textAlign` vb.)
  migrasyonda bileşenlere/utility'ye iner; migrasyon sonunda `grep -rn "style=" src/pages`
  yalnız boş küme döndürmelidir.
- Her `a-*` sınıfı, sahibi olan bileşenin JSX'ine utility zinciri olarak taşınır; değerler
  theme token'ı, yoksa arbitrary value (`rounded-[1.375rem]`, `min-h-[3.25rem]`) — artboard
  değeri birebir. Varyantlar (`kind`, `shape`, `tone`, `align`, `ring`, `waiting`,
  `photoOnly`…) koşullu utility zincirlerine çevrilir; prop API'leri DEĞİŞMEZ.
- Her bileşenin başında tek satır kaynak referansı kalır (ör.
  `/* Kaynak: DS v2 .btn / W1 artboard */`) — utility zinciri ↔ artboard izlenebilirliği.
- `::before/::after` gerektiren desenler (`a-dv-text` "veya" ayracı, `a-check` tiki,
  `a-ico-*` glyph'leri, `a-mark-*` illüstrasyonu) `@layer components`'ta küçük sınıflar
  olarak kalır — Tailwind'in kendi kaçış yolu; SCSS değil, sayı büyümez. Bunlar `c-*`
  önekine taşınır (`c-dv-text`, `c-check`, `c-ico-*`, `c-mark-*`) ki eski sistemin
  grep gate'i (§6.3) temiz kalsın.
- `c-*` istisnaları dışında eski `a-*` sınıfları migrasyon sonunda hiçbir dosyada kalmaz
  (grep gate, §6).

## 5. i18n

- `src/i18n/index.ts`: i18next init — `fallbackLng: "tr"`, detektör sırası
  `["querystring", "navigator"]` (`?lng=en`), **cache yok** (`caches: []` — storage'a hiçbir
  şey yazılmaz; güvenlik modeliyle uyumlu ve durumsuz).
- `src/i18n/locales/tr.json | en.json | nl.json` — tek dosya/dil, ekran-önekli anahtarlar
  (`join.title`, `waiting.preparing`, `deck.seeAll`, `runoff.lockIn`, `result.directions`,
  `common.wordmark`…). `aria-label`'lar dahil TÜM kullanıcıya görünen metin extract edilir.
- **tr taban dildir ve artboard mikro-kopyasının birebir kopyasıdır** — tek doğruluk kaynağı
  Claude Design olmaya devam eder; tr.json bir "türetilmiş artifact"tır, elle değiştirilmez,
  tasarım değişirse güncellenir.
- `Highlight`/zengin işaretli metinler `<Trans>` bileşeniyle (`"Buluşmaya katıl"` →
  `<0>Buluşmaya</0> katıl`) — vurgunun hangi kelimede olduğu dile göre değişebilir.
- **en/nl çevirilerini ajan yazar; dosya başında `"_status": "tasarım onayı bekliyor"`
  işareti bulunur.** Mikro-kopya bağlayıcı tasarım öğesidir; kullanıcı onaylayınca işaret düşer.
- **Dil seçici UI EKLENMEZ** — tasarımda yok. İstenirse önce Claude Design'da çizilir.
- Dinamik/veri metinleri (mekan adı, katılımcı adı, dakika değerleri) çevrilmez; kalıplar
  interpolasyonla (`deck.travel: "{{who}} {{min}} dk"`). Çoğul gerekirse i18next plural kuralları.
- `index.html` `<title>` ve `lang="tr"` statik kalır (SPA öncesi yüklenir; tasarımda dil
  başına başlık yok) — açık konu §8.

## 6. Doğrulama gate'leri (hepsi zorunlu)

1. `tsc --noEmit` temiz; mevcut 5 test yeşil (testlere tr kaynaklı senkron i18n wrapper eklenir).
2. `pnpm build:web` + `pnpm build:web:preprod` başarılı; preprod bundle'da
   `api.preprod.bumpinto.app` doğrulanır (Plan 3 kapanışındaki `--` tuzağı tekrar etmesin).
3. `grep -rEn '"[^"]*\ba-[a-z]' frontend/web/src` → boş (eski `a-*` sınıf adı hiçbir
   className/CSS'te kalmadı; korunan desenler `c-*` önekinde — tam sınıf listesi plan
   dosyasında).
4. `grep -rn "style=" src/pages` → boş; `grep -rn "localStorage\|sessionStorage" src/` → boş.
5. Hard-coded Türkçe metin taraması: bileşen/sayfa dosyalarında string literal olarak kalan
   kullanıcı metni yok (t()/Trans dışı).
6. Her ekran (W1-W4 + Runoff) migrasyon sonrası ilgili artboard'la yeniden karşılaştırılır.

## 7. Riskler / bilinçli tavizler

- Utility zincirleri artboard CSS'iyle diff'lenebilirliği zayıflatır → bileşen başı kaynak
  yorumu (§4) telafi eder.
- en/nl metinleri tr'den uzun olabilir (ör. buton etiketleri) → taşmada davranış: tek satır +
  `truncate` DEĞİL; buton/rozet `white-space: nowrap` korunur, kap genişliği esner. Kırılım
  yaratan çeviri tespit edilirse çeviri kısaltılır (tasarım değişmez), onay notuna yazılır.
- Tailwind v4 tarayıcı tabanı modern (Safari 16.4+/Chrome 111+); proje hedefiyle uyumlu.
- Plan 4 (RN mobil) bu spec'ten etkilenmez; mobilde NativeWind kararı Plan 4'te ayrıca verilir.

## 8. Açık konular (kullanıcı)

- Dil seçici UI istenecekse Claude Design'a eklenmeli (sonra bağlanır).
- `index.html` başlığının dile göre değişmesi istenirse tasarım kararı gerekir.
- en/nl çeviri onayı: ilk migrasyon PR'ında `_status` işaretli dosyalar incelenecek.
