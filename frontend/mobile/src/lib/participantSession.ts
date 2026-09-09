import type { SessionView } from "@bumpinto/shared";

import { api, hasParticipantToken, rememberParticipantToken } from "./api";

/**
 * Katılımcı jetonunu ONARIR (K-M39).
 *
 * Oda içindeki tek yetki kaynağı katılımcı jetonudur ve mobilde yalnız BELLEKTE durur: oturum
 * kurarken ya da katılırken yazılır, uygulama yeniden başlayınca kaybolur. Listeden açılan bir
 * oturumda hiç yazılmamıştır bile — o yüzden `swipe`/`deck-done`/`location`/`nudge`/
 * `force-decision`/`runoff-vote`/`voice` ve canlı kanalın el sıkışması 403 alıyordu.
 *
 * Web bu onarımı çerezle yapar (`ParticipantTokenDelivery#refresh`); mobilde çerez yoktur ve
 * onarım KATILIM ucundan gelir: kimlik taşıyan katılım aynı koltuğu ve taze jetonu gövdede
 * döner. Koltuk **olduğu gibi** döner — ad, konum ve ulaşım türü sahibinindir, bu çağrı hiçbirine
 * dokunmaz (`SessionCommands#join`).
 *
 * İki kapı var ve ikisi de zorunlu:
 * - **Jeton varsa çağrılmaz.** `loadView` her 30 sn'de bir koşuyor; kapı olmasa her tur bir
 *   katılım isteği olurdu.
 * - **`viewer` yoksa çağrılmaz.** `viewer` sunucunun bizi HESAP koltuğundan tanıdığını söyler;
 *   tanımıyorsa katılım yeni bir koltuk açar ve hayalet koltuk orta noktayı bozar.
 *
 * Kendi hatasını YUTAR: çağıran `loadView`'dur ve onarımın 500'ü "oturum bulunamadı" ekranına
 * düşmemeli — görünüm zaten elde, yalnız yazma uçları kapalı kalır.
 *
 * Kapsam dışı: jeton VAR ama süresi dolmuşsa (24 sa, `TokenService.PARTICIPANT_TTL`) onarım
 * tetiklenmez. Bellekte tutulan jetonun o yaşa gelmesi için uygulamanın 24 saat açık kalması
 * gerekir; 403'ten tetiklenen onarım paylaşılan `http` kesicisini değiştirir (web'i de etkiler).
 */
export async function repairParticipantToken(slug: string, view: SessionView): Promise<boolean> {
  if (hasParticipantToken(slug)) return false;
  const seat = view.viewer?.participantId;
  if (!seat) return false;
  // Sunucu `displayName`i zorunlu tutuyor (`JoinRequest`), ama var olan koltukta YOK SAYIYOR:
  // kendi adımızı geri göndermek en zararsız değer. Satır bulunamazsa boş ad 400 dönerdi.
  const displayName = (view.participants ?? []).find((p) => p.id === seat)?.displayName;
  if (!displayName) return false;
  try {
    const { participantToken } = await api.join(slug, { displayName });
    if (!participantToken) return false;
    rememberParticipantToken(slug, participantToken);
    return true;
  } catch {
    return false;
  }
}
