# v3 gereksinim analizi — backend · web · mobil (2026-09-06)

Orkestratör/karar: Fable. Analiz: üç Opus ajanı (backend, web, React Native), tek tur; ham raporlar scratchpad
`req/backend.md`, `req/web.md`, `req/mobile.md`. Girdi: Web Ekranlar v3 (72 artboard), Mobil Ekranlar v3
(26), Mobil Onboarding, İzinler ve Yasal (19), yön dokümanı, uyumluluk dokümanı. Bu doküman **bağlayıcı**dır;
plan yazımı buradan başlar. Kimlikler: `R-B*`, `R-W*`, `R-M*` (ajan raporlarındaki numaralar korunur).

## 0. Özet karar

- **Mağaza kapısı önce.** Apple girişi, hesap silme (+ kurulumsuz web akışı), açık rıza, bildir/engelle olmadan
  App Store/Play reddeder. Backend paketi **B-14** kritik yol; web **W-14** ve mobil **M-5** ona bağlı.
- **Yol çubuğu / sonuç kartı / presence / mekan kartı 2.0** veri açısından büyük ölçüde hazır (kişi başı dakika,
  adalet alanları, saat, foto var); eksikler küçük alanlar (`tagline`, `lastSeenAt`, `linkOpenedAt`) + iki uç
  (`nudge`, `export`).
- **Mobil planlar yeniden yazılır:** M-1/M-2/M-3 `superseded`; yerine M-4 (temel), M-7 (kurma/katılım),
  M-8 (karar akışı), M-5 (mağaza/yasal), M-6 (sesli sohbet RN), M-9 (v3 cilası), I-3 (yayın hattı) — 2026-09-06 gece bölündü. Gerekçe: M-1 gövdesi 9 artboard'lık v2'ye ve "Apple yok"
  varsayımına dayanıyor; üç plana ek yazmak dört bağlayıcı katman üretir.
- **Sonraki ize ertelenenler:** push/Live Activity (B-16+), oturum kodu/QR UI (backend alanı B-15'te açılır),
  davet OG görseli (B-15, web meta W-15).
- **Reddedilen:** kullanıcı-mekân hafızası, streak/puan (yön dok. §3).

## 1. Destek matrisi (üç ajanın uzlaştığı hâl)

| Alan | Backend | Web | Mobil | Not |
|---|---|---|---|---|
| Apple girişi | YOK | YOK | YOK | `users.auth_provider` tek değerli |
| Hesap silme + web linki | YOK | YOK | YOK | B-3 retention planı `ready`, yürütülmedi |
| Bildir / engelle | YOK | YOK | YOK | Ses odası üyeliğinde filtre kancası yok |
| Mekan kartı 2.0 | KISMİ | KISMİ | — | `hoursToday`, `photoUrl`, `provider` VAR; "neyle bilinir" YOK |
| Yol çubuğu verisi | VAR | KISMİ (sunum çip) | — | `VenueDto.travel[]` + `FairnessDto`; `shared/fairness.ts` |
| Sonuç kartı görsel / ICS | gerek yok | YOK | YOK | İstemci işi; buluşma saati alanı yok |
| Presence + dürt + linki açtı | KISMİ | KISMİ | — | `online` VAR; `lastSeenAt`/`linkOpenedAt`/`nudge` YOK |
| Sesli sohbet | VAR | VAR (yerleşim farkı) | YOK | `voiceMesh.ts` DOM'a bağlı |
| Oturum kodu + QR | YOK | YOK | YOK | slug 8 hane, karışabilen karakterler |
| OG kartı | YOK | doğrulanamadı | — | `/preview` yalnız JSON |
| Live Activity / push | YOK | — | YOK | Cihaz jetonu tablosu yok |
| Çevrimdışı / iskelet | KISMİ | YOK | YOK | `lastSeenAt` yok → "Son görülen · 12:38" yazılamaz |
| Yasal sayfalar + rıza | YOK | YOK | YOK | `MeResponse`'ta rıza yok |
| Analitik rıza + veri indirme | YOK | KISMİ | KISMİ | `track()` koşulsuz |
| Erişilebilirlik token'ları | — | KISMİ | — | `ink3` üstlükte, rozet 11px |
| 3 etkinlik / çapa / 100 km / berabere | VAR | VAR | plan yok | |

## 2. Sözleşme kararları (üç raporun uyuşmazlıkları çözüldü — backend adları esas)

| Konu | Karar | Reddedilen adlar |
|---|---|---|
| Mekan "neyle bilinir" | `VenueDto.tagline?: string`, `taglineSource?: "FSQ"\|"OSM"`; `hoursToday` **olduğu gibi** | `knownFor`, `openingHours{}` |
| Presence 2.0 | `ParticipantDto.lastSeenAt?: string`, `linkOpenedAt?: string`, `blocked?: boolean` | `openedLink` |
| Dürt | `POST /api/sessions/{slug}/nudge/{participantId}` → 204; WS `nudged{fromParticipantId,toParticipantId}`; 60 sn/kişi | gövdeli `nudge`, olay `nudge` |
| Rıza | `MeResponse.consents{location,microphone,analytics,updatedAt,version}`; yazma **`PUT /api/me/consents`** (tam-yerine-koyma tuzağından kaçınmak için `PUT /api/me` dışında) | `analyticsConsent` tekil alan |
| Veri indirme | `GET /api/me/export` (JSON, attachment, 1/saat) | `POST` |
| Hesap silme | `DELETE /api/me` → 204, erişim anında kapanır (`deleted_at`), fiziksel silme 30 günde (B-3 işi); host oturumları silinir, katılımlar anonimleştirilir; Apple bağlıysa `revoke` (hata silmeyi engellemez). Kurulumsuz web: aynı Google/Apple girişi + `deleteConfirmToken` | `POST /api/account/delete-request` |
| Apple | `POST /api/auth/apple {identityToken, nonce, fullName?}` → `LoginResponse`; eşleştirme önce `apple_sub`, sonra e-posta; `MeResponse.authProviders[]` | ayrı revoke ucu (silmenin içinde) |
| Bildir / engelle | `POST /api/reports {sessionSlug,targetParticipantId,reason,note?}`; `GET/POST /api/me/blocks {userId?\|participantId}`, `DELETE /api/me/blocks/{id}`; anonim katılımcı engeli yalnız o oturum; engelli çift aynı ses odasına alınmaz | `/api/sessions/{slug}/blocks` |
| Oturum kodu | `sessions.join_code` 5 hane karışmayan alfabe; `SessionView.joinCode` (yalnız üyeye); `GET /api/sessions/by-code/{code}` → `SessionPreview` | `code` |
| Buluşma saati (ICS) | **Bu turda alan yok**; ICS istemcide saat soran küçük diyalogla üretilir; `meetAt` sonraki iz | `SessionView.meetAt` |
| `travelMinutes` → `travel[]` (K-B26) | W-13 **W-12 sonrasına** kilitlenir; `shared/fairness.ts` aynı planda güncellenir | — |

Flyway: V1–V11 kullanılmış. **B-3 (plan6, retention) önce yürütülür ve V12 alır** (INDEX kural 9). Sonra
**V13** users.apple_sub/apple_refresh_token/auth_providers[] · **V14** users.deleted_at/purge_after +
participants.anonymized_at · **V15** reports + blocks · **V16** user_consents · **V17** venues.tagline ·
**V18** participants.last_seen_at/link_opened_at + sessions.join_code · (**V19** device_tokens, sonraki iz).

## 3. Gereksinimler (konsolide; ayrıntı ham raporlarda)

**Backend** — R-B1 Apple girişi (M) · R-B2 hesap silme (M) · R-B3 kurulumsuz silme kimliği (S) · R-B4 bildir/
engelle (M) · R-B5 rıza tercihleri (S) · R-B6 veri indirme (S) · R-B7 `tagline` (S–M; FSQ tips doğrulanacak) ·
R-B8 presence 2.0 + dürt (S–M) · R-B9 oturum kodu (S) · R-B10 OG kartı (M) · R-B11 push (L, sonraki iz).

**Web** — R-W16 erişilebilirlik token'ları (S) · R-W1/R-W2 `RangeBar` + `TravelBars`, `TravelChips`/
`FairnessBadge` kaldırılır, 9 bileşen + DS önizlemeleri (M) · R-W7 VoiceDock 1280 sağ alt + 7. durum metni (S) ·
R-W8 mekan satırı saat/tagline/foto/FSQ atfı (S) · R-W9 `useOnline` şeridi + iskelet (S) · R-W10 yasal rotalar
(M) · R-W11 `/account` (M) · R-W12 `/account/consent` (M) · R-W13 `/account/delete` (M) · R-W14 analitik rıza
kapısı — rıza yoksa betik yüklenmez (S) · R-W17 Apple girişi (M) · R-W15 bildir/engelle paneli (M) ·
R-W5/R-W6 presence UI + dürt (S+S) · R-W3 sonuç kartı görseli `html-to-image` + `navigator.share({files})` (L) ·
R-W4 ICS (S).

**Mobil** — R-M16 app config (purpose string'ler O4/O7'den, PrivacyInfo, edge-to-edge, hesap silme URL'si) ·
R-M2 izin ön-ekranları + red kurtarma · R-M1 Apple · R-M3/R-M4/R-M5/R-M6 hesap-yasal-rıza-silme · R-M15
analitik kapılı · R-M7 bildir/engelle · R-M8 yol çubuğu (`shared/fairness.ts`) · R-M13 çevrimdışı + iskelet ·
R-M14 çapalı + 3 etkinlik · R-M9 canlı lobi/bekleme · R-M11 sonuç kartı (`react-native-view-shot`, ICS+Share) ·
R-M12 mekan kartı 2.0 · R-M10 sesli sohbet RN (L: `voiceMesh` saf mantığı shared'a, ses I/O platform adaptörü) ·
R-M17 kod/QR (sonraki iz). Yığın: Expo SDK 54+ CNG prebuild (Expo Go yok), expo-router tek stack (alt sekme
yok), Google Sign-In + `expo-apple-authentication`, `expo-location` foreground, AASA/assetlinks `bumpinto.app/j/*`,
`react-native-maps` yalnız tam ekran alt sayfada, `expo-haptics`; ters geocode **backend'e alınır** (Nominatim
mobil trafik politikası). Test: jest-expo + RNTL + Maestro e2e; STOMP/WebRTC/derin link/izin akışı gerçek
istemciyle (untested-seam kuralı).

## 4. Plan paketleri ve sıra

| Plan | İçerik | Bağımlılık | Boyut |
|---|---|---|---|
| **B-14** Mağaza uyumluluk çekirdeği | R-B1–R-B5 (V13–V16) | **B-3 ✓** (plan6, V12) | ~12 görev |
| **B-15** v3 ürün cilası | R-B6–R-B10 (V17–V18) | B-14 | ~10 görev |
| **W-13** v3 kabuk senkronu | R-W16, R-W1/2, R-W7, R-W9, R-W8 | **W-12 ✓** (K-B26) | ~10 görev |
| **W-14** Mağaza uyumluluğu web | R-W10–R-W14, R-W17 | B-14 | ~10 görev |
| **W-15** Sosyal güvenlik + paylaşım | R-W15, R-W5/6, R-W3/4 | B-14 (R-B4), B-15 (R-B8) | ~8 görev |
| **M-4** Expo iskeleti + kabuk + v3 ürün akışı | plan4 T1–T4/T7 + plan13 T1/T3/T4 + plan17 birleşik; R-M8, R-M13, R-M14, R-M2, R-M16'nın config kısmı | B-6 ✓ (mevcut API) | ~12 görev (büyük; T bölünür) |
| **M-5** Mağaza/yasal paketi | R-M1, R-M3–R-M6, R-M15, R-M7, R-M16 | B-14, W-14 (`/account/delete`, yasal URL'ler) | ~10 görev |
| **M-6** Sesli sohbet RN | R-M10, R-M9'un dock kısmı | B-12 ✓, M-4 | ~8 görev |
| M-7 / B-16 (sonraki iz) | R-M11 görsel kart+ICS, R-M12, R-M9 dürt, R-M17 kod/QR, Live Activity + push | B-15 | — |

**Kritik yol:** B-3 → B-14 → W-14 → M-5. **Paralel başlayabilir:** B-14, M-4 (mevcut API ile), W-13 (W-12 bittiyse).
Play kapalı test (12 tester × 14 gün, yeni bireysel hesap) M-5 bitmeden **başlatılmalı**.

## 5. Kullanıcı kararı gerekenler

1. M-1/M-2/M-3'ü `superseded` yapıp M-4/M-5/M-6'yı yazma kararı (öneri: evet).
2. Silme semantiği: erişim anında, fiziksel 30 gün (öneri: evet; O15 metniyle uyumlu).
3. Play geliştirici hesabı bireysel mi kurumsal mı (D-U-N-S, kapalı test kuralı); tacir bilgisi.
4. Analitik: mobil ve web'de Clarity/GA4 rıza kapılı ve varsayılan kapalı (öneri: evet).
5. "Neyle bilinir" verisi için FSQ Premium `tips` ölçümü — gerçek anahtarla bir sorgu (kullanıcıda).
6. ICS için buluşma saati: bu turda istemci diyaloğu, `meetAt` alanı sonraki iz (öneri: evet).

## 6. Riskler (birleşik)

- Apple private-relay e-postası hesap birleştirmeyi bozar → `apple_sub` birincil anahtar.
- `voiceMesh.ts` RN portu sinyal protokolünü ikiye ayırabilir → saf mesh mantığı `frontend/shared`'a.
- Yasal metinler hukukçu onaysız → rotalar/kabuk planda, metin ayrı içerik görevi.
- Kart görselinde foto CORS → `crossOrigin` + gradyan fallback, testle sabitle.
- Çapalı oturum alanlarının API'de tam karşılığı mobil ajan tarafından doğrulanamadı → M-4 T1 sözleşme denetimi.

## 7. Planlar (2026-09-06 gece, yazıldı — INDEX'e kayıtlı, hepsi `ready`)

| Plan | Dosya | Görev | Satır |
|---|---|---|---|
| B-14 | `2026-09-06-plan33-backend-store-compliance.md` | 12 | 1822 |
| B-15 | `2026-09-06-plan34-backend-v3-polish.md` | 10 | 1988 |
| W-13 | `2026-09-06-plan35-web-v3-shell-sync.md` | 12 | 1601 |
| W-14 | `2026-09-06-plan36-web-store-compliance.md` | 11 | 2211 |
| W-15 | `2026-09-06-plan37-web-social-share.md` | 9 | 1399 |
| M-4 | `2026-09-06-plan38-mobile-shell-v3.md` (temel; plan38 üçe bölündü) | 9 | 896 |
| M-7 | `2026-09-06-plan41-mobile-create-join.md` | 6 | 643 |
| M-8 | `2026-09-06-plan42-mobile-decision-flow.md` | 5 | 469 |
| M-5 | `2026-09-06-plan39-mobile-store-compliance.md` | 12 | 1579 |
| M-6 | `2026-09-06-plan40-mobile-voice.md` | 8 | 1543 |
| M-9 | `2026-09-06-plan43-mobile-v3-polish.md` | 8 | 1670 |
| I-3 | `2026-09-06-plan44-infra-mobile-release.md` | 9 | 1486 |

Sekiz Opus ajanı tek turda yazdı; her plan kendi kontrol listesinden (spec kapsamı, yer tutucu, tip tutarlılığı)
geçti; ≤1400 satır hedefi altısında aşıldı (gerçek test+kod blokları; repo emsalleri plan29 1962, plan31 2026).
Plan yazımında çıkan bulgular INDEX'e düştü: K-M5 (`SessionView`'da çapa etiketi yok), W-13 notu (`SUGGESTING`
tek transaction → iskelet `busy` penceresine bağlı; `VoiceDto` yalnız `endsAt`), W-15 sapmaları (ICS
`X-WR-TIMEZONE`, rapor sonrası otomatik engel), B-15 riskleri (FSQ `tips` ölçülmedi, OG için `fontconfig`).
