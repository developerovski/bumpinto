# Design parity audit — W13 · W13b · W14 · W15 · W16 · W17 · W18 · W19

Design: `scratchpad/web-v3.html` (shared CSS 20–571, v3 override block 386–397, legal reader 510–518, settings rows 520–526).
App: `/Users/mehmetserefoglu/projects/bumpinto/frontend/web` (paths below are relative to `frontend/web/`).

## Route map check (asked explicitly)

| Design URL | App route | Verdict |
|---|---|---|
| `/account` | `App.tsx:31` | present |
| `/account/consent` | `App.tsx:32` | present |
| `/privacy` | `App.tsx:27` | present |
| `/terms` | `App.tsx:28` | present |
| `/kvkk` (W16) | `/data-rights` `App.tsx:29` → `src/content/legal/dataRights.ts` | **maps** — the TR body of `/data-rights` IS the KVKK aydınlatma metni (Veri sorumlusu → İşlenen kişisel veriler → … → m.11 hakları → Başvuru, `dataRights.ts:10–41`). Only the URL and the visible title differ (see W16-1/W16-2). EN/NL bodies deliberately switch to GDPR (`content/legal/types.ts:6–11`). |
| `/attributions` (W17) | — | **genuinely missing.** No route in `App.tsx`, no page, no content file. `SourceRow.tsx` exists and is exported (`components/index.ts:41`) but is imported nowhere. |
| `/support` | `App.tsx:30` | present |
| `/account/delete` | `App.tsx:36` | present |
| `/account/deleted` | `App.tsx:37` | present |

## Backend contract check (no faked data)

All data the design shows is backed by real endpoints in `frontend/shared/src/api-types.ts`:
`PUT /api/me/consents` (line 39–48, `UpdateConsentsRequest` 597–601, `ConsentsDto` 567–575 with `updatedAt`/`version`), `GET /api/me/export` (455–462), `DELETE /api/me` (33), `POST /api/me/delete-token` (263–272). `MeResponse.authProviders` (588) backs the "Google/Apple ile giriş" label. Nothing on these screens is invented. Two contract notes: `ConsentsDto.version` is `int32` while `ConsentPage.tsx:34` falls back to the string `"1.0"` (design line 4905 prints "sürüm 1.0"); and `POST /api/me/delete-token` exists but `authStore.deleteAccount` (`store/authStore.ts:113`) does not use it — the delete flow relies on the live session only.

---

## W13 · Hesap ve veriler (design 4717–4798 / 4799–4863)

P1 — "Atıflar ve lisanslar" satırı — design (4762–4767): `Hakkında` kartı İKİ satır taşır — `ph-map-trifold` "Atıflar ve lisanslar" → `/attributions` ve `ph-lifebuoy` "Destek ve iletişim"; app (`pages/AccountPage.tsx:99–102`): `Hakkında` kartında yalnız "Destek ve iletişim" var, atıf satırı yok; fix: `tr/en/nl.json`'a `account.attributions` ("Atıflar ve lisanslar") ekle, `AccountPage.tsx:100–102` içine `<SettingRow icon={<MapTrifold size={ICON} />} label={t("account.attributions")} to="/attributions" />` satırını Destek'ten ÖNCE koy ve W17 sayfasını aç (bkz. W17-1).

P2 — Sayfa başlığı ölçüsü (390) — design (4810): mobil başlık `.h2` 19px/700; app (`AccountPage.tsx:81` → `molecules/PageHeader.tsx:7` → `styles/app.css:230–239`): `h1` mobilde `--text-display` = 34px, ≥1024'te 46px; fix: bu ekran ailesinde başlığı mobilde küçült — `PageHeader`'a `size?: "reader"` ekleyip `h1`e `text-[1.1875rem] lg:text-[2.875rem]` uygula (aynı sorun W13b/W14/W15/W16/W17/W19'da tekrarlıyor, tek düzeltme hepsini kapatır).

P2 — Satır ayraçları — design (4733, 4735, 4737 vb.): `.dv` ayraç kartın kenarından 18px (390'da 16px) içeri çekilmiş; app (`molecules/SettingsCard.tsx:9`): `divide-y divide-line` kart kenarından kenarına tam genişlikte çizgi; fix: `SettingsCard`'da `divide-y` yerine `[&>li+li]:before` yerine basitçe `SettingRow`'a üst çizgi ver: `SettingsCard` `className`'inden `divide-y divide-line` kaldır, `SettingRow.tsx:25` `<li>`'ye `[&:not(:first-child)]:border-t [&:not(:first-child)]:border-line mx-[1.125rem]` yerine iç `<span>` ile 18px inset çizgi bas.

P2 — Satır etiketi kalınlığı — design (523 `.srow.st .lb{font-weight:700}`, uygulanışı 4732–4767): ayar satırı etiketi 700; app (`molecules/SettingRow.tsx:18`): `font-semibold` = 600; fix: `SettingRow.tsx:18` `font-semibold` → `font-bold`.

P3 — Satır ölçüleri — design (521–522): `.srow.st` padding 12px 16px, gap 12px, ikon kutusu 32×32 radius 10px; app (`SettingRow.tsx:7–8`): `px-[1.125rem] py-3.5` (18/14px), `gap-3.5` (14px), ikon `h-9 w-9 rounded-xl` (36px/12px); fix: `ROW` → `gap-3 px-4 py-3`, `ICON` → `h-8 w-8 rounded-[0.625rem]`.

P3 — 390 satır yoğunluğu — design (4813 vb.): 390'da `.srow.st` padding **7px** 16px'e iner (dört bölüm tek ekrana sığsın diye); app (`SettingRow.tsx:7`): tek padding, kırılım yok; fix: `ROW`'a `py-[0.4375rem] lg:py-3` ver.

P3 — Caret rengi — design (4732 `style="color:var(--ink3)"`): satır sonu chevron ink3; app (`SettingRow.tsx:21`): `text-ink2`; fix: `text-ink3`.

P3 — Kimlik kartında sağlayıcı rozeti — design (4786): sağlayıcı `.bg g-ne` rozeti içinde `ph-google-logo` ikonuyla ("Google ile giriş"), ada ve e-postaya ayrı satır; app (`molecules/IdentityCard.tsx:61`): e-posta ve sağlayıcı tek `Note` satırında "· " ile birleşik, rozet ve ikon yok; fix: `IdentityCard.tsx:61`'i `<Note>{me.email}</Note>` + altına `<Badge tone="neutral"><GoogleLogo size={14}/>{t(...)}</Badge>` olarak ayır (`atoms/Badge.tsx` mevcut).

P3 — Dışa aktarma ipucu — design (4757): "JSON · **e-postana gelir**"; app (`i18n/locales/tr.json` `account.exportHint` = "JSON · tarayıcına iner", `AccountPage.tsx:50–69` blob indiriyor); fix: **app doğru** — uygulama gerçekten tarayıcıya indiriyor ve `GET /api/me/export` senkron dosya döndürüyor; tasarımın kopyası değiştirilmeli, kod değil. Değişiklik yok, tasarım notu.

P3 — Yasal satır 3 etiketi — design (4738): "KVKK aydınlatma metni"; app (`AccountPage.tsx:88`, `tr.json legal.dataRights` = "Veri hakların" → `/data-rights`); fix: bilinçli sapma (`content/legal/types.ts:6–11` — TR=KVKK, EN/NL=GDPR; tek başlık üç dile hizmet ediyor). Değişiklik önerilmiyor, yalnız kayda geçsin.

P3 — Bölge içi boşluk — design (4731, 4778): iki bölge de `gap:18px`; app (`AccountPage.tsx:82` → `molecules/TwoZone.tsx:53,62`): varsayılan `gap-4` (16px), `leftGap`/`rightGap` verilmemiş; fix: `<TwoZone leftGap="md" rightGap="md" …>`.

P3 — Mobil çıkış butonu (app fazlası) — design (4799–4863): 390 W13'te "Çıkış yap" HİÇ yok (yalnız 1280 sağ bölgede, 4792); app (`AccountPage.tsx:115`): `MobileCta` ile mobilde ekran altına sabit çıkış butonu ekliyor; fix: app'in eklemesi doğru (mobilde başka çıkış yolu yok) — tasarım eksiği; değişiklik önerilmiyor.

## W13b · Açık rıza tercihlerin (design 4864–4916; 1280 karşılığı W16 sağ panel 5083–5092)

P2 — "Kaydet" konumu — design (4910–4912): `Kaydet` kaydırma alanının DIŞINDA, `.cta` bölgesinde ekrana yapışık tam genişlik `b-fl`; app (`pages/ConsentPage.tsx:78`): buton `ReaderZone` içinde metnin sonunda akıyor, uzun sayfada ekranın altında kalıyor; fix: `ConsentPage.tsx`'te `Button`'ı `ReaderZone`'dan çıkarıp `<MobileCta>` (mobil, `molecules/MobileCta.tsx`) + `DesktopOnly` ikilisiyle bas — W13'teki çıkış butonuyla aynı desen.

P2 — "Verildi: …" damgası tipografisi — design (4905): `.lg-meta` — 12.5px, normal ağırlık, ink2, cümle düzeni; app (`ConsentPage.tsx:71`): `<Overline>` → 11.5px **700, tümü BÜYÜK HARF, 0.11em harf aralığı** ("VERİLDİ: 6 EYL 2026 12:41 · SÜRÜM 1.0"); fix: yeni bir `atoms/Meta.tsx` (`text-[0.78125rem] text-ink2`) ekle ve `ConsentPage.tsx:71`'de `Overline` yerine onu kullan (aynı hata W14/W15/W16'da "Son güncelleme"de tekrarlıyor — bkz. W14-2).

P2 — Konum-kapalı uyarısı koşulu — design (4906): "Konum rızanı kapatırsan buluşmalara adres yazarak katılırsın." notu konum anahtarı **AÇIKKEN** de görünüyor (kalıcı bilgi); app (`ConsentPage.tsx:72`): `{!draft.location && …}` — yalnız kapalıyken basılıyor, yani tasarımın gösterdiği durumda görünmüyor; fix: koşulu kaldır, notu her zaman bas.

P3 — Giriş paragrafı ölçüsü — design (4880): `.lg-p.m2` 15px/1.55 ink2; app (`ConsentPage.tsx:65` → `atoms/Note.tsx:7`): `text-[0.8125rem]` = 13px; fix: bu paragrafı `LegalBlocks`'un `p` bloğuyla ya da `text-[0.9375rem] leading-relaxed text-ink2` sınıfıyla bas.

P3 — Anahtar ölçüsü ve dolgusu — design (154–155): `.tog` 50×30, topuz 24px, açıkken zemin `var(--grad)` (gradyan); app (`atoms/Toggle.tsx:18–28`): 46×28, topuz 20px, açıkken düz `bg-flame-deep`; fix: `h-[1.875rem] w-[3.125rem]`, topuz `h-6 w-6` (`left-[0.1875rem]` / `left-[1.4375rem]`), açık zemin `bg-[image:var(--grad)]`.

P3 — Kapalı anahtar zemini — design (524): `.tog.off{background:#E4D9CD}` (line2, kenarlıksız); app (`Toggle.tsx:21`): `border-line2 bg-sand` (#F4EEE6 + 1.5px kenarlık); fix: kapalı durumda `bg-line2 border-transparent`.

P3 — 1280 rıza yerleşimi — design (5039, 5083–5092): masaüstünde KVKK okuyucusu (68fr) ve rıza paneli (32fr) TEK ekranda yan yana; app: rıza ayrı rota (`/account/consent`, `App.tsx:32`) ve tek sütun `ReaderZone` (`ConsentPage.tsx:64`); fix: bilinçli sapma — `content/legal/dataRights.ts:10` notu okuyucudan rıza ekranına yönlendiriyor. Değişiklik önerilmiyor; yalnız `/data-rights` sayfasına rıza ekranına giden görünür bir bağlantı yok (metin içinde "Hesap → Açık rıza" diye tarif ediliyor) — `LegalPage`'e slug'a bağlı bir `LinkButton to="/account/consent"` eklemek tasarımın niyetini karşılar.

## W14 · Gizlilik politikası (design 4917–4953 / 4954–4991)

P2 — "Neyi topluyoruz" tablosu — design (4931–4939, `.tbl` 516–518): 2 sütunlu grid, 1px `--line` kenarlık, radius 14px, hücre dolgusu 8/10px, **her satır arasında 1px ayraç**, **tek sütun zemini #FBF5EC**, 13px; app (`molecules/LegalBlocks.tsx:38–45`): `<dl>` grid, tek dış kenarlık, radius 16px, satır ayracı YOK, ilk sütun zemini YOK, `gap-x-4 gap-y-2` ile boşluklu; fix: `LegalBlocks.tsx:38–45`'te `dl`'yi `grid-cols-2 gap-0 overflow-hidden rounded-[0.875rem] border border-line text-[0.8125rem]` yap, `dt`/`dd`'ye `border-b border-line px-2.5 py-2` ver, `dt`'ye ayrıca `bg-[#fbf5ec] font-semibold`.

P2 — "Son güncelleme" satırı — design (4929, 4963): `.lg-meta` 12.5px normal ink2; app (`pages/LegalPage.tsx:23`): `<Overline>` → 11.5px bold BÜYÜK HARF tracked; fix: W13b-2'deki `Meta` atomunu burada da kullan.

P2 — Gövde metni rengi — design (512–513): `.lg-p` **ink** (#27203B), yalnız `.lg-p.m2` ink2'dir; app (`LegalBlocks.tsx:17` ve `:26`): tüm `p` ve `ul` blokları `text-ink2`; fix: `LegalBlocks.tsx:17,26`'da `text-ink2` → `text-ink`, `m2` gerektiren yerler için bloğa `{ p, muted?: true }` alanı ekle.

P3 — Okuma sütunu genişliği — design (4927): `.one … max-width:44rem; gap:11px`; app (`molecules/ReaderZone.tsx:8`): `max-w-[42rem] gap-3.5` (14px); fix: `max-w-[44rem] gap-[0.6875rem]`.

P3 — Bölüm sayısı (app fazlası) — design (4930–4950): Neyi topluyoruz · Neden topluyoruz · Kimlerle paylaşıyoruz · Ne kadar tutuyoruz · Hakların · Çocuklar · İletişim; app (`content/legal/privacy.ts:7–32`): bunlara ek "Hukuki dayanak" ve "Yurt dışına aktarım" başlıkları var; fix: app fazlası GDPR açısından doğru — değişiklik önerilmiyor, kayda geçsin.

P3 — Liste girintisi — design (514): `.lg-ul` `padding-left:18px`; app (`LegalBlocks.tsx:26`): `pl-5` = 20px; fix: `pl-[1.125rem]`.

P3 — Başlık üst boşluğu — design (511): `.lg-h` `margin:6px 0 0`; app (`LegalBlocks.tsx:16`): `mt-2` = 8px; fix: `mt-1.5`.

## W15 · Kullanım şartları (design 4992–5025)

P3 — Bölüm yapısı — design (5002–5022): Hizmet · Hesap ve davet linkleri · Kabul edilebilir kullanım · İçerik · Sorumluluk sınırı · Fesih · Değişiklikler · Uygulanacak hukuk · İletişim; app (`content/legal/terms.ts:6–23`): dokuz başlığın hepsi aynı sırada mevcut; fix: yok — eşleşiyor.

P3 — Paragraf içi vurgu — design (5008): "Kabul edilebilir kullanım" paragrafında bir cümle `<b>` ile vurgulu ("Sesli sohbette … sıfır toleransımız var."); app (`LegalBlocks.tsx:17`): `p` bloğu düz metin, kalın vurgu için tip yok, `terms.ts` vurguyu taşımıyor; fix: `LegalBlock`'a `{ p: string; strong?: string }` ya da `{ p: (string | {b: string})[] }` varyantı ekle ve `terms.ts` TR/EN/NL üçünde bu cümleyi işaretle.

W15'in başlık ölçüsü (5000: `.h2` 20px) ve "Son güncelleme" satırı (5001) sorunları W13-2 ve W14-2 ile aynı; ayrıca sayılmadı.

## W16 · KVKK aydınlatma + açık rıza (design 5026–5097 / 5098–5148)

P2 — Sayfa başlığı — design (5038, 5106): "KVKK aydınlatma metni"; app (`LegalPage.tsx:21` → `tr.json legal.dataRights` = "Veri hakların"); fix: bilinçli sapma (tek sayfa üç rejime hizmet ediyor, `content/legal/types.ts:6–11`). İstenirse TR başlığı `"Veri hakların (KVKK aydınlatma metni)"` yapılabilir; aksi halde değişiklik yok.

P3 — Amber bilgi kartında ikon — design (5108–5110): `.card` amber-w zeminli, `ph-info` ikonu (amber, 17px) + metin, satır içi yan yana; app (`LegalBlocks.tsx:18–23`): aynı zemin/kenarlık/dolgu ama **ikon yok**, düz paragraf; fix: `note` bloğunu `flex gap-2.5` yap ve başına `<Info size={17} className="mt-px flex-none text-amber" />` koy.

P3 — Bölüm yapısı — design (5111–5145): Veri sorumlusu · İşlenen kişisel veriler (liste) · İşleme amaçları · Aktarılan taraflar ve amaç · Toplama yöntemi ve hukuki sebep · Saklama süresi · İlgili kişinin hakları (m.11) (8 maddelik liste) · Başvuru; app (`content/legal/dataRights.ts:10–41`): sekiz bölümün hepsi aynı sırada, m.11 listesi ve amber not dahil; fix: yok — yapı birebir.

## W17 · Atıflar ve lisanslar (design 5149–5230)

P1 — Sayfanın kendisi — design (5149–5229): `/attributions` ekranı iki bölümden oluşur: "Mekan ve harita verisi" kartı (Google Maps Platform / Foursquare / OpenStreetMap satırları, her biri açıklama + sağda atıf rozeti) + "Bu atıflar, verinin göründüğü her ekranda da yer alır." notu, ardından "Açık kaynak" kartı (kütüphane + lisans satırları); app: rota yok (`App.tsx:19–38`), sayfa yok, `molecules/SourceRow.tsx` yazılmış ama hiçbir yerden import edilmiyor (`components/index.ts:41` dışında referans yok); fix: `pages/AttributionsPage.tsx` yaz — `Page` + `PageHeader` + `ReaderZone` içinde `Overline` + `SettingsCard`>`SourceRow` iki blok; veri kaynağı `useConfigStore().config.sources` (`ConfigSourceDto`, `api-types.ts:990–996`) ve mevcut `attribution.*` i18n anahtarları (`tr.json:431–438`); açık kaynak listesi statik sabit olarak sayfada dursun; `App.tsx`'e `<Route path="/attributions" element={<AttributionsPage />} />` ekle (RequireAuth YOK — W17 çerçevesi anonim kabuk gösteriyor, 5152–5155'te avatar yok).

P3 — Açık kaynak listesi içeriği — design (5195–5228): React Native · Expo · react-native-webrtc · Phosphor Icons · Bricolage Grotesque · Figtree · Caveat; app: — ; fix: web sayfasında ilk üçü mobil bağımlılığı; web sürümü React · Vite · Phosphor Icons + üç yazı tipi (OFL 1.1) olarak yazılmalı, mobil listesi mobil uygulamada kalmalı.

## W18 · Hesabı sil (design 5231–5284 / 5285–5327 / 5329–5367) ve Hesap silindi (5477–5498)

P1 — Onay alanının görünür etiketi — design (5272–5274): `.fld` içinde görünür `.lb` etiket "Onaylamak için SİL yaz" + altında input; app (`pages/DeleteAccountPage.tsx:70–75`): etiket yalnız `aria-label` olarak veriliyor, ekranda **hiç** etiket yok — kullanıcı boş bir kutu görüyor; fix: `TextInput`'un üstüne `<span className="text-[0.875rem] font-semibold">{t("del.confirmLabel", { word })}</span>` bas (ya da `molecules/Field.tsx`'i kullan) ve `aria-label` yerine `id`/`htmlFor` bağla.

P1 — 390 onay adımı (alt sayfa) — design (5329–5366): mobilde silme, scrim + `.sheet` içinde ayrı bir onay adımıdır: "Son kez soruyoruz" başlığı, "Onaylamak için **SİL** yaz.", input, Apple notu ve **Vazgeç + Hesabı kalıcı olarak sil** ikilisi; ekrandaki `.cta` butonu (5322–5324, "Hesabımı sil") bu sayfayı açar; app (`DeleteAccountPage.tsx:65–90`): tek adım — input ve silme butonu doğrudan sayfa akışında, alt sayfa yok, "Vazgeç" yok, "Son kez soruyoruz" adımı yok; fix: mobilde `MobileCta` içine "Hesabımı sil" butonu koy, tıklayınca `role="dialog"` bir alt sayfa aç (`molecules/MeetTimeDialog.tsx` deseni hazır), input+Vazgeç+sil oraya taşınsın; `tr.json`'a `del.sheetTitle` = "Son kez soruyoruz" ekle (`common.cancel` = "Vazgeç" zaten var).

P2 — Silme butonunun görünümü — design (5276, 5361): ana yıkıcı eylem DOLU koyu kırmızı — `background:#B3261E`, beyaz metin, gölgesiz, çöp ikonlu; app (`DeleteAccountPage.tsx:76` → `atoms/buttonStyles.ts:20`): `kind="danger"` = saydam zemin, #C0392B metin, #EFC9C2 kenarlık — yani "Çıkış yap" ile aynı ikincil görünüm; fix: `buttonStyles.ts`'e `dangerSolid: "bg-[#b3261e] text-white border-transparent shadow-none"` ekle ve `DeleteAccountPage.tsx:76`'da kullan; `danger` (b-dg) çıkışa ayrılsın.

P2 — Liste kartları — design (5246, 5255, 5303, 5312): "Silinecekler" ve "Kalacaklar" listeleri beyaz `.card` içinde (padding 14px 18px, 1px `--line`, radius 22); app (`DeleteAccountPage.tsx:54,56`): `LegalBlocks` `ul` blokları çıplak, kart yüzeyi yok; fix: her iki `LegalBlocks` çağrısını `<SettingsCard>` yerine basit bir `<div className="rounded-card border border-line bg-card p-[0.875rem_1.125rem] shadow-sh1">` ile sar.

P2 — 390'da bölge sırası — design (5297–5299): mobilde EN ÜSTTE kimlik doğrulama kartı ("Uygulama kurulu değilse de buradan silebilirsin — önce Google/Apple ile kimliğini doğrula." + Google butonu), sonra uyarı ve listeler; app (`DeleteAccountPage.tsx:50–91` → `molecules/TwoZone.tsx:51–67`): mobilde sol bölge (uyarı, listeler, çıkış) önce, kimlik doğrulama en sonda; fix: `TwoZone`'un mevcut `mobileFirst="right"` bayrağını ver (`TwoZone.tsx:35–38`) — DOM sırası bozulmadan sağ bölge mobilde öne gelir.

P2 — Doğrulama bölgesi kart yüzeyi — design (5264–5279): sağ bölgede İKİ kart var — "Kimliğini doğrula" `.h3` başlıklı beyaz kart (Google + Apple + not) ve `#EFC9C2` kenarlıklı ikinci kart (etiket + input + kırmızı buton + Apple notu); app (`DeleteAccountPage.tsx:66–88`): `Overline` + serbest akan `Note`/input/buton, hiç kart yüzeyi yok, `h3` başlık yok; fix: iki durumu da kart içine al (`rounded-card border border-line bg-card p-[1.375rem] shadow-sh1`, onay kartında `border-[#efc9c2]`), `Overline` yerine `<h3>{t("del.verify")}</h3>`.

P2 — Silinen hesap ekranındaki iğne — design (5486): `.mk-pin` **ink3, gölgesiz** (sönük iğne — veda ekranı); app (`pages/AccountDeletedPage.tsx:14`): `<MapMark />` — `muted` prop'u verilmemiş, marka gradyanı ve kırmızı gölge basılıyor (`styles/app.css:341–360`); fix: `<MapMark muted />`.

P3 — 390 kimlik doğrulama kopyası — design (5298): "Uygulama kurulu değilse de buradan silebilirsin — önce Google/Apple ile kimliğini doğrula."; app (`tr.json del.verifyHint` = "Silme isteği yalnız hesap sahibinden alınır.", `DeleteAccountPage.tsx:86`) — 1280 kopyası (5269) doğru, 390'ın "kurulum gerekmez" mesajı hiç yok; fix: `del.verifyIntro` anahtarı ekle ve doğrulama kartının en üstüne bas.

P3 — Uyarı paragrafı ölçüsü — design (5244): `.lg-p.m2` 15px; app (`DeleteAccountPage.tsx:52` → `atoms/Note.tsx:7`): 13px; fix: W13b-4 ile aynı — 15px'lik paragraf sınıfı kullan.

P3 — Silindi ekranı CTA'sı — design (5492–5494): "Kapat" `.cta` bölgesinde TAM GENİŞLİK `b-wh`; app (`AccountDeletedPage.tsx:18`): `size="fit"` — içerik genişliğinde, ortalanmış blok içinde; fix: `<MobileCta>` içine al ve `size="md"` yap (mobilde tam genişlik, ≥1024'te `DesktopOnly` fit).

P3 — Silindi ekranı başlığı — design (5488): 26px; app (`AccountDeletedPage.tsx:15` → `atoms/Heading.tsx:5`): varsayılan `display` = 34/46px; fix: `<Heading size="md" center>` (26px varyantı zaten var, `Heading.tsx:6`).

## W19 · Destek ve iletişim (design 5368–5420 / 5421–5476)

P2 — 1280 yerleşimi — design (5379): masaüstünde `.two` 58/42 — solda iletişim kartı + SSS, sağda tacir tablosu ve silme bağlantısı; app (`pages/SupportPage.tsx:21`): tek `ReaderZone` (`max-w-[42rem]`), 1280'de sayfa ortasında dar tek sütun; fix: `SupportPage`'i `TwoZone` ile kur (sol: kart + SSS, sağ: iletişim/silme bağlantısı) — `ReaderZone` yalnız gerçek düzyazı sayfalarına (W14–W16) kalsın.

P2 — İletişim kartının tipografisi — design (5382–5383, 5431–5432): kart içinde `.h3` 17px/700 "Bir şey mi takıldı?" başlığı ve ALTINDA `.mi` 12px "Genelde 1 iş günü içinde dönüyoruz."; app (`SupportPage.tsx:22`): ikisi tek `Note card` satırında 13px düz metin olarak " — " ile birleştirilmiş, başlık hiyerarşisi yok; fix: `<div className="rounded-card border border-line bg-card p-[1.375rem] shadow-sh1"><h3>{t("support.cardTitle")}</h3><Note>{t("support.cardHint")}</Note>…</div>`.

P2 — Kart aksiyonları — design (5384–5387, 5433–5436): kart içinde iki `bsm` buton — "E-posta gönder" (`b-fl`, zarf ikonu) ve "SSS" (`b-wh`, soru ikonu); app (`SupportPage.tsx:22–31`): buton yok, e-posta yalnız sayfanın altında metin bağlantısı; fix: **bilinçli sapma** (`SupportPage.tsx:3–6, 27–28` — aynı adresi ikinci kez göstermemek için buton kaldırıldı). En azından "E-posta gönder" birincil eylem olarak `LinkButton href="mailto:…"` ile karta konulmalı, alttaki tekrar eden metin bağlantısı kalksın; "SSS" butonu aynı sayfada olduğundan gereksiz.

P3 — SSS satırları — design (5390–5397, 5439–5455): tek kart içinde caret'li satırlar (`.srow`), cevaplar ekranda yok; app (`molecules/FaqItem.tsx:4`): her soru ayrı `<details>` kartı, cevaplar açılır; fix: app davranışı daha iyi (cevaplar `tr.json support.a1–a4`'te hazır); yalnız görsel olarak tek kart içinde toplansın — `FaqItem`'lardan kart kenarlığını al, hepsini bir `SettingsCard` benzeri kabın içine koy, `summary`'ye sağa dayalı caret ekle.

P3 — Tacir bilgileri tablosu — design (5401–5410, 5460–5469): `Tacir bilgileri` üstlüğü + `.tbl` (Ad · E-posta · Telefon · Adres · Web) + "AB Dijital Hizmetler Yasası (DSA) m.30 gereği yayımlanır." notu; app (`SupportPage.tsx:25–31`): yalnız `İletişim` üstlüğü ve e-posta satırı; fix: **bilinçli sapma** (`SupportPage.tsx:2–6` — kullanıcı kararı 2026-09-07: DSA m.30 pazaryerleri içindir, tacir adı/adresi mağaza listelemesinde zaten görünür). Değişiklik önerilmiyor; W16 aydınlatma metni "[tacir adresi — mağazada görünür]" yer tutucusunu (`content/legal/dataRights.ts:12`) taşıdığından yayına çıkmadan o yer tutucu doldurulmalı.

P3 — Silme bağlantısı yüzeyi — design (5412–5414): silme bağlantısı ayrı beyaz kart içinde; app (`SupportPage.tsx:30`): `LegalBlocks` `link` bloğu, düz paragraf; fix: kart yüzeyine al.
