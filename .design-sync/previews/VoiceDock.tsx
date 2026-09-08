import { VoiceDock } from "@bumpinto/web";

/* DENENDİ VE ÇALIŞMADI (bir sonraki tur tekrarlamasın): `useVoiceStore`'u
   "../../frontend/web/src/store/voiceStore"den elle import edip `.setState()` ile
   phase/peers/endedReason/micDenied seed etmeyi denedim (mağaza standart bir zustand
   `create()`, kendi test dosyası tam bunu yapıyor). Ekran görüntüsünde "İçeride"/
   "Süresi doldu"/"Mikrofon reddedildi" hücreleri sessizce "AcikDisarida" ile AYNI
   çıktıyı bastı — kök sebep TopBar/AvatarMenu'deki İLE AYNI (bkz. NOTES §ilgili): DS
   paketi (`@bumpinto/web`) preview bundle'ında EXTERNAL'e çevriliyor (previews.mjs:127
   "react/react-dom and the DS package are externalized to the window globals"), yani
   gerçek `VoiceDock` `window.BumpInto` içindeki `_ds_bundle.js` kapanışını kullanıyor.
   Ham göreli yoldan yapılan import ise TAMAMEN AYRI bir `create()` örneği üretiyor —
   `.setState()` o kopyayı günceller, gerçek bileşenin okuduğu mağazayı DEĞİL. Mağaza
   barrel'dan export edilmediği sürece (aynı `useSessionStore`/`useAuthStore` gibi)
   bu köprü kurulamaz. Sahte bir "içeride" kartı basmaktansa yalnız PROP'tan (view)
   türeyen iki gerçek dal gösteriliyor; phase/peers/endedReason mağaza-bağımlı dallar
   (in/error/ended) bu ortamda ERİŞİLEMEZ — AvatarMenu/RequireAuth ile aynı sınıf. */

const MEHMET = { id: "self", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, inVoice: true };
const ELIF = { id: "elif", displayName: "Elif", host: false, hasLocation: true, deckDone: false, manual: false, inVoice: true };
const DENIZ = { id: "deniz", displayName: "Deniz", host: false, hasLocation: false, deckDone: false, manual: false, inVoice: true };

const inTenMinutes = () => new Date(Date.now() + 10 * 60_000).toISOString();

/** Kapalı + KURAN gözünden: sesli sohbet hiç açılmamış (`view.voice` yok), mağaza taze
    sayfa yüklemesinde zaten varsayılan `phase: "idle"` — tek erişilebilir eylem "Başlat". */
export function KapaliHost() {
  const view = { participants: [MEHMET, ELIF], viewer: { participantId: "self", host: true } } as never;
  return <VoiceDock view={view} />;
}

/** Açık + DIŞARIDA (misafir gözünden): `view.voice.endsAt` gelecekte, `isHost` false —
    üye sayısı + geri sayım + "Katıl". "Herkes için bitir" YOK, yalnız kurana özgü bir kontrol. */
export function AcikDisarida() {
  const view = {
    participants: [MEHMET, ELIF, DENIZ],
    viewer: { participantId: "elif", host: false },
    voice: { endsAt: inTenMinutes() },
  } as never;
  return <VoiceDock view={view} />;
}
