# Maksimum yayılım kuralı (100 km) — tasarım

**Tarih:** 2026-09-05
**Durum:** onaylandı, plana bölünecek (B-11 backend + W-10 web)
**Kaynak karar:** [2026-09-05-anchored-session-design.md](2026-09-05-anchored-session-design.md) —
çapa modu bu kuralın çıkış yoludur.

## 1. Amaç

Hollanda'daki bir host ile Türkiye'den katılan biri arasında orta nokta hesaplanmasın. Böyle
bir "orta nokta" Balkanlar'da bir tarladır: kimsenin gidemeyeceği bir yer, ve ürün tezi grup
uzlaşması olduğu için sessizce üretilen anlamsız bir merkez, hatanın en pahalı biçimidir.

Kural: **çapasız bir oturumda hiçbir iki konum birbirinden 100 km'den uzak olamaz.**

## 2. Kararlar ve gerekçeleri

| # | Karar | Gerekçe |
|---|---|---|
| S1 | Ölçü **en uzak ikili mesafe** (çap), centroid'e uzaklık değil | Ağırlıklı centroid ulaşım moduna göre kayıyor (`GeoMath.centroid(points, weights)`, ağırlık = 1/hız): yürüyen biri katılınca merkez ona doğru çekilir ve **hiç kımıldamamış** bir arabalı menzil dışına düşebilir. Kural insanların ulaşım moduna göre değişmemeli. |
| S2 | Çap ölçüsü **monotondur** ve reddedilecek kişiyi tekilleştirir | Yeni katılan çapı yalnız büyütebilir; kimse geriye dönük dışarı düşmez. Kuralı bozan her zaman yeni gelendir. Centroid ölçüsünde A(Amsterdam)+B(Rotterdam) uygunken C(İstanbul) katılınca merkez kayar ve A ile B birden menzil dışı olur — "kimi reddedeceksin?" sorusu cevapsız kalır. |
| S3 | Kural **yalnız yazma-zamanında** zorlanır | Dört yazma yolu da kontrol ederse "çap ≤ 100 km" bir DEĞİŞMEZ olur: ihlal eden oturum hiç oluşamaz. O hâlde okuma tarafının (`SessionCenter`, `SessionView`, Lobi kapıları) kuraldan haberi olmasına gerek kalmaz. Okuma tarafına da yazmak, B-10'da beş yere kopyalanan "≥2 konumlu katılımcı" önkoşulunun ürettiği hata sınıfını yeniden açardı. |
| S4 | Kural **çapalı oturumda işlemez** | Çapa sabit bir yerdir; İstanbul'dan biri Amsterdam buluşmasına katılmak istiyorsa bu onun bileceği iştir, yol süresi büyük çıkar o kadar. Bu aynı zamanda kuralın çıkış yolunu bedavaya verir: kural tetiklendiğinde doğru cevap "belli bir yerde" moduna geçmektir. |
| S5 | İhlal **reddedilir** (409), yarım katılım üretilmez | "Konumsuz katılsın" seçeneği `requireDeckParticipant` yüzünden kişiyi izleyiciye çevirirdi (kaydıramaz, karar onsuz çıkar). "Konumu geometriye girmesin" ise `midpoint`i sessiz bir yalana çevirirdi — artık herkesin ortası olmazdı. |
| S6 | Sınır **100 km**, dakika değil km | Dakika cinsinden sınır ulaşım moduna bağlanırdı (100 km yürüyerek 13 saat, arabayla ~54 dk) ve "herkes aynı kuralı görür" özelliği giderdi. |
| S7 | Mevcut oturumlar **etkilenmez** | Değişmez yalnız yeni yazmalarda uygulanır. Kural okuma anında da işleseydi, bugün 100 km'den geniş olan oturumlar bir anda orta noktasız kalırdı. |

### 100 km sayısı hakkında

`SearchRadius.baseKm` = `maxDist × 0.25`, `BASE_MAX_KM = 10`. 100 km çapta centroid'e uzaklık
~50 km → 12,5 → **10'a kırpılır**. Yani ~80 km çaptan sonra yayılım sinyali zaten ölüdür;
arama yarıçapı tavanda sabitlenir. 100 km bu eşiğin biraz üstüdür: arabayla herkes ~54 dk yol
(72 km/h × 1,3 sapma). Kahve için üst sınır — bilinçli olarak cömert tarafta seçildi.

## 3. Alan modeli

```java
// domain/geo/SpreadLimit.java
public final class SpreadLimit {

    public static final double MAX_SPREAD_KM = 100.0;

    /**
     * Degismez ZATEN gecerli oldugu icin tam cap hesabina gerek yok: yalniz ADAYI mevcut
     * noktalara olcmek yeter. O(n), O(n^2) degil.
     */
    public static boolean exceeded(GeoPoint candidate, List<GeoPoint> existing) {
        return existing.stream().anyMatch(p -> GeoMath.distanceKm(candidate, p) > MAX_SPREAD_KM);
    }

    private SpreadLimit() {
    }
}
```

**Yeni dosya eşiği (AGENTS.md):** bağımsız test edilebilir ✓, tek sorumluluk ✓, ama yalnız
**bir** gerçek çağrı yeri var (`SessionCommands` içindeki özel yardımcı). Eşiğin "iki çağrı
yeri" maddesi karşılanmıyor; kuralın saf ve `domain`e ait olması nedeniyle yine de ayrı dosya
seçildi. Bu bilinçli bir istisnadır. Alternatif: `GeoMath`'e statik olarak eklemek.

## 4. Zorlama noktaları

Dört yazma yolu, `SessionCommands` içindeki **tek** özel yardımcıdan geçer:

| Yol | Satır | Not |
|---|---|---|
| `createSession` | host'un kendi konumu | Küme boş → hiçbir zaman ihlal edemez, ama kapı yine de oradan geçer (simetri) |
| `join` | `SessionCommands:99` | Asıl senaryo |
| `updateLocation` | `SessionCommands:164` | Mevcut katılımcı pinini uzağa taşırsa |
| `addPoint` | `SessionCommands:182` | SOLO elle nokta; host başkası adına ekler, hatayı host görür |

Karşılaştırma kümesi: o oturumun **konumu olan** katılımcıları (elle eklenen `manual=true`
noktalar dahil — geometri kümesi, oy kümesi değil), **konumu yazılan katılımcının kendi
mevcut konumu HARİÇ**.

Kendini dışlamak zorunlu, kozmetik değil: A Amsterdam'dan Groningen'e taşınıyor ve B zaten
Assen'de olsun. Groningen–Assen sınır içinde, yani taşınma meşru. Ama A'nın kendi eski konumu
kümede kalırsa Groningen–Amsterdam (~180 km) ölçülür ve taşınma **haksız yere** reddedilir.
Kişi kendi eski konumuyla kısıtlanamaz.

Çapa kontrolü: `session.anchor() != null` ise kural hiç çalışmaz (S4).

## 5. Sözleşme

`ConflictException("participants_too_far_apart")` → **409**.

Prose değil **kod** kullanılır: `ApiExceptionHandler:52`'deki `new ApiError("invalid_token")`
precedent'i zaten var ve web'in dile bağlı olmayan bir şeye dallanması gerekiyor. `ApiError`
kaydının şekli (`record ApiError(String error)`) değişmez.

Bruno koleksiyonunda `participants/join-session.yml` ve `participants/update-location.yml`
`docs:` blokları bu 409'u anlatır (AGENTS.md "API Collection Policy").

## 6. Web

**Bu bölüm zorunludur, kozmetik değil.** `JoinForm.tsx:87-88` bugün her hatayı çıplak
`catch {}` ile yakalayıp tek bir `t("join.errJoin")` basıyor. O hâlde 409'u seçmenin bütün
anlamı — kullanıcıya çapa modunu önermek — kaybolur.

axios `err.response.status` ve `err.response.data.error` taşıyor, yani dallanma mümkün.

- Yeni i18n anahtarı (ör. `join.errTooFar`): *"Bu buluşma katılımcıların orta noktasında
  yapılıyor ve sen gruptan çok uzaktasın. Host'tan sabit bir buluşma yeri seçmesini iste."*
  Üç dile birden.
- `JoinForm` (katılım), `NewSessionPage` (host konumu) ve `WaitingRoom` (PUT /location) aynı
  409'u alabilir; üçü de aynı anahtarı kullanır.
- Başka bir 409 gelirse bugünkü genel mesaj korunur.

## 7. Test kapıları

### Backend

- `SpreadLimit`: sınırın altı · tam sınırda · üstünde · boş küme (`existing` boşken asla ihlal).
- `join` 100 km'den uzak konumla → 409, gövde `participants_too_far_apart`.
- `updateLocation` mevcut katılımcıyı sınır dışına taşırsa → 409.
- `updateLocation` **kendini dışlar**: tek başına olan bir katılımcı 100 km'den uzağa
  taşınabilir; iki katılımcılı oturumda A'nın uzun ama diğerine yakın bir taşınması kabul
  edilir. (Bu test olmadan §4'teki kendini-dışlama kuralı sessizce düşerdi.)
- `addPoint` (SOLO elle nokta) aynı kuralı uygular.
- **Çapalı oturumda kural işlemez** — İstanbul konumuyla katılım başarılı.
- `createSession`: host'un kendi konumu küme boşken hiçbir şeyi ihlal edemez.
- Değişmez: iki geçerli katılımdan sonra üçüncü uzak katılım reddedilir ve **mevcut iki
  katılımcı etkilenmez** (S2 monotonluğu).

### Web

- 409 + `participants_too_far_apart` → özel mesaj basılır.
- Başka bir 409 → bugünkü genel mesaj (gerileme koruması).
- Üç çağrı yerinin (JoinForm, NewSessionPage, WaitingRoom) hepsi aynı anahtarı kullanır.

**Kapı komutları:** `mvn -o clean test` (test *sayısı* kontrol edilerek) · `tsc --noEmit` ·
`pnpm test:web` · `pnpm i18n:check` · `pnpm build:web`.

## 8. Kapsam dışı

Çapalı oturumlar · mevcut oturumlara geriye dönük uygulama · okuma tarafında savunmacı kontrol ·
sınırı dakika cinsinden ifade etmek · host'un kuralı gevşetebilmesi · uzak katılımcıyı host'un
onayına sunan bir akış · sınırın oturum başına ayarlanabilir olması.

## 9. Bilinen riskler

- **R1 — Değişmez yalnız uygulama katmanında.** Şemada karşılığı yok; elle SQL ya da ileride
  eklenecek bir yazma yolu kuralı atlayabilir. S3 bunu bilerek kabul ediyor: okuma tarafına
  savunmacı kontrol koymak B-10'un beş-yere-kopyalanma hata sınıfını yeniden açardı. Yeni bir
  konum yazma yolu açılırsa bu yardımcıdan geçmesi gerekir.
- **R2 — 100 km bir ürün yargısıdır, ölçüm değil.** Yayılım sinyalinin fiilen öldüğü nokta
  ~80 km. Kullanımda "bu oturum kuruldu ama merkez saçma" şikâyeti gelirse sayı aşağı çekilir.
- **R3 — Elle eklenen noktalarda hatayı yanlış kişi görür.** `addPoint`'te reddi host alır,
  oysa uzak olan noktanın sahibi orada değildir. Bugünkü SOLO modelinde bunun daha iyi bir
  karşılığı yok.
