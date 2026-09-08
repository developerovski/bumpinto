# Rapor G — W6 / W6b / W6c (Deste) tasarım-uygulama paritesi

Tasarım: `scratchpad/web-v3.html` (satır numaraları o dosyaya ait)
Uygulama kökü: `/Users/mehmetserefoglu/projects/bumpinto/frontend/web`
Yalnız rapor — hiçbir dosya değiştirilmedi.

## API kısıtı (önce okunmalı)

`frontend/shared/src/api-types.ts` içindeki `VenueDto` yalnız **tek** `photoUrl?: string`
alanı taşır; fotoğraf **dizisi yok** (`grep -c photos api-types.ts` → 0). `hoursToday`,
`tagline`, `taglineSource`, `category`, `locality`, `travel[]`, `fairness` mevcut.
Dolayısıyla `.pdots` foto-karusel noktaları (tasarım 495-497, 2006, 2112) **veri olmadan
uygulanamaz**; uydurma nokta basılmamalı. Aşağıda P1-1 bu yüzden "backend gerekir" olarak
işaretlendi.

---

## 1. W6 · Deste — 1280 (tasarım 1978-2089)

P1-1 — foto-karusel noktaları (`.pdots`) — tasarım (495-497, 2006): ön kartın fotoğrafının
üstünde 4 adet 22×3px yatay çubuk, aktif olan `#fff`, diğerleri `rgba(255,255,255,.5)`;
app (`VenueCard.tsx:171-193`): fotoğraf alanında yalnız `<img>` veya monogram var, nokta
göstergesi hiç yok; fix: **backend gerekmeden yapılamaz** — `VenueDto`'da fotoğraf dizisi
(`photoUrls: string[]`) yoktur (`api-types.ts` `VenueDto`, yalnız `photoUrl`). Ya B-tarafına
`photoUrls` eklenip `VenueCard`'a nokta şeridi + yatay foto geçişi eklenir, ya da bu öge
tasarımdan düşürülür. Tek foto için sahte 4 nokta basılmamalı.

P1-2 — 1280'de el yazısı gerekçe notu yok — tasarım (2034): aksiyon satırının ALTINDA,
klavye ipucu satırının ÜSTÜNDE `.hand` (Caveat 20px, ink2, `rotate(-1.5deg)`) "önce herkese
en adil olanlar"; app (`VenueDeck.tsx:187-189`): `HandNote` sarmalayıcısı `lg:hidden` — 1280'de
hiç görünmez, yalnız 390'da `deck.swipeHand` basılır; fix: `VenueDeck.tsx:177-189` sırasını
tasarımdaki gibi kur — önce `HandNote` (masaüstünde de görünür), sonra klavye satırı; 1280 için
`tr.json`'a `deck.fairestFirstHand: "önce herkese en adil olanlar"` ekle, 390'da mevcut
`deck.swipeHand` yerine tasarımdaki "önce herkese en adil olanlar — kaydır gitsin" kullanılsın
(tek anahtar + `lg:hidden`/`lg:block` ile iki metin).

P1-3 — 390'da sağ bölge sızıyor (bu artboard'ın karşıtı, ama 1280 bileşen sözleşmesinden
doğuyor) — bkz. bölüm 2, P1-6.

P2-1 — kart başlığındaki adalet rozeti — tasarım (2013, 2119): başlık satırının sağında
`.bg g-gr` "Herkese ~aynı" rozeti (grass-wash zemin, grass metin, 12px/700); app
(`VenueCard.tsx:196-201`): o konumda yalnız `mixedDeck` iken `ActivityBadge` var; adalet
yalnız kartın en altındaki `FairnessNote` metniyle anlatılıyor; fix: `VenueCard.tsx:196` satır
başındaki `justify-between` bloğunun sağ ucuna `fairnessLine(...).lead` doluysa
`<Badge tone={leadTone === "amber" ? "amber" : "grass"}>{lead}</Badge>` bas; `TravelBars`
içindeki `FairnessNote` (`TravelBars.tsx:47`) o zaman yalnız `rest` kısmını yazsın
(tasarım 2023: "fark 10 dk · en uzun yol Kerem" — lead tekrar edilmiyor).

P2-2 — meta satırı parçalanmış — tasarım (2015): TEK `.mi` satırı
"★ 4.6 · €€ · Bugün 08:00–18:00 · espresso bar" (12px, ink2); app
(`VenueCard.tsx:203-233`): üç ayrı satır — meta (`★ 4.6 · Google · €€ · Helmond`, 13px),
`hoursToday` ayrı satır (12px), `tagline` ayrı satır (12px), ayrıca üstte `FitLine`; fix:
`VenueCard.tsx:203-232` içindeki meta `<div>`'ine `hoursToday`'i `·` ile ekle (ayrı `<span>`
satırını 228-232'den kaldır) ve `locality` yerine/yanına kategori bas; punto 13px → 12px
(`text-[0.8125rem]` → `text-[0.75rem]`).

P2-3 — sağlayıcı atfı kart içinde uzun metin — tasarım (2024): alt satırın SAĞ ucunda
`.f-attr` = Phosphor `ph-google-logo` ikonu + "Google", 11px, ink2, `.rg-g` ile aynı satırda
(`justify-content:space-between`); app (`VenueCard.tsx:244` + `Attribution.tsx:18-31`):
`Attribution` kartın altında kendi bloğu olarak, config'ten gelen TAM yasal atıf cümlesini
alt alta basıyor, ikon yok, satırın sağına yaslı değil; fix: `VenueCard.tsx:243-244`'ü tek
`<div className="flex items-center justify-between">` içine al — solda `FairnessNote`, sağda
kompakt atıf (`Attribution`'a `compact` modu ekleyip sağlayıcı adı + ikon bas; tam yasal metin
liste altındaki tek birleşik `Attribution`'da kalsın, `DeckScreen.tsx:128` zaten öyle yapıyor).

P2-4 — damga renkleri — tasarım (492-494): `.stamp.yes` = `rgba(255,255,255,.7)` zemin,
3px `--grs` (#0B7A44) kenarlık, `--grs` metin, `rotate(-14deg)`; `.stamp.no` = aynı zemin,
`--flame-deep` (#DE2456) kenarlık + metin, `rotate(12deg)`; app (`SwipeCard.tsx:30-34`):
BEĞEN damgası `bg-[image:var(--grad)]` + beyaz metin + `border-transparent` + `shadow-sh2`,
GEÇ damgası `border-ink2` + `bg-white/90` + `text-ink2` (gri); fix: `STAMP_LIKE` →
`left-[1.125rem] -rotate-[14deg] border-grass bg-white/70 text-grass` (gölge yok),
`STAMP_PASS` → `right-[1.125rem] rotate-12 border-flame-deep bg-white/70 text-flame-deep`;
ayrıca `top-6` → `top-[1.375rem]`, `text-[1.5rem]` → `text-[1.625rem]`,
`tracking-[0.08em]` → `tracking-[0.06em]` (tasarım 492).

P2-5 — 1280 başlık metasında orta nokta yok — tasarım (1993): "4 / 12 kart · Eindhoven civarı";
app (`DeckScreen.tsx:147` + `DeckHeader.tsx:33-38`): meta yalnız `deck.cardsOf`; `likesMeta`
sadece `lg:hidden`; `props.view.midpointLabel` (`DeckScreen.tsx:27`) elde var ama başlıkta
kullanılmıyor; fix: `DeckScreen.tsx:147` meta'sını
`` `${t("deck.cardsOf", …)}${midpointLabel ? ` · ${t("deck.near", { place: midpointLabel })}` : ""}` ``
yap ve `tr.json`'a `deck.near: "{{place}} civarı"` ekle.

P2-6 — fotoğraf yüksekliği duyarsız — tasarım (2005): 1280 ön kart `.pol-ph` `height:240px`;
(2111): 390'da `210px`; app (`VenueCard.tsx:173`): `photoHeight ?? 264` — her genişlikte 264px,
`DeckScreen`/`VenueDeck` değer geçmiyor; fix: `VenueDeck.tsx:126-132`'de ön karta
`photoHeight` yerine duyarlı sınıf ver (ör. `VenueCard`'a `photoClassName` ekleyip
`h-[13.125rem] lg:h-[15rem]` bas) — 390'da 210px, 1280'de 240px.

P2-7 — "Beğendiklerin" satırında fiyat ve uyum satırı eksik — tasarım (2053, 2065-2066):
`★ 4.4 · €` ve gerektiğinde `.f-fit warn` "Kahve değil: fırın" satırı; app
(`LikedList.tsx:39-41`): yalnız `★ 4.4`, fiyat yok, `FitLine` hiç çağrılmıyor; fix:
`LikedList.tsx:39-41`'e `VenueCard`'daki fiyat parçasını (`"€".repeat(v.priceLevel!)`) ekle ve
adın hemen altına `<FitLine venue={v} categories={categories} />` koy (kategori listesi
`DeckScreen.tsx:34-37`'den prop olarak geçirilmeli).

P2-8 — "Beğendiklerin" satırında adalet rozeti eksik — tasarım (2054, 2067): her satırda
`.bg g-gr` "Herkese ~aynı" rozeti, `align-self:flex-start`, `.rg` çubuğunun ÜSTÜNDE; app
(`LikedList.tsx:37-43`): rozet yok, adalet yalnız `RangeBar` içindeki `FairnessNote` metninde;
fix: P2-1 ile aynı `Badge` bileşenini `LikedList.tsx:41` ile `42` arasına ekle (o zaman
`FairnessNote` yine yalnız `rest`'i yazsın).

P3-1 — arka kart yükseklikleri 1280'de kısa — tasarım (2001-2002): d3 420px, d2 430px;
app (`VenueDeck.tsx:22,32`): `h-[25rem]` (400px) / `h-[24.375rem]` (390px) — 390 artboard'ıyla
(2107-2108: 390/400px) uyuşuyor ama 1280 ile 30px sapıyor; fix: `D2`/`D3`'e
`lg:h-[26.875rem]` / `lg:h-[26.25rem]` ekle.

P3-2 — aksiyon butonu çapları — tasarım (225-230): `.act` 62px (ikon 24px), `.a-un` 44px
(ikon 18px); app (`Button.tsx:22-23`): `round` 60px, `round-sm` 48px; `DeckActions.tsx` üç ikonu
da `ACTION_ICON=24` ile basıyor (`deckActions.ts:2` — bilinçli karar, yorumda yazılı); fix:
`rounds.round` → `w-[3.875rem] min-h-[3.875rem]`, `rounds["round-sm"]` → `w-11 min-h-11`;
ikon ölçüsü mevcut karar gereği aynı bırakılabilir.

P3-3 — aksiyon satırı üst boşluğu — tasarım (2029): `margin-top:6px`; app
(`DeckActions.tsx:20`): `mt-3` (12px); fix: `mt-3` → `mt-1.5 lg:mt-1.5`.

P3-4 — başlık ile ilerleme çubuğu arası — tasarım (1989, `.wrap gap:16px`); app
(`DeckHeader.tsx:30`): `gap-3` (12px); fix: `gap-3` → `gap-4`.

P3-5 — "Beğendiklerin" satır ölçüleri — tasarım (372-373 `.f-lk`: `gap:11px; padding:11px 16px;
align-items:flex-start`, gövde `gap:5px`; 2050: küçük görsel 44×44); app (`LikedList.tsx:33,36,37`):
`gap-3` (12px), `py-[0.8125rem]` (13px), `items-center`, gövde `gap-0.5` (2px), `size={48}`;
fix: `flex items-start gap-[0.6875rem] px-4 py-[0.6875rem]`, `VenueThumb size={44}`,
gövde `gap-[0.3125rem]`.

P3-6 — kart meta satırında sağlayıcı adı fazladan — tasarım (2015): meta satırında sağlayıcı
adı YOK (atıf ayrı, 2024); app (`VenueCard.tsx:208-213`): `providerMark(v.provider)` meta'ya
"· Google" olarak giriyor; fix: `VenueCard.tsx:208-213` bloğunu kaldır (atıf P2-3'teki tek
yerde kalsın).

---

## 2. W6 · Deste — 390 (tasarım 2090-2145)

P1-4 — 390'da destenin altında olmaması gereken "Beğendiklerin" kartı ve ilerleme notu —
tasarım (2097-2141): `.scroll` yalnız başlık + `.prog` + `.deck` + aksiyonlar + `.hand`
içerir; beğeni listesi ve "kim bitirdi" kartı 390'da YOKTUR (bilgi başlıktaki
"· 2 beğeni" ile veriliyor, 2101); app (`DeckScreen.tsx:152-167`): `TwoZone`'a `rightLgOnly`
geçilmiyor, mobilde sağ bölge destenin altına yığılıyor (`TwoZone.tsx:59-67`) — `LikedList`
+ `DeckProgressNote` 390'da da basılıyor; fix: `DeckScreen.tsx:152`'deki aktif deste
`<TwoZone …>` çağrısına `rightLgOnly` ekle (prop `TwoZone.tsx:25`'te zaten var). Bitmiş deste
(satır 79) ve liste modu (112) dalları DEĞİŞMEZ — tasarım 390'da orada listeyi gösteriyor
(3355+).

P1-5 — 390 başlık puntosu — tasarım (2100): `.h3` (17px/700) — 1280'deki 24px'in yerine;
app (`SessionHeader.tsx:16`): `<h2 className="text-[1.5rem]">` her genişlikte 24px; fix:
`SessionHeader.tsx:16` → `text-[1.0625rem] lg:text-[1.5rem]` (veya `as="h3"` varyantı ekle;
liste modunda tasarım 21px istiyor — bkz. P3-9).

P2-9 — 390 "Hepsini gör" butonu büyük — tasarım (2103): `.bsm` üstüne
`min-height:34px; font-size:13px`; app (`DeckHeader.tsx:10-12` → `Button.tsx:27` `pillSm`):
42px/14px her genişlikte; fix: `pillSm` → `min-h-[2.125rem] text-[0.8125rem] lg:min-h-[2.625rem]
lg:text-[0.875rem]`.

P2-10 — 390 el yazısı not metni — tasarım (2140): "önce herkese en adil olanlar — kaydır gitsin";
app (`tr.json` `deck.swipeHand`): "kaydır gitsin — butonlar da aynı işi yapar"; fix:
`deck.swipeHand` değerini tasarımdaki cümleyle değiştir (P1-2 ile birlikte).

P3-7 — 390 ilerleme çubuğu alt boşluğu — tasarım (2105): `margin-bottom:12px`, başlık satırı
`margin-bottom:10px`; app (`DeckHeader.tsx:30`): tek `gap-3` + `mb-3`; fix: `mb-3` yerine
`mb-[0.625rem] lg:mb-4` ve iç `gap-3` (390) / `gap-4` (1280).

Not: 390'da damga, `.tb` yol çubukları, foto noktaları ve kart anatomisi 1280 ile aynıdır —
P1-1, P2-1..P2-4, P2-6, P3-6 bulguları aynen bu artboard için de geçerlidir (tasarım
2110-2131 satırları 2004-2025 ile birebir).

---

## 3. W6b · Deste bitti — 1280 (tasarım 2146-2273)

P1-6 — "Kim nerede" roster kartı gönderim ÖNCESİ yok — tasarım (2180-2210): sol bölgede
"Deste bitti" kartının hemen altında ikinci kart: `.ov` "Kim nerede" + `.mi tab` "2 / 3 bitti",
kişi başına `.srow` (halkalı avatar + ad + "12 / 12 kart" + `bitti` / `kaydırıyor · 7/12`
rozeti), altında `Bekleyenleri dürt` ve `Kerem olmadan devam et` ghost butonları + "yalnız
kurana görünür" notu — hepsi henüz gönderilmemiş durumda; app (`DeckScreen.tsx:80-97` →
`FinishedCard.tsx:88-126`): roster listesi, dürtme butonu ve "olmadan devam et" YALNIZ
`props.sent` doğruyken basılıyor, gönderim öncesi sol bölgede tek kart var; fix:
`FinishedCard.tsx:88` ve `110` koşullarından `props.sent &&` kısmını kaldırıp roster + aksiyon
bloğunu ayrı bir `<div className="rounded-card border border-line bg-card">` kartına taşı
(tasarım 2180). "N / 12 kart" sayaçları §4.8 gereği KOPYALANMAMALI (kod yorumu
`FinishedCard.tsx:1-6`) — satırlar rozetle kalsın; "2 / 3 bitti" üstlük sayacı ise kişi
sayısıdır, §4.8 kapsamı değil, eklenebilir.

P2-11 — başlıkta vurgu (highlight) yok — tasarım (2173): `<h1 class="big">4 mekan
<span class="hl-m">beğendin</span></h1>` — "beğendin" sarı `--hl` kalem izinde; app
(`FinishedCard.tsx:65` + `tr.json` `deck.likedTitle`): düz metin, `Highlight` atomu
(`atoms/Highlight.tsx`) kullanılmıyor; fix: `deck.likedTitle` → `"{{count}} mekan <0>beğendin</0>"`
ve `FinishedCard.tsx:65`'te `<Trans i18nKey="deck.likedTitle" components={[<Highlight key="0" />]} />`.

P2-12 — başlık puntosu duyarsız — tasarım (2173): 1280'de `font-size:38px`; (3348): 390'da
`26px`; app (`FinishedCard.tsx:51,65`): `text-[2rem]` (32px) her genişlikte; fix:
`text-[1.625rem] lg:text-[2.375rem]`.

P2-13 — alt açıklama cümlesi sayıyı tekrarlıyor — tasarım (2174): "Herkes bitirince sonuç
açıklanır." (başlık zaten sayıyı söylüyor); app (`tr.json` `deck.finishedCopy`):
"{{count}} mekanı beğendin. Herkes bitirince sonuç açıklanır." — sayı iki kez; fix:
`deck.finishedCopy` → "Herkes bitirince sonuç açıklanır." (`FinishedCard.tsx:66`'daki `count`
argümanı da kaldırılabilir).

P2-14 — kart iç boşluğu duyarsız — tasarım (2168): `padding:40px 32px 34px; gap:14px`;
(3344): 390'da `22px 20px 20px; gap:10px`; app (`FinishedCard.tsx:44`): `px-8 pt-11 pb-9 gap-4`
(32/44/36/16px) her genişlikte; fix: `gap-2.5 px-5 pt-[1.375rem] pb-5 lg:gap-[0.875rem]
lg:px-8 lg:pt-10 lg:pb-[2.125rem]`.

P3-8 — kutlama noktacıkları (`.cel`) — tasarım (2169-2171): 3 küçük renkli nokta (sun / flame
kare / mor), 390'da 2 tane (3345-3346); app (`FinishedCard.tsx:1-6`): §4.8 gereği konfeti
bilinçli olarak kaldırılmış; fix: ürün kararı geçerliyse DEĞİŞİKLİK YOK — tasarımdan düşürülsün;
aksi halde `Confetti.tsx` yerine 3 statik `.cel` noktası eklenir.

P3-9 — sağ bölge alt notu farklı — tasarım (2266): bitmiş destede son satırın altında
"En uzak: Kerem · 35 dk"; app (`LikedList.tsx:54`): her durumda `deck.likedNote`
("Beğeni seni bağlamaz…"); fix: `LikedList`'e `footer` prop'u ekle — aktif destede mevcut not,
bitmiş destede `f.longestId` + `f.max`'ten "En uzak: {{name}} · {{min}} dk"
(veri `fairnessOf(v)`'den elde, uydurma yok).

P3-10 — buton bloğu üst boşluğu — tasarım (2175): `margin-top:6px`, `gap:10px`, `max-width:340px`;
app (`FinishedCard.tsx:71`): `mt-2 gap-2.5 max-w-[21.25rem]` — gap ve genişlik doğru, üst boşluk
8px vs 6px; fix: `mt-2` → `mt-1.5`.

---

## 4. W6b · Deste bitti — 390 (tasarım 3335-3413)

P2-15 — 390'da "Beğendiklerin" kartının alt notu fazla — tasarım (3413'e kadar): 390 kartı son
satırdan sonra kapanıyor, `deck.likedNote` paragrafı YOK; app (`LikedList.tsx:53-54`): not her
zaman basılıyor; fix: `LikedList.tsx:54` paragrafını `hidden lg:block` yap (1280'de tasarım
2074'te var).

P2-16 — dikey sıra ve boşluk — tasarım (3343): `.scroll` `gap:12px`, kartlar `flex:0 0 auto`,
sıra = bitti kartı → beğeni listesi; app (`DeckScreen.tsx:79-99` + `TwoZone.tsx:45`):
mobilde `flex flex-col gap-4` (16px), sıra doğru; fix: `TwoZone.tsx:45` `gap-4` → `gap-3 lg:gap-10`
(veya Deste ekranı için `gap` prop'u).

Not: P2-11..P2-14 (başlık vurgusu, punto, kopya, iç boşluk) bu artboard için de geçerlidir;
390 değerleri yukarıdaki fix'lerde verildi.

---

## 5. W6c · Liste modu — 390 (tasarım 2274-2357)

P1-7 — liste satırı bambaşka bir bileşen — tasarım (2289-2349): TEK `.card` (padding 0) içinde
`.f-lk` satırları: `padding:9px 14px`, 44×44 küçük görsel (radius 12), gövdede ad (`.h3`) +
`.f-fit` uyum satırı + `.mi tab` "★ 4.3 · € · Best" + `.rg` yol bandı + `.rg-g`, sağda 26px
`.chk` dairesi; satır arası `.dv` çizgi; app (`DeckScreen.tsx:115-126` →
`VenueCheckRow.tsx:19-39`): her mekan AYRI polaroid `VenueCard` (`photoHeight={120}` — 120px
fotoğraf, 24px köşe, gölge, `TravelBars` çubukları) + solunda native `<input type="checkbox">`;
12 mekanda ekran uzunluğu ve görsel dil tamamen farklı; fix: `VenueCheckRow`'u `LikedList`
satır düzenine çevir — `VenueThumb size={44}` + ad + `FitLine` + meta + `RangeBar`
(`TravelBars` DEĞİL) + 26px yuvarlak `.chk` düğmesi; satırları `DeckScreen.tsx:115-126`'da tek
`rounded-card` kap içine al, aralara `mx-[0.875rem] h-px bg-line` koy.

P1-8 — seçim kontrolü native checkbox — tasarım (2299, 2335 + `.chk` 167-169): 26px daire,
seçilide `--grad` dolgu + beyaz tik, seçilmemişte `1.5px --line-in` kenarlık; app
(`VenueCheckRow.tsx:21-26`): `<input type="checkbox" className="w-[1.375rem] accent-flame-deep">`
— kare, 22px, tarayıcı görünümü; fix: `LikedList.tsx:44-49`'daki daire işaretini paylaşılan bir
atom'a çıkar (`CheckCircle`), `VenueCheckRow`'da `<input className="sr-only peer">` +
`peer-checked:` ile boya (erişilebilirlik korunur, görünüm tasarımla eşleşir).

P2-17 — gönder butonu ekranın dibine yapışmıyor — tasarım (2352-2354): `.cta` bloğu `.scroll`
DIŞINDA, `padding:12px 18px 14px`, tam genişlik `.btn.b-fl` "Beğenilerimi gönder"; ayrıca
listenin üstünde `.fade` (2350) gradyan; app (`DeckScreen.tsx:129-131`): buton listenin sonunda
akış içinde, `MobileCta` (`molecules/MobileCta.tsx`) kullanılmıyor, fade yok; fix:
`DeckScreen.tsx:129-131`'i `<MobileCta>` ile sar (`mt-auto`, `lg:hidden`) ve 1280 için ayrı
`DesktopOnly` sürümü bas; listenin altına `pointer-events-none` gradyan şerit ekle.

P2-18 — başlık puntosu — tasarım (2284): liste modunda `.h2` = 21px; app
(`SessionHeader.tsx:16`): 24px; fix: P1-5'teki duyarlı punto ile birlikte
`text-[1.3125rem] lg:text-[1.5rem]` (global `h2` zaten 21/24px — sabit `text-[1.5rem]`
ezmesini kaldırmak yeterli).

P3-11 — "Desteye dön" butonu ölçüsü — tasarım (2287): `min-height:34px; font-size:13px`;
app (`DeckHeader.tsx:10-12`): 42px/14px; fix: P2-9 ile aynı.

P3-12 — satır atfı — tasarım (2274-2357): liste satırlarında ve listenin altında atıf satırı
YOK; app (`DeckScreen.tsx:128`): listenin altında tek birleşik `Attribution`; fix: DEĞİŞİKLİK
YOK — sağlayıcı lisansları atfı zorunlu kılıyor (spec §11), tasarımın eksiği; olduğu gibi kalsın.

P3-13 — liste modunda sağ bölge — tasarım: 390'da sağ bölge yok; app (`DeckScreen.tsx:135`):
`LikedList` sağ bölgede, mobilde listenin altına yığılıyor — aynı mekanlar iki kez listeleniyor;
fix: `DeckScreen.tsx:112`'deki `<TwoZone>`'a da `rightLgOnly` ekle.
