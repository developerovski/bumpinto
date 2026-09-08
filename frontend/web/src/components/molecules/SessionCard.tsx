/* Kaynak: artboard Oturumlar_1280.html .card (açık liste) / DS v2 */
import { useTranslation } from "react-i18next";
import { sessionCtaKey, type SessionSummaryDto } from "@bumpinto/shared";
import { Avatar, Button, LinkButton, Progress, Sticker } from "../atoms";
import { activityListLabel } from "../../lib/activity";

/** Artboard W1 · açık buluşma kartı — durum, ilerleme, katılımcı sayısı, CTA. */
export default function SessionCard({ row, disabled }: { row: SessionSummaryDto; disabled?: boolean }) {
  const { t, i18n } = useTranslation();
  const label = activityListLabel(row.activityTypes ?? [], t, i18n.resolvedLanguage ?? "en");
  const active = row.status === "SWIPING";
  const done = row.doneCount ?? 0;
  const readyTotal = row.readyCount ?? 0;
  const participantTotal = row.participantCount ?? 0;
  // Sunucu `participants[]`i her satırda döner (ad + hazır mı + host mu). Alan yoksa (eski
  // sunucu) yığın hiç basılmaz — sayıdan avatar UYDURULMAZ, baş harfler oradan türetilemez.
  const people = row.participants ?? [];
  const progress =
    row.status === "SWIPING"
      ? done / Math.max(readyTotal, 1)
      : row.status === "COLLECTING" || row.status === "SUGGESTING"
        ? readyTotal / Math.max(participantTotal, 1)
        : null;
  const status =
    row.status === "SWIPING"
      ? t("sessions.doneOf", { done, total: readyTotal })
      : row.status === "COLLECTING" || row.status === "SUGGESTING"
        ? `${t("sessions.readyOf", { ready: readyTotal, total: participantTotal })}${
            row.sessionType === "GROUP" ? ` — ${t("sessions.linkHint")}` : ""
          }`
        : row.status === "BROWSING" || row.status === "RUNOFF"
          ? t(`sessions.status.${row.status}`)
          : null;
  return (
    <div
      className={[
        "relative rounded-card bg-card p-[1.25rem_1.375rem]",
        active ? "border-[1.5px] border-flame-deep shadow-sh2" : "border border-line shadow-sh1",
      ].join(" ")}
    >
      {active && (
        <span className="absolute -top-[0.8125rem] right-4">
          <Sticker>{t("sessions.deckOpen")}</Sticker>
        </span>
      )}
      <h3 className="mb-1 text-[1.3125rem]">{row.name ?? label}</h3>
      <p className="mb-3.5 text-[0.8125rem] text-ink2">
        {label} · {row.sessionType === "SOLO" ? t("sessions.solo") : t("sessions.group")}
      </p>
      {/* Artboard W1 (701-712): ÖNCE ilerleme çubuğu, SONRA [avatar yığını + durum metni | CTA]
          tek satırda. Durum metni çubuğun üstünde değil ALTINDA, `.cp.tab` 13px/600. */}
      {progress != null && (
        <div className="mb-3.5">
          <Progress value={progress} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {people.length > 0 && (
            // Artboard `.av.av-s` (29px) yığını, -9px binişme; konumu gelmemiş kişi `.av-wt`
            // (kesik çizgi). Yığın süslemedir — adları ekran okuyucuya sr-only listede veririz.
            <>
              <div className="flex" aria-hidden>
                {people.map((p, i) => (
                  <span key={i} className={i === 0 ? "" : "-ml-[0.5625rem]"}>
                    <Avatar
                      name={p.displayName ?? "?"}
                      index={i}
                      size="xs"
                      waiting={p.ready === false}
                    />
                  </span>
                ))}
              </div>
              <span className="sr-only">
                {people.map((p) => p.displayName).filter(Boolean).join(", ")}
              </span>
            </>
          )}
          {status && (
            <span className="text-[0.8125rem] font-semibold text-ink2 tabular-nums">{status}</span>
          )}
        </div>
        {/* Çevrimdışında bağlantı DEVRE DIŞI olamaz (<a disabled diye bir şey yok) — artboard
            şeridi "bayat içerik" der ve düğmeyi kilitler; aynı etiketle butona düşüyoruz. */}
        {disabled ? (
          <Button
            type="button"
            kind="white"
            size="sm"
            disabled
            aria-label={`${t(sessionCtaKey(row.status))} · ${row.name ?? label}`}
          >
            {t(sessionCtaKey(row.status))}
          </Button>
        ) : (
          <LinkButton
            href={`/j/${row.slug ?? ""}`}
            kind="white"
            size="fit-sm"
            aria-label={`${t(sessionCtaKey(row.status))} · ${row.name ?? label}`}
          >
            {t(sessionCtaKey(row.status))}
          </LinkButton>
        )}
      </div>
    </div>
  );
}
