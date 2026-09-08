/* Kaynak: karar dokümanı §5.B.5 + §5.C "Deste bitti" — artboard `Deste bitti 390` (bulunmayan
   an, sticker) / `Gönderildi 1280` (3414-3543) + `Gönderildi 390` (3544-3636): gönderilmiş anda
   `.f-lock` onay satırı + "Şimdi bekliyoruz · {isim} kaydırıyor" başlığı + `.f-steps` + roster.
   TEK sticker; "Deste bitti" BİREYSEL an — kutlama yok (§4.8), konfeti kaldırıldı.
   Gönderilmiş kart artboard'da SOLA YASLI (`padding:30px 30px 26px`, 390'da `16px 16px 14px`);
   gönderilmemiş "Deste bitti" anı bu denetimin kapsamında değildi, ortalanmış hâliyle KALIR.
   Bileşen İKİ kart döndürür (artboard 3441 / 3563): ana kart + altında ayrı "Kim nerede" kartı —
   iç içe kabuk değil, bölgenin kendi `gap`i ayırır. */
import { CheckCircle, HandWaving } from "@phosphor-icons/react";
import { Trans, useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { votersOf } from "../../lib/voters";
import { useSessionStore } from "../../store/sessionStore";
import { useSocialStore } from "../../store/socialStore";
import { Badge, Button, HandNote, Highlight, Note, Overline, Sticker } from "../atoms";
import PersonRow from "./PersonRow";
import SessionSteps from "./SessionSteps";

export default function FinishedCard(props: {
  likedCount: number;
  sending: boolean;
  sent: boolean;
  host: boolean;
  selfId?: string;
  participants: ParticipantDto[];
  /** @deprecated Dürtme artık paylaş-linki değil, gerçek uç nokta (`socialStore.nudge`) —
      bu iki prop kullanılmıyor. DeckScreen'den kaldırılması Deste ajanına raporlandı. */
  shareText?: string;
  shareUrl?: string;
  onSend: () => void;
  onList: () => void;
  onForce: () => void;
}) {
  const { t, i18n } = useTranslation();
  const slug = useSessionStore((s) => s.slug);
  const nudge = useSocialStore((s) => s.nudge);
  const canNudge = useSocialStore((s) => s.canNudge);
  const present = votersOf(props.participants);
  const others = present.filter((p) => p.id !== props.selfId);
  const waiting = others.filter((p) => !p.deckDone);
  // Yerel `sent` sunucudan önce bilinir — kendi satırı henüz deckDone=true dönmese de
  // "olmadan devam et" host için görünmeli (coordinator düzeltmesi). Aynı düzeltme sayaçta da:
  // gönderen kişi "N / M bitti"de hemen sayılır.
  const selfSent = (p: ParticipantDto) => p.deckDone || (props.sent && p.id === props.selfId);
  const doneCount = present.filter(selfSent).length;
  const anyDone = present.some((p) => p.deckDone) || props.sent;
  const names = new Intl.ListFormat(i18n.resolvedLanguage ?? i18n.language, { type: "conjunction" }).format(
    waiting.map((p) => p.displayName ?? "?"),
  );
  // Başlıkta tek kişi adla anılır; birden çok kişi kaydırıyorsa genel "diğerleri" (§4.8 — çoklu
  // geciken isim isim sayılmaz).
  const waitingLabel = waiting.length === 1 ? (waiting[0].displayName ?? "?") : t("deck.othersLabel");
  const empty = props.likedCount === 0;
  const showForce = props.host && anyDone && waiting.length > 0;

  return (
    <>
      <div
        className={
          props.sent
            ? "flex flex-col gap-[0.5625rem] rounded-card border border-line bg-card p-4 pb-3.5 shadow-sh1 " +
              "lg:gap-3.5 lg:px-[1.875rem] lg:pt-[1.875rem] lg:pb-[1.625rem]"
            : "flex flex-col items-center gap-2.5 rounded-card border border-line bg-card px-5 pt-[1.375rem] pb-5 text-center shadow-sh1 " +
              "lg:gap-3.5 lg:px-8 lg:pt-10 lg:pb-[2.125rem]"
        }
      >
        {props.sent ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-bold text-grass">
              <CheckCircle size={16} weight="fill" aria-hidden />
              {t("deck.sentBadge")}
            </span>
            {/* Artboard başlığı 390'da 24px, 1280'de 34px (`.big` inline ezmesi) — h1 atomunun
                lg varsayılanı 46px olduğu için iki kırılımda da açıkça yazılır. */}
            <h1 className="text-[1.5rem] lg:text-[2.125rem]">
              {waiting.length > 0 ? (
                /* Artboard 3437: bekleyenin adı sarı fosforlu kalemle (`.hl-m`). */
                <Trans i18nKey="deck.sentTitleWaiting" values={{ name: waitingLabel }}
                  components={[<Highlight key="0" />]} />
              ) : (
                t("deck.sentTitleAllDone")
              )}
            </h1>
            <p className="max-w-[36ch] text-[0.8125rem] leading-normal text-ink2 lg:text-base">
              {t("deck.sentCopy")}
              {/* Artboard 1280'de ikinci cümle var, 390'da yok. */}
              <span className="hidden lg:inline"> {t("deck.sentCopyExtra")}</span>
            </p>
            {/* Artboard 3440 / 3560: adım şeridi kartın İÇİNDE, "Oylama" adımında. */}
            <SessionSteps current="vote" />
          </>
        ) : (
          <>
            <Sticker>{t("deck.finishedSticker")}</Sticker>
            <h1 className="mt-1.5 text-[1.625rem] lg:text-[2.375rem]">
              {/* Artboard 2160: sayı değil FİİL vurgulanır ("… beğendin") — `Highlight` sarmalayıcı
                  i18n'den `<0>` ile gelir, `Trans` olmadan literal etiket basılırdı. */}
              <Trans i18nKey="deck.likedTitle" values={{ count: props.likedCount }} components={[<Highlight key="0" />]} />
            </h1>
            <p className="max-w-[34ch] text-ink2">{t("deck.finishedCopy", { count: props.likedCount })}</p>
          </>
        )}
        {empty && !props.sent && <Note center>{t("deck.emptyWarn")}</Note>}

        {/* Gönderilmiş kartta buton satırı içerik genişliğinde ve sola yaslı (artboard'da bu
            aksiyon üstteki "Hepsini gör" ile aynı işi yapar, tam genişlik pill değildir). */}
        <div
          className={
            props.sent
              ? "flex flex-wrap gap-2"
              : "mt-1.5 flex w-full max-w-[21.25rem] flex-col gap-2.5"
          }
        >
          {/* Gönderdikten sonra buton KAYBOLUR — tekrar basılamaz (karar dokümanı §1). */}
          {!props.sent && !empty && (
            <Button type="button" onClick={props.onSend} disabled={props.sending}>
              {t("deck.send")}
            </Button>
          )}
          <Button
            type="button"
            kind={empty && !props.sent ? "flame" : "white"}
            size={props.sent ? "fit" : "md"}
            onClick={props.onList}
          >
            {t("deck.backToList")}
          </Button>
          {empty && !props.sent && (
            <Button type="button" kind="white" onClick={props.onSend} disabled={props.sending}>
              {t("deck.sendAnyway")}
            </Button>
          )}
        </div>

        {props.sent && waiting.length === 0 && <HandNote center>{t("deck.allDoneHand")}</HandNote>}
      </div>

      {/* Artboard 3441 (1280) / 3563 (390): "Kim nerede" ana kartın İÇİNDE değil, onun altında
          AYRI bir `.card` — bölge kendi `gap`iyle ayırır, iç içe iki kart kabuğu değil. */}
      {props.sent && others.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-card border border-line bg-card py-1 shadow-sh1">
          {/* Artboard 3442-3445: roster kartının tepesinde "Kim nerede" + "N / M bitti". */}
          <div className="flex items-center justify-between gap-2.5 px-4 pt-2 pb-1">
            <Overline>{t("deck.whoWhere")}</Overline>
            <span className="text-[0.75rem] leading-normal text-ink2 tabular-nums">
              {t("deck.doneCount", { done: doneCount, total: present.length })}
            </span>
          </div>
          <div role="list" className="flex flex-col gap-0.5">
            {/* Artboard satır altında "12 / 12 kart" / "hâlâ destede · 7/12" ve %58'lik bir çubuk
                var: ParticipantDto YALNIZ `deckDone: boolean` taşıyor, kişi başı kaydırılan kart
                indeksi (örn. `ParticipantDto.deckIndex`) API'de YOK. Uydurulmaz — durum yalnız
                bitti/kaydırıyor rozetiyle anlatılır; alan eklenirse sayaç + çubuk buraya girer. */}
            {present.map((p, i) => (
              <PersonRow
                key={p.id}
                participant={p}
                index={i}
                isSelf={p.id === props.selfId}
                ring={p.deckDone}
                presence
                className="px-4"
              >
                {selfSent(p) ? (
                  <Badge tone="grass">{t("deck.rowDone")}</Badge>
                ) : (
                  <Badge tone="amber">{t("deck.rowSwiping")}</Badge>
                )}
              </PersonRow>
            ))}
          </div>

          {/* Artboard 3467-3472 / 3597: dürtme (ve host'un "olmadan devam et"i) roster kartının
              İÇİNDE, ayraçtan sonra. Dürtme gerçek uç noktayı çağırır (60 sn soğuma sunucuda ve
              `socialStore`'da), paylaş-linki DEĞİL. */}
          {waiting.length > 0 && (
            <>
              <div className="mx-4 h-px bg-line" />
              <div className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {waiting.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      kind="ghost"
                      size="sm"
                      disabled={!p.id || !canNudge(p.id)}
                      onClick={() => void nudge(slug, p.id!, p.displayName ?? "")}
                    >
                      <HandWaving size={18} aria-hidden />
                      {t("presence.nudge", { name: p.displayName ?? "" })}
                    </Button>
                  ))}
                  {/* Host + ≥1 bitiren + ≥1 bitirmeyen. Sayaç YOK, "geç" etiketi YOK (§4.8).
                      390 artboard'ında bu buton yok çünkü o görünüm DAVETLİ — kırılım kapısı
                      değil, host kapısı. */}
                  {showForce && (
                    <Button type="button" kind="ghost" size="sm" onClick={props.onForce}>
                      {t("deck.continueWithout", { names })}
                    </Button>
                  )}
                </div>
                {showForce && <span className="text-[0.75rem] text-ink2">{t("deck.forceHostOnly", { names })}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
