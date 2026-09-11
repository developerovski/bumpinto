/* Kaynak: Keşfet POC artboard P4 — host'un katılım istekleri (onay = kesin nokta). Lobi'de, açık planda. */
import type { SeatRequestDto, SessionView } from "@bumpinto/shared";
import { Check, CheckCircle } from "@phosphor-icons/react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, Badge, Button, HandNote, Note, Sticker } from "../atoms";
import SeatDots from "../molecules/SeatDots";
import SignInBlock from "../molecules/SignInBlock";
import { meetAtOptions } from "@bumpinto/shared";
import { personIndexOf } from "../../lib/personColor";
import { useAuthStore } from "../../store/authStore";
import { useSeatRequestsStore } from "../../store/seatRequestsStore";

export default function SeatRequestsPanel({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const slug = view.slug ?? "";
  const { slug: listSlug, list: storedList, busy, confirmedBy, load, approve, decline } = useSeatRequestsStore();
  const status = useAuthStore((s) => s.status);
  // Liste YALNIZ bu planınsa: ilk karede depoda önceki planın isteyenleri durabilir.
  const list = listSlug === slug ? storedList : null;

  useEffect(() => {
    // Uçlar hesap kimliği ister: katılımcı çereziyle lobide kalan ama hesabı kapanmış host 401
    // alır ve yenileme kesicisi onu çıkışa düşürürdü — önce giriş istenir.
    if (status === "signed") void load(slug);
  }, [slug, load, status]);

  const plan = view.openPlan ?? {};
  const approved = list?.approvedSeats ?? plan.approvedSeats ?? 0;
  const capacity = list?.capacity ?? plan.capacity ?? 0;
  // Geçilen istek listede DECLINED olarak kalır (sunucu) — host'a gösterilmez; "geç" kimseye görünmez.
  const rows = (list?.requests ?? []).filter((r) => r.status !== "DECLINED");
  const pending = rows.filter((r) => r.status === "PENDING").length;
  const when = plan.meetAt
    ? new Intl.DateTimeFormat(lang, meetAtOptions(new Date(plan.meetAt), new Date(), "short")).format(new Date(plan.meetAt))
    : "";
  const people = view.participants ?? [];

  /** `.mi` — ilgi alanları · isteyenin kendi yazdığı yer. Dakika sunucudan hiç gelmez (null), çizilmez. */
  const meta = (r: SeatRequestDto) =>
    [
      (r.interests ?? []).map((a) => t(`activity.${a}`).toLocaleLowerCase(lang)).join(", "),
      r.locality,
      r.minutes != null ? `~${r.minutes} dk` : null,
    ].filter(Boolean).join(" · ");

  return (
    <section className="flex flex-col gap-3" aria-labelledby="seat-requests-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="seat-requests-title" className="text-[1.1875rem]">{t("seat.requests")}</h2>
        {pending > 0 && <Badge tone="flame">{t("seat.newCount", { count: pending })}</Badge>}
      </div>
      <div className="flex items-center gap-3 rounded-card border border-line bg-card px-3.5 py-3 shadow-sh1">
        <span className="flex-1 text-[0.75rem] text-ink2">{t("seat.summary", { when, capacity, approved })}</span>
        <SeatDots approved={approved} capacity={capacity} count={false} />
      </div>
      {status === "anon" && <SignInBlock onDone={() => void load(slug)} />}
      {list && rows.length === 0 && <Note>{t("seat.noRequests")}</Note>}
      {rows.length > 0 && (
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((r, i) => {
        const ok = r.status === "APPROVED";
        const id = r.id ?? "";
        const nameId = `seat-req-${id || i}-name`;
        // Bir kişi = bir renk: onaylı isteyen artık katılımcıdır, rengi roster'daki kanonik dizininden.
        // Bekleyen henüz kimse değil — koltuklu birinin rengini ödünç almasın diye nötr (bekleyen) avatar.
        const member = ok ? people.find((p) => p.displayName === r.displayName && !p.host) : undefined;
        return (
          <li key={id || i}
            className={`flex items-start gap-3 rounded-[1.125rem] border px-3.5 py-3 shadow-sh1 ${ok ? "border-[#bfe5cf] bg-grass-wash" : "border-line bg-card"}`}>
            {member
              ? <Avatar name={r.displayName ?? "?"} index={personIndexOf(people, member.id)} />
              : <Avatar name={r.displayName ?? "?"} waiting />}
            <div className="flex min-w-0 flex-1 flex-col gap-[0.3125rem]">
              <div className="flex items-center justify-between gap-2">
                <span id={nameId} className="font-head text-[0.9375rem] font-bold">{r.displayName}</span>
                {ok && id === confirmedBy && <Sticker>{t("seat.confirmedSticker", { approved, capacity })}</Sticker>}
              </div>
              {meta(r) && <span className="text-[0.75rem] text-ink2">{meta(r)}</span>}
              {r.note && <p className="m-0 text-[0.8125rem] italic leading-[1.45] text-ink2">“{r.note}”</p>}
              {ok ? (
                <span className="inline-flex items-center gap-1.5 text-[0.78125rem] font-semibold text-grass">
                  <CheckCircle size={14} aria-hidden />
                  {t("seat.approved")}
                </span>
              ) : (
                <div className="mt-1 flex gap-2">
                  <Button type="button" size="sm" className="flex-1" aria-describedby={nameId} disabled={busy != null} onClick={() => void approve(slug, id)}>
                    <Check size={16} weight="bold" aria-hidden />
                    {t("seat.approve")}
                  </Button>
                  <Button type="button" kind="white" size="sm" className="flex-1" aria-describedby={nameId} disabled={busy != null} onClick={() => void decline(slug, id)}>
                    {t("seat.decline")}
                  </Button>
                </div>
              )}
            </div>
          </li>
        );
      })}
      </ul>
      )}
      {capacity > approved && <HandNote center size="sm">{t("seat.left", { count: capacity - approved })}</HandNote>}
    </section>
  );
}
