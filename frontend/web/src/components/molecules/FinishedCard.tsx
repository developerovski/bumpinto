/* Kaynak: karar dokümanı §5.B.5 + §5.C "Deste bitti" — artboard `Deste bitti 390` (bulunmayan
   an, sticker) / `Gönderildi 1280` + `Gönderildi 390` (gönderilmiş an, `.f-lock` onay satırı +
   "Şimdi bekliyoruz · {isim} kaydırıyor" başlığı — artboard'daki "N/12 kart" sayaçları §4.8'i
   ihlal ettiği için KOPYALANMADI, satırlar yalnız rozetle anlatılır).
   TEK sticker; "Deste bitti" BİREYSEL an — kutlama yok (§4.8), konfeti kaldırıldı.
   SessionSteps şeridi artboard'da var ama bu bileşenin kapsamı değil (T6a). */
import { CheckCircle } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { votersOf } from "../../lib/voters";
import { Badge, Button, HandNote, Note, Sticker } from "../atoms";
import PersonRow from "./PersonRow";
import ShareButton from "./ShareButton";

export default function FinishedCard(props: {
  likedCount: number;
  sending: boolean;
  sent: boolean;
  host: boolean;
  selfId?: string;
  participants: ParticipantDto[];
  shareText: string;
  shareUrl: string;
  onSend: () => void;
  onList: () => void;
  onForce: () => void;
}) {
  const { t, i18n } = useTranslation();
  const present = votersOf(props.participants);
  const others = present.filter((p) => p.id !== props.selfId);
  const waiting = others.filter((p) => !p.deckDone);
  // Yerel `sent` sunucudan önce bilinir — kendi satırı henüz deckDone=true dönmese de
  // "olmadan devam et" host için görünmeli (coordinator düzeltmesi).
  const anyDone = present.some((p) => p.deckDone) || props.sent;
  const names = new Intl.ListFormat(i18n.resolvedLanguage ?? i18n.language, { type: "conjunction" }).format(
    waiting.map((p) => p.displayName ?? "?"),
  );
  // Başlıkta tek kişi adla anılır; birden çok kişi kaydırıyorsa genel "diğerleri" (§4.8 — çoklu
  // geciken isim isim sayılmaz).
  const waitingLabel = waiting.length === 1 ? (waiting[0].displayName ?? "?") : t("deck.othersLabel");
  const empty = props.likedCount === 0;

  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-card px-8 pt-11 pb-9 text-center shadow-sh1">
      {props.sent ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-bold text-grass">
            <CheckCircle size={16} weight="fill" aria-hidden />
            {t("deck.sentBadge")}
          </span>
          <h1 className="mt-1.5 text-[2rem]">
            {waiting.length > 0
              ? t("deck.sentTitleWaiting", { name: waitingLabel })
              : t("deck.sentTitleAllDone")}
          </h1>
          <p className="max-w-[34ch] text-ink2">
            {t("deck.sentCopy")}
            {/* Artboard 1280'de ikinci cümle var, 390'da yok. */}
            <span className="hidden lg:inline"> {t("deck.sentCopyExtra")}</span>
          </p>
        </>
      ) : (
        <>
          <Sticker>{t("deck.finishedSticker")}</Sticker>
          <h1 className="mt-1.5 text-[2rem]">{t("deck.likedTitle", { count: props.likedCount })}</h1>
          <p className="max-w-[34ch] text-ink2">{t("deck.finishedCopy", { count: props.likedCount })}</p>
        </>
      )}
      {empty && !props.sent && <Note center>{t("deck.emptyWarn")}</Note>}

      <div className="mt-2 flex w-full max-w-[21.25rem] flex-col gap-2.5">
        {/* Gönderdikten sonra buton KAYBOLUR — tekrar basılamaz (karar dokümanı §1). */}
        {!props.sent && !empty && (
          <Button type="button" onClick={props.onSend} disabled={props.sending}>
            {t("deck.send")}
          </Button>
        )}
        <Button type="button" kind={empty && !props.sent ? "flame" : "white"} onClick={props.onList}>
          {t("deck.backToList")}
        </Button>
        {empty && !props.sent && (
          <Button type="button" kind="white" onClick={props.onSend} disabled={props.sending}>
            {t("deck.sendAnyway")}
          </Button>
        )}
      </div>

      {props.sent && others.length > 0 && (
        <div role="list" className="mt-2 flex w-full flex-col gap-0.5 rounded-card border border-line bg-paper py-1">
          {present.map((p, i) => (
            <PersonRow
              key={p.id}
              participant={p}
              index={i}
              isSelf={p.id === props.selfId}
              ring={p.deckDone}
              waiting={!p.deckDone}
              className="px-4"
            >
              {p.deckDone ? (
                <Badge tone="grass">{t("deck.rowDone")}</Badge>
              ) : (
                <Badge tone="amber">{t("deck.rowSwiping")}</Badge>
              )}
            </PersonRow>
          ))}
        </div>
      )}

      {props.sent && waiting.length > 0 && (
        <div className="flex w-full max-w-[21.25rem] flex-col gap-2.5">
          <ShareButton
            text={props.shareText}
            url={props.shareUrl}
            label={t("deck.nudge")}
            copiedLabel={t("result.copied")}
            kind="white"
          />
          {/* Host + ≥1 bitiren + ≥1 bitirmeyen. Sayaç YOK, "geç" etiketi YOK (§4.8). */}
          {props.host && anyDone && (
            <Button type="button" kind="white" onClick={props.onForce}>
              {t("deck.continueWithout", { names })}
            </Button>
          )}
        </div>
      )}

      {props.sent && waiting.length === 0 && <HandNote center>{t("deck.allDoneHand")}</HandNote>}
    </div>
  );
}
