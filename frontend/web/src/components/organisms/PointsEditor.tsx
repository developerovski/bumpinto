/* Kaynak: artboard "Yeni oturum 1280" sağ kart "Konumlar" */
import { Plus, X } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { geocode } from "../../lib/geocode";
import { DEFAULT_TRAVEL_MODE, type TravelMode } from "../../lib/travelMode";
import { pointCount, type LocalPoint } from "../../store/newSessionStore";
import { Avatar, Badge, Button, ErrorText, Overline, TextInput } from "../atoms";
import TravelModeField from "../molecules/TravelModeField";

/** SOLO sağ bölge kartı — kendi konum + elle eklenen noktalar + ekleme formu. Yeni nokta formunun
    ulaşım varsayılanı CAR (§5b). `onModeChange` verilirse satırlar da düzenlenebilir (yerel taslak
    — NewSessionPage); SoloSetupPage'de sunucudaki mevcut katılımcının modunu değiştiren bir uç
    olmadığından o çağrı yeri `onModeChange`'i GEÇMEZ, satırlar salt-bilgi kalır. */
export default function PointsEditor(props: {
  own: { label: string | null } | null;
  points: { displayName: string; locationLabel: string | null; travelMode?: TravelMode }[];
  onAdd: (p: LocalPoint) => void | Promise<void>;
  onRemove: (index: number) => void | Promise<void>;
  onModeChange?: (index: number, mode: TravelMode) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [draftMode, setDraftMode] = useState<TravelMode>(DEFAULT_TRAVEL_MODE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = pointCount(props.own, props.points);

  async function add(e: FormEvent) {
    e.preventDefault();
    const parts = draft.split(/[·,]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const name = parts[0];
    const query = parts.slice(1).join(" ") || name;
    setBusy(true);
    setError(null);
    try {
      const found = await geocode(query);
      if (!found) {
        setError(t("join.errGeocode"));
        return;
      }
      await props.onAdd({
        displayName: name,
        locationLabel: found.label,
        lat: found.lat,
        lng: found.lng,
        travelMode: draftMode,
      });
      setDraft("");
      setDraftMode(DEFAULT_TRAVEL_MODE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Overline>{t("newSession.points")}</Overline>
        <span className="text-[0.75rem] text-ink2 tabular-nums">{t("newSession.pointsCount", { count })}</span>
      </div>
      <div className="rounded-card border border-line bg-card py-0.5 shadow-sh1">
        <div className="flex items-center gap-3 px-4 py-[0.6875rem]">
          <Avatar name={t("deck.travelSelf")} ring />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[0.875rem] font-bold">{t("deck.travelSelf")}</span>
            <span className="text-[0.8125rem] text-ink2">
              {props.own ? `${props.own.label ?? ""} · ${t("newSession.ownHint")}` : t("newSession.ownMissing")}
            </span>
          </div>
          {props.own && <Badge tone="grass">{t("join.locOk")}</Badge>}
        </div>
        {props.points.map((p, i) => (
          <div key={`${p.displayName}-${i}`}>
            <div className="mx-4 h-px bg-line" />
            <div className="flex items-center gap-3 px-4 py-[0.6875rem]">
              <Avatar name={p.displayName} waiting />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[0.875rem] font-bold">{p.displayName}</span>
                <span className="text-[0.8125rem] text-ink2">{p.locationLabel}</span>
              </div>
              <Badge>{t("newSession.manual")}</Badge>
              <button
                type="button"
                aria-label={t("newSession.remove", { name: p.displayName })}
                onClick={() => props.onRemove(i)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            {props.onModeChange && (
              <div className="px-4 pb-[0.6875rem]">
                <TravelModeField
                  value={p.travelMode ?? DEFAULT_TRAVEL_MODE}
                  onChange={(mode) => props.onModeChange?.(i, mode)}
                  label={t("travelMode.forName", { name: p.displayName })}
                  hideLabel
                />
              </div>
            )}
          </div>
        ))}
        <div className="mx-4 h-px bg-line" />
        <form onSubmit={add} className="flex flex-col gap-2.5 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <TextInput
              aria-label={t("newSession.pointPlaceholder")}
              placeholder={t("newSession.pointPlaceholder")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button type="submit" kind="white" size="sm" disabled={busy}>
              <Plus size={18} aria-hidden />
              {t("newSession.add")}
            </Button>
          </div>
          <TravelModeField value={draftMode} onChange={setDraftMode} />
        </form>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}
