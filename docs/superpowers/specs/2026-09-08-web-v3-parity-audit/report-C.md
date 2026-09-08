# Rapor C — W3 Lobi (1280 / 390) + W3d Lobi çapalı (1280 / 390)

Tasarım: `scratchpad/web-v3.html` (ortak CSS 20–571, v3 ezmeleri 386–397, presence 437–443, dock 445–462 + 563–566).
Uygulama kökü: `/Users/mehmetserefoglu/projects/bumpinto/frontend/web`.
API alan doğrulaması: `/Users/mehmetserefoglu/projects/bumpinto/frontend/shared/src/api-types.ts`.

Sözleşme durumu (uydurma veri riski):
- `ParticipantDto.online` (685), `inVoice` (686), `lastSeenAt` (688), `linkOpenedAt` (690), `travelMode` (681), `midpointMinutes` (683) VAR — presence satırı ve "Linki açtı" metni gerçek veriye dayanıyor.
- `SessionView.anchored` (726) ve `SessionView.joinCode` (728) VAR — çapalı metinler ve "kod X7K2M" satırı uydurma değil, yalnızca uygulanmamış.
- Eksik alan bulunmadı; "dürtme" tersi yönde (uygulamada var, tasarımda yok).

---

## 1) W3 · Lobi — 1280 (tasarım 1052–1161)

1. P1 — Davet kartı: oturum kodu + Paylaş düğmesi — design (1086–1090): tek satır kart; mono link (nowrap+ellipsis), altında `kod X7K2M · hesap gerekmez`, sağda ikon-only kopyala (`.icb`, 40px daire) VE `b-fl` "Paylaş" (share-network, min-height 44px); app (InviteCard.tsx:26-39): dikey kart, break-all link + etiketli beyaz "Kopyala"; kod satırı ve Paylaş düğmesi yok. `joinCode` sözleşmede var (api-types.ts:728), `ShareButton` bileşeni de var. fix: InviteCard'ı `slug`+`joinCode` alacak biçimde genişlet, satır düzenine geçir (`flex items-center gap-2.5`), link altına `kod <b class="tabular-nums">{joinCode}</b> · hesap gerekmez` (yeni `lobby.code`), kopyalamayı 40px ikon-only yuvarlak düğmeye indir, yanına `<ShareButton kind="flame" size="sm" …/>` ekle.

2. P1 — Sol bölge sırası + "Kimler var" bloğunun bütünlüğü — design (1076–1129): f-act → davet kartı → (Kimler var + sayaç + .prog + .f-steps TEK blok, 1092–1099) → roster → gizlilik notu; app (LobbyPage.tsx:64-71): davet → ActivityStrip → SessionSteps (blok dışında ve üstünde) → ParticipantList (ParticipantList.tsx:36-45); gizlilik notu sağ bölgede (LobbyPage.tsx:112). fix: sol bölgeyi `ActivityStrip → InviteCard → ParticipantList → Note(privacy)` sırasına al, SessionSteps'i ParticipantList içinde Progress'in altına taşı.

3. P1 — Dock "warm" davet durumu — design (1154–1158 + CSS 445–461, 564): sağ altta 420px hap (`border-radius:999px`), warm = flame-wash zemin + #F6C6D2 kenar; beyaz daire içinde flame mikrofon → "Sesli sohbet" (700/14px) + "Herkes gelmeden konuşmaya başla" → kırmızı "Başlat"; app (VoiceDock.tsx:44-70, 116-143): beyaz bg-card + rounded-card dikdörtgen, ikon dairesi/başlık/alt satır yok, beyaz düğme, etiket "Sesli sohbeti başlat". fix: endsAt yokken host görünümünü warm hap'a çevir (`rounded-full bg-flame-wash border-[1.5px] border-[#f6c6d2]`, 40px beyaz mikrofon dairesi, `voice.region` + yeni `voice.warmHint`, `kind="flame" size="sm"` kısa "Başlat").

4. P2 — Başlık satırındaki `⋯` oturum menüsü — design (1072): başlığın sağında 40px `.lg` hapı içinde `ph-dots-three`; app (LobbyPage.tsx:49-58): SessionHeader'ın `action` prop'u (SessionHeader.tsx:7,20) doldurulmuyor. fix: `action={<button …><DotsThree/></button>}` geç.

5. P2 — `f-steps` görünümü — design (1098 + CSS 321–323): numara YOK, "Konumlar" bold ink, diğerleri 12px/500 ink2, ayraç 12×1px; app (SessionSteps.tsx:14-24): 24px daire içinde 1–4 numara, flame-wash dolgu, ayraç 16px. fix: daireleri kaldır, düz metin adımlar, ayraç `w-3`.

6. P2 — Etkinlik şeridinin kutulanması — design (1076–1082 + CSS 339–340): kart/zemin YOK; 22px flame ikon + .h3 (17px) + .mi; app (ActivityStrip.tsx:16-19): `rounded-card border bg-flame-wash px-4 py-3`, ikon 20px, başlık 14px. fix: düz satıra indir (flame-wash zaten davet kartının rengi — iki kutu çakışıyor), ikon 22px, başlık `text-h3`.

7. P2 — Roster host satırında iki rozet — design (1107–1108): `g-ne Kuran` + `g-gr Hazır`; app (ParticipantRow.tsx:123-129): host ise SADECE "Kuran", durum rozeti düşüyor. fix: host rozetini durum rozetinin önüne bas, ikisini birden render et.

8. P2 — Harita: hayalet yer tutucu vs otomatik mount — design (1140–1147): 1280'de bile 200px `gmap` + `f-ghostmap` "Haritayı aç"; app (LobbyPage.tsx:26-33,82-101): masaüstünde MapView doğrudan mount (2026-09-04 prezans kararı §7 — bilinçli sapma). fix: karar geçerliyse tasarımı güncelle, değilse 1280'de de hayalet yer tutucu.

9. P2 — Gizlilik notu metni/yeri — design (1129, sol bölge sonu, 12px): "Konumun ~1 km yuvarlanarak gösterilir; tam adres kimseye gitmez."; app (LobbyPage.tsx:112, sağ bölge): `join.privacy` = "Konumun bu buluşma için kullanılır ve gruba haritada yaklaşık gösterilir.". fix: yeni `lobby.privacy` anahtarı + notu sol bölge sonuna taşı.

10. P2 — OSM atfı basılmıyor — design (1150): sağ bölgede ortalanmış `f-attr` "© OpenStreetMap contributors"; app: `attribution.osm` anahtarı tr.json'da var ama hiçbir bileşen basmıyor; tek geçtiği yer MidpointCard.tsx:5'teki YANLIŞ yorum ("AppShell altbilgisinde basılı" — AppShell.tsx:28-35'te yalnız yasal bağlantılar var). Harita mount edilmediğinde maplibre kontrolü de yok. fix: MidpointCard altına atıf satırı ekle (veya AppShell altbilgisine) ve yorumu düzelt.

11. P3 — Davet kartında fazladan sticker — design (1083–1091): sticker yok; app (InviteCard.tsx:27-29): "linki at gitsin" etiketi + bunun için TwoZone.tsx:53-55'te ekstra pay. fix: sticker'ı kaldır.

12. P3 — Kart iç boşluğu — design (1083): 12px 14px; app (InviteCard.tsx:26): 18/20px. fix: `p-3 px-3.5`.

13. P3 — Avatar ölçüsü — design (CSS 185–186): 40×40 / 15px; app (Avatar.tsx:15): 44px / 16px. fix: `h-10 w-10 text-[0.9375rem]`.

14. P3 — Bekleyen avatarın nabız rengi — design (CSS 442–443): flame rgba(222,36,86,.35); app (app.css:60-68 `pulse-soft`, ParticipantRow.tsx:57): amber rgba(169,106,11,.35). fix: keyframe rengini flame yap.

15. P3 — E-bisiklet ikon sırası — design (1115): bicycle sonra 9px lightning; app (travelMode.ts:24): `[Lightning, Bicycle]`, ikisi 14px. fix: sırayı çevir, ikinciyi küçült.

16. P3 — İçerik genişliği — design (CSS 93): max 1120px; app (Page.tsx:56): 1280/1536. fix: `fit` sayfalarında `lg:max-w-[70rem]`.

17. P3 — Uygulamada fazladan öğeler — design (1100–1128): satırda `⋯` ve dürtme şeridi yok; app (ParticipantRow.tsx:113-122, ParticipantList.tsx:57-73): var (R-W6 sosyal güvenlik kararı). fix: tasarımı güncelle; kodda değişiklik gerekmiyor.

---

## 2) W3 · Lobi — 390 (tasarım 1162–1252)

1. P1 — CTA dipte, davet kartı üstte — design (1172–1248): akış `başlık+⋯ → rozetler → davet kartı → orta nokta → atıf → Kimler var+progress+steps → roster → not`, `Mekanları bul` + "…sonradan katılır" `.cta` ile DİPTE sabit (1245–1248); app (LobbyPage.tsx:59-116 + TwoZone.tsx:37-38): `mobileFirst="right"` → `orta nokta → Haritayı aç → Mekanları bul → notlar → davet kartı → şerit → adımlar → roster`; ana CTA sayfanın ortasında, davet kartı listenin altında. fix: 390'da CTA'yı `sticky bottom-0` eylem şeridine al (dock'un altına) ve mobil sıralamayı davet kartı üstte olacak şekilde kur.

2. P2 — Başlık ölçüsü — design (1174): `.h2` 21px, `⋯` ile aynı satırda; app (SessionHeader.tsx:16 + app.css:231-236): `as="h1"` → 34px. fix: mobilde `text-h2 lg:text-display-lg` (semantik h1 kalsın).

3. P2 — "Haritada gör" ikon düğmesi — design (1198): kartın sağında 40px `.icb` (map-trifold); app: MidpointCard.tsx:27-55'te düğme yok, kart altında tam genişlikte "Haritayı aç" (LobbyPage.tsx:98-100). fix: MidpointCard'a `onOpenMap` prop'u + 40px ikon düğme; tam genişlikliyi kaldır.

4. P2 — Durum rozet değil düz metin — design (1180): `· konumlar toplanıyor` `.mi`; app (LobbyPage.tsx:55): her ölçüde amber Badge. fix: `lg` altında düz `text-[0.75rem] text-ink2`.

5. P2 — Dock CTA'nın üstünde yüzer — design (1240–1244 + CSS 563 `.mb .dock{bottom:96px}`): warm hap, alt CTA şeridinin üstünde; app (VoiceDock.tsx:47-61): `order-last sticky bottom-0` tam genişlikte beyaz şerit. fix: §1.3 warm stilini mobilde de uygula, CTA şeridinin üstüne konumla.

6. P3 — Atıf satırı — design (1200): orta nokta kartının altında ortalanmış OSM atfı; app: yok (§1.10).

7. P3 — Roster satır dolgusu — design (1210,1219,1228): 11px 16px; app (ParticipantRow.tsx:54): 13px. fix: `py-[0.6875rem] lg:py-[0.8125rem]`.

8. P3 — 390 host satırında "Kuran" yok — design (1216): yalnız `g-gr Hazır`; app (ParticipantRow.tsx:123-124): "Kuran". fix: §1.7 (iki rozet) her iki ölçüyü de karşılar.

9. P3 — Etkinlik şeridi 390'da yok — design (1177–1181): yalnız rozetler; app (LobbyPage.tsx:65): her ölçüde ActivityStrip. fix: `hidden lg:flex`.

---

## 3) W3d · Lobi çapalı — 1280 (tasarım 3976–4059)

1. P1 — Çapalı satır metni ve rozeti — design (4020–4022): "Konum vermedin · gerekmiyor" + `g-gr Hazır`; app (ParticipantRow.tsx:41-45,126-128): "Konum bekleniyor…" + amber "Bekliyor" (host ise "Kuran"); `anchored` satıra hiç geçmiyor. `SessionView.anchored` VAR (api-types.ts:726). fix: ParticipantList/ParticipantRow'a `anchored` prop'u; `anchored && !hasLocation` → yeni `waiting.noLocationNeeded` + `tone="grass"` "Hazır".

2. P1 — Çapalı hazır sayacı ve ilerleme — design (4013–4015): `1 / 1 hazır`, %100; app (ParticipantList.tsx:33,41,44): `ready = hasLocation` → `0 / 1 hazır`, boş çubuk. fix: `ready = anchored ? participants.length : hasLocation sayısı`.

3. P1 — Başlık durum rozeti — design (3993): `g-am "buluşma yeri belli"`; app (LobbyPage.tsx:55): koşulsuz "konumlar toplanıyor"; tr.json'da karşılık yok. fix: `lobby.anchoredBadge` ekle, `view.anchored ? … : lobby.collecting`.

4. P2 — Çapalı işaret glifi yalnız iğne — design (4033): `.mark` içinde SADECE `mk-pin` (kesikli halka ve iki nokta yok); app (MapMark.tsx:6-11, MidpointCard.tsx:28): her durumda halka + 2 nokta. fix: `MapMark`'a `pinOnly` prop'u, MidpointCard `anchored` iken geçsin.

5. P2 — Çapalı bilgi notu — design (4029): "Davetliler konum vermeden de katılabilir; süreler kendi konumlarına göre hesaplanır."; app (LobbyPage.tsx:112): her durumda `join.privacy`. fix: `lobby.anchoredNote` ekle.

6. P2 — CTA altı notu — design (4046): "Çapalı buluşmada tek başına da arayabilirsin."; app (LobbyPage.tsx:113): yalnız konumu gelmemiş katılımcı varsa `lobby.late`; tek kişilik çapalıda hiç not yok. fix: `lobby.anchoredSolo` + `anchored && !waiting` koşulu.

7. P3 — Çapalıda etkinlik şeridi yok — design (sol bölge 4001'den davet kartıyla başlıyor); app (LobbyPage.tsx:65): her zaman. fix: `anchored` iken gizle veya vaat metnini çapalı sürüme çevir.

8. P3 — Davet kartı mono link ölçüsü — design (4004): 14px; app (InviteCard.tsx:32): 15px. fix: 13–14px.

---

## 4) W3d · Lobi çapalı — 390 (tasarım 4060–4125)

1. P1 — Sıra ve dipteki CTA — design (4093–4122): davet kartı 3. sırada, `Mekanları bul` + "Çapalı buluşmada tek başına da arayabilirsin." `.cta` ile dipte; app: §2.1'deki `mobileFirst="right"` sırası (LobbyPage.tsx:61, TwoZone.tsx:37-38). fix: §2.1.

2. P1 — Çapalı satır metni / sayaç — design (4113–4118, 4104–4106): "Konum vermedin · gerekmiyor" + Hazır, `1 / 1`, %100; app: §3.1 ve §3.2 ile aynı (ParticipantRow.tsx:41-45, ParticipantList.tsx:33,41,44). fix: §3.1 + §3.2.

3. P2 — "Haritada gör" ikon düğmesi — design (4110): `.icb` map-trifold; app: yok (LobbyPage.tsx:98-100). fix: §2.3.

4. P2 — Çapalı 390'da dock yok — design (4060–4125): artboard'da `.dock` YOK ("dock yok" etiketi); app (SessionPage.tsx:35-39 + VoiceDock.tsx:105): GROUP + host olduğu için warm dock her zaman basılır. fix: kararı netleştir — gösterilecekse tasarımı güncelle, gösterilmeyecekse VoiceDock'a katılımcı sayısı kapısı ekle (şu an yok).

5. P3 — Sayaç metni — design (4104): `1 / 1` ("hazır" yok; 1280 çapalıda var); app (ParticipantList.tsx:41): her zaman "… hazır". fix: tasarım içi tutarsızlık, 1280 sürümü esas — kod değişikliği yok.

6. P3 — Etkinlik şeridi / rozet — design (4098–4101): tek rozet + `· buluşma yeri belli` düz metin, `f-act` yok; app: ActivityStrip + amber rozet. fix: §2.4 + §2.9.
