# BumpInto — MVP Tasarım Dokümanı

Tarih: 2026-08-31
Durum: Onaylandı (brainstorming oturumu sonucu)

## 1. Problem ve Ürün

Farklı şehirlerdeki insanlar buluşmak istediğinde iki problem yaşar:
1. İkisine de adil bir "orta nokta" bulmak zor.
2. Orta noktadaki şehirlerde (ör. 's-Hertogenbosch ↔ Someren için Eindhoven,
   Boxtel, Helmond, Best) ne olduğunu bilmiyorlar.

**BumpInto**, bir buluşma oturumu açıp davet linki paylaşarak herkesin
konumunu topladığı, coğrafi orta noktaya göre etkinlik türüne uygun mekan
önerdiği ve grubun bir kart destesini kaydırarak birlikte karar verdiği
bir üründür.

**Hedef:** Gerçek ürün / startup. Süre kısıtı yok; doğru mimari öncelikli.
**İlk pazar:** Hollanda. UI dili İngilizce başlar, i18n altyapısı ilk günden kurulur.

## 2. Çekirdek Akış (Happy Path)

1. Host mobil uygulamada (Expo RN) hesapla giriş yapar, oturum oluşturur:
   etkinlik türü + kendi konumu (GPS veya adres) + opsiyonel isim/tarih.
2. Uygulama davet linki üretir: `bumpinto.app/j/{slug}` (nanoid, tahmin edilemez).
3. Katılımcı linki tarayıcıda açar (React web): sadece ad + konum
   (tek tuş GPS veya adres/şehir arama). Kayıt yok.
4. Host katılımcıları gerçek zamanlı görür; hazır olunca "Mekanları bul" der
   (en az 2 konum gerekir).
5. Backend coğrafi orta noktayı ve yayılıma göre yarıçapı hesaplar,
   kategoriye göre mekanları çeker, DB'ye snapshot'lar.
6. Herkese aynı mekan destesi düşer. Her kart: ad, fotoğraf, puan, fiyat
   seviyesi, açık/kapalı + kişi başı tahmini yol süresi. Katılımcı kartları
   tek tek beğenir ya da geçer (kaydırma jesti veya buton — bkz. §4).
7. Deste bitince "Ortak nokta" ekranı: herkesin beğendiği mekanlar. Kesişim
   tek mekansa karar verilir; birden fazlaysa aralarında runoff açılır;
   kesişim boşsa en çok beğeni alan 3 mekan runoff'a girer.
8. Karar → Google Maps yol tarifi linki. Runoff beraberliğinde host seçer.

**Etkinlik kategorileri (MVP):** kahve, yemek, içki/bar, yürüyüş/park,
aktivite (bowling, bilardo vb.).

**MVP dışı (bilinçli):** chat, arkadaş listesi, seyahat süresi eşitlemeli
orta nokta, toplu taşıma rotalama, uygulama içi navigasyon, push bildirim
(v1.1), takvim entegrasyonu.

## 3. Mimari

### Repo düzeni (tek repo, polyglot)

```
bumpinto/
├── pnpm-workspace.yaml # JS workspace tanımı: frontend/*
├── .npmrc              # node-linker=hoisted (Metro/EAS uyumu)
├── package.json        # kök scriptler: codegen, dev:web, dev:mobile
├── backend/            # Spring Boot 4.x, Java 21, Maven — JS araçlarından bağımsız
├── frontend/
│   ├── mobile/         # @bumpinto/mobile — Expo RN, host uygulaması
│   ├── web/            # @bumpinto/web — React + Vite, katıl/oyla sayfası
│   └── shared/         # @bumpinto/shared — OpenAPI'den üretilen TS client + ortak tipler
└── docs/
```

JS tarafı **pnpm workspaces** ile yönetilir (Nx/Turborepo bilinçli olarak yok —
3 paket için orkestratör değil linker gerekir; Turborepo ihtiyaç doğarsa
sonradan eklenir). `shared`, web ve mobile'a `workspace:*` ile bağlanır.
Backend-frontend köprüsü tek nokta: backend `openapi.json` üretir, kök
`pnpm codegen` scripti shared'daki client'ı yeniler. CI'da backend ve
frontend ayrı pipeline'lardır.

### Sözleşme senkronu

Backend `springdoc-openapi` ile OpenAPI spec üretir → `frontend/shared`
içine TS client otomatik generate edilir. Mobil ve web aynı client'ı
kullanır; API değişimi frontend'de derleme hatası olarak yakalanır.

### Backend: hexagonal modüler monolit (DDD)

- Spring Boot 4.x, Java 21. Tek deploy edilebilir uygulama; mikroservis yok.
- Ports & adapters: `domain` (saf çekirdek — geo, deck, session, venue),
  `application` (use case'ler), `adapter.in.web`, `adapter.out.persistence`,
  `adapter.out.provider` (dış HTTP: Unirest), `infra`. Bağımlılık yönü daima
  içeri; ArchUnit testle zorlanır.
- Güvenlik: Spring Security — tüm uçlar varsayılan kilitli, public uçlar
  açıkça permitAll.
- **DB:** PostgreSQL. Redis MVP'de yok; mekan arama cache'i Caffeine
  (in-memory, geohash+kategori anahtarı, TTL). Çoklu pod'da Redis'e geçilir.
- **Auth:** Host için Google Sign-In → backend JWT. Katılımcı için auth yok;
  oturuma özel imzalı participant token.
- **Realtime:** Spring WebSocket (STOMP), `/topic/session/{id}`.
  Olaylar: `participant_joined`, `deck_ready`, `deck_progress`,
  `runoff_started`, `session_decided`. `deck_progress` yalnızca kaç kişinin
  desteyi bitirdiğini taşır — kimin neyi beğendiğini karar anına kadar
  sızdırmaz, aksi halde son kaydıran sürüyü takip eder.
  WS düşerse istemci 3 sn polling'e döner.

### Mekan sağlayıcı katmanı

`VenueProvider` arayüzü; iki implementasyon:
- **Foursquare Places** — birincil arama (cömert ücretsiz kota).
- **Google Places** — detay zenginleştirme (fotoğraf/puan/açılış saati
  kalitesi). Yalnızca desteye giren mekanlar zenginleştirilir; deste
  hedefi 12-15 kart (kaydırmanın anlamlı olması için alt sınır 6, üst sınır
  20 — üstü yorucu). Fazlası çağrılmaz (maliyet kontrolü).

Üçüncü varyasyon (OSM/Overpass) muhtemel; soyutlama AGENTS.md design
pattern eşiğini karşılıyor (≥3'e giden gerçek varyasyon + bağımsız evrim +
test izolasyonu).

### Coğrafi hesaplar

- **Orta nokta:** küresel centroid (lat/lng → 3B vektör ortalaması → geri).
- **Yarıçap:** katılımcı yayılımından türetilir; min 1 km. Sonuç 0 ise ×2
  genişletme, en fazla 3 kez; hâlâ 0 ise kullanıcıya "kategori değiştir" önerisi.
- **Yol süresi:** MVP'de haversine × 1.3 heuristiği (dış API yok, ücretsiz).
  v1.1'de bare-metal K8s üzerinde self-host OSRM.
- **Geocoding (adres → koordinat):** Nominatim (ücretsiz, kullanım
  politikasına uygun oranda, sonuçlar cache'lenir).

## 4. Deste Mekaniği ve Karar Motoru

Kaydırma ayrı bir "mod" değil, **oylamanın kendisidir**. Host seçim yöntemi
belirlemez — tek mekanik vardır. Gerekçe: henüz kullanıcı yokken iki mod inşa
etmek iki hipotezi aynı anda test etmek olur; biri kaçınılmaz olarak ölü kod
kalır ve hangisinin öldüğü ölçülemez.

### Etkileşim

- Deste herkese aynı sırada sunulur (`venues.deck_order`).
- Her kart için iki eylem: **beğen** veya **geç**.
- Kaydırma jesti tek yol değildir: her kartta görünür beğen/geç butonları
  bulunur. WCAG 2.2 `dragging-alternative` gereği her sürükleme eyleminin
  tek-işaretçi ve klavye alternatifi zorunludur.
- **Geri al:** son karar bir adım geri alınabilir. Kaydırma alternatifleri
  bilerek gizlediği için bu kaçış kapısı zorunludur.
- **"Hepsini gör":** deste her an liste görünümüne çevrilebilir. Ayrı mod
  değil — kaydırmanın gizlediği karşılaştırmalı bilgiyi geri veren kaçış
  kapısıdır. Listeden beğenmek, kaydırarak beğenmekle aynı kaydı üretir.

### Karar motoru

Deste bitince örtüşme hesaplanır: desteyi bitiren katılımcıların beğendiği
mekanların kesişimi.

| Kesişim | Sonuç |
|---|---|
| Tam 1 mekan | Doğrudan `DECIDED` — runoff yok |
| 2+ mekan | `RUNOFF`: yalnızca o mekanlar arasında tek seçimli oylama |
| 0 mekan | `RUNOFF`: en çok beğeni alan 3 mekan (eşitlikte `rating` kırar) |

Runoff sonrası beraberlik kalırsa host seçer.

**Kısmi katılım:** host, herkes desteyi bitirmeden kararı zorlayabilir;
hesap yalnızca desteyi bitirmiş katılımcılar üzerinden yapılır. Tek bir
kişinin kaydırmaması tüm grubu kilitlemez.

### Az sonuçlu deste

Deste 6 karttan azsa kaydırma antiklimaks olur ve mekanik değerini kaybeder.
Bu durumda istemci doğrudan liste görünümüyle açılır; karar motoru değişmez
(liste seçimi = beğeni). Kırsal orta noktalarda beklenen durumdur ve hata
değildir.

## 5. Veri Modeli

```
users        (id, email, name, auth_provider)
sessions     (id, slug, host_id, activity_type, status, expires_at, created_at)
participants (id, session_id, display_name, lat, lng, token, joined_at,
              deck_done_at)
venues       (id, session_id, provider, external_id, name, lat, lng,
              rating, price_level, photo_url, maps_url, deck_order)
swipes       (session_id, venue_id, participant_id, liked, swiped_at)
             → unique(venue_id, participant_id)
votes        (session_id, venue_id, participant_id)   -- yalnızca runoff
             → unique(session_id, participant_id)
```

`sessions.status`: `COLLECTING → SUGGESTING → SWIPING → [RUNOFF] → DECIDED`
(+ `EXPIRED`). `RUNOFF` koşulludur — kesişim tek mekan verdiğinde atlanır.

Kurallar:

- Host da bir `participants` satırıdır (oturum oluşturulurken konumuyla
  birlikte eklenir); orta nokta hesabında, destede ve runoff'ta katılımcılarla
  eşit muamele görür.
- Mekanlar oturum başına snapshot'lanır; swipe ve oy sabit satırlara bağlanır.
- `swipes.liked` boolean: `true` beğeni, `false` geçme. Geçmeler de saklanır —
  tam tercih vektörü hem sıralama hem ileride kişiselleştirme için değerlidir.
- Geri alma, `swipes` satırını siler (yeni satır yazmaz).
- Çift swipe ve çift runoff oyu DB unique kısıtlarıyla engellenir.
  Runoff tek seçimlidir: kısıt katılımcı başına tek satırdır.
- `DECIDED` olana kadar geç katılım serbest; geç katılan desteyi baştan alır.

## 6. Hata Yönetimi ve Güvenlik

- **Sağlayıcı hatası:** 1 retry → diğer sağlayıcıya fallback → ikisi de
  düşerse host'a hata olayı + "tekrar dene".
- **GPS reddi:** adres/şehir arama ile manuel giriş.
- **WS kopması:** polling fallback (3 sn).
- **Rate limiting:** Bucket4j + Caffeine, IP anahtarlı uç politikaları (auth 5/dk,
  join 10/dk, find-venues 3/dk, create 10/dk, diğer /api 120/dk); 429 + Retry-After.
  Çoklu pod'da Redis backend'i.
- **SQL injection duruşu:** parametrik sorgular tek koruma; ArchUnit kuralı
  EntityManager/JdbcTemplate'i production kodda yasaklar. Girdi hijyeni: Texts
  normalizer (kontrol karakteri/uzunluk/boşluk) + DTO @Size. Tırnak/keyword
  temizleyici bilinçli olarak yok (meşru veriyi bozar, koruma sağlamaz).
- **Kimlik/token mimarisi:** Google id_token yalnız `/api/auth/google`'da doğrulanır;
  backend kendi HMAC-imzalı access token'ını (12h TTL) üretir. Web istemcisi token'ları
  ASLA tutmaz — HttpOnly `SameSite=Lax` cookie'ler (`bumpinto_at`, `bumpinto_pt_{slug}`)
  + `withCredentials` axios. Mobil: token SecureStore'da, `Authorization: Bearer` ile.
  CSRF: SameSite=Lax + origin-kısıtlı credentialed CORS (ayrı CSRF token'a bilinçli hayır).
- **Ortamlar:** her uygulamada 3 profil — `local`, `preprod`, `prod` (backend Spring
  profilleri; web Vite mode'ları; mobil EAS build env'leri).
- **GDPR:** katılımcıdan sadece ad + koordinat; süresi dolan oturumlar
  30 gün sonra kalıcı silinir. Oturum varsayılan 24 saatte expire olur.
- Secrets asla loglanmaz; `.env` okunmaz (AGENTS.md).

## 7. Test Stratejisi

AGENTS.md test politikasına uygun — test çöplüğü yok:
- Unit test sadece gerçek mantıkta: orta nokta/yarıçap hesabı, yarıçap
  genişletme, sağlayıcı yanıt eşlemesi ve **karar motoru**.
- Karar motoru üç dalın hepsiyle test edilir: kesişim 1 → `DECIDED`,
  kesişim 2+ → `RUNOFF`, kesişim 0 → en çok beğenilen 3. Kısmi katılım
  (desteyi bitirmeyen katılımcının hesaba katılmaması) ayrıca test edilir.
- Backend'de tek happy-path entegrasyon testi:
  create → join → suggest → swipe → decide (sağlayıcılar mock).
- Frontend smoke test.

## 8. Deploy

- Docker imajları → bare-metal K8s. CI: GitHub Actions (komutlar rtk ile).
- Web statik build (nginx/ingress), backend container, Postgres.
- Mobil: Expo EAS build → TestFlight / Play Internal Testing; store yayını
  MVP doğrulamasından sonra.
- Dış hazırlıklar: domain, Foursquare + Google Places API anahtarları,
  Google Sign-In OAuth yapılandırması.

## 9. Onaylanan Kararlar Özeti

| Karar | Seçim |
|---|---|
| Hedef | Gerçek ürün / startup |
| Çekirdek akış | Oturum + davet linki |
| Platform | Host: Expo RN app · Katılımcı: web |
| Backend | Spring Boot 4.x — DDD + hexagonal, ArchUnit korumalı |
| Dış HTTP / Güvenlik | Unirest (adapter.out.provider) · Spring Security |
| Kimlik/token | Backend HMAC JWT; web: HttpOnly cookie, mobil: SecureStore+Bearer |
| Ortam profilleri | local · preprod · prod (Spring / Vite mode / EAS env) |
| JS monorepo | pnpm workspaces (hoisted linker); Nx/Turborepo yok |
| Frontend mimarisi | Atomic design (atoms/molecules/organisms), tüm bileşenler reusable |
| Frontend state / HTTP | Zustand · axios (shared'da tipli tek client) |
| Mekan verisi | Karma: Foursquare arama + Google detay |
| Orta nokta | Coğrafi centroid + kişi başı süre (heuristik) |
| Hesap | Host hesaplı (Google Sign-In), katılan isimle |
| Karar mekanizması | Kaydırmalı deste = oylama; koşullu runoff |
| Mod seçimi | Yok — tek mekanik (host yöntem seçmez) |
| Realtime | STOMP WebSocket + polling fallback |
| Süre | Kısıt yok; mimari kalite öncelikli |
| UI tasarımı | "Warm Pop" — onaylandı (2026-09-01) |

## 10. Onaylanan UI Tasarımı

Claude Design'da tasarlandı ve onaylandı ("Warm Pop" dili — açık, canlı,
insan dokunuşlu; FB/IG/Tinder ailesi). **Claude Design canlı ve BAĞLAYICI
kaynaktır:** UI implemente eden ajan artboard'ları MCP ile güncel halinden okur,
birebir uygular; kendi tasarımını yapmaz, eksik tasarımda kullanıcıya sorar:

- Design System: claude.ai/design/p/b536b3aa-8945-4865-b7e5-e693f8d5a588
  (Design System v2.dc.html)
- Ekranlar: claude.ai/design/p/719fcd5f-bb62-4356-9c53-7d4f0a8fbe36
  (Mobil Ekranlar v2.dc.html — 9 ekran, Web Ekranlar v2.dc.html — 4 ekran)

Özet: paper #FFFBF6 zemin, ink #27203B, alev gradyanı #FD3E6B→#FF7854
(butonlarda düz #DE2456 + beyaz), güneş #FFC93C, çimen #0B7A44, mor #7C4DFF.
Fontlar: Bricolage Grotesque (başlık) + Figtree (gövde) + Caveat (dekoratif
el yazısı, ekran başına ≤1). İnsan dokunuşu kiti: sticker rozet, fosforlu
vurgu, polaroid deste kartı, story-ring avatar, dönüklük bütçesi (≤3/ekran).
Deste kartları polaroid; kaydırma sırasında başkalarının beğenisi gösterilmez.

Mobil ekranlar: Giriş, Oturumlar, Yeni oturum, Lobi, Deste, Ortak nokta,
Runoff, Karar, Profil. Web: Katıl, Katıldın/Bekle, Deste (klavye destekli),
Sonuç (+ viral "buluşma kur" bloğu).
