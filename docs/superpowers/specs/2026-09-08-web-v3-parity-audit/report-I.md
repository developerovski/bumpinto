# Rapor I — W8 · Karar (Web v3) tasarım/uygulama paritesi

Kaynak tasarım: `scratchpad/web-v3.html`
Uygulama: `/Users/mehmetserefoglu/projects/bumpinto/frontend/web`

Kapsanan artboard'lar:
- **A** — satır 2515–2598: `W8 · Karar 1280` host · oybirliği
- **B** — satır 2599–2666: `W8 · Karar 390` davetli
- **C** — satır 3736–3819: `W8 · Karar 1280` oylama sonucu ("Oylamayla 2–1")

Uygulamada ekranı kuran zincir: `src/pages/ResultScreen.tsx` → `TwoZone` → `WinnerCard`
(→ `VenueCard`, `Attribution`, `LinkButton`, `Sticker`), `ResultActions` (→ `ShareButton`,
`ShareCard`, `MeetTimeDialog`), `WhyHere` (→ `FitLine`), `TravelBars`, `BackupPlan`,
`ViralCard`, `Confetti`.

Not: `A` ve `C` artboard'ları yalnız üstlük metni, sol çıkartma ve yedek plan cümlesinde ayrışıyor;
geri kalan tüm bulgular ikisinde de aynen geçerli. Tekrarı önlemek için ortak bulgular A bölümünde,
C bölümünde yalnız duruma özgü (oylama) farklar yazıldı.

---

## Artboard A — W8 · Karar 1280 · host · oybirliği (tasarım 2515–2598)

### P1

**P1-1 — İmza sonuç kartının kişi satırları (`.rc-ppl`) ve altbilgisi (`.rc-ft`) yok** — design
(2547–2555): `.rc` kartının içinde her katılımcı için `28px | 1fr | auto` gridli bir satır var
(avatar `av-A/B/C` 26px + ad + `.f-mode` ulaşım türü ikonu + `~30 dk` tabular sayı), altında
kesikli üst çizgili `.rc-ft` şeridi (`BumpInto` wordmark + `herkes ~25–35 dk · fark 10 dk`);
app (`ResultScreen.tsx:97-107` → `WinnerCard.tsx:101-110` → `VenueCard.tsx:160-249`): `WinnerCard`
`VenueCard`'ı `travelBars={false}` + `attribution={false}` ile çağırıyor, `VenueCard`'ın gövdesi
yalnız `FitLine` + puan/fiyat/semt meta satırı + `hoursToday` + `tagline` basıyor — kartta hiçbir
kişi satırı, hiçbir avatar, hiçbir wordmark/adalet altbilgisi yok. Kişi başı dakikalar ekranda
yalnız sağ bölgedeki ayrı "Herkesin yolu" kartında (`TravelBars.tsx:30-46`) var, imza kartında yok;
`.rc-ft` cümlesi ise sadece ekran dışı paylaşım görselinde (`ShareCard.tsx:88-94`,
`share.cardFooter`) üretiliyor. Veri tamamen mevcut: `VenueDto.travel[]` (api-types.ts:771,
`TravelDto` 730-736), `ParticipantDto.travelMode` (api-types.ts:681) ve `MODE_ICON`
(`src/lib/travelMode.ts`) zaten var; `fairnessOf` min/max/spread veriyor.
fix: `WinnerCard`'a `.rc-ppl` bloğu ekle — `fairnessOf(venue).entries`'i `travel.selfId` önce
gelecek şekilde sırala, satır başına `<Avatar size="sm" index=i>` + `travel.labels[id]` (kendisi
`<b>Sen</b>`) + `MODE_ICON[participant.travelMode]` (EBIKE'ta `Lightning` 9px ek glif) +
`t("travel.min",{min})`; hemen altına `border-t border-dashed border-line2` ile
`Wordmark` + `t("share.cardFooter",{min,max,spread})` satırı. Kart gövdesi `VenueCard`
yerine `WinnerCard` içinde kurulmalı (yeni `VenueCard` prop'u değil) — `.rc` desteden farklı bir
kart.

**P1-2 — Birincil "Yol tarifi al" aksiyonu yok** — design (2566): aksiyon şeridinin ilk düğmesi
`.btn.b-fl.fit` (flame dolgu, `ph-navigation-arrow`, `padding:0 28px`) "Yol tarifi al"; app
(`WinnerCard.tsx:112-126` + `ResultActions.tsx:42-55`): yalnız hayalet (`kind="ghost"`)
"Google Maps'te aç" bağlantısı var, birincil yol tarifi düğmesi hiç yok (`WinnerCard.tsx:76`
yorumu "§4.7 harita politikası" gereği kaldırıldığını söylüyor, v3 tasarımı geri getiriyor).
`venueLink()` (`src/lib/venueLink.ts:10-12`) zaten `mapsUrl`'ü döndürüyor ve dosya başlığı bunun
"HER ZAMAN koordinat tabanlı yol tarifi" olduğunu yazıyor — veri var.
fix: `ResultActions`'ın başına `<LinkButton kind="flame" size="fit" href={venueLink(venue)}>` +
`NavigationArrow` ikonu + yeni `result.directions` = "Yol tarifi al" anahtarı ekle; mevcut ghost
"Google Maps'te aç" bağlantısı aynı şeride (aksiyonlardan SONRA) taşınsın.

**P1-3 — Sol bölge 1280'de ortalanmış, tasarımda sola yaslı** — design (2534–2538): `.zone` sol
bölge varsayılan `align-items:stretch` + sola yaslı metin (üstlük, `h1`, `★ 4.6 · €€`, meta satırı
hepsi sol kenardan başlıyor), `.rc` kartı `max-width:460px` ile sola yapışık; app
(`WinnerCard.tsx:83-93`): `<div className="flex flex-col items-center gap-1.5">` + `Heading center`
+ `Note center` — masaüstünde de ortalanıyor, `lg:` sıfırlaması yok; `WinnerCard.tsx:122,132,137`
bağlantı/atıf da `self-center` / `center`.
fix: `WinnerCard`'ın başlık bloğunu `items-center lg:items-start` + `Heading`/`Note`'a
`center` yerine `lg:text-left` ver; `self-center`'ları `lg:self-start`, `Attribution center`'ı
`lg:text-left` yap (390 ortalı kalır, bkz. artboard B 2615-2618).

**P1-4 — "Neden burası?" ve "Yedek plan" yanlış bölgede** — design (2557–2575 sol bölge / 2577–2593
sağ bölge): SOL bölge = üstlük+başlık+meta → `.rc` → "Neden burası?" kartı → aksiyon şeridi →
`.f-back` yedek plan; SAĞ bölge = "Herkesin yolu" (`.tb`) kartı → el yazısı not → viral kart; app
(`ResultScreen.tsx:95-120`): sol = `WinnerCard` + `ResultActions`, sağ = `WhyHere` + `TravelBars`
kartı + `BackupPlan` + `ViralCard`. Yani "Neden burası?" ve "Yedek plan" 42fr'lik dar sağ sütuna
düşüyor, sol sütun kartın altında boş kalıyor.
fix: `ResultScreen.tsx:95-120`'de `WhyHere` ve `BackupPlan`'ı `left` fragment'ine taşı (sıra:
`WinnerCard` → `WhyHere` → `ResultActions` → `BackupPlan`), `right`'ta yalnız `TravelBars` kartı +
el yazısı not + `ViralCard` kalsın.

**P1-5 — Kartta tek çıkartma var, tasarımda iki çıkartma var** — design (2540–2541): `.rc` iki
çıkartma taşıyor — solda sarı `.stk` "3/3 beğendi!" (`left:10px;top:-13px`) ve sağda beyaz `.stk.w`
"Karar verildi · 12:41" (`right:10px;top:-13px;rotate(2deg)`); app (`WinnerCard.tsx:96-98` +
`61-67`): tek `<Sticker>` sağ üstte, içeriği ya "N/M beğendi!" YA "Karar verildi · HH:mm";
`isLikedSticker` iken saat, kartın çıkartması yerine başlığın altına düz `Note` satırı olarak
düşüyor (`WinnerCard.tsx:92`).
fix: `WinnerCard`'da iki ayrı `Sticker` bas — sol (`absolute -top-[0.8125rem] left-2.5`, sarı)
`likedSticker`/`eyebrowRunoff` metnini, sağ (`right-2.5`, `white`) `decidedAtSticker`'ı; 
`WinnerCard.tsx:90-92`'deki yedek `Note` satırını kaldır.

### P2

**P2-1 — Üstlük metninde "Ortak nokta · " öneki yok** — design (2535):
`Ortak nokta · hepiniz aynı yeri beğendi`; app (`tr.json` `result.eyebrowUnanimous`):
`HEPİNİZ AYNI YERİ BEĞENDİ` — ürün adı olan "Ortak nokta" ön eki düşmüş
(`WinnerCard.tsx:51-58` yalnız bu anahtarı basıyor).
fix: `tr.json` → `result.eyebrowUnanimous` = `"Ortak nokta · hepiniz aynı yeri beğendi"`
(ve `eyebrowRunoff` = `"Ortak nokta · oylamayla {{a}}–{{b}}"`, `eyebrowPartial` =
`"Ortak nokta · {{names}} olmadan"`); en/nl karşılıkları da güncellensin.

**P2-2 — Başlık altındaki `★ 4.6 · €€` satırı yok, meta satırı adresi taşımıyor** — design
(2537–2538): `h1`'in altında iki ayrı satır — `.cp` 14px `★ 4.6 · €€` ve `.mi`
`Herkesin ortasına ~600 m · Kleine Berg 16, Eindhoven merkez`; app (`WinnerCard.tsx:72-74,89`):
tek `Note` satırı, yalnız `midpointMeters`; puan/fiyat yalnız kart içinde, adres ise
`WhyHere.tsx:56-69`'un YER ekseninde. `venue.rating`/`priceLevel`/`address` (api-types.ts:745-759)
mevcut.
fix: `WinnerCard`'a başlık altına `★ {rating} · {€×priceLevel}` satırı (`Note`, 0.875rem) ve
mevcut `metaLine`'a `· {venue.address}` ekini ekle (adres varsa).

**P2-3 — `.rc` meta satırındaki "Herkese ~aynı" adalet rozeti yok** — design (2543–2546):
fotoğrafın altındaki satır solda `.mi` `★ 4.6 · €€ · Kleine Berg 16, Eindhoven`, sağda yeşil
`.bg.g-gr` "Herkese ~aynı" rozeti; app (`VenueCard.tsx:203-227`): yalnız sol meta parçaları var,
sağda rozet yok (`VenueCard.tsx:243` `travelBars=false` olduğu için `FairnessNote` de basılmıyor).
Veri var: `fairnessLine()` (`src/lib/travelText.ts:17-45`) `spread <= SAME_FOR_ALL` iken
`fairness.same` = "Herkese ~aynı" üretiyor.
fix: `WinnerCard`'ın kart gövdesinde meta satırını `justify-between` yap, sağa
`<Badge tone="grass">{fairnessLine(...).lead}</Badge>` bas (lead yoksa rozet basma).

**P2-4 — "Neden burası?" kartının iç yerleşimi farklı (grid vs. sol çizgili yığın)** — design
(2559–2563): `.f-why` = `grid-template-columns:auto 1fr; gap:6px 14px; align-items:baseline` —
etiket (`Adalet`/`Uyum`/`Yer`) ile değer AYNI satırda, yan yana; app (`WhyHere.tsx:9,31-69`):
`AXIS = "flex flex-col gap-0.5 border-l-2 border-line pl-3"` — etiket değerin ÜSTÜNDE ve her eksen
2px sol kenarlıkla işaretli (tasarımda böyle bir kenarlık yok).
fix: `WhyHere`'in `AXIS`'ini kaldır, dış kabı `grid grid-cols-[auto_1fr] items-baseline
gap-x-[0.875rem] gap-y-1.5` yap; her eksen `<Overline>` + `<span className="text-[0.875rem]
text-ink">` çifti olarak doğrudan grid çocuğu olsun.

**P2-5 — "Yer" ekseni bugünün saatlerini taşımıyor** — design (2562):
`Bugün 08:00–18:00 · Kleine Berg 16, Eindhoven merkez`; app (`WhyHere.tsx:59-60`): yalnız
`venue.address`. `VenueDto.hoursToday` (api-types.ts:763) mevcut ve zaten
`VenueCard.tsx:228-232`'de basılıyor (kartın içinde, yani yanlış yerde).
fix: `WhyHere`'in YER değerini `[hoursToday && t("venue.hoursToday",{hours}), address]
.filter(Boolean).join(" · ")` yap; `VenueCard`'ın `hoursToday` satırı `WinnerCard` çağrısında
gizlensin (yeni prop veya `hideTitle` gibi bir bayrak).

**P2-6 — Yedek plan satırı sayıyı ve yol aralığını yazmıyor, tıklanabilir değil** — design
(2572–2575): tek satır `.f-back` — `Yedek plan: **Koffie Top Hundred** · 2 beğeni · herkes
~25–40 dk` + sağda `ph-caret-right`; app (`BackupPlan.tsx:15-24`): `VenueThumb` (44px görsel —
tasarımda yok) + `Overline "Yedek plan"` + ad + sabit `Note "ikinci sırada"`; beğeni sayısı, yol
aralığı ve caret yok. Veri var: `SessionView.likeCounts` (api-types.ts:722) ve yedek mekânın
`travel[]`/`fairness`'ı (api-types.ts:753-756).
fix: `BackupPlan`'ı tek satıra indir (`VenueThumb`'ı kaldır), metni
`t("result.backup") + ": " + <b>{name}</b> + " · " + t("result.backupLikes",{n:likeCounts[id]}) +
" · " + t("result.backupRange",{min,max})` yap ve sağa `CaretRight` ikonu koy; `result.backupNote`
yerine iki yeni anahtar (`backupLikes` = `"{{n}} beğeni"`, `backupRange` =
`"herkes ~{{min}}–{{max}} dk"`).

**P2-7 — Aksiyon şeridi tek satır değil, sırası farklı ve fazladan "Gruba paylaş" düğmesi var** —
design (2565–2571): TEK `.row.wr` içinde sırayla `Yol tarifi al` (flame) · `Takvime ekle` (beyaz) ·
`Kartı paylaş` (beyaz) · `Google Maps'te aç` (ghost) · `.f-attr` "Google Maps" — link/metin
paylaşma düğmesi 1280'de YOK; app: `WinnerCard.tsx:112-137` önce ghost maps bağlantısını, sonra
"Web sitesi" bağlantısını (tasarımda hiç yok), sonra `Attribution`'ı basıyor; ardından ayrı bir
kapta `ResultActions.tsx:42-55` `Takvime ekle` + `Kartı paylaş` + `ShareButton` ("Gruba paylaş")
geliyor.
fix: ghost maps bağlantısını, web sitesi bağlantısını ve `Attribution`'ı `WinnerCard`'dan
`ResultActions`'a taşı; sırayı `Yol tarifi al → Takvime ekle → Kartı paylaş → Google Maps'te aç →
Attribution` yap; `ResultActions.tsx:55`'teki metin paylaşımını `hidden lg:hidden` yerine
1280'de tümüyle kaldır (390 için başlık satırındaki paylaş ikonuna taşınır — bkz. P2-B1).

**P2-8 — Ghost düğme rengi flame değil ink** — design (135, `.b-gh{background:transparent;
color:var(--flame-deep)}`, kenarlık yok): "Google Maps'te aç" flame-deep metinli ve kenarlıksız;
app (`src/components/atoms/buttonStyles.ts:22`): `ghost: "bg-transparent text-ink border-line2"` —
metin `--ink`, üstelik görünür `line2` kenarlığı var.
fix: `buttonStyles.ts:22` → `ghost: "bg-transparent text-flame-deep border-transparent"`.

**P2-9 — El yazısı not sağ bölgede ama "Herkesin yolu" kartının İÇİNDE değil, `WhyHere` kartının
içinde** — design (2586): `.hand` 18px, `.tb` kartının ALTINDA, kart dışında serbest paragraf
(`margin:14px 4px 4px`); app (`WhyHere.tsx:73-75`): `HandNote` "Neden burası?" kartının içinde,
en altta — yani P1-4 uygulanınca sol bölgeye kayacak.
fix: `HandNote`'u `WhyHere`'den çıkar, `ResultScreen.tsx:114-116`'daki `TravelBars` kartından SONRA
sağ bölgeye bas (`className="mt-3.5 mx-1 lg:text-[1.125rem]"`); metin anahtarı
`result.leaveEarlyHand` aynen kalır (tasarımla birebir aynı cümle).

### P3

**P3-1 — Kart köşe yarıçapı ve fotoğraf yarıçapı 2px sapıyor** — design (500–501): `.rc`
`border-radius:22px`, `.rc-ph` `border-radius:14px`; app (`VenueCard.tsx:163,172`):
`rounded-3xl` (24px) ve `rounded-2xl` (16px).
fix: `WinnerCard`'ın kart kökünde `rounded-card` (=1.375rem, app.css:45), fotoğrafta
`rounded-[0.875rem]` kullan.

**P3-2 — Kart eğimi -1.4° yerine -1.2° olmalı** — design (2539): `transform:rotate(-1.2deg)`;
app (`WinnerCard.tsx:13`): `WINNER = "transform-[rotate(-1.4deg)] shadow-sh2"` (yorumda kaynak
olarak eski W4 artboard'ı yazıyor).
fix: `WinnerCard.tsx:13` → `transform-[rotate(-1.2deg)]`.

**P3-3 — Beyaz çıkartmanın eğimi ters yönde** — design (183 + 2541): `.stk.w`
`transform:rotate(1.8deg)`, karar çıkartmasında inline `rotate(2deg)` (POZİTİF); app
(`Sticker.tsx:16`): `white ? "bg-white -rotate-[1.5deg]"` (NEGATİF).
fix: `Sticker.tsx:16` → `bg-white rotate-[2deg]`.

**P3-4 — Sol bölge iç boşluğu 16px, tasarımda 14px** — design (2534): sol `.zone`
`style="gap:14px"` (sağ bölge varsayılan 16px); app (`TwoZone.tsx:53`): iki bölge de `gap-4`.
fix: `ResultScreen.tsx:94`'te `<TwoZone leftGap="…">`'a 14px'lik bir değer ekle (mevcut `zoneGaps`
haritasına `sm: "lg:gap-[0.875rem]"` girişi).

**P3-5 — `.rc` ve "Neden burası?" kartının max genişliği yok** — design (2539, 2557): `.rc`
`max-width:460px`, "Neden burası?" kartı `max-width:520px`, `.f-back` `max-width:520px`; app: sol
bölge sütunun tamamını dolduruyor (`WinnerCard.tsx:94`, `WhyHere.tsx:28`, `BackupPlan.tsx:16`).
fix: sırasıyla `lg:max-w-[28.75rem]`, `lg:max-w-[32.5rem]`, `lg:max-w-[32.5rem]` ekle.

**P3-6 — Konfeti 1280'de 5 nokta, uygulamada 3** — design (2518–2522): beş `.cel` (sun 9px,
flame kare 7px, mor 6px, yeşil 6px, flame2 kare 6px); app (`Confetti.tsx:6-19,25-41`): `result`
varyantı üç nokta ve `lg:` konumu yok — 1280'de mobil koordinatlarda kalıyor.
fix: `Confetti.tsx`'in `result` varyantına iki nokta daha (`#18b26b`, `--color-flame2` kare) ve
`lg:` konum sınıfları ekle (tasarım koordinatları: 560/150, 690/200, 640/120, 96/420, 720/330 —
tarayıcı çerçevesi 44px + bar 64px düşülerek).

**P3-7 — "Herkesin yolu" kartında fazladan adalet notu var** — design (2580–2584): `.tb`
kartında yalnız üç satır, adalet cümlesi YOK (o cümle `.rc-ft`'de); app (`TravelBars.tsx:47`):
her `TravelBars` çıktısının altına `FairnessNote` basılıyor → P1-1 uygulanınca aynı cümle iki kez
görünür.
fix: `TravelBars`'a `note?: boolean` (varsayılan `true`) ekle, `ResultScreen.tsx:115` çağrısında
`note={false}` geç.

**P3-8 — Çubuk zemini `#EFE7DC` yerine `line2` (#E4D9CD)** — design (432): `.tb-b`
`background:#EFE7DC`; app (`TravelBars.tsx:34`): `bg-line2`.
fix: `app.css @theme`'e `--color-track: #efe7dc` ekle, `TravelBars.tsx:34` → `bg-track`.

**P3-9 — Atıf tasarımda aksiyon şeridinde satır içi çip, uygulamada altta ortalı yığın** — design
(2570): `.f-attr` (11px, `ph-google-logo` ikonu ile) düğmelerle AYNI satırda; app
(`Attribution.tsx:18-20`): `flex flex-col ... text-center`, ikon yok.
fix: `Attribution`'a `inline?: boolean` ekle (yatay `flex-row gap-4`, sağlayıcı ikonu ile) ve
aksiyon şeridinde onu kullan.

---

## Artboard B — W8 · Karar 390 · davetli (tasarım 2599–2666)

Uygulama mobil-öncelikli; `TwoZone` (`TwoZone.tsx:43-49`) `lg:` altında tek sütuna düşüyor, yani
390'da sıra: `WinnerCard` → `ResultActions` → `WhyHere` → `TravelBars` kartı → `BackupPlan` →
`ViralCard`.

### P1

**P1-B1 — Ekranın altına yapışan `.cta` "Yol tarifi al" yok** — design (2661–2663): `.cta`
bloğu `.scroll`un DIŞINDA, tam genişlik `.btn.b-fl` "Yol tarifi al" (birincil, ekranın dibinde
sabit); app: `ResultScreen.tsx:91-122` hiç `MobileCta` kullanmıyor (bileşen mevcut:
`src/components/molecules/MobileCta.tsx:4-6`, `mt-auto ... lg:hidden`), yol tarifi düğmesi de
zaten yok (P1-2).
fix: `ResultScreen`'in `Page` içinde, `TwoZone`'dan SONRA
`<MobileCta><LinkButton kind="flame" href={venueLink(winner)}>{t("result.directions")}</LinkButton></MobileCta>`
ekle; P1-2'de eklenen masaüstü düğmesi `DesktopOnly` ile sarılsın (aynı düğme iki kez basılmasın).

**P1-B2 — `.rc-ppl` / `.rc-ft` 390'da da yok** — design (2627–2635): 390'daki `.rc` kartı da aynı
üç kişi satırını ve altbilgiyi taşıyor, üstelik burada bu TEK kişi-başı-dakika kaynağı (tasarımın
390 ekranında `.tb` "Herkesin yolu" kartı YOK); app: P1-1 ile aynı — kart boş, dakikalar yalnız
alttaki `TravelBars` kartında.
fix: P1-1 ile aynı; ek olarak `ResultScreen.tsx:114-116`'daki `TravelBars` kartı `hidden lg:block`
olsun (390'da `.rc-ppl` zaten aynı bilgiyi taşıyor).

### P2

**P2-B1 — Oturum başlığı satırı (ad + paylaş ikonu) yok** — design (2611–2614): `.scroll`un ilk
satırı `justify-between` — solda `.h2` oturum adı ("Cuma kahvesi"), sağda `.lg` yuvarlak paylaş
ikonu (`ph-share-network`, 36px); app: `ResultScreen.tsx:92-93` doğrudan `Confetti` + `TwoZone` ile
başlıyor, `SessionHeader` (`src/components/molecules/SessionHeader.tsx:13-21`) burada hiç
kullanılmıyor — `view.name` ekranda hiçbir yerde görünmüyor.
fix: `ResultScreen`'in `Page` içinde, `TwoZone`'dan ÖNCE
`<div className="lg:hidden"><SessionHeader title={v.name} action={<ShareButton text={shareText}
url={shareUrl} size="sm" .../>} /></div>` ekle ve `ResultActions.tsx:55`'teki metin paylaşım
düğmesini kaldır (P2-7 ile birlikte).

**P2-B2 — "Neden burası?" 390'da kartsız olmalı, üstlüksüz** — design (2637–2641): `.f-why`
DOĞRUDAN sayfa akışında, kart yok, "Neden burası?" başlığı yok, `gap:3px 12px`, değerler `.mi`
(12px) `color:var(--ink)`; app (`WhyHere.tsx:28-29`): her ölçüde kart (`rounded-card border
bg-card p-[1.25rem_1.375rem] shadow-sh1`) + `Overline "Neden burası?"` + 14px değerler.
fix: `WhyHere`'e `bare?: boolean` yerine responsive sınıf ver — kabı
`lg:rounded-card lg:border lg:border-line lg:bg-card lg:p-[1.25rem_1.375rem] lg:shadow-sh1`
yap, `Overline "Neden burası?"`'ı `hidden lg:block`, değerleri `text-[0.75rem] lg:text-[0.875rem]`
yap.

**P2-B3 — 390'ın "Yer" ekseni adres değil mesafe yazıyor** — design (2640):
`Bugün 08:00–18:00 · herkesin ortasına ~600 m` (1280'de aynı yerde ADRES var, 2562); app
(`WhyHere.tsx:59-66`): adres varsa HER ZAMAN adres, mesafe yalnız adres yokken yedek.
fix: YER değerini ölçüye göre ayır — `<span className="lg:hidden">{hoursToday · midpointMeters}
</span><span className="hidden lg:inline">{hoursToday · address}</span>`.

**P2-B4 — İki aksiyon düğmesi tasarımda yan yana ve eşit genişlikte** — design (2643–2646):
`.row gap:8px` içinde `Takvime ekle` ve `Kartı paylaş`, ikisi de `.btn.b-wh.bsm` +
`style="flex:1;min-height:44px"` — 14px metin, 44px yükseklik, satırı eşit paylaşıyorlar; app
(`ResultActions.tsx:42-55`): `flex flex-wrap items-center gap-3` + `size="fit"` (=`pillFit`,
`w-auto min-h-[3.25rem] text-base`, `Button.tsx:29`) — 52px yüksek, içerik genişliğinde, üçüncü
düğme yüzünden 390'da sarıyor.
fix: `ResultActions`'ın kabını `flex gap-2 lg:gap-3 lg:flex-wrap` yap; iki düğmeye
`className="flex-1 min-h-[2.75rem] text-[0.875rem] lg:flex-none lg:min-h-[3.25rem] lg:text-base"`
ver.

**P2-B5 — Yedek plan 390'da hiç olmamalı** — design (2599–2666): 390 artboard'ında `.f-back`
satırı YOK; app: `BackupPlan` (`ResultScreen.tsx:117`) mobilde de basılıyor.
fix: `ResultScreen.tsx:117` → `<div className="hidden lg:block"><BackupPlan …/></div>` (P1-4 ile
sol bölgeye taşınırken bu sarmalayıcı korunsun).

**P2-B6 — Viral kart 390'da yatay yerleşimli, sticker solda** — design (2651–2658): `.card`
`display:flex;align-items:center;gap:10px`, `padding:12px 14px`; solda `.h3` 15px + `.mi` alt
satır, sağda `.btn.b-wh.bsm` "Kur" (40px); `.stk.w` "sıra sende" SOL üstte (`left:12px`); app
(`ViralCard.tsx:11-31`): her ölçüde dikey (`flex-col`), buton metnin ALTINDA tam satır
(`mt-3`), sticker SAĞ üstte (`right-3`), padding `p-4` (16px).
fix: `ViralCard`'ın kökünü `flex items-center gap-2.5 p-[0.75rem_0.875rem] lg:block lg:p-4`,
sticker'ı `left-3 lg:left-auto lg:right-3`, butonu `lg:mt-3 min-h-[2.5rem] lg:min-h-[2.75rem]`,
başlığı `text-[0.9375rem] lg:text-h3` yap. 390'da buton metni tasarımda "Kur" (kısa) —
yeni `result.viralCtaShort` anahtarı ekle ve `lg:` altında onu göster.

### P3

**P3-B1 — Başlık 390'da 30px olmalı, uygulamada 34px** — design (2617): `.big`
`style="font-size:30px"` (390 için açık ezme); app (`app.css:38,231-232` + `Heading.tsx:4-8`):
`--text-display` = 2.125rem = 34px, `display` boyutunda mobil ezmesi yok.
fix: `Heading`'e `size="result"` = `"text-[1.875rem] lg:text-display-lg"` ekle ve
`WinnerCard.tsx:85`'te kullan.

**P3-B2 — Sayfa iç boşluğu 14px, tasarımda 10px** — design (2610): `.scroll`
`style="gap:10px;padding-top:10px"`; app (`Page.tsx:12`): `result: "gap-3.5 px-[1.125rem] pt-5 …"`
= 14px boşluk, 20px üst boşluk.
fix: `Page.tsx:12` → `result: "gap-2.5 px-[1.125rem] pt-2.5 lg:gap-[1.375rem] …"`.

**P3-B3 — İki atıf yan yana bir şeritte olmalı** — design (2647–2650): `.f-attrs`
(`display:flex;gap:16px`) içinde `Google Maps` ve `Powered by Foursquare` YAN YANA; app
(`Attribution.tsx:18-20`): `flex-col` (alt alta) ve yalnız kazanan mekânın KENDİ sağlayıcısı
basılıyor (`WinnerCard.tsx:137`, `providers={[venue.provider]}`) — ikinci sağlayıcı hiç görünmez.
fix: P3-9'daki `inline` varyantını 390'da da kullan; kazananın sağlayıcısı + harita sağlayıcısı
birlikte geçilsin (`configStore.config.sources` zaten ikisini de tanıyor).

**P3-B4 — El yazısı notun metni 390'da kısa** — design (2642):
`Kerem ~10 dk önce çıkarsa herkes aynı anda varır` (1280'de 2586: `Kerem en uzaktan geliyor — ~10
dk önce çıkarsa herkes aynı anda varır`); app (`tr.json` `result.leaveEarlyHand`): her ölçüde uzun
sürüm.
fix: `result.leaveEarlyHandShort` = `"{{name}} ~{{min}} dk önce çıkarsa herkes aynı anda varır"`
ekle, `HandNote` içinde `<span className="lg:hidden">` / `<span className="hidden lg:inline">`
ikilisiyle bas.

---

## Artboard C — W8 · Karar 1280 · oylama sonucu (tasarım 3736–3819)

Yapı A ile birebir aynı (`.rc` 3760–3777, "Neden burası?" 3778–3785, aksiyon şeridi 3786–3792,
`.f-back` 3793–3796, sağ bölge 3798–3814) — **P1-1 … P1-5, P2-1 … P2-9 ve tüm P3'ler bu
artboard'da da aynen geçerlidir**. Aşağıda yalnız oylama durumuna özgü farklar var.

### P1

**P1-C1 — Oylama sonucunda sol çıkartma "Oylamayla 2–1" olmalı, uygulamada yalnız üstlükte var** —
design (3761–3762): sarı `.stk` "Oylamayla 2–1" + beyaz `.stk.w` "Karar verildi · 12:41"; app
(`WinnerCard.tsx:61-67`): `isLikedSticker` yalnız `decisionKind === "UNANIMOUS"` iken doğru, RUNOFF'ta
tek çıkartma "Karar verildi · 12:41" olur; "Oylamayla 2–1" ise 3760'taki değil, üstlük satırındaki
`result.eyebrowRunoff` metnidir — yani kartın üstünde skor çıkartması hiç yok.
fix: P1-5'te eklenen sol çıkartmanın metnini durum bazlı seç:
`UNANIMOUS → result.likedSticker`, `RUNOFF && tally → result.eyebrowRunoff`,
`PARTIAL && names → result.eyebrowPartial`, aksi hâlde çıkartma basma
(`decisionKind` api-types.ts:717, `voteTally` api-types.ts:707 mevcut).

### P2

**P2-C1 — Oylama durumunda yedek plan cümlesi "oylamada N oy" demeli** — design (3795):
`Yedek plan: **Koffie Top Hundred** · oylamada 1 oy · herkes ~25–40 dk` (A'da 2573:
`· 2 beğeni ·`); app (`BackupPlan.tsx:22`): her durumda sabit `result.backupNote` = "ikinci sırada".
`backupOf` (`src/lib/backupPlan.ts`) zaten runoff/like ayrımını yapıyor, `voteTally` ve
`likeCounts` (api-types.ts:707,722) mevcut.
fix: P2-6'daki iki anahtara üçüncüyü ekle — `result.backupVotes` = `"oylamada {{n}} oy"`; kaynak
`view.decisionKind === "RUNOFF"` ise `voteTally[backup.id]` ile `backupVotes`, aksi hâlde
`likeCounts[backup.id]` ile `backupLikes` basılsın.

**P2-C2 — Üstlükte "Ortak nokta · " öneki (oylama sürümü)** — design (3756):
`Ortak nokta · oylamayla 2–1`; app (`tr.json` `result.eyebrowRunoff`): `Oylamayla {{a}}–{{b}}`.
fix: P2-1 ile aynı düzeltme.

---

## Veri boşluğu notu

Bu üç artboard'da API'de KARŞILIĞI OLMAYAN tek bir alan bile bulunmadı. Kontrol edilen alanlar
(`frontend/shared/src/api-types.ts`): kişi başı dakika `VenueDto.travel[]` (satır 771) →
`TravelDto` (730-736); ulaşım türü ikonu `ParticipantDto.travelMode` (681, WALK/BIKE/EBIKE/
TRANSIT/CAR — `src/lib/travelMode.ts`'te `MODE_ICON` haritası hazır); adalet aralığı/fark
`VenueDto.fairness` (756) + `FairnessDto` (656-663); "Herkese ~aynı" eşiği
`SAME_FOR_ALL` (`frontend/shared/src/fairness.ts:30`); saatler `VenueDto.hoursToday` (763);
adres `VenueDto.address` (759); puan/fiyat `rating`/`ratingScale`/`priceLevel` (745-747, 769);
yol tarifi bağlantısı `VenueDto.mapsUrl` (750, `venueLink.ts` başlığına göre koordinat tabanlı
yol tarifi URL'i); yedek planın beğeni/oy sayısı `SessionView.likeCounts` (722) /
`voteTally` (707); karar türü ve saati `decisionKind` (717) / `decidedAt` (719); oturum adı
`SessionView.name` (694). Yalnız `.rc`'nin sağ üstündeki `foto · Google` etiketi (design 2542,
2622) uygulamada bilinçli olarak kaldırılmış (`VenueCard.tsx:187` yorumu, §4.9) — bu bir veri
boşluğu değil, kasıtlı bir ürün kararı; raporda bulgu olarak sayılmadı.
