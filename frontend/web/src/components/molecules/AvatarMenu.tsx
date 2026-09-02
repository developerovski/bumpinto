/* Kaynak: DS v2 §06 — avatar menüsü (Profil, Çıkış yap) */
import { SignOut, UserCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../atoms";

const POP =
  "absolute right-0 top-[2.875rem] z-20 flex w-[11.75rem] flex-col gap-0.5 rounded-2xl " +
  "border border-line bg-white p-1.5 shadow-sh2";
const ROW = "flex cursor-pointer items-center gap-2 rounded-[0.625rem] px-3 py-2.5 text-[0.875rem] font-semibold text-ink no-underline";

export default function AvatarMenu() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.me);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!me) return null;
  return (
    <div
      className="relative"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button type="button" ref={triggerRef} className="cursor-pointer rounded-full" aria-label={t("shell.accountAria")} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={me.displayName ?? "?"} ring size="sm" />
      </button>
      {open && (
        <div className={POP} role="menu">
          <Link role="menuitem" className={ROW} to="/profile" onClick={() => setOpen(false)}>
            <UserCircle size={16} aria-hidden />
            {t("shell.profile")}
          </Link>
          <button
            type="button"
            role="menuitem"
            className={ROW}
            onClick={() => {
              setOpen(false);
              void logout().catch(() => undefined).finally(() => navigate("/"));
            }}
          >
            <SignOut size={16} aria-hidden />
            {t("shell.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
