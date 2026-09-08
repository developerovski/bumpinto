import { AppleLogo, CaretRight, GoogleLogo, PencilSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MeResponse } from "@bumpinto/shared";
import { Avatar, Badge, Button, ErrorText, Note, TextInput } from "../atoms";

/** Artboard W9 · Profil kimlik kartı — ad kalem/chevron ile düzenlenir, e-posta salt okunur.
    390 (2768-2779) ORTALANMIŞ bir sütundur: kart yok (zemin şeffaf), avatar → ad+kalem →
    e-posta → sağlayıcı rozeti. 1280 (2672-2679) ise yatay kart: avatar | ad + "e-posta ·
    sağlayıcı" | chevron. Tek DOM, iki yerleşim — düzenleme düğmesi TEK kalsın diye (iki
    kopya olsaydı erişilebilir ad da iki kez sayılırdı) ikon breakpoint'e göre değişir. */
export default function IdentityCard({ me, onSaveName }: { me: MeResponse; onSaveName: (name: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const apple = me.authProviders?.includes("APPLE") ?? false;
  const providerLabel = t(apple ? "account.appleLogin" : "profile.googleLogin");
  const ProviderLogo = apple ? AppleLogo : GoogleLogo;

  function startEdit() {
    setName(me.displayName ?? "");
    setError(false);
    setEditing(true);
  }

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(false);
    try {
      await onSaveName(name.trim());
      setEditing(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={
        // 390: kartsız, ortalanmış sütun (`gap:6px`, üstte -6px kaydırma artboard'ın
        // `.scroll` boşluğuna aitti — burada bölge boşluğu zaten o işi görüyor).
        "flex flex-col items-center gap-1.5 border-0 bg-transparent p-0 text-center shadow-none " +
        // 1280: artboard `.card` (padding 26/24, gap 20) yatay satır.
        "lg:flex-row lg:items-center lg:gap-5 lg:rounded-card lg:border lg:border-line lg:bg-card " +
        "lg:p-[1.625rem_1.5rem] lg:text-left lg:shadow-sh1"
      }
    >
      <Avatar name={me.displayName || me.email || "?"} ring size="xl" />
      <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-1 lg:items-start">
        {editing ? (
          <>
            <div className="flex w-full items-center gap-2">
              <TextInput
                aria-label={t("profile.editName")}
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void save();
                  if (e.key === "Escape") setEditing(false);
                }}
              />
              <Button type="button" size="sm" onClick={() => void save()} disabled={saving || !name.trim()}>
                {t("common.save")}
              </Button>
            </div>
            {error && <ErrorText>{t("profile.errSave")}</ErrorText>}
          </>
        ) : (
          <>
            {/* Düzenleme düğmesi bu satırın içinde: 390'da adın YANINDA kalem (2772-2775),
                1280'de `justify-between` onu bölgenin sağ ucuna — yani kartın sağına — atar
                ve chevron olur (2678). */}
            <div className="flex w-full items-center justify-center gap-1.5 lg:justify-between">
              <h2 className="min-w-0 truncate text-h3 lg:text-h2">{me.displayName || me.email}</h2>
              <button
                type="button"
                aria-label={t("profile.editName")}
                onClick={startEdit}
                className="flex flex-none items-center justify-center text-ink3 focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px] lg:h-10 lg:w-10 lg:rounded-full"
              >
                <PencilSimple size={16} aria-hidden className="lg:hidden" />
                <CaretRight size={16} aria-hidden className="hidden lg:block" />
              </button>
            </div>
            {/* E-posta TEK kez basılır; 1280'de sağlayıcı aynı satıra "· …" olarak eklenir
                (2674), 390'da altına rozet düşer (2777). */}
            <Note small>
              {me.email}
              <span className="hidden lg:inline"> · {providerLabel}</span>
            </Note>
            <span className="lg:hidden">
              <Badge tone="neutral">
                <ProviderLogo size={14} aria-hidden />
                {providerLabel}
              </Badge>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
