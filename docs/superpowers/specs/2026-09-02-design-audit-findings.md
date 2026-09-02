# Tasarım denetimi — bulgular ve kararlar (2026-09-02)

İki bağımsız denetim koşuldu: (a) `Web Ekranlar v2` artboard'ları ↔ web parity spec rev 2,
(b) `Design System v2` §06–§10 ↔ uygulanmış web kodu (`frontend/web`).

Bu dosya **karar kaydıdır**. W-3 / W-4 / M-2 uygulayıcıları artboard'a bakmadan önce burayı okur:
aşağıda "artboard yanlış" denen yerlerde artboard değil bu dosya bağlayıcıdır.

> Tasarım dosyalarına **dokunulmadı**. Claude Design'da yama arayüzü yok; tek satırlık değişiklik
> bile 174KB'lık artboard dosyasının tamamının yeniden yazılmasını gerektiriyor ve `.dc.html`
> dosyaları kendi içinde kaçışlı HTML barındırdığı için çift-kaçış riski var. Düzeltmeler
> Claude Design arayüzünde elle yapılmalı.

---

## 1. Bloke eden: EN/NL artboard'ları rev 2'ye taşınmamış

TR ekranlar rev 2'de yeniden çizildi, dil varyantları rev 1'de kaldı. Sonuç: **W-2'deki
`_status: "tasarım onayı bekliyor"` işaretli en/nl çevirileri onaylanamıyor** — onay artefaktı
olarak gösterilen artboard'lar artık var olmayan bir akışı anlatıyor.

| Artboard | Sorun | Düzeltme |
|---|---|---|
| Katıl EN 1280, Katıl NL 1280 | Hâlâ rev-1'in soyut `class="map"` illüstrasyonu (mdot + mlb) | `Katıl 1280` TR'deki `gmap` + `pin-av` + `tag` yapısıyla değiştir |
| Katıl EN/NL 1280 | Gizlilik notunda rev 2'nin "gruba haritada yaklaşık gösterilir" cümlesi yok | TR'deki "Konumun bu buluşma için kullanılır ve gruba haritada yaklaşık gösterilir." karşılığını yaz |
| Yeni oturum EN/NL 390 | Oturum tipi seçimi (Group/Solo) hiç yok; TR 390'da var | TR 390'daki `seg` tip seçicisini + seçili tipin açıklama satırını ekle |

## 2. Tasarımın kendi içindeki çelişkiler

**Chip ölçüsü — karar: 44px.**
DS §08 düzyazısı "Chip 44px", spec satır 143 "Chip: 44px", ama DS CSS'i `.chip{min-height:46px}`.
İki metin hemfikir, sapan tek şey CSS → 46px yazım hatası. DS CSS'i 44px'e çekilecek.

**Pin dili çakışması — karar: yeni pin türü gerekli.**
Kesik çizgili avatar pini (`pin-av man`) spec'te **yalnız** elle girilmiş konum (SOLO `manual=true`)
demek. Lobi/Katıl/Bekle 1280'de aynı pin "konumu henüz gelmemiş gerçek katılımcı" için de
kullanılmış. Tek gösterge iki anlam taşıyor. Bekleyen katılımcı için ayrı **soluk/gri** pin türü
tanımlanacak; kesik çizgi yalnız `manual` konumlara kalacak.

## 3. Rev 2 akışıyla çelişen kopya — "Bekle" ekranı

Mevcut kopya: *"Deste hazırlanıyor… Mekanlar gelince buradan kaydıracaksın"*.

Rev 2'de mekanlar `BROWSING`'de hazır oluyor; deste ancak host **Karıştır** deyince açılıyor,
yani davetli önce salt-okunur Mekanlar ekranına düşüyor. Kopya rev-1 akışını anlatıyor.

**Uygulayıcıya:** bu metni artboard'dan birebir alma. Yeni metin kullanıcı onayı bekliyor;
anlam şu olmalı: *mekanlar hazırlanıyor → gelince harita ve listede görünecek → host karıştırınca
deste açılır.*

## 4. Eksik artboard — "Mekanlar grup 390 host"

W3b'nin 390 kırılımı yalnız **davetli** (salt okunur) hâli. Host'un mobil Mekanlar ekranı hiç
çizilmemiş, dolayısıyla spec'in tarif ettiği "host CTA'sı alt çubukta sabit" (Karıştır ve kaydır)
ve karttan "Bunu seç" mobilde tanımsız. **M-2'yi doğrudan bloke eder.**

## 5. Kapanan eski açık kalemler

Bellekte ve INDEX'te taşınan iki tartışma çözüldü — **her ikisinde de kod zaten doğru**:

- **Avatar 44 ↔ 40:** kod 44px (`Avatar.tsx`, `h-11 w-11`), DS `.av` ile birebir. Artboard'lardaki
  40px bayat değer. Uyuşmazlık yok.
- **h1 36 ↔ 34:** kod 34px (`--text-display: 2.125rem`), DS'ten türetilen değerle uyuşuyor.
  36px repoda hiçbir yerde yok.

Gerçek açık kalem başka: **tipografide ≥1024 adımı eksik**. DS ve spec `display 46px (≥1024) / 34px
(mobil)`, `h2 24/21` diyor; kod her ikisini de tek değere sabitlemiş (34px / 21px), breakpoint
adımı yok. W-3 kabuğuyla birlikte `@media (min-width:1024px)` override'ı eklenecek.

## 6. Tasarım hatası değil — W-3 / W-4 iş yükü

Bunlar DS ile kodun uyuşmazlığı, ama sebebi ekranların henüz yazılmamış olması. "Eksik" değil
"planlı boşluk" — yine de W-3/W-4 başlamadan kararı verilmiş olmalı:

- **Phosphor ikon seti hiç kurulmamış.** DS §06/§08/§09 tamamen `ph-*` sınıflarına dayanıyor;
  kod elle CSS glifi kullanıyor (`app.css` `.c-ico-*`). `@phosphor-icons/web` bağımlılık olarak
  eklenmeden W-3 yazılamaz. (DS kendi içinde de tutarsız: §04 hâlâ eski CSS glifini gösteriyor,
  §09 daha yeni — §09 geçerli.)
- **`Page` bileşeni 480px tek sütuna sabit** (`max-w-[30rem]`). DS §07 bunu **açıkça yasaklıyor**
  ("480px'e sabitlenmiş tek sütun"); doğrusu içerik 1120px, tek bölge 34rem, yatay boşluk 24/48px.
  W-3'ün iki bölgeli kabı bu değerleri almalı.
- **`round-sm` buton 44px** — DS'in kendi "dokunma hedefi ≥48px" kuralının altında. 48px'e çıkar.
- **Deste eylem butonu 62px**, DS `.act` 60px diyor. 62px eski `ui.css` artboard kalıntısı → 60px.
- **Sticker beyaz varyant `+1.8deg`**, DS `.stk.w` `-1.5deg` (yön ters). DS kazanır.
- **DS'te liste-içi "bekleyen avatar" tanımı yok**; kod `Avatar.tsx`'te türetmiş. §10 harita pini
  yazılırken DS'e eklenmeli.
- **Caveat 700** DS'te yükleniyor ama hiçbir yerde kullanılmıyor → DS'ten düşür.

## 7. Karar bekleyen, spec'e yazılacak kurallar

Bunlar hata değil, spec'in sessiz kaldığı yerler; W-3/W-4 başlamadan yazılmalı:

- **Tip seçimi kontrolü:** 1280'de iki büyük kart, 390'da segment kontrolü. Kasıtlı responsive
  uyarlama ise spec'e "≥1024 kart, <1024 segment" diye yazılmalı.
- **390'da harita:** Karar 390 ve Bekle 390'da harita düşmüş, Lobi 390 ve Mekanlar grup 390'da var.
  Ya eksik haritalar eklenecek ya spec'e "390'da harita opsiyoneldir" kuralı yazılacak.
- **Hata ekranları:** üç hata durumunun hiçbirinin 1280+390 çifti yok (bulunamadı yalnız 1280;
  süresi dolmuş ve 404 yalnız 390). Spec "her biri 1280 ve 390 çifti" diyor → istisna yazılmalı.
- **"Puan sırası" ne demek:** Mekanlar kart sırası 4.6 → 4.4 → 4.3 → 4.5 → 4.1, yani gösterilen
  ★ sırası değil. Spec'te "puan sırası"nın iç skorlama olduğu netleştirilmeli.
- **"~1 km yuvarlanmış" bilgisi hiçbir haritada görünmüyor** — yalnız Katıl kopyasındaki "yaklaşık"
  kelimesi ima ediyor. Lobi ve Mekanlar haritalarına mikro-not eklenmeli (gizlilik iddiası).

## 8. Küçük tutarsızlıklar (tek satır düzeltme)

- Mekanlar grup 390 davetli: aynı oturum 1280'de 3 pin, 390'da 2 pin → üçüncü katılımcı pini eksik.
- Mekanlar bireysel 390: buton "Seç", her yerde "Bunu seç" → terim birliği.
- Yeni oturum TR 390: "Eğlence" etkinlik grubu markup'ta yok; EN/NL 390'da var → ekle.

## 9. B-6 API ↔ artboard hizalaması (2026-09-02, uygulandı)

Oturumlar / Profil / Katıl artboard'ları B-6 sözleşmesiyle karşılaştırıldı. Düzeltmeler bu kez
**Claude Design dosyalarına uygulandı** (`Web Ekranlar v2` + `Mobil Ekranlar v2`; yerel kopya
üzerinde byte-doğrulamalı yazım — girişteki "elle yapılmalı" notu bu yöntemle aşıldı).

| # | Bulgu | Karar / yapılan |
|---|---|---|
| 1 | Oturumlar satırı `Kahve · Eindhoven civarı · 12 kart` — şehir ve deste sayısı API'de yok | Artboard: `Kahve · Grup` (`sessionType` API'de var). Geçmiş satırlarındaki ` · <şehir>` düştü. Orta nokta şehir adı B-7 adayı olarak kalır |
| 2 | İlerleme `2/3 bitirdi — sıra Kerem'de` / `1/3 hazır` | API: `SessionSummaryDto.readyCount` (konumu olan) + `doneCount` (desteyi bitiren). Artboard: ad gerektiren "— sıra Kerem'de" düştü |
| 3 | Geçmiş satırında mekan fotoğrafı | API: `decidedVenuePhotoUrl` (nullable; Google-only 10 türde null). Artboard'daki renk bloğu foto-yok fallback'idir |
| 4 | Katıl sağ bölge: "Kimler var 2/3 hazır", avatarlar, "…hazır. Sıra sende" cümlesi, pinli harita | API: `preview.participants[{displayName, host, hasLocation}]` + `participantCount` — id/koordinat YOK (kamu uçtan koordinat çıkmaz). Artboard TR/EN/NL: pinler, şehir etiketleri, orta nokta halkası kaldırıldı; harita pinsiz + "Katılınca konumlar haritada görünür." notu. EN/NL'deki rev-1 `class="map"` bloğu TR'nin `gmap` yapısıyla değiştirildi, gizlilik cümlesi rev 2'ye çekildi (§1'in Katıl satırları kapandı; "Yeni oturum EN/NL 390" hâlâ açık) |
| 5 | Profil'de ad düzenlenemiyor, `PUT /api/me` destekliyor (spec §8/2) | Artboard: ad satırına diğer tercih satırlarıyla aynı chevron eklendi (Profil 1280/390 + Mobil 09) |
| 6 | Null tercih hâlleri çizilmemiş | Artboard açılmadı. **Kural:** değer yoksa satır `Seçilmedi` / `Not set` / `Niet ingesteld` gösterir, chevron kalır (EN/NL kopyası onay bekler) |
| 7 | `expiresAt` hiçbir artboard'da kullanılmıyor | API'de kalır (kalan süre rozeti isterse hazır); artboard değişmedi |

Dokunulmayan: Lobi/Mekanlar/Karar/Deste'deki "Orta nokta · Eindhoven civarı" etiketi W-4'ün bilinen
sınırı (B-7 ters geocode). Mobil dosyada Katıl/preview ekranı yok (M-1/M-2 çizer).

## 10. W-3 uygulama turu — artboard/DS düzeltmeleri (2026-09-02, uygulandı)

W-3 (Plan 11) yürütülürken artboard ↔ API/kod karşılaştırmasından çıkan ve **Claude Design'a yazılan**
değişiklikler (`Web Ekranlar v2` etag `1788347637445782`, `Design System v2` etag `1788347638279222`;
yerel kopya üzerinde asserted string replacement, `DesignSync` ile yükleme):

| # | Artboard / DS | Değişiklik | Gerekçe |
|---|---|---|---|
| 1 | Oturumlar 1280, kart 2 meta | "Yürüyüş · konumlar toplanıyor" → "Yürüyüş · Grup" | §9/1 kuralı: meta = etkinlik · tip; durum sticker + ilerleme satırında (`readyCount`/`doneCount`) |
| 2 | Deste bitti 1280 | "…Gönderince Kerem'i bekleriz — herkes bitirince…" → "4 mekanı beğendin. Herkes bitirince sonuç açıklanır." | Türkçe ad eki şablonlanamaz; bekleyen adlar sağ bölgedeki ilerleme notunda |
| 3 | Karar 1280 overline | "üçünüz de aynı yeri beğendi" → "hepiniz aynı yeri beğendi" | sayı sözcüğü şablonlanamaz. **Not:** kesişim-1 kutlama varyantı kodda KAPALI — bkz. B-7 `likeCounts` |
| 4 | Katıl 1280/390/EN/NL rozeti | "2 kişi katıldı / 2 joined / 2 doen mee" → 3 | rozet `participantCount` (host dahil); üç avatar çizili |
| 5 | Deste 390 kart rozeti | "Sana 28 dk" → "Sen 28 dk" | 1280/Karar/Runoff "Sen"; "Sana" yalnız liste modunda (`deck.travelSelfTo`) |
| 6 | Mekanlar bireysel 390 | "Seç" ×4 → "Bunu seç" | §8 terim birliği |
| 7 | Yeni oturum TR 390 | "Eğlence" grubu eklendi (Bowling/Oyun/Tema parkı/Gece hayatı) | §8; EN/NL 390'da vardı |
| 8 | Mekanlar grup 390 davetli | üçüncü katılımcı pini (K) eklendi | §8; 1280'de 3 pin |
| 9 | DS `.chip` | `min-height:46px` → `44px` | §2 kararı |
| 10 | DS `@import` | Caveat `600;700` → `600` | §6: 700 kullanılmıyor |

Kodda artboard'dan **bilinçli** ayrılan yerler (INDEX W-3 notunda da var): Google butonu GIS render'ı;
Karar'da adres / "şu an açık" / km yok (API'de yok); Oturumlar kartında avatar satırı yok (liste API'sinde
ad yok); Bekle kopyası rev-1 metniyle kaldı (§3 onay bekliyor); Profil'de ad düzenleme satır-içi input
(artboard yalnız chevron çiziyor — düzenleme hâli çizilmedi, onay bekliyor).

## 11. W-4 uygulama turu — artboard düzeltmeleri (2026-09-02, uygulandı)

W-4 (Plan 12) başlarken artboard ↔ API/kod karşılaştırması. **Claude Design'a yazıldı** (`Web Ekranlar v2`
etag `1788351021656495`, 177 590 → 179 433 bayt; yerel kopya üzerinde asserted string replacement, `DesignSync`).
Ortak gerekçe: `VenueDto`'da adres/şehir/açık-kapalı yok; `midpoint`/`radiusKm` şehir adı taşımaz; konumu
olmayan katılımcı haritaya çizilemez; mekanlar bulunduktan sonra noktalar donar (backend `COLLECTING` dışında 409).

| # | Artboard | Değişiklik | Gerekçe |
|---|---|---|---|
| 1 | Yeni oturum 1280 | mcap "Orta nokta · Eindhoven civarı · ~18 km" → "Orta nokta"; sol sütuna "Sen neredesin?" + `.loc.on` satırı + "…ya da adres yaz" eklendi | istemci önizlemesinde yarıçap/şehir yok; `createSession` lat/lng ister — host konumu için alan çizilmemişti |
| 2 | Yeni oturum 390 (TR) | isim alanı ("Buluşmaya isim ver · istersen") + "Sen neredesin?" `.loc.on` satırı eklendi | EN/NL 390'da isim alanı vardı, TR'de yoktu; konum alanı hiçbirinde yoktu |
| 3 | Yeni oturum EN/NL 390 | `seg` tip seçici (Group/Solo · Groep/Solo) + açıklama satırı + "Where are you? / Waar ben je?" `.loc.on` satırı eklendi | §1'in açık kalemi kapandı |
| 4 | Lobi 1280 | mcap → "Orta nokta · ≤ 9 km"; Kerem'in "bekleniyor" pini kaldırıldı; alt satır "Linke tıkladı, konum seçiyor…" → "Konum bekleniyor…" | konumu olmayan katılımcının pini olamaz (§2'deki "soluk pin" ihtiyacı böylece düştü); kopya tek kaynak `waiting.waitingLocation` |
| 5 | Lobi 390 | "Linke tıkladı, konum seçiyor…" → "Konum bekleniyor…" | aynı |
| 6 | Bekle 1280 | K pini kaldırıldı | konumu yok |
| 7 | Mekanlar grup 1280 | meta "12 mekan · orta noktadan ≤ 9 km"; satır/popcard'larda "Açık" / "17:00'de kapanır" rozetleri ve şehir adları kaldırıldı ("★ 4.6 · €€") | API'de yok |
| 8 | Mekanlar grup 390 davetli | aynı meta temizliği; "Sana 28′" → "Sen 28′" | §10/5 terim birliği |
| 9 | Mekanlar bireysel 1280 | "Konumları düzenle" butonu kaldırıldı; meta "12 mekan · orta noktadan ≤ 9 km"; satır/popcard temizliği | BROWSING'de noktalar donmuş (B-7 adayı) |
| 10 | Mekanlar bireysel 390 | satır meta temizliği; alttaki "Haritada gör" butonu kaldırıldı (üstteki Liste/Harita `seg` kalır) | aynı işlev iki kontrol |
| 11 | Karar 1280 | alt satır "Kleine Berg 16, Eindhoven · ★ 4.6 · €€ · şu an açık" → "★ 4.6 · €€"; harita mcap (adres) kaldırıldı | W-3'teki bilinçli sapmayla aynı hata sınıfı, artboard'a da uygulandı |

Plan 12'den **düşen** kalemler (artboard'da yok, backend'de yok): "Ben de kaydıracağım" anahtarı (plan uydurmuş;
hiçbir artboard'da `.tog` kullanılmıyor) ve "Link hemen oluşur, sonra atarsın" ipucu. Çizilmemiş kalan boşluk:
**Yeni oturum 1280 · Grup** (sağ bölge "davetlinin göreceği" önizleme kartı yalnız spec §5'te tarif ediliyor) —
kod spec'e göre yazılır (`InvitePreview`), artboard sonra çizilir.

§7'nin W-4'te kapanan kalemleri (kod böyle yazıldı; spec'e taşınacak kural):
- **Tip seçimi kontrolü:** ≥1024 iki `TypeCard`, <1024 `Segmented` (`TypeSelector`). Kasıtlı responsive uyarlama.
- **390'da harita:** yalnız Lobi ve Mekanlar'da (artboard'larda `gmap` var); Katıl/Bekle/Karar 390'da harita yok →
  `MapView lgOnly` ile ≥1024'e sınırlandı, Bekle 390 dekoratif `MapMark`'ı korur.
- **"Puan sırası":** Mekanlar listesi `deckOrder`'a göre (backend'in iç skoru); ekrandaki ★ sırası değil.

