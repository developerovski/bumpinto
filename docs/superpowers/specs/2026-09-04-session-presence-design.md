# Oturum Presence — tasarım

Tarih: 2026-09-04 · Durum: onaylandı (kullanıcı, 2026-09-04) · İzler: **B-8**, **W-7**, (parite: M-4)

İlgili kaynaklar: `backend/ARCHITECTURE.md` §8 (kimlik), §11 (olaylar) ·
`2026-09-03-map-free-group-decision-ux.md` §3 (rekabet bulguları), §4.7 (harita politikası)

---

## 1. Problem

Katılımcı bugün yalnız bir **DB satırı**. Sayfayı kapatan kişi listede kalır; host onu bekleyerek
deste başlatır ve deste hiç bitmez. "Kim şu an burada" sorusunun cevabı sistemde yok.

Kullanıcı üç kural istedi (2026-09-04). İkisi olduğu gibi alınmadı, gerekçesi §2'de:

1. Host oturumda değilse davet linkiyle katılım engellensin.
2. Kullanıcı katılınca ekranda görünsün, sayfayı kapatınca oturumdan otomatik ayrılsın.
3. Biri katılınca konumu haritada otomatik görünsün ve harita ölçeklensin.

## 2. Kapatılan çelişkiler

**2a. Host presence katılımı ENGELLEMEZ.** Davet linkinin ana akışı asenkrondur: host linki
paylaşır, telefonu kilitler; davetli 5 dakika sonra tıklar. Sert kural bu akışı öldürür. Mobil
tarayıcı arka planda WS'i askıya aldığı için host tam yanınızdayken "çevrimdışı" görünür.
`2026-09-03-map-free-group-decision-ux.md` §3 rekabet bulgusu zaten şunu söylüyor: *"host tek arıza
noktası en çok şikayet edilen şey"*. Karar: host'un çevrimdışılığı Katıl ekranında **gösterilir**,
katılımı engellemez. Katılımı kapatan tek şey oturum **durumudur** (§5).

**2b. "Ayrılma" satır silmek DEĞİLDİR.** Disconnect ≠ ayrılma: sayfa yenileme, ağ dalgalanması,
sekme değişimi, mobil arka plan hepsi disconnect üretir. Satırı silmek konumu, swipe'ları ve orta
noktayı götürür; `SWIPING` ortasında oy popülasyonunu kaydırır. Karar: **presence ayrı bir canlı
katmandır**, üyelik silinmez.

**2c. Harita §4.7'yi kısmen geri alır.** Ölçekleme kodu (`lib/mapCamera.ts`) zaten doğru çalışıyor;
eksik olan haritanın **mount edilmemesi**. Karar: `lg`+ genişlikte Lobi ve Bekle'de harita
varsayılan açık; 390'da "Haritada gör" ghost'u kalır (mobilde chunk + Maps faturası bedava değil).
§4.7'nin "Bekle'de harita yok" ve "Lobi'de ghost arkasında" maddeleri bu kararla değişir; Karar
ekranı ve Mekanlar politikası **değişmez**.

**2d. `participant token required` ayrı bir hatadır.** `WebPrincipals.participantId` katılımcı
token'ı olmayan çağırana 403 atar. Presence bunu düzeltmez. Repro elde olmadığı için bu spec'in
kapsamına **alınmadı**; ayrı bulgu olarak izlenir.

---

## 3. WebSocket kimliği: uç noktayı oturum yoluna taşı

Bugün handshake kimliksiz (`WebSocketConfig` javadoc'u bunu ve sonucunu açıkça yazıyor: slug'ı
bilen herkes kanalı dinleyebilir). Presence "bu soket kimin" cevabını gerektirir.

**Karar: `/ws` → `/api/sessions/{slug}/ws`.**

Neden bu, ticket ucu değil:

- Katılımcı çerezinin path'i **zaten** `/api/sessions/{slug}` (ARCHITECTURE §8). Tarayıcı çerezi
  handshake'e kendiliğinden gönderir; JS'in HttpOnly token'ı okumasına gerek kalmaz.
- Handshake isteği servlet filtre zincirinden geçer → `ParticipantTokenFilter` **hiç
  değişmeden** çalışır ve `Principal`'ı WS oturumuna bağlar. Yeni token türü, yeni uç, yeni Bruno
  isteği yok.
- `SecurityConfig` `anyRequest().authenticated()` olduğu için kimliksiz handshake kendiliğinden
  401 alır — fail-closed, ek kural gerekmez.
- Bilinen güvenlik açığını kapatır: abonelik artık kimlik ister ve kişi yalnız **kendi** oturumunun
  konusuna abone olabilir.

Doğrulandı (2026-09-04): `WebSocketHandlerMapping extends SimpleUrlHandlerMapping`, desen
eşleşmesini destekler → `/api/sessions/*/ws` kaydı geçerlidir.

Yapılacak yan düzeltmeler:

- `SecurityConfig`: `/ws/**` permitAll satırı ve `/ws/**` CORS kaydı kaldırılır.
- `RateLimitFilter`: WS handshake `api` kovasına (120/dk) düşer. Ortak NAT arkasındaki bir grup +
  reconnect fırtınası bunu yiyebilir; handshake yoluna kendi politikası eklenir (`ws`, 30/dk),
  `api`'den **önce**.
- İstemci: `useSessionLive` brokerURL'i slug'a göre kurar. `VITE_WS_URL` yalnız origin taşır.

Reddedilen alternatif — **ticket ucu** (`POST /api/sessions/{slug}/ws-ticket` → 60 sn ömürlü JWT,
`/ws?t=...`): yeni uç + yeni token türü + Bruno isteği + her reconnect'te ek roundtrip. Tek
kazancı WS URL'inin sabit kalması. A yolu bir sebeple çökerse (Spring sürümü desen eşleşmesini
kaybederse) yedek plan budur.

---

## 4. Presence modeli

```text
domain/port/PresencePort         arrived(sessionId, participantId) · left(...) · presentIn(sessionId): Set<UUID>
adapter/out/presence/InMemoryPresence    ConcurrentHashMap: sessionId -> participantId -> {openConnections, lastSeenAt}
adapter/in/web/PresenceListener  SessionConnectedEvent / SessionDisconnectEvent -> port + presence_changed olayı
```

**Grace penceresi 2 sn** (ilk karar 45 sn'ydi; kullanıcı 2026-09-04'te "kopma anında görünmeli" dedi ve 45 sn bunu öldürüyordu). Kişi *bağlıysa* **ya da** *son 2 sn içinde koptuysa* "mevcut" sayılır.
Sayfa yenileme (~1 sn), kısa ağ kesintisi ve mobil arka plan bu eşiği devirmez. Eşik enjekte edilen
`Clock` ile ölçülür — saf birim testi mümkün, `Thread.sleep` yok.

**Sayaç, bayrak değil.** Aynı kişi iki sekme açabilir; `openConnections` sayılır, sıfıra inince
`lastSeenAt` yazılır. Tek sekmenin kapanması kişiyi çevrimdışı yapmaz.

**Kopmada iki yayın.** Kopma anındaki `presence_changed` henüz "online" cevabını taşır (grace
içindeyiz); ikinci bir zil grace bitiminde zamanlanır ve gerçek değişikliği duyurur. Tek zil,
"çıkan kişi ekranda online kalıyor" demektir — istemci ancak emniyet poll'ünde fark eder.

**Satır asla silinmez.** Konum, swipe'lar, orta nokta ve deste geometrisi korunur.

---

## 5. Bağlayıcı ilke: presence GİRİŞİ kapatır, SONUCU asla

| Kapı | Neye bakar | Gerekçe |
|---|---|---|
| `join` | **Durum**: `SWIPING`/`RUNOFF`/`DECIDED` → 409 | Deste başladıktan sonra popülasyon donar; `done/total` bozulmaz |
| `findVenues` | **Satır**: ≥2 konumlu (değişmedi) | Konum bilinçli bir katkıdır; kişi o an offline olsa da geçerlidir |
| `shuffle` | **Presence**: ≥2 mevcut oy veren | Hayalet koltukla deste başlamaz (kullanıcı kuralı 2/3) |
| Deste bitişi `done>=total` | **Satır** (değişmedi) | Karar geri alınamaz; bir ağ dalgalanması erken karar üretmemeli. Host'un `decideWithout`'u zaten çıkış kapısıdır |

Kural tek cümlede: **geri alınabilir giriş** kararları presence'a bakar, **geri alınamaz sonuç**
kararları veriye bakar.

"Oy veren" = `Participant.votes()`, yani konumu olan ve `manual=false` katılımcı — deste
popülasyonuyla **aynı** küme (ARCHITECTURE §7 "geometri / oy ikilisi"). Presence bu kümeyi
daraltır, tanımını değiştirmez.

**Host çıkmaz sokakta kalmaz.** Tek kişi kaldığında `shuffle` 409 verir ama `BROWSING`
ekranındaki `force-decision{venueId}` (GROUP host kısayolu, ARCHITECTURE §7) açıktır: host
mekânı kendi seçip kararı kapatabilir. 409 mesajı web tarafında bu çıkışı gösteren metne
çevrilir, çıplak hata olarak basılmaz.

`join` durum kapısı yeni: bugün yalnız `DECIDED` engelleniyor
(`SessionCommands.join`), yani `SWIPING` ortasında katılan biri oy popülasyonuna girip herkesi
bekletebiliyor.

---

## 6. API yüzeyi

| Alan | Yer | Anlam |
|---|---|---|
| `ParticipantDto.online: boolean` | `SessionView.participants[]` | Grace penceresi dahil "şu an burada" |
| `SessionPreview.hostOnline: boolean` | `GET /{slug}/preview` | Katıl ekranındaki rozet (§2a) |
| `presence_changed` | STOMP olayı | Gövde boş — `location_updated` ile aynı desen: istemci için "tazele" zili |

Elle eklenen nokta (`manual=true`, SOLO) token taşımaz, dolayısıyla soket de açamaz: `online`
her zaman `false` gelir ve SOLO ekranlarında bu alan **gösterilmez**. Presence yalnız GROUP
akışının sorusudur.

Yeni REST ucu **yok** → yeni Bruno isteği gerekmez. Mevcut `sessions/preview` ve `sessions/get`
isteklerinin `docs:` blokları yeni alanları anlatacak şekilde güncellenir.

`presence_changed` yayını, katılım/kopma **transaction dışında** olduğu için doğrudan gider
(`StompSessionEvents` zaten iki hâli de karşılıyor).

---

## 7. Harita (kullanıcı kuralı 3)

- **Lobi (`LobbyPage`)**: `lg`+ harita varsayılan mount; `mapOpen` ghost'u yalnız 390'da kalır.
- **Bekle (`WaitingRoom`)**: `lg`+ harita eklenir (bugün hiç yok), 390'da ghost.
- **Otomatik kadraj**: yeni bir katılımcı konumuyla girdiğinde `refresh()` görünümü tazeler →
  `cameraSignature` değişir → `applyCamera` yeniden sığdırır. **Kod değişikliği gerektirmez**;
  eksik olan tek şey haritanın mount edilmesiydi.
- **Offline pin**: `participantPin` çevrimdışı katılımcıyı soluk çizer (opacity), ayrı bir ikon ya
  da etiket eklenmez — §4.8 dil sözlüğü suçlayıcı işaret istemiyor.
- Katıl ekranı (`JoinForm`) haritası **değişmez**: kendi pinin + `lg` sınırı bugünkü gibi kalır.

---

## 8. Test

Yeni:

- `InMemoryPresenceTest` — saf birim, sahte `Clock`: grace içinde mevcut, dışında değil; iki
  sekmeden biri kapanınca hâlâ mevcut.

Zenginleştirilecek (yeni dosya açılmaz):

- `DeckFlowTest` — `shuffle` presence kapısı (mevcut 1 kişi → 409; 2 kişi → SWIPING).
- `SessionCommandsTest` — `SWIPING`/`RUNOFF`'ta `join` → 409.
- `SessionViewAssemblerTest` — `online` alanı ve `hostOnline`.
- `WebSecuritySliceTest` — `/api/sessions/{slug}/ws` handshake: token yok → 401, token var → 101.
- Web: `sessionStore` testi `online` alanını taşır; Lobi/Bekle harita mount'u için mevcut render
  testleri genişletilir.

---

## 9. Bilinen sınırlar (ARCHITECTURE.md §11'e yazılacak)

- **Süreç içi.** Presence tek pod'un hafızasındadır; çok pod'da paylaşılmaz, restart'ta herkes bir
  an çevrimdışı görünür ve ilk reconnect'te düzelir. `ProviderQuotaCache` ile aynı sınıf borç.
- **Tarayıcı dışı istemci.** WS artık kimlik ister, ama presence "sekme açık" demektir; kullanıcının
  ekrana bakıyor olması değil.
- **Kör nokta artık heartbeat'tir, grace değil.** Grace 2 sn'ye indi (yalnız sayfa yenilemesini
  yutar). Gerçek sınır temiz kapanmayan bağlantılar: kapak, uçak modu, ağ geçişi FIN göndermez ve
  kopukluk ancak 10 sn'lik çift yönlü heartbeat kaçırılınca anlaşılır (~20 sn).
  Bu sınırın geçerli olması STOMP heartbeat'inin açık olmasına bağlıdır: kapalıyken sekme
  kapatma dışındaki kopmalar (kapak, uçak modu, ağ geçişi) yalnız TCP zaman aşımıyla anlaşılır
  ve pencere saatlere çıkar. Uygulamada 10 sn çift yönlü heartbeat açıktır.
