/* Artboard W8 `.rc` — sonuç kartı, offscreen render edilip `shareCard.ts`ün `toBlob`una verilir.
   Statik/offscreen olduğu için `useTravelLabels` hook'u (selfId/anchored bağlamı) gerekmez:
   katılımcı adları doğrudan `props.participants`ten, dakikalar `fairnessOf`ten — TEK kaynak
   (fairness.ts başlığı) burada da geçerli, `travelMinutes` yerine `travel[]` okunur (K-B26). */
import type { CSSProperties, RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { fairnessOf } from "@bumpinto/shared";

const HEAD = "'Bricolage Grotesque', system-ui, sans-serif";

const S = {
  root: {
    position: "fixed",
    left: -20000,
    top: 0,
    width: 1080,
    height: 1920,
    background: "#fffbf6",
    padding: 72,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 40,
    fontFamily: "Figtree, system-ui, sans-serif",
  },
  eyebrow: { fontSize: 34, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "#de2456" },
  title: { fontFamily: HEAD, fontSize: 92, fontWeight: 800, lineHeight: 1.05, color: "#27203b" },
  photo: {
    height: 720,
    borderRadius: 40,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mono: { fontFamily: HEAD, fontSize: 180, fontWeight: 800, color: "#ffffff" },
  row: { display: "flex", justifyContent: "space-between", fontSize: 38 },
  foot: { marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 32, color: "#6e6584" },
} satisfies Record<string, CSSProperties>;

const monogram = (name: string) => name.replace(/[^\p{L}]/gu, "").slice(0, 2).toLowerCase();

export default function ShareCard(props: {
  nodeRef: RefObject<HTMLDivElement | null>;
  venue: VenueDto;
  participants: ParticipantDto[];
  photo: string | null;
}) {
  const { t } = useTranslation();
  const fairness = fairnessOf(props.venue);
  const rows = (fairness?.entries ?? [])
    .map((e) => ({ p: props.participants.find((p) => p.id === e.id), minutes: e.minutes }))
    .filter((r): r is { p: ParticipantDto; minutes: number } => !!r.p);
  const min = fairness?.min ?? 0;
  const max = fairness?.max ?? 0;

  return (
    <div ref={props.nodeRef} aria-hidden style={S.root}>
      <div style={S.eyebrow}>{t("result.overline")}</div>
      <div style={S.title}>{t("share.cardTitle", { venue: props.venue.name ?? "" })}</div>
      <div
        style={{
          ...S.photo,
          background: props.photo ? "#f4eee6" : "linear-gradient(120deg,#fd3e6b 10%,#ff7854 90%)",
        }}
      >
        {props.photo ? (
          <img
            src={props.photo}
            crossOrigin="anonymous"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={S.mono}>{monogram(props.venue.name ?? "")}</span>
        )}
      </div>
      <div style={{ fontSize: 34, color: "#6e6584" }}>{props.venue.address}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {rows.map(({ p, minutes }) => (
          <div key={p.id} style={S.row}>
            <span style={{ fontWeight: 700, color: "#27203b" }}>{p.displayName}</span>
            <span style={{ color: "#6e6584" }}>{t("travel.min", { min: minutes })}</span>
          </div>
        ))}
      </div>
      <div style={S.foot} data-testid="share-card-footer">
        <span style={{ fontWeight: 800, color: "#27203b" }}>{t("common.wordmark")}</span>
        {/* Veri yoksa (`fairness` null — örn. solo oturum) "~0–0 dk · 0 dk fark" yazmak "herkes tam
            eşit" ile ayırt edilemez bir yalan söyler; satır tamamen düşürülür (coordinator
            düzeltmesi). */}
        {fairness && <span>{t("share.cardFooter", { min, max, spread: max - min })}</span>}
      </div>
    </div>
  );
}
