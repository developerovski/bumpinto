# Rapor F — W5 · Bekle + W6d · Gönderildi (1280 / 390) tasarım-uygulama parite denetimi

Tasarım kaynağı: `scratchpad/web-v3.html` (paylaşılan CSS 20–571, v3 ezme bloğu 386–397, presence 437–443, dock 445–462, 563–566).
Uygulama kökü: `/Users/mehmetserefoglu/projects/bumpinto/frontend/web`.

**Token kontrolü (ön koşul):** `src/styles/app.css:9-47` tasarımın `:root` değişkenleriyle 1:1 eşleşiyor (paper/card/ink/ink2/ink3/flame*/sun/hl/grass*/violet*/amber*/sand/line/line2/line-in, `--grad`, `--story-ring`, `--sh1/--sh2`, radius-card 22px, üç yazı ailesi). v3 erişilebilirlik ezmeleri de karşılanmış: `--color-amber-ink:#7e4f06`, `--color-flame-ink:#c41c4b` (`app.css:29-30`), `Overline` 11.5px/ink2 (`Overline.tsx:7`), `Badge` 12px (`Badge.tsx:17`). Bu eksende bulgu yok.

**API kısıtı (tekrar tekrar geçecek):** `frontend/shared/src/api-types.ts` → `ParticipantDto` alanları: `id, displayName, host, hasLocation, deckDone, manual, locationLabel, approxLocation, travelMode, midpointMinutes, online, inVoice, blocked, lastSeenAt, linkOpenedAt`. **Kişi başı deste ilerlemesi (kaç kart kaydırdı) alanı YOKTUR.** `online`, `lastSeenAt`, `linkOpenedAt`, `inVoice` VARDIR; dürtme uç noktası da vardır (`src/store/socialStore.ts:17` `nudge(slug, participantId, name)`, 60 sn soğuma).

---

## A. W5 · Bekle — 1280 (tasarım 1799–1893)

Ekranı basan: `src/pages/WaitingRoom.tsx` (SessionPage.tsx:47, davetli + COLLECTING/SUGGESTING).

**A-P1-1 — sağ bölge: harita vs "Mekanlar geliyor" kartı** — tasarım (1864–1883): sağ bölge yalnız üç blok — `.f-mid` orta nokta kartı, ortalanmış "Mekanlar geliyor" kartı (iki buton), `.f-steps`. **Harita yok.** app (`WaitingRoom.tsx:37-39, 89-103`): `desktop = useMediaQuery("(min-width: 1024px)")` → `showMap` masaüstünde varsayılan `true`, lazy `MapView` sağ bölgeye `fit:flex-1` ile basılıyor ve kalan yüksekliğin tamamını yiyor. Uygulamanın kendi bileşen notu da haritayı reddediyor (`MidpointCard.tsx:2` "harita YOK (§4.7)") ama sayfa yine basıyor. fix: `WaitingRoom.tsx:37-39` `desktop` varsayılanını kaldır (`showMap = mapOpen`), 1280'de de haritayı "Haritayı aç" butonunun arkasına al; sağ bölge sırası `MidpointCard` → `WaitingStatus` → `SessionSteps` olsun.

**A-P1-2 — "Kerem'i dürt" butonu davetlide yok** — tasarım (1880): bekleme kartının içinde, "Konum ve ulaşım"ın yanında `btn b-wh bsm` + `ph-hand-waving` "Kerem'i dürt"; artboard davetli (Ayşe) görünümü, yani dürtme **kurana özel değil**. app (`ParticipantList.tsx:57` `{isHost && waiting.length > 0 && (...)}`, `ParticipantList.tsx:70` `presence.hostOnly` = "Dürtme yalnız kurana görünür."): davetlide dürtme butonu hiç render edilmiyor; `WaitingStatus.tsx` de dürtme taşımıyor. fix: dürtme kapısını `isHost`'tan çıkar (uç nokta + soğuma zaten `socialStore.ts:10,17`'de), butonu `WaitingStatus.tsx:69-72`'deki "Konum ve ulaşım" butonuyla aynı satıra `flex gap-2` içinde koy (`<Button kind="white" size="sm">` + `HandWaving size={18}`), etiket `presence.nudge` ({{name}}); `presence.hostOnly` satırını bu ekrandan kaldır.

**A-P1-3 — aktivite şeridi: kartsız blok vs alev-yıkama kart** — tasarım (1821–1827): `.f-act` = ikon + iki satır, **zemin/kenar/gölge yok**, ikon `.f-act > .ic` 22px flame-deep, başlık `.h3` (17px, Bricolage 700), alt satır `.mi` (12px ink2). app (`ActivityStrip.tsx:16-19`): `rounded-card border border-line bg-flame-wash px-4 py-3`, ikon `size={20}`, başlık `text-[0.875rem] font-bold` (14px, gövde fontu). fix: `ActivityStrip.tsx:16` sınıfını `flex items-start gap-[0.6875rem]` yap (kart/zemin/kenar sil), ikon `size={22}`, başlık `<h3>` (`text-h3` = 17px font-head).

**A-P2-4 — "Mekanlar geliyor" gövde kopyası anlamı ters** — tasarım (1876): "Önce liste, sonra oylama. **Sekmeyi kapatsan da olur — hazır olunca haber veririz.**" app (`WaitingStatus.tsx:41` → `tr.json waiting.copy`): "Önce liste, sonra oylama. **Sayfayı kapatma yeter.**" — tasarım "kapatabilirsin", uygulama "kapatma" diyor. fix: `tr.json` `waiting.copy` → "Önce liste, sonra oylama. Sekmeyi kapatsan da olur — hazır olunca haber veririz." (390 varyantı için ayrı anahtar: B-P2-4).

**A-P2-5 — adım şeridi: numaralı daireler vs düz kalın etiket** — tasarım (1883, `.f-steps` 321–323): 12px gövde metni, aktif adım `<b>` (ink, 700), diğerleri ink2, aralarda 12×1px `--line2` çizgi; **numara dairesi yok**; blok `justify-content:center`. app (`SessionSteps.tsx:14-24`): her adımda 24px, 1.5px kenarlıklı, `font-head` numaralı daire; tamamlananlar `border-flame-deep bg-flame-wash text-flame-deep`; sol yaslı. fix: `SessionSteps.tsx` daireleri kaldır, `<span className={i===at ? "font-bold text-ink" : "text-ink2"}>` + `text-[0.75rem]`, ayraç `h-px w-3 bg-line2`, kapsayıcıya `justify-center` (1280 için).

**A-P2-6 — bekleyen avatarın nabzı yanlış renkte** — tasarım (442–443 `.pulse`): `rgba(222,36,86,.35)` (flame-deep) → 12px yayılım, 1.8s. app (`app.css:60-68 pulse-soft`, `.c-pulse` 381; kullanım `ParticipantRow.tsx:57`): `rgba(169,106,11,.35)` (amber) → 0.5rem (8px). fix: `app.css` `@keyframes pulse-soft` renklerini `rgba(222,36,86,.35)`/`rgba(222,36,86,0)`, yayılımı `0.75rem` yap.

**A-P2-7 — bekleme kartındaki buton ölçüsü ve yerleşimi** — tasarım (1878–1881): iki buton yan yana, `.bsm` + inline `min-height:44px`, `width:auto`, kart içinde `.row gap:8px`. app (`WaitingStatus.tsx:69-72`): tek `<Button kind="white">` varsayılan `md` → `w-full min-h-[3.25rem]` (52px, tam genişlik) (`Button.tsx:21`). fix: butonu `size="sm"` yap (42px) + `min-h-[2.75rem]` ezmesi, ikisini `<div className="flex gap-2">` içine al.

**A-P2-8 — 1280'de fazladan gizlilik notu** — tasarım (1864–1884): sağ bölge `.f-steps` ile biter, altında not yok. app (`WaitingRoom.tsx:129`): `<Note center>{t("join.privacy")}</Note>` = "Konumun bu buluşma için kullanılır ve gruba haritada yaklaşık gösterilir." her iki kırılımda basılıyor. fix: notu `lg:hidden` yap ve 390 metnini B-P2-8'deki kopyayla değiştir.

**A-P3-9 — aktivite vaadi kopyası** — tasarım (1825): "Orta nokta çevresinde (≤ 9 km) kahve mekanları aranacak" (km parantez içinde, ortada, nokta yok). app (`ActivityStrip.tsx:22` → `lobby.promiseKm`): "Orta nokta çevresinde {{activity}} mekanları aranacak (≤ {{km}} km)." fix: `tr.json lobby.promiseKm` → "Orta nokta çevresinde (≤ {{km}} km) {{activity}} mekanları aranacak".

**A-P3-10 — çevrimiçi noktanın konumu** — tasarım (439 `.avw .od`): `right:-1px;bottom:-1px`, 12px, `border:2px solid #fff`. app (`ParticipantRow.tsx:69`): `-right-0.5 -bottom-0.5` = −2px. fix: `-right-px -bottom-px`.

**A-P3-11 — konuşma göstergesi** — tasarım (440 `.od.spk`): halka **noktanın** üstünde, `box-shadow:0 0 0 3px rgba(11,122,68,.25)` (yumuşak, %25 opak). app (`ParticipantRow.tsx:57`): `ring-[3px] ring-grass ring-offset-2` — tam opak halka **avatarın** çevresinde. fix: halkayı noktaya taşı, `shadow-[0_0_0_3px_rgba(11,122,68,0.25)]`.

**A-P3-12 — "Katıldın!" kartı iç boşluğu** — tasarım (1812): `padding:16px 18px`, ikon dairesi 32px / tik 18px. app (`JoinedCard.tsx:10`): `px-4 py-[0.9375rem]` (16/15px), tek boy `c-check`. fix: `px-[1.125rem] py-4`, daire 32px (390'da 28px, bkz. B-P3-9).

---

## B. W5 · Bekle — 390 (tasarım 1894–1976)

**B-P1-1 — dikey sıra tamamen farklı** — tasarım (1902–1963): Katıldın → orta nokta → "Mekanlar geliyor" (başlık+kopya) → Kimler var + ilerleme + adım şeridi → roster kartı → iki buton → (dock) → CTA notu. app (`WaitingRoom.tsx:70-132`, `TwoZone.tsx:37-38` `mobileFirst="right"`): sağ bölge `order-1` olduğu için 390'da önce MidpointCard → "Haritayı aç" → WaitingStatus → SessionSteps → gizlilik notu, **sonra** JoinedCard → ActivityStrip → ParticipantList geliyor. Yani "Katıldın!" ve roster ekranın en altına düşüyor. fix: 390 için `mobileFirst`'ü genişlet ya da WaitingRoom'da `JoinedCard`'ı `TwoZone` dışında, üstte bas; roster'ı (`ParticipantList`) `order-3`, "Mekanlar geliyor" bloğunu `order-2` yap — hedef sıra yukarıdaki tasarım sırası.

**B-P1-2 — "Kerem'i dürt" (390)** — tasarım (1960–1963): roster kartının hemen altında `flex:1` iki buton — "Konum ve ulaşım" + "Kerem'i dürt", ikisi de 44px. app: A-P1-2'deki aynı `isHost` kapısı; 390'da hiç yok. fix: A-P1-2 ile aynı; 390'da `flex-1` verip iki butonu eşit bölüştür.

**B-P2-3 — "Mekanlar geliyor" kart olmamalı + ikinci harita işareti** — tasarım (1920–1923): sadece ortalanmış `col` — `h2` 19px + `.cp` 13px; kart yok, `.mark` yok (mark yukarıdaki `.f-mid` kartında zaten var, 1913). app (`WaitingStatus.tsx:34-37`): kart (`rounded-card border bg-card shadow-sh1`) + `lg:hidden` `MapMark` → 390'da MidpointCard'ın markıyla birlikte **iki** harita işareti görünüyor. fix: `WaitingStatus.tsx:35-37` `MapMark` bloğunu sil; 390'da kart kabuğunu kaldır (`lg:rounded-card lg:border lg:bg-card lg:shadow-sh1`), başlığı `text-[1.1875rem]` yap.

**B-P2-4 — 390 kopyası ayrı** — tasarım (1922): "Önce liste, sonra oylama. **Uygulamayı kapatsan da haber veririz.**" (1280'den farklı). app: tek `waiting.copy`. fix: `waiting.copyMobile` anahtarı ekle, `WaitingStatus`'ta `<span className="lg:hidden">`/`<span className="hidden lg:inline">` ikilisiyle bas (FinishedCard.tsx:59'daki mevcut desen).

**B-P2-5 — adım şeridinin yeri** — tasarım (1924–1931): `.f-steps`, "Kimler var" + sayaç + `.prog` ile **aynı** `col` içinde, ilerleme çubuğunun hemen altında, roster'dan önce. app: `SessionSteps` sağ bölgede (`WaitingRoom.tsx:126`), 390'da roster'dan çok önce ve ilerleme çubuğundan kopuk. fix: 390'da `SessionSteps`'i `ParticipantList`'in başlık grubunun (`ParticipantList.tsx:36-45`) içine, `<Progress>`'in altına taşı.

**B-P2-6 — CTA notu** — tasarım (1971–1973): `.cta` alanında `.mi` ortalanmış "Sayfayı kapatsan da olur; hazır olunca kilit ekranından görürsün." app (`WaitingRoom.tsx:129`): `join.privacy` (konum gizliliği) — farklı konu. fix: 390 notunu `waiting.closeHint` yeni anahtarıyla bas, `join.privacy`'yi bu ekrandan çıkar (LobbyPage'de kalabilir).

**B-P2-7 — roster satır iç boşluğu 390'da daralmıyor** — tasarım (1933, 1942, 1951): `.srow` 390'da `padding:9px 14px`, ayraç `margin:0 14px`. app (`ParticipantRow.tsx:54`): her kırılımda `px-4 py-[0.8125rem]` (16/13px); ayraç `ParticipantList.tsx:52` `mx-4`. fix: `px-[0.875rem] py-[0.5625rem] lg:px-4 lg:py-[0.8125rem]`, ayraç `mx-[0.875rem] lg:mx-4`.

**B-P2-8 — ses dock'u: koyu hap vs açık kart** — tasarım (446–447, 563): `.dock` = `#27203B` zemin, beyaz metin, `border-radius:999px`, `padding:8px 8px 8px 14px`, `left/right:14px`, `bottom:96px` (CTA'nın üstünde yüzer), `box-shadow:0 14px 34px rgba(39,32,59,.32)`. app (`VoiceDock.tsx:50-56`): `sticky bottom-0 border-t border-line bg-card shadow-sh1` — akışta, açık zeminli, köşesiz bir şerit. fix: `Bar` kabuğunu `absolute inset-x-[0.875rem] bottom-24 rounded-full bg-ink text-white px-2 py-2 pl-3.5 shadow-[0_14px_34px_rgba(39,32,59,0.32)]` yap; metin renklerini `text-white` / `text-white/72` olarak çevir.

**B-P2-9 — dock içeriği (boştayken)** — tasarım (1966–1969): avatar yığını (`.avs`, 28px, `-8px` bindirme, 2px `#27203B` kenar) → `<b>Sesli sohbet açık</b>` + `<span>1 kişi · 28 dk kaldı</span>` iki satır → sağda `.btn.rd` (flame-deep) `ph-microphone` + "Katıl". app (`VoiceDock.tsx:152-164`): avatar yığını **yok**, "Sesli sohbet açık" ve "N kişi · X kaldı" yan yana tek satırda, Katıl butonunda mikrofon ikonu yok. fix: `phase !== "in"` dalına `members` avatar yığınını ekle (in-voice dalındaki `VoiceDock.tsx:172-194` bloğunun aynısı, `size="sm"`, `-ml-2` bindirme), metni `<div className="flex flex-col"><b .../><span .../></div>` yap, Katıl butonuna `<Microphone size={18} />` koy.

**B-P3-10 — "Katıldın!" kartı 390 ölçüleri** — tasarım (1903–1905): `padding:11px 14px`, daire 28px, tik 15px. app (`JoinedCard.tsx:10`): tek ölçü `px-4 py-[0.9375rem]`. fix: `px-[0.875rem] py-[0.6875rem] lg:px-[1.125rem] lg:py-4`.

**B-P3-11 — 390'da aktivite şeridi tasarımda yok** — tasarım (1902–1963): `.f-act` bloğu 390 artboard'ında hiç yok. app (`WaitingRoom.tsx:76`): `ActivityStrip` her kırılımda basılıyor. fix: `<div className="hidden lg:block"><ActivityStrip .../></div>` (ya da bilinçli sapma olarak not düş).

---

## C. W6d · Gönderildi — 1280 (tasarım 3414–3543)

Ekranı basan: `src/pages/DeckScreen.tsx:70-101` ("gönderildi/bekleme" dalı) → `FinishedCard` + `LikedList`.

**C-P1-1 — satırlarda çevrimiçi noktası yok** — tasarım (3447, 3452, 3459): "Kim nerede" listesinin **her** satırında `.avw` + `.od` (12px yeşil nokta, 2px beyaz kenar). app (`FinishedCard.tsx:90-105` → `PersonRow.tsx:22-27`): `PersonRow` yalnız `Avatar` basıyor, presence noktası hiç yok (nokta yalnız `ParticipantRow.tsx:65-71`'de var). Veri var: `ParticipantDto.online`. fix: `PersonRow.tsx`'e `ParticipantRow.tsx:56-72`'deki `relative inline-flex` sarmalayıcı + `online-dot` `<i>` bloğunu taşı (ortak bir `PresenceAvatar` molekülüne çıkarmak iki çağıranı da toplar).

**C-P1-2 — kişi başı kart sayacı + Kerem'in ilerleme çubuğu — API ALANI YOK** — tasarım (3448, 3453, 3459–3465): her satırda `.mi tab` "12 / 12 kart", Kerem'de "hâlâ destede · 7/12" ve altında `.prog` (`height:5px`, `width:58%`). app (`FinishedCard.tsx:91-105`): `PersonRow` alt satır taşımıyor, ilerleme çubuğu yok; bileşen başlığı zaten "N/12 kart sayaçları §4.8'i ihlal ettiği için KOPYALANMADI" diyor (`FinishedCard.tsx:3-4`). **Kısıt:** `frontend/shared/src/api-types.ts` `ParticipantDto`'da kişi başı deste ilerlemesi (kaydırılan kart indeksi) alanı YOKTUR — yalnız `deckDone: boolean` var. Toplam kart sayısı `view.venues.length`'ten bilinir, ama "7/12"nin payı bilinmiyor. fix: **veri uydurma.** Ya backend'e `ParticipantDto.deckIndex?: number` eklenir ve sonra bu satır/çubuk basılır, ya da tasarımın bu iki öğesi kapsam dışı sayılıp artboard güncellenir. Ara çözüm olarak yalnız `deckDone`'a dayanan "bitti / hâlâ destede" alt satırı (sayısız) basılabilir.

**C-P1-3 — kart hizası: sol vs ortalanmış** — tasarım (3435–3440): `.card{padding:30px 30px 26px;display:flex;flex-direction:column;gap:14px}` — **sola yaslı**, `.f-lock` → `.big` 34px → `.bd m2` (max 36ch) → `.f-steps`. app (`FinishedCard.tsx:44`): `flex flex-col items-center ... text-center px-8 pt-11 pb-9`. Tüm blok ortalanıyor. fix: `items-center text-center` sınıflarını kaldır (`items-start text-left`), `px-[1.875rem] pt-[1.875rem] pb-[1.625rem] gap-3.5`; altındaki buton sütunu `FinishedCard.tsx:71` `max-w-[21.25rem]` yerine `w-auto self-start flex-row`.

**C-P1-4 — adım şeridi eksik** — tasarım (3440): kartın içinde `.f-steps` (Konumlar · Mekanlar · **Oylama** · Karar). app: `DeckScreen.tsx:70-101` ve `FinishedCard.tsx` hiç `SessionSteps` basmıyor (`FinishedCard.tsx:6` "bu bileşenin kapsamı değil (T6a)"). fix: `FinishedCard`'ın gövde kopyasının altına `<SessionSteps current="vote" />` ekle (A-P2-5'teki düzeltilmiş görünümüyle).

**C-P2-5 — başlıktaki isim vurgusuz** — tasarım (3437): `Şimdi bekliyoruz · <span class="hl-m">Kerem</span> kaydırıyor` — isim sarı fosforlu kalem (`.hl-m`, 114–115). app (`FinishedCard.tsx:51-55`): `t("deck.sentTitleWaiting", { name })` düz metin; `Highlight` atomu (`src/components/atoms/Highlight.tsx`) mevcut ama kullanılmıyor. fix: `deck.sentTitleWaiting` anahtarını `Şimdi bekliyoruz · <0>{{name}}</0> kaydırıyor` yapıp `<Trans components={[<Highlight key="0" />]}>` ile bas.

**C-P2-6 — "Kim nerede" başlığı ve "2 / 3 bitti" sayacı yok** — tasarım (3442–3445): roster kartının tepesinde `.ov` "Kim nerede" + sağda `.mi tab` "2 / 3 bitti". app (`FinishedCard.tsx:89`): başlıksız çıplak `role="list"` kutusu. Veri var (`deckDone` sayılabilir). fix: `ParticipantList.tsx:37-43`'teki başlık satırının aynısını ekle: `<Overline>{t("deck.whoWhere")}</Overline>` + `<span className="... tabular-nums">{t("deck.doneCount",{done,total})}</span>`.

**C-P2-7 — dürtme: paylaş-linki yerine gerçek dürtme + yerleşim + ton** — tasarım (3467–3472): roster kartının **içinde**, ayraçtan sonra `flex-wrap` satırda iki `.btn.b-gh bsm` — "Kerem'i dürt" (`ph-hand-waving`) ve "Kerem olmadan devam et", altında `.mi` "…yalnız kurana görünür." app (`FinishedCard.tsx:110-126`): kartın altında ayrı `max-w-[21.25rem]` sütunda `ShareButton` (`deck.nudge` = "Bekleyenleri dürt" — link kopyalama/paylaşma, `socialStore.nudge` çağrısı DEĞİL) ve `kind="white"` `deck.continueWithout`. Ayrıca app'in `ghost` tonu (`buttonStyles.ts:22`) `text-ink border-line2` iken tasarımın `.b-gh` (135) `color:var(--flame-deep)` ve **kenarlıksız**. fix: (a) `ShareButton`'ı `socialStore.nudge(slug, p.id, name)` çağıran gerçek dürtme butonuyla değiştir, etiket `presence.nudge` ({{name}}); (b) iki butonu roster kartının içine ayraçtan sonra `flex flex-wrap gap-2` satırına al, `kind="ghost" size="sm"`; (c) `buttonStyles.ts:22` `ghost` → `bg-transparent text-flame-deep border-transparent`.

**C-P2-8 — başlık meta kopyası + fazladan ilerleme çubuğu** — tasarım (3427–3428): `.mi tab` "12 / 12 kart · **gönderildi**"; başlığın altında ilerleme çubuğu **yok**. app (`DeckScreen.tsx:75` → `deck.cardsDone` = "{{total}} / {{total}} kart · **bitti**"; `DeckHeader.tsx:43` `<Progress value={props.progress} />` her zaman basılıyor). fix: `tr.json deck.cardsDone` → "… · gönderildi"; `DeckHeader`'a `progress?: number` yapıp `undefined` geçilince çubuğu basma, `DeckScreen.tsx:76`'da `progress` prop'unu kaldır.

**C-P2-9 — "Beğendiklerin" satırında uyum satırı ve fiyat/semt metası yok** — tasarım (3479–3483): sıra `.h3` ad → `.f-fit` ("Kahve için: espresso bar" / warn "Kahve değil: fırın") → `.mi tab` "★ 4.6 · €€ · merkez" → `.rg` → `.rg-g`. app (`LikedList.tsx:38-42`): ad → yalnız "★ puan" → `RangeBar`. `FitLine` bileşeni (`src/components/molecules/FitLine.tsx`) ve `VenueMeta` (fiyat/saat/semt, `VenueMeta.tsx:19-24`) mevcut ama bu listede çağrılmıyor. fix: `LikedList.tsx:39-41`'i `<FitLine venue={v} categories={categories} />` + `VenueMeta`'nın meta parçası (`★ · € · semt`) ile değiştir; `categories`/`midpointLabel` prop'larını `DeckScreen.tsx:98,135,158`'den geçir.

**C-P2-10 — liste altbilgisi farklı** — tasarım (3524): `.mi` "En uzak: Kerem · 35 dk". app (`LikedList.tsx:54` → `deck.likedNote`): "Beğeni seni bağlamaz — bitirince listeden düzeltebilirsin. Diğerlerinin beğenileri sonuçta belli olur." fix: altbilgiyi `deck.farthest` ("En uzak: {{name}} · {{min}} dk") ile değiştir; değer `fairnessOf(venue)` + `travel.labels` üzerinden zaten hesaplanabiliyor (`RangeBar.tsx:39,82`). `likedNote` metnini deste ekranındaki yerinde bırak.

**C-P2-11 — kendi satırında ad kayboluyor** — tasarım (3448): `Mehmet <span class="m2">(sen)</span>` — ad + parantez. app (`PersonRow.tsx:25`): `props.isSelf ? t("travel.self") : p.displayName` → yalnız "Sen" basılıyor, ad görünmüyor (`ParticipantRow.tsx:74-76` doğru deseni zaten uyguluyor). fix: `PersonRow.tsx:25` → `{p.displayName}{props.isSelf && <span className="font-normal text-ink2"> {t("waiting.you")}</span>}`.

**C-P3-12 — rozet metinleri büyük harfle başlıyor** — tasarım (3449, 3455, 3462): "bitti" / "kaydırıyor" (küçük harf). app (`tr.json deck.rowDone` = "Bitirdi", `deck.rowSwiping` = "Kaydırıyor"). fix: `tr.json` değerlerini "bitti" / "kaydırıyor" yap.

**C-P3-13 — hâlâ kaydıran kişinin avatarı** — tasarım (3459): `av avC` — normal renkli avatar, halkasız. app (`FinishedCard.tsx:96-97`): `waiting={!p.deckDone}` → `Avatar.tsx:41,43` kesikli kenarlı, `bg-sand text-ink3` "bekleyen" avatarı. fix: `waiting` prop'unu bu kullanımda geçme (`ring={p.deckDone}` yeter).

**C-P3-14 — küçük görsel boyu** — tasarım (3477 vb.): `width:44px;height:44px;border-radius:12px`. app (`LikedList.tsx:36`): `size={48}` + `rounded-xl` (12px). fix: `size={44}`.

**C-P3-15 — kart ölçüleri ve kopya genişliği** — tasarım (3435, 3438): `padding:30px 30px 26px`, gövde `max-width:36ch`, `.big` 34px. app (`FinishedCard.tsx:44,51,56`): `px-8 pt-11 pb-9` (32/44/36), `max-w-[34ch]`, `text-[2rem]` (32px). fix: C-P1-3'teki dolgu düzeltmesiyle birlikte `max-w-[36ch]`, `text-[2.125rem]`.

**C-P3-16 — liste satırı dolgusu** — tasarım (3476 `.f-lk` inline `padding:11px 16px`). app (`LikedList.tsx:33`): `px-4 py-[0.8125rem]` (13px). fix: `py-[0.6875rem]`.

---

## D. W6d · Gönderildi — 390 (tasarım 3544–3636)

**D-P1-1 — 390'da kart dolgusu iki katı** — tasarım (3556): `padding:16px 16px 14px`, `gap:9px`, `h1` **24px**, gövde `.cp` (13px). app (`FinishedCard.tsx:44,51,56`): kırılımdan bağımsız `px-8 pt-11 pb-9` (32/44/36px) ve `text-[2rem]` (32px) — 390'da yan boşluk iki katı, başlık %33 büyük. fix: `p-4 pb-3.5 gap-[0.5625rem] lg:px-[1.875rem] lg:pt-[1.875rem] lg:pb-[1.625rem] lg:gap-3.5`; başlık `text-[1.5rem] lg:text-[2.125rem]`; gövde `text-[0.8125rem] lg:text-base`.

**D-P2-2 — kendi satırında mikrofon ikonu + konuşma noktası yok** — tasarım (3577–3581): `Ayşe (sen)` yanında `ph-microphone` 12px (`aria-label="Sesli sohbette"`), avatarda `.od.spk` (konuşan yeşil nokta + yumuşak halka). app (`FinishedCard.tsx:91-105` → `PersonRow.tsx`): ne mikrofon ne nokta var; `inVoice`/konuşma göstergesi yalnız `ParticipantRow.tsx:77-83`'te. Veri var (`ParticipantDto.inVoice` + `voiceStore.selfSpeaking`/`peers[id].speaking`). fix: C-P1-1 ile birlikte `PersonRow`'a `ParticipantRow.tsx:48-51,65-83` presence/ses bloğunu taşı.

**D-P2-3 — dürtme butonunun yeri (390)** — tasarım (3597): Kerem'in ilerleme çubuğunun hemen **altında**, roster kartının içinde, `btn b-gh bsm` + `align-self:flex-start` + `min-height:44px`. app: C-P2-7'deki `ShareButton`, kartın dışında ve tam genişlikte. fix: C-P2-7 ile aynı; 390'da tek buton (`self-start`), "olmadan devam et" 390 tasarımında yok → `lg:` ile gizle.

**D-P2-4 — sağlayıcı atfı basılmıyor** — tasarım (3628–3631): kaydırma alanının sonunda `.f-attrs` — "Google Maps" ve "Powered by Foursquare". app (`DeckScreen.tsx:70-101`): "gönderildi" dalında `<Attribution>` **yok** (yalnız liste modunda var, `DeckScreen.tsx:128`); `AppShell.tsx:28-35` altbilgisi de yalnız yasal linkleri basıyor. Spec §11 gereği ekranda mekan verisi varken atıf zorunlu. fix: `DeckScreen.tsx:98` sağ bölgesine `<Attribution providers={listProviders} />` ekle (`listProviders` zaten `DeckScreen.tsx:39`'da hesaplı).

**D-P2-5 — dock (390, sohbetin içindeyken)** — tasarım (3632–3636 + 446–462): koyu hap, `bottom:96px`, içerik: avatar yığını (`A`,`M`) → `<b>Sesli sohbette</b>` + `<span>Mehmet konuşuyor</span>` → iki 40px yuvarlak ikon butonu (`.ic.on` beyaz = mikrofon açık, `.ic` = ayrıl `ph-phone-x`). app (`VoiceDock.tsx:170-214`): açık zeminli şerit (B-P2-8), avatarlar var ama **iki satırlı metin bloğu yok** — yerine yalnız kalan süre; "Ayrıl" ikon+metinli ghost pill (tasarımda ikon-only yuvarlak); ayrıca kalan süre tasarımın bu durumunda hiç gösterilmiyor. fix: B-P2-8'in kabuk düzeltmesine ek olarak `VoiceDock.tsx:195` yerine `<div className="flex min-w-0 flex-1 flex-col"><b>{t("voice.inVoiceTitle")}</b><span>{speakerLine}</span></div>` (konuşanın adı `voice.peers`/`selfSpeaking`'ten zaten türetiliyor, `VoiceDock.tsx:176`), "Ayrıl"ı `shape="round-sm"` + `aria-label` ikon butonu yap.

**D-P3-6 — beğeni satırında 390'da meta yok** — tasarım (3603–3612): 390 satırları yalnız ad + `.rg` + `.rg-g` (puan/uyum satırı yok) ve kartın altında altbilgi/not yok. app (`LikedList.tsx:39-41,53-54`): puan satırı ve `deck.likedNote` her kırılımda basılıyor. fix: C-P2-9'daki meta satırını `hidden lg:block`, altbilgiyi (C-P2-10'daki yeni "En uzak" satırı) `hidden lg:block` yap.

**D-P3-7 — roster satır dolgusu** — tasarım (3564, 3576, 3589): 390'da `.srow padding:11px 16px`, Kerem bloğu `padding:11px 16px;gap:8px`. app (`PersonRow.tsx:22` + `FinishedCard.tsx:98`): `py-2.5 px-4` (10/16px). fix: `py-[0.6875rem]`.

**D-P3-8 — roster kartı zemini** — tasarım (3563): `.card` (beyaz `--card`). app (`FinishedCard.tsx:89`): `bg-paper` (`#fffbf6`) — kartın içinde ikinci bir kart olduğu için tasarımda beyaz üstüne beyaz değil, ayrı bir kart olarak duruyor. Not: app'te bu kutu ana kartın **içinde** olduğundan `bg-paper` bilinçli olabilir; C-P1-3'teki yeniden hizalamayla birlikte tasarımdaki gibi ana karttan **ayrı** bir `.card` olarak dışarı çıkarılması gerekir. fix: roster'ı `FinishedCard`'ın dışına, `DeckScreen.tsx:82-96` sol bölgesine ikinci bir `<div className="rounded-card border border-line bg-card shadow-sh1">` olarak taşı.
