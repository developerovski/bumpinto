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
