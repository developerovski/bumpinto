import { CaretRight } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MeResponse } from "@bumpinto/shared";
import { Avatar, Button, ErrorText, Note, TextInput } from "../atoms";

/** Artboard W9 · Profil kimlik kartı — ad chevron ile düzenlenir, e-posta salt okunur. */
export default function IdentityCard({ me, onSaveName }: { me: MeResponse; onSaveName: (name: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

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
    <div className="flex items-center gap-5 rounded-card border border-line bg-card p-[1.625rem_1.5rem] shadow-sh1">
      <Avatar name={me.displayName || me.email || "?"} ring size="xl" />
      <div className="flex flex-1 flex-col gap-1">
        {editing ? (
          <>
            <div className="flex items-center gap-2">
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
            <h2>{me.displayName || me.email}</h2>
            <Note>{me.email} · {t("profile.googleLogin")}</Note>
          </>
        )}
      </div>
      {!editing && (
        <button
          type="button"
          aria-label={t("profile.editName")}
          onClick={startEdit}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink3 focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px]"
        >
          <CaretRight size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}
