# Maestro e2e akışları (M-8 T5, M-9 T8)

Bu akışlar **gerçek istemcide** koşar. Jest ikizleri framework yapıştırıcısını
(derin link eşlemesi, izin diyaloğu, geri tuşu, Google girişi) **doğrulamaz** — depo kuralı
gereği o yüzeyler burada sınanır.

> **Durum: bu akışlar henüz koşulmadı.** Yazıldılar ve seçicileri
> `frontend/shared/src/i18n/locales/tr.json` içindeki gerçek dizelerle eşleştirildi, ama bir
> dev build + cihaz gerektirdikleri için CI'da ya da bu oturumda koşturulmadılar. İlk koşu
> sonucu INDEX'in M-8 satırına yazılır.

## Kurulum

```bash
# 1) Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# 2) Dev build (Expo Go ÇALIŞMAZ: yerel modüller var — MapLibre, Google girişi, konum)
cd frontend/mobile
eas build --profile development --platform android   # ya da: pnpm android
```

Cihaz/emülatör dili **Türkçe** olmalı: seçiciler `tr` dizelerine göre yazıldı.
Emülatör: `bumpinto-api35` (M-7'de kullanılan).

## Örnek oturum kurma (`MAESTRO_SLUG`)

Akışlar davetli tarafını koşar, yani **önceden kurulmuş** bir oturum ister:

```bash
API=http://localhost:8060

# 1) Oturumu kur (host). `participantToken` yanıtta döner — sakla.
curl -sX POST "$API/api/sessions" -H 'Content-Type: application/json' -H 'X-Client: mobile' \
  -d '{"displayName":"Mehmet","activityTypes":["COFFEE"],"sessionType":"GROUP",
       "lat":51.44,"lng":5.47,"locationLabel":"Eindhoven","travelMode":"BIKE",
       "originPresent":true,"locationWhole":true}' | tee /tmp/session.json

SLUG=$(python3 -c "import json;print(json.load(open('/tmp/session.json'))['slug'])")
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/session.json'))['participantToken'])")
export MAESTRO_SLUG="$SLUG"
```

`05-code-join` **kodu** ister (slug'ı değil). Oturum görünümünden al:

```bash
export MAESTRO_JOIN_CODE=$(curl -s -H "X-Participant-Token: $TOKEN" \
  "$API/api/sessions/$SLUG" | python3 -c "import json,sys;print(json.load(sys.stdin)['joinCode'])")
```

`01-signin-join-deck-decide` desteyi bekler; host tarafında mekanları bulup desteyi aç:

```bash
curl -sX POST "$API/api/sessions/$SLUG/venues"  -H "X-Participant-Token: $TOKEN"   # mekanları bul
curl -sX POST "$API/api/sessions/$SLUG/shuffle" -H "X-Participant-Token: $TOKEN"   # desteyi aç
```

Akışın **son adımı** (P20 "Ortak nokta") yalnız oturumdaki HERKES desteyi bitirince gelir.
Tek cihazla koşarken host'un destesini de kapat:

```bash
curl -sX POST "$API/api/sessions/$SLUG/deck-done" -H "X-Participant-Token: $TOKEN"
```

## Koşturma

```bash
cd frontend/mobile
maestro test .maestro                                   # üçü birden
maestro test .maestro/02-deeplink.yaml                  # tek akış
maestro test -e MAESTRO_SLUG=$MAESTRO_SLUG .maestro     # değişkeni açıkça geçerek
```

## Akışlar

| Dosya | Ne doğrular | Bağımsız koşabilir mi |
|---|---|---|
| `01-signin-join-deck-decide.yaml` | Giriş → derin linkle katıl → izin → deste → gönder → karar | Hayır: hazır oturum + açık deste ister |
| `02-deeplink.yaml` | `https` ve `bumpinto://`, uygulama kapalı/açık, bilinmeyen slug'da çıkışlı hata | Hayır: geçerli `MAESTRO_SLUG` ister |
| `03-location-permission.yaml` | Açılışta izin İSTENMEZ · ön-ekran sistemden ÖNCE · redde O6 kurtarması ve adres yolu | Evet |
| `04-voice-dock.yaml` | P25 dock durumları · O7 mikrofon ön-ekranı sistemden ÖNCE · red kurtarması · gerçek WebRTC yığını · arka planda susma | Hayır: HOST olduğun GRUP oturumu ister |
| `05-code-join.yaml` | 5 haneli kodla katılım (`by-code`) · bilinmeyen kod · kısa kod · kamera ön-bilgilendirmesi sistemden ÖNCE | Hayır: geçerli `MAESTRO_JOIN_CODE` ister |

## Bilinen kırılganlıklar

- **Google hesap seçici** cihaz kabuğundan gelir; akış `optional: true` ile geçer, ama cihazda
  hiç hesap yoksa 01 ve 03 giriş adımında durur. Cihaza önce bir Google hesabı ekle.
- **Sistem izin diyaloğunun metni** OEM'e ve Android sürümüne göre değişir; seçiciler
  regex (`İzin Ver.*|Allow.*|…`) — yeni bir varyantla karşılaşırsan regex'i genişlet,
  akışı `optional` yapma (izin diyaloğunun çıktığını doğrulamak testin ta kendisi).
- **Sesli sohbet akışı (04)** iki cihaz olmadan yalnız TEK taraflı doğrulanır: dock içeri geçer
  ve mikrofon açılır, ama karşı tarafın sesi duyulmaz. Uçtan uca ses için ikinci bir cihaz
  (ya da web istemcisi) aynı oturuma katılmalı.
- **QR taraması (05)** emülatörde DOĞRULANMAZ: sanal kamera gerçek bir kare okumaz. Gerçek
  tarama `docs/store/DEVICE-CHECKLIST-M9.md` üzerinden fiziksel cihazda işaretlenir.
- **Swipe sayısı** (12) destedeki mekan sayısına bağlı; daha az mekan gelirse fazla kaydırmalar
  boşa gider ve akış yine de P15'e ulaşır (zararsız).
