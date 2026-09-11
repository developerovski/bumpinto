/* Kaynak: artboard Katıl 1280 sağ kart "Kimler var" (1310–1321, özet şerit) ve
   W4b Katıl hata 1280 (4229–4250, kişi başına `.srow` satırı) — preview verisi (id/koordinat yok) */
import type { ReactNode } from "react";
import type { Schemas } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Avatar, Badge, HandNote, Overline } from "../atoms";

type Row = Schemas["PreviewParticipantDto"];

export default function WhoIsHere(props: {
  participants: Row[];
  /** Artboard W4b 1280 (4229–4250): 409 halinde şerit yerine kişi başına satır çizilir —
      kullanıcının "kim hazır, kim değil" sorusuna tek tek cevap gerekir. W4 (1310) özet
      şeridini korur, o yüzden bu bir BAYRAK, varsayılan değil. */
  rows?: boolean;
  /** Yalnız HOST için sunucudan gelir (`SessionPreview.hostOnline`). `PreviewParticipantDto`
      kişi başına varlık alanı TAŞIMAZ — diğer satırlarda çevrimdışı/nokta yazılmaz. */
  hostOnline?: boolean;
  children?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const ready = props.participants.filter((p) => p.hasLocation);
  const names = new Intl.ListFormat(i18n.resolvedLanguage ?? i18n.language, { type: "conjunction" })
    .format(ready.map((p) => p.displayName ?? "?"));
  return (
    <>
      {props.participants.length > 0 && (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-[1.125rem_1.25rem] shadow-sh1">
          <div className="flex items-center justify-between">
            <Overline>{t("waiting.who")}</Overline>
            <span className="text-[0.75rem] text-ink2 tabular-nums">{t("waiting.readyCount", { ready: ready.length, total: props.participants.length })}</span>
          </div>
          {props.rows ? (
            <div className="flex flex-col">
              {props.participants.map((p, i) => {
                // Çevrimdışı YALNIZ host satırında dürüst — tek varlık alanı `hostOnline`.
                const away = !!p.host && props.hostOnline === false;
                const sub = p.host
                  ? away
                    ? `${t("waiting.host")} · ${t("waiting.offline")}`
                    : t("waiting.host")
                  : p.hasLocation
                    ? null // hazır katılımcının alt satırı için önizlemede alan yok (konum etiketi gelmiyor)
                    : t("waiting.waitingLocation");
                return (
                  <div
                    key={i}
                    // Artboard `.srow` padding 8px 0, gap 12px; satır arası `.dv`; `.off` = %55.
                    className={`flex items-center gap-3 py-2${i > 0 ? " border-t border-line" : ""}${away ? " opacity-55" : ""}`}
                  >
                    <Avatar name={p.displayName ?? "?"} index={i} ring={!!p.hasLocation} waiting={!p.hasLocation} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[0.875rem] font-bold">{p.displayName ?? "?"}</span>
                      {sub && <span className="text-[0.75rem] text-ink2">{sub}</span>}
                    </div>
                    <Badge tone={p.hasLocation ? "grass" : "amber"}>
                      {p.hasLocation ? t("waiting.ready") : t("waiting.waitingBadge")}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3.5">
              <div className="flex gap-1.5">
                {props.participants.map((p, i) => (
                  <Avatar key={i} name={p.displayName ?? "?"} index={i} ring={!!p.hasLocation} waiting={!p.hasLocation} />
                ))}
              </div>
              {ready.length > 0 && (
                <span className="text-[0.8125rem] leading-[1.45] text-ink2">{t("join.whoCopy", { names, count: ready.length })}</span>
              )}
            </div>
          )}
        </div>
      )}
      {props.children}
      {/* Artboard 1330: `.hand` satır içi `align-self:flex-end` — el yazısı not haritanın SAĞ
          alt köşesine yaslanır, sola yaslı basıldığında oka ("→") bağlandığı yer kalmıyor. */}
      <div className="self-end">
        <HandNote>{t("join.hand")}</HandNote>
      </div>
    </>
  );
}
