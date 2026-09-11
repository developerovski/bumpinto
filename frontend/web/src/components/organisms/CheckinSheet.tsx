/* Kaynak: Keşfet POC artboard P5 ("Buluştunuz mu?") + P5b (rozet anı). */
import { BADGES, badgesFor, newBadges, type BadgeId, type ParticipantDto } from "@bumpinto/shared";
import { Confetti } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, Button, ErrorText, HandNote, Overline, Sticker } from "../atoms";
import Sheet from "../molecules/Sheet";
import { api } from "../../lib/api";
import { BADGE_ICONS } from "../../lib/badgeIcons";
import { markAnswered } from "../../lib/checkinMark";
import { useAuthStore } from "../../store/authStore";

type Phase = "ask" | "busy" | { badge: BadgeId; next: BadgeId | null };

const statusOf = (e: unknown) => (e as { response?: { status?: number } })?.response?.status;
const BIG = "m-0 font-head text-[1.75rem] font-extrabold leading-[1.05] tracking-[-0.02em]";

/** Tek soru, tek dokunuş. Yalnız CEVAP işaretler; kapatmak (scrim/Esc) bu açılışlık gizler.
    Rozet farkı yalnız hesaplı kullanıcıda: misafir katılımcının sayacı yok. */
export default function CheckinSheet({ slug, people, planName, onDone, onDismiss }: {
  slug: string;
  people: ParticipantDto[];
  planName?: string;
  onDone: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("ask");
  const [error, setError] = useState(false);

  async function answer(met: boolean) {
    setPhase("busy");
    setError(false);
    try {
      await api.checkin(slug, met);
    } catch (e) {
      const code = statusOf(e);
      // 403 (koltuk yok) / 404 (gizli ya da silinmiş) kalıcıdır: tekrar sormanın anlamı yok.
      if (code === 403 || code === 404) {
        markAnswered(slug);
        onDone();
        return;
      }
      // 409 = sunucuya göre buluşma henüz geçmedi (saat kayması) — işaretleme, yeniden denenebilir.
      setError(true);
      setPhase("ask");
      return;
    }
    markAnswered(slug);
    const auth = useAuthStore.getState();
    if (met && auth.status === "signed") {
      const before = badgesFor(auth.me?.stats);
      try {
        // authStore.load() DEĞİL: o ağ hatasında kullanıcıyı çıkışa düşürür; burada yalnız sayaç tazeleniyor.
        const fresh = await api.me();
        useAuthStore.getState().setMe(fresh);
        const after = badgesFor(fresh.stats);
        const gained = newBadges(before, after);
        if (gained.length) {
          setPhase({ badge: gained[0], next: BADGES.find((b) => !after.includes(b.id))?.id ?? null });
          return;
        }
      } catch {
        // sayaç gelmedi: kutlama yok, cevap zaten kaydedildi
      }
    }
    onDone();
  }

  if (typeof phase === "object") {
    const Icon = BADGE_ICONS[phase.badge];
    const title = `${t(`badge.${phase.badge}.title`)}!`;
    const body = t(`badge.${phase.badge}.hint`) + (phase.next ? ` ${t("badge.next", { title: t(`badge.${phase.next}.title`) })}` : "");
    return (
      /* `key`: aynı yerde yeni diyalog — Sheet yeniden mount olur, odak içeri taşınır ve yeni ad
         duyurulur (yeniden kullanılan panelde odak kaldırılan "Evet" düğmesiyle sayfaya düşerdi). */
      <Sheet key="badge" title={title} onClose={onDone} titleHidden>
        <div className="flex flex-col items-center gap-2.5 text-center">
          <Sticker>{t("badge.new")}</Sticker>
          <span aria-hidden className="mt-0.5 flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-full border-2 border-ink bg-hl text-[3.125rem] text-ink shadow-[3px_5px_0_rgba(39,32,59,0.18)]">
            <Icon />
          </span>
          <h2 className={BIG}>{title}</h2>
          <p className="m-0 text-[0.9375rem] leading-normal text-ink2">{body}</p>
          <HandNote center size="sm">{t("badge.hand")}</HandNote>
          <Button type="button" onClick={onDone}>{t("common.ok")}</Button>
        </div>
      </Sheet>
    );
  }

  const busy = phase === "busy";
  return (
    <Sheet key="ask" title={t("checkin.title")} onClose={onDismiss} titleHidden>
      <div className="flex items-center gap-3">
        <span className="flex" aria-hidden>
          {people.slice(0, 5).map((p, i) => (
            <span key={p.id ?? i} className={`rounded-full border-2 border-white${i ? " -ml-[0.5625rem]" : ""}`}>
              <Avatar name={p.displayName ?? "?"} index={i} />
            </span>
          ))}
        </span>
        {planName && <Overline>{planName}</Overline>}
      </div>
      <h2 className={BIG}>{t("checkin.title")}</h2>
      <p className="m-0 text-[0.9375rem] leading-normal text-ink2">{t("checkin.lead")}</p>
      {error && <ErrorText>{t("checkin.error")}</ErrorText>}
      <div className="mt-1 flex gap-2.5">
        <Button type="button" className="flex-1" disabled={busy} onClick={() => void answer(true)}>
          <Confetti size={18} aria-hidden />
          {t("checkin.yes")}
        </Button>
        <Button type="button" kind="white" className="flex-1" disabled={busy} onClick={() => void answer(false)}>
          {t("checkin.no")}
        </Button>
      </div>
      <HandNote center size="sm">{t("checkin.hand")}</HandNote>
    </Sheet>
  );
}
