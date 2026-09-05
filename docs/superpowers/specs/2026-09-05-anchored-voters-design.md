# Çapalı oturumda oy veren kim? — tasarım

**Tarih:** 2026-09-05
**Durum:** onaylandı, plana bölünecek (Faz B)
**Kaynak karar:** [2026-09-05-anchored-session-design.md](2026-09-05-anchored-session-design.md)
§2 K1 — *"Çapalı modda katılımcı konumu isteğe bağlı."*

## 1. Sorun

K1 onaylandı ve B-10 `find-venues` önkoşulunu çapalı oturumda kaldırdı. Ama "konum" varsayımı
kod tabanında beş yerde kodlanmıştı; B-10 yalnız birini kaldırdı. Faz A iki web kapısını
düzeltti. Geriye **oy verme** tarafı kaldı ve K1 orada hâlâ yalan:

- `DeckFlow.requireDeckParticipant` konumsuz kişinin kaydırmasını engelliyor
  (*"share your location before joining the deck"*).
- `DeckFlow.shuffle`'ın kapısı `votingPopulation`u sayıyor ve `shuffle`, `BROWSING → SWIPING`'in
  **tek** yolu — yani çapalı+konumsuz bir GROUP oturumu deste kurabiliyor ama kaydırmaya
  geçemiyor.

Sonuç: çapa modu fiilen yalnız "host konum vermesin" demeye indirgenmişti.

## 2. Kararlar ve gerekçeleri

| # | Karar | Gerekçe |
|---|---|---|
| V1 | Çapalı oturumda oy veren = **`!manual`**; konum gerekmez | Merkez katılımcılardan türemiyor, dolayısıyla konum artık üyeliğin değil yalnız **gösterimin** (yol süresi, adalet) girdisi. K1'in gerçek karşılığı budur. |
| V2 | Çapasız davranış **değişmez**: `!manual && hasLocation()` | Orta nokta konumlardan türediği için konumsuz kişi orada gerçekten temsil edilemez. |
| V3 | Elle eklenen noktalar (`manual`) **hiçbir modda** oy vermez | Token taşımazlar, kaydırmazlar; yalnız geometriye girerler. Bu kural değişmiyor. |
| V4 | Kural **tek** yerde durur: `domain/session/Voters` | Bugün "oy veren kim?" sorusunun iki ayrı yerde aynı cevabı var (`DeckFlow.votingPopulation`, `SessionQueries:62,87`). B-10'da `SessionCenter` tam bu sebeple kuruldu: merkez iki yerde hesaplanıyordu ve çapayı ikisine birden eklemek ayrışma riskini ikiye çıkarıyordu. |
| V5 | `Participant.votes()` **silinir** | İki tanım yan yana durursa biri sessizce yanlış cevabı verir. `Participant` oturumu görmediği için doğru cevabı veremez — soru oraya ait değil. Testlerde hiç kullanılmıyor, temiz kaldırılır. |
| V6 | `shuffle`'ın `ready < 2` kapısı **değişmez** | Yeni tanımla kapı kendiliğinden "odadaki 2 oy veren" anlamına gelir. Ayrı bir çapa dallanması yazmak, B-10'un beş-kopya hatasını yeniden üretmek olurdu — kapı değişmiyor, beslendiği küme değişiyor. |

## 3. Alan modeli

```java
// domain/session/Voters.java
public final class Voters {

    /**
     * Elle eklenen noktalar ASLA oy vermez: token tasimazlar, kaydirmazlar.
     * Konum yalniz CAPASIZ oturumda sarttir — capali oturumda merkez katilimcilardan
     * turemedigi icin konumsuz kisi de tam uyedir (spec K1).
     */
    public static boolean votes(Participant p, Session session) {
        return !p.manual() && (session.anchor() != null || p.hasLocation());
    }

    public static List<Participant> of(Session session, List<Participant> participants) {
        return participants.stream().filter(p -> votes(p, session)).toList();
    }

    private Voters() {
    }
}
```

`domain/session/` altında, saf Java — ArchUnit `domainIsPure` ve `noClassesSitInLayerRoots`
bozulmaz. **İki gerçek çağrı yeri** (`DeckFlow`, `SessionQueries`) olduğu için AGENTS.md'nin
yeni dosya eşiğini geçer.

## 4. Değişen çağrı yerleri

| Yer | Değişiklik |
|---|---|
| `DeckFlow.votingPopulation(UUID)` → `(Session)` | Dört çağrı: shuffle kapısı (159), `done/total` (199), runoff finishers (251), **`DecisionEngine` girdisi** (278) |
| `DeckFlow.requireDeckParticipant` | Konum kontrolü yalnız `session.anchor() == null` iken uygulanır |
| `SessionQueries:62` | `session` zaten kapsamda |
| `SessionQueries.tallyLikes` | `Session` parametresi alır (satır 87) |

## 5. Kabul edilen bedel

**Karar artık konumsuz kişileri de bekler.** 5 kişilik çapalı bir oturumda 3'ü konum
paylaşmadıysa deste 5 kişi bitirmeden otomatik değerlendirilmez; bugün 2 kişi yetiyordu.

Bu bilinçli: alternatifi ("oyu sayılsın ama beklenmesin") oyu sayılan birini "bitirmesi
beklenmeyen" biri yapardı ve deste ortasında karar çıkabilirdi. Tutarlılık hızdan önce geldi.

## 6. Test kapıları

- `Voters`: çapalı+konumsuz → verir · çapasız+konumsuz → vermez · `manual` → iki modda da
  vermez · çapalı+konumlu → verir.
- Çapalı oturumda konumsuz katılımcı **kaydırabilir** (`requireDeckParticipant` geçer).
- Çapasız oturumda konumsuz katılımcı hâlâ kaydıramaz — gerileme koruması.
- Çapalı oturumda `shuffle` iki konumsuz katılımcıyla çalışır (V6, kapı kendiliğinden düzelir).
- `done/total` konumsuz katılımcıyı sayar → karar onu bekler (§5'in kapısı).

**Kapı komutları:** `mvn -o clean test`, test *sayısı* karşılaştırılarak.

## 7. Kapsam dışı

Web (bu değişiklik sözleşmeye alan eklemiyor; `SessionView` şekli aynı kalıyor) · konumsuz
katılımcıya yol süresi göstermek (gösterilemez, konumu yok) · `Fairness` (o
`geometryPopulation`'dan besleniyor, etkilenmiyor) · 100 km yayılım kuralı (ayrı spec).

## 8. Bilinen riskler

- **R1 — Çapalı oturumda karar gecikebilir.** Konum paylaşmamış ama odaya hiç dönmeyen biri
  desteyi bitirmezse karar askıda kalır. Bugün de aynı risk konumlu katılımcılar için vardı
  (host `force-decision` ile aşıyor); çapalı modda payda büyüdüğü için olasılık artıyor.
- **R2 — `votes()` kaldırılması sessiz bir davranış değişikliğidir.** Derleyici tüm çağrı
  yerlerini yakalar (üç tane), ama gelecekte `Participant`a bakıp "oy veren kim" sorusunu
  oradan cevaplamaya çalışan biri artık cevabı bulamayacak — `Voters`e yönlendiren bir
  javadoc notu `Participant`ta bırakılır.
