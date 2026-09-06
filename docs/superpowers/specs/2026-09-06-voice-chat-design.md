# Oturum içi sesli sohbet — tasarım

Tarih: 2026-09-06 · Durum: onaylandı (kullanıcı, 2026-09-06) · İzler: **B-12** backend, **W-11** web
(mobil parite: ayrı iz, M serisi)

İlgili kaynaklar: `backend/ARCHITECTURE.md` §8 (kimlik), §11 (olaylar) ·
`2026-09-04-session-presence-design.md` (kimlikli WS kanalı, presence katmanı)

---

## 1. Problem ve sınırlar

Oturumdaki katılımcılar karar verirken birbirleriyle **sesli** konuşabilsin. Host başlatır ve
bitirir. Kayıt yok. Sunucu ses trafiği taşımaz, saklamaz.

Kullanıcı sınırları (2026-09-06):

1. Tamamen ücretsiz yol; **yeni sunucu maliyeti çıkmamalı**.
2. Kayıt yok, yalnız bağlantı kurulur.
3. Görüşme ömrü sınırlı olsun; kullanıcı bunu hissetmesin.

Tek tarayıcı yolu WebRTC'dir. Medya P2P gider, sunucuya dokunmaz. Ücretsiz olmayan tek parça NAT
geçişinin son yüzde on ile yirmisi (§3).

---

## 2. Kararlar

| # | Karar | Gerekçe |
|---|---|---|
| K1 | **Full-mesh**, ≤6 kişi | Sunucusuz tek topoloji. Opus ~50 kbps; 6 kişiye kadar mobilde rahat, 10+ çalışmaz. Üstü için Cloudflare SFU aynı ücretsiz kotadan geçiş yolu, ilk sürümde yok |
| K2 | **STUN + Cloudflare TURN** | Yalnız STUN ana senaryoyu vurur: iki telefon, ikisi de operatör CGNAT'ı arkasında. Cloudflare Realtime ayda 1.000 GB ücretsiz relay verir, bu uygulama ölçeğinde sıfır maliyet. TURN standart protokol; Cloudflare kalkarsa herhangi bir TURN'e geçilir |
| K3 | **Durum REST'ten, sinyal STOMP SEND'den** | Başlat/bitir/kimlik mevcut komut desenine uyar. Offer/answer/ICE düşük gecikme ister ve `api` kovasını (120/dk) ICE damlalarıyla doldurmamalı. SEND yalnız TEK adrese ve yalnız ses üyelerine açılır; `/topic` altına istemci yayını düşürülmeye devam eder |
| K4 | **Ses üyeliği = kendi sinyal konusuna abonelik** | Üyelik ancak sinyal alabilen birini listeler: "REST ile katıldı ama aboneliği kopmuş" diye boşluğa giden teklif olmaz. Kopma temizliği sokete bağlı ve kesindir; REST üyelikte iki sekmeli kişinin yanlış sekmesi onu odadan atardı |
| K5 | **Teklif eden küçük id** | Her üye roster değişince bakar: bağlantısı olmayan üye için `myId < peerId` ise offer, değilse bekler. Aynı anda katılan ikili, yeniden bağlanma ve roster sırası bu kuralı bozmaz; "yeni gelen teklif eder" kuralı eşzamanlı katılımda çift teklif üretirdi |
| K6 | **Üç katmanlı ömür** (§5) | Sektör deseni: uzun sert sınır + boş oda temizliği + sessizlik tespiti. "Her 20 dk yenile" reddedildi: yenilenen sınır sınır değildir, unutulan sekme de yenilenir |
| K7 | **Sert sınır 2 saat = TURN kimlik ömrü** | Twilio varsayılanı 4 saat aynı mantık: kimse fark etmesin, kaçak kapansın. Zorlama istemci iyi niyetine değil kimlik ömrüne dayanır. Unutulan masaüstü çifti en fazla ~140 MB yer |
| K8 | **Süreç içi durum** | Oda ve üyelik hafızada, presence ile aynı borç sınıfı. Restart sohbeti bitirir, host yeniden açar. DB kolonu + migration bu ölçekte fazla |
| K9 | **Opt-in katılım** | Tarayıcı mikrofon izni ve ses autoplay'i kullanıcı jesti ister; otomatik katılım teknik olarak mümkün değil |
| K10 | **Yalnız web** | Mobil uygulama henüz yok. `react-native-webrtc` ayrı iz |
| K11 | **Cloudflare erişilemezse STUN ile devam** | TURN yalnız azınlığa lazım; çoğunluğu üçüncü tarafın kesintisine kurban etmek yanlış. Cevap `relay=false` taşır, sunucu WARN loglar, UI ilk sürümde göstermez |
| K12 | **Konuşan kişi göstergesi istemcide ölçülür** | Her istemci zaten her peer'in akışını alır; seviye Web Audio AnalyserNode ile yerelde okunur. Sunucu, ağ ve TURN maliyeti sıfır. Sinyal kanalından "konuşuyorum" yayını reddedildi: gecikme ve relay trafiği ekler. Örnekleyici katman 3'ün (§5) yarısıdır, ilk sürümde gelir |

---

## 3. Ağ: STUN, TURN ve Cloudflare

Her cihaz NAT arkasındadır. **STUN** cihaza dış adresini söyler, birkaç paket, bedava. Koni tipi
NAT'larda iki taraf birbirine "delik açar". **Simetrik NAT** ve UDP'yi kapatan güvenlik duvarları
STUN'un cevabını geçersiz kılar; tek çözüm **TURN** relay'dir ve tüm ses trafiği ondan geçer.
Tarayıcı ICE ile tüm yolları aynı anda dener, çalışan en kısasını seçer; TURN listede durur,
yalnız gerektiğinde tüketilir.

Cloudflare Realtime: SFU ve TURN için ortak **1.000 GB/ay ücretsiz**, üstü 5 sent/GB. Yalnız
TURN sunucusundan istemciye giden veri sayılır. Opus ~50 kbps ≈ 22 MB/saat/akış:

| Senaryo | Kota tüketimi | Aylık ücretsiz kapasite |
|---|---|---|
| 4 kişilik mesh, 1 kişi TURN'de | ~70 MB/saat | ~14.000 relay saati |
| 4 kişi, herkes TURN'de | ~270 MB/saat | ~3.700 oturum saati |
| 15 dk tipik sohbet, en kötü durum | ~68 MB | ~15.000 sohbet |

Kimlik üretimi: `POST https://rtc.live.cloudflare.com/v1/turn/keys/{keyId}/credentials/generate-ice-servers`,
`Authorization: Bearer {apiToken}`, gövde `{"ttl": <saniye>}`, cevap 201 `{"iceServers": [...]}`.
Uygulama sırasında belge yeniden doğrulanır; sözleşme değiştiyse adapter tek dokunuş noktasıdır.

STUN yedek listesi (Cloudflare yoksa): `stun:stun.cloudflare.com:3478`, `stun:stun.l.google.com:19302`.

Reddedilenler: sadece STUN (mobil kullanıcıya yığılan "bağlanamadı") · kendi pod'una coturn (para
sıfıra yakın ama K8s'te UDP port aralığı + public IP gerçek ops yükü) · ses paketlerini kendi
WS'inden geçirmek (tüm trafik sunucudan, yankı iptali yok) · Jitsi açık sunucusu (iframe, marka,
moderatör girişi) · PeerJS/Trystero sinyal servisleri (elimizde kimlikli kanal varken üçüncü taraf).

---

## 4. Akış

Aktörler: host H, odada olan B, yeni katılan A, backend, Cloudflare.

**Başlatma**
1. H "Sesli sohbeti başlat" der; istemci `POST /voice`.
2. Backend host ve GROUP kapılarından geçirir, odayı açar (`startedAt`, `endsAt = now + maxDuration`),
   bitiş anına kapanış zamanlar, `voice_started{endsAt}` yayınlar.
3. Herkesin görünümü tazelenir, `voice.endsAt` gelir. Dock belirir: "Sesli sohbet açık · Katıl".

**Katılım (A)**
4. A "Katıl" der. İstemci **önce mikrofon izni** ister; red → dock mesajı, sunucuya gidilmez.
5. İstemci `/topic/session/{slug}/voice/{A}` konusuna abone olur. Yalnız A abone olabilir
   (interceptor). Sunucu `SessionSubscribeEvent` ile A'yı odaya ekler, `voice_roster_changed` yayınlar.
6. İstemci `POST /voice/credentials` çağırır; cevap `{iceServers, relay, endsAt}`. Kimlik ömrü
   odanın kalan süresi + 60 sn.
7. İstemci mesh'i kurar. Roster kaynağı tazelenen görünümdeki `participants[].inVoice`.

**Mesh (K5)**
8. A roster'daki her üye için bakar. `A < H` ise A, H'ye offer; değilse H'nin offer'ını bekler.
   Offer: RTCPeerConnection(iceServers), mikrofon track'i, `createOffer`, STOMP SEND
   `/app/sessions/{slug}/voice/signal` gövde `{to: H, type: "offer", sdp}`.
9. Sinyal handler'ı: gönderen ve hedef aynı odada mı, `sdp`/`candidate` ≤ 16 KB mı. Geçerse
   `{from: A, type, sdp}` olarak `/topic/session/{slug}/voice/{H}` konusuna iletir. `from`
   istemciden **okunmaz**, sunucu damgalar. Hiçbir şey saklanmaz.
10. H offer'ı alır, kendi PC'sini kurar, answer'ı aynı yoldan A'ya yollar.
11. ICE adayları buldukça aynı kanaldan damlar. Yol seçimi tarayıcının içindedir.
12. `ontrack` gelince istemci peer başına bir `Audio` nesnesine bağlar; "Katıl" jesti autoplay'i açar.
13. Aynı şey B için; A'nın H ve B ile iki bağlantısı olur, H–B zaten vardı.

**Sustur, ayrıl, bitir**
14. Sustur: yerel track `enabled=false`; bağlantı açık kalır.
15. Ayrıl: mesh kapanır, mikrofon bırakılır, özel konudan **abonelik düşürülür**. Sunucu
    `SessionUnsubscribeEvent` ile odadan çıkarır, roster olayı yayınlar. Diğerleri tazelenen roster'da
    A'yı görmez ve A'ya olan PC'yi kapatır. Ayrı "bye" mesajı yok.
16. Sekme kapanır / sayfa yenilenir: `SessionDisconnectEvent` → odadan çıkarma, grace yok
    (PC'ler zaten ölmüştür). Sonrası 15 ile aynı.
17. Host bitirir: `DELETE /voice` → oda kapanır, zamanlayıcı iptal, üyeler silinir,
    `voice_ended{reason: HOST}`. Herkes PC'leri kapatır, mikrofonu bırakır, aboneliği düşürür.

Host odadan **ayrılabilir**, oda açık kalır; yalnız "Bitir" herkesi kapatır.

---

## 5. Ömür: üç katman

| Katman | Mekanizma | Sektör örneği | Sürüm |
|---|---|---|---|
| 1. Sert sınır | `maxDuration` (2h). Süre dolunca oda kapanır, `voice_ended{TIME_LIMIT}`. TURN kimliği kalan süre kadar üretilir, dolunca relay **fiziksel** olarak durur | Twilio `MaxParticipantDuration` 4h, Daily `eject_after_elapsed` | 1 |
| 2. Boş oturum | Presence grace bitiş zilinde `presentIn(session)` boşsa oda kapanır, `voice_ended{EMPTY}`. WS kopması üyeyi anında düşürür | LiveKit `departureTimeout`, Daily `exp` | 1 |
| 3. Sessizlik | Odada N dk kimse konuşmazsa istemci "Hâlâ orada mısın?" sorar, cevap yoksa ayrılır. Masaüstünde unutulan iki açık sekmeyi yakalayan tek katman | Discord AFK, Meet "Are you still there?" | **2** |

Katman 3 ertelendi: katman 1 zararı zaten ~140 MB'a bağlar. Seviye örnekleyici K12 ile ilk sürümde geliyor; ikinci sürümde yalnız "N dk sessizlik" zamanlayıcısı ve "Hâlâ orada mısın?" sorusu kalır.

Süre dolunca dock "Süre doldu" der, host'a "Yeniden başlat" görünür. Uzatma düğmesi **yok**:
uzatma sınırı sınır olmaktan çıkarır.

---

## 6. Backend

```text
domain/port/VoiceRoomsPort          open(sessionId, slug, endsAt, onExpire) · close(sessionId) · join(sessionId, participantId, Seat)
                                    · leaveSeat(sessionId, wsSessionId, subscriptionId) · leaveSocket(sessionId, wsSessionId) · roomOf(sessionId)
domain/port/TurnCredentialsPort     issue(Duration ttl): IceConfig(iceServers, relay)
adapter/out/presence/InMemoryVoiceRooms   Caffeine + Clock (InMemoryPresence deseni); TaskScheduler ile onExpire; close iptal eder
adapter/out/turn/CloudflareTurnCredentials Unirest; hata/eksik ayar → STUN listesi, relay=false, WARN
application/session/VoiceCommands   start · end(reason) · credentials · endIfEmpty
adapter/in/web/VoiceController      3 REST ucu
adapter/in/web/VoiceSignalController  @MessageMapping relay
adapter/in/web/VoiceRoomListener    SessionSubscribeEvent / SessionUnsubscribeEvent / SessionDisconnectEvent → üyelik + voice_roster_changed
```

`VoiceRoom(sessionId, slug, startedAt, endsAt, Map<participantId, Seat(wsSessionId, subscriptionId)> members)`.
Koltuk soket + abonelik çiftidir: UNSUBSCRIBE yalnız o çifti (`leaveSeat`), DISCONNECT soketin tüm
koltuklarını (`leaveSocket`) düşürür. `EndReason {HOST, TIME_LIMIT, EMPTY}` domain enum'udur.
Aynı katılımcının ikinci soketten aboneliği **öncekini ezer** (son abone kazanır); iki sekmeden ses
desteklenmez, §11. Oda kapalıyken gelen abonelik üyelik yaratmaz, yok sayılır. `leave` yalnız kendi
`wsSessionId`'sine ait koltuğu düşürür: eski soketin kopması yeni koltuğu silmez.

**Kapılar** (`VoiceCommands`):

| Komut | Kapı | Hata |
|---|---|---|
| `start` | host · GROUP · durum ≠ EXPIRED | 403 / 409 |
| `end` | host | 403 |
| `credentials` | oturum üyesi (katılımcı token'ı) · oda açık | 409 `voice not active` |

`start` ve `end` **idempotent**: açık odaya `start` mevcut `endsAt`'i döner; kapalı odaya `end` 204.
**Oda oturumu aşmaz:** `endsAt = min(now + maxDuration, session.expiresAt)`; TURN kimliği de bu sınıra bağlı kalır (uygulama incelemesi 2026-09-06).
`requireHost` tek yardımcıya çıkar (`application/session/SessionGates`, `SessionExpiry` deseni); `SessionCommands`, `DeckFlow` ve `VoiceCommands` aynı kuralı kullanır, kopya kalmaz.
DECIDED durumunda ses **açık kalabilir** ("orada görüşürüz"); yalnız EXPIRED kapatır.

**Zamanlayıcı** adapterdedir: `open(..., onExpire)` bitiş anına `TaskScheduler` işi kurar,
`close` iptal eder. Uygulama katmanı `onExpire` olarak `end(TIME_LIMIT)` verir; olay yayını
uygulama katmanında kalır.

**API**

| Yol | Kim | Cevap |
|---|---|---|
| `POST /api/sessions/{slug}/voice` | host | 200 `{endsAt}` |
| `DELETE /api/sessions/{slug}/voice` | host | 204 |
| `POST /api/sessions/{slug}/voice/credentials` | üye | 200 `{iceServers: [{urls, username?, credential?}], relay, endsAt}` |
| SEND `/app/sessions/{slug}/voice/signal` | ses üyesi | `{to, type: offer\|answer\|ice, sdp?, candidate?}` |
| SUBSCRIBE `/topic/session/{slug}/voice/{me}` | üye | sunucudan `{from, type, sdp?, candidate?}` |

Üç REST ucu Bruno'ya girer (`sessions/` klasörü, `docs:` bloğu: yetki, hata kodları, `api` kovası; 16 KB sınırı yalnız STOMP sinyalinindir). Oturum uçları katılımcı token'ı ister: `sessions/folder.yml` `X-Participant-Token` başlığını klasör düzeyinde taşır.

**SessionView**: `voice: {endsAt} | null` (null = kapalı; SOLO'da hep null) ·
`ParticipantDto.inVoice: boolean`. `openapi.json` yeniden üretilir.

**Olaylar** (ARCHITECTURE §11 tablosuna üç satır):

| Olay | Yük |
|---|---|
| `voice_started` | `endsAt` |
| `voice_ended` | `reason: HOST \| TIME_LIMIT \| EMPTY` |
| `voice_roster_changed` | — |

Üçü de istemci için tazeleme zilidir; `voice_ended.reason` ayrıca dock metnini seçer.
Yayınlar transaction dışındadır (oda durumu DB'de değil), `StompSessionEvents` doğrudan gönderir.

**Yapılandırma** (`AppProps`):

| Alan | Varsayılan | Not |
|---|---|---|
| `bumpinto.voice.max-duration` | `2h` | K7 |
| `bumpinto.turn.key-id` | — | sır değil |
| `bumpinto.turn.api-token` | — | **sır**, toString maskeli, env'den |

TURN ayarı eksikse uygulama **ayağa kalkar**, açılışta tek WARN, `relay=false` (K11). Bu,
`AppProps.required`'ın fail-closed kuralına bilinçli istisnadır: ses yan özelliktir, giriş değil.

**WebSocketConfig**:
- `setApplicationDestinationPrefixes("/app")`.
- Inbound interceptor: MESSAGE yalnız `/app/sessions/{ownSlug}/voice/signal` hedefine geçer,
  başka her SEND düşer. SUBSCRIBE `/topic/session/{ownSlug}` **veya**
  `/topic/session/{ownSlug}/voice/{ownParticipantId}`; başkasının özel konusu düşer.
- Transport mesaj sınırı 32 KB (Tomcat metin tamponu da `ServletServerContainerFactoryBean` ile aynı değere çekilir, yoksa 8 KB'de soket kapanır); handler `sdp` ≤ 16 KB, `candidate` en fazla 16 alan ve değerleri toplam 16 KB (istemci `RTCIceCandidate.toJSON()` yollar).
- Heartbeat ve handshake değişmez.

**PresenceListener**: grace bitiş zilinde `voiceCommands.endIfEmpty(sessionId)` (katman 2).

---

## 7. Web

```text
store/liveChannel.ts      STOMP istemcisi useSessionLive'dan buraya; subscribe(dest, cb) → unsubscribe, publish(dest, body);
                          yeniden bağlanınca kayıtlı abonelikleri kendisi kurar
lib/voiceMesh.ts          saf denetleyici, React yok; RTCPeerConnection + Audio fabrikası enjekte
store/voiceStore.ts       zustand; mesh örneği modül düzeyinde; sessionStore'a abone
components/organisms/VoiceDock.tsx   alt sabit çubuk
pages/SessionPage.tsx     GROUP + view varken dock'u durum anahtarının DIŞINDA mount eder
i18n/locales/{tr,en,nl}.json
```

**voiceMesh** girdi: `myId`, `iceServers`, `stream`, `send`, `onChange(peers, selfSpeaking)`, opsiyonel fabrikalar ve `watchdogMs`.
- `setRoster(ids)`: eksik → K5 kuralıyla PC aç ya da bekle; fazla → PC kapat, Audio bırak.
- `handleSignal({from, type, ...})`: offer → PC yoksa aç, answer, ice.
- `setMuted(bool)`: yerel track `enabled`.
- `close()`: tüm PC'ler, track'ler, Audio nesneleri, AudioContext.
- **Seviye örnekleyici (K12)**: "Katıl" jestiyle açılan tek paylaşılan AudioContext; yerel akış ve her peer akışı
  için bir AnalyserNode; 200 ms'de bir RMS okunur, eşik üstü `speaking=true`, 300 ms tutma ile titreme
  önlenir. Chrome ve Safari uzak akışı ancak bir Audio elemanına da bağlıysa analizöre verir; playback
  zaten bunu yapıyor. `onPeers` her peer için `{state, speaking}` ve `selfSpeaking` taşır.
- Peer `failed` → başlatıcı taraf PC'yi **bir kez** yeniden kurar ve yeniden teklif eder (ICE restart yerine; DTLS/ufrag belirsizliği yok); 15 sn içinde bağlanmayan peer için bekçi zamanlayıcı aynı yolu kullanır; yine olmazsa `failed`, roster gerçekten değişince yeniden denenir.

**voiceStore**: `phase: idle | joining | in | error` · `muted` · `peers: Record<id, {state: connecting | connected | failed, speaking}>` ·
`selfSpeaking` · `endedReason`. Aksiyonlar `start(slug)`, `end(slug)`, `join(slug)`, `leave()`, `toggleMute()`.
`sessionStore`'a abone: `voice` null olunca `leave()`; `participants[].inVoice` değişince `setRoster`.
Oturum konusundaki `voice_ended` gövdesinden `reason` okur.

**Katılım sırası** (bilinçli): mikrofon izni → özel konuya abonelik → kimlik isteği → mesh.
Abone olmadan kimlik alınmaz; kimlik almadan PC açılmaz.

**Dock durumları**:

| Durum | Görünen |
|---|---|
| kapalı, host | "Sesli sohbeti başlat" |
| kapalı, üye | dock **yok** |
| açık, dışarıda | "Sesli sohbet açık · N kişi" + Katıl |
| joining | Katıl pasif, etiket "Bağlanıyor…" (tasarım sisteminde spinner atomu yok, `disabled` konvansiyonu) |
| in | üye avatarları (bağlantı durumu ile), Sustur, Ayrıl, geri sayım; host'a Bitir |
| error | mikrofon izni mesajı + tekrar dene |
| süre doldu | "Süre doldu"; host'a "Yeniden başlat" |

`endedReason` 10 sn sonra silinir; üye için dock kapalı hâle döner, host için "Yeniden başlat" kalır.

Dock `sticky bottom-0` ve kabuk flex'inde `order-last`: akışta gerçek yüksekliğini kaplar, sabit boşluk tahmini yok, atıf altbilgisi üstünde kalır (uygulama incelemesi 2026-09-06).

**Konuşma göstergesi (K12)**: dock avatarında ve `ParticipantRow`'da konuşan kişiye vurgu halkası;
`ParticipantRow` sesdeki katılımcıya mikrofon ikonu basar (`inVoice`, görünümden) ve halkayı
`voiceStore.peers[id].speaking`'den okur. Sesde olmayan izleyici de halkayı görmez, çünkü akış almaz;
gösterge yalnız odadakiler için anlamlıdır.

---

## 8. Güvenlik

- Handshake ve kimlik değişmez: katılımcı çerezi, `ParticipantTokenFilter`, `anyRequest().authenticated()`.
- SEND yalnız tek uygulama adresine, yalnız kendi slug'ına; `/topic` altına istemci yayını düşer
  (mevcut koruma korunur: sahte olay → N ağır GET).
- Relay hedefi aynı odanın üyesi olmalı; `from` sunucu damgası.
- TURN kimliği kısa ömürlü; uzun ömürlü anahtar yalnız backend'de.
- SDP yerel IP taşır: yalnız aynı oturumun ses üyeleri görür. İstemci `iceCandidatePoolSize`
  varsayılan; mDNS adayları tarayıcı varsayılanıyla kalır.
- Sinyal kanalında soket başına çerçeve bütçesi vardır (§11): ses kutusuna SUBSCRIBE/UNSUBSCRIBE 20/dk, SEND 240/dk; aşan çerçeve sessizce düşer.

---

## 9. Hata durumları

| Durum | Davranış |
|---|---|
| Mikrofon reddi | Sunucuya gidilmez; dock "mikrofon izni gerekli" + tekrar dene |
| Cloudflare erişilemez / ayarsız | STUN ile devam, `relay=false`, WARN; UI sessiz |
| Kimlik isteği ağ/5xx hatası | `connectFailed` durumu: dock "bağlanılamadı · tekrar dene" (409 ise oda kapanmıştır, dock kapalı hâle döner) |
| Peer `failed` | Başlatıcı PC'yi bir kez yeniden kurar (bekçi 15 sn); sonra avatar soluk. Diğer peer'ler etkilenmez |
| `voice_ended` (HOST / TIME_LIMIT / EMPTY) | Tek kapanış yolu: mesh kapat, mikrofon bırak, abonelik düşür; dock sebebi gösterir |
| Backend restart | WS yeniden bağlanır, tazelemede `voice` null → aynı kapanış yolu |
| `credentials` 409 | Oda bu arada kapandı; dock kapalı hâle döner |
| `start` 409 (EXPIRED / SOLO) | `useSessionAction` deseniyle çevrilmiş metin |

---

## 10. Test

Yeni (yalnız yeni parçalar):
- `InMemoryVoiceRoomsTest` — sahte Clock + sahte scheduler: aç/kapat, süre dolumu `onExpire`'ı çağırır,
  `close` zamanlayıcıyı iptal eder, ikinci soket öncekini ezer.
- `VoiceCommandsTest` — host kapısı, SOLO/EXPIRED reddi, idempotentlik, kimlik ömrü = kalan süre + 60 sn.
- `VoiceOverWebSocketTest` — **gerçek STOMP istemcisi** (`PresenceOverWebSocketTest` altyapısı):
  abonelik üye yapar ve roster olayı gider · offer `from` damgasıyla hedefe ulaşır · üye olmayan
  hedef düşer · başkasının özel konusuna abonelik düşer · `/topic` altına SEND düşer · kopma üyeliği
  siler. Zorunlu: interceptor ve listener framework yapıştırıcısıdır (kural: testsiz bırakılmaz).
- `CloudflareTurnCredentialsTest` — 201 cevabı, HTTP hatası, eksik ayar → STUN + `relay=false`.

Zenginleştirilen:
- `SessionViewAssemblerTest` — `voice` ve `inVoice`; SOLO'da null/false.
- `WebSecuritySliceTest` — üç uç token ister.
- `VoiceOverWebSocketTest` — herkes kopunca oda kapanır (`EMPTY`); ek: 12 KB SDP geçer / 20 KB düşer, abone ol-çık döngüsü bütçelenir, yeniden abonelik roster'ı çaldırmaz.
- Web: `voiceMesh.test.ts` (sahte RTCPeerConnection: K5 kuralı, roster farkı, sinyal işleme, sessize
  alma, ICE restart; sahte AnalyserNode: eşik ve 300 ms tutma) · `liveChannel.test.ts` (yeniden abonelik) · `voiceStore.test.ts` (faz geçişleri,
  `voice` null → leave) · `VoiceDock.test.tsx` (yedi durum + konuşma halkası) · `ParticipantRow.test.tsx` (mikrofon ikonu, halka) · `sessionStore.test.ts` (yeni alanlar).

---

## 11. Bilinen sınırlar

- **Süreç içi.** Oda ve üyelik tek pod'un hafızasında; çok pod'da paylaşılmaz, restart sohbeti bitirir.
- **6 kişi tavanı** UI'da zorlanmaz; 7. kişi katılabilir, kalite düşer. Zorlama gerekirse `credentials`
  409 döner (tek satır).
- **İki sekme.** Aynı katılımcı iki sekmeden sese giremez: iki sekme de aynı özel konuya abone olduğu için ikisi de her sinyali alır ve çift bağlantı kurmaya çalışır; koltuk ise son aboneye aittir, ilk sekmenin kapanması üyeliği düşürmez, ikincisinin kapanması düşürür.
- **Soket başına çerçeve bütçesi (uygulama incelemesi 2026-09-06).** SUBSCRIBE/UNSUBSCRIBE 20/dk, SEND 240/dk; aşan çerçeve sessizce düşer. Roster olayı yalnız üye kümesi gerçekten değişince yayınlanır. Gerekçe: abone ol/çık döngüsü her turda herkese ağır GET yaptırabiliyordu, `/topic`'e istemci yayınının yasaklanma sebebiyle aynı sınıf.
- **Presence = sekme açık.** Unutulan masaüstü çifti katman 1'e (2 saat) kadar relay tüketir; katman 3
  ikinci sürümde.
- **TURN üçüncü taraf.** Cloudflare hesabı ve anahtar gerekir; kota `developers.cloudflare.com/realtime`
  fiyatlandırmasına bağlıdır.
- **Mobil tarayıcı arka planı.** iOS Safari arka planda WebRTC'yi askıya alır; kişi WS kopmasıyla
  odadan düşer, öne gelince yeniden katılır. Bu bir hata değil, platform sınırıdır.
