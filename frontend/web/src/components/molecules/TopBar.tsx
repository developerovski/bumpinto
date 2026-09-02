/* Kaynak: DS v2 §06 Uygulama kabuğu — 64px masaüstü / 56px mobil; anonimde yalnız wordmark + dil */
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Wordmark } from "../atoms";
import AvatarMenu from "./AvatarMenu";
import LangMenu from "./LangMenu";

const BAR =
  "sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line " +
  "bg-paper/92 px-[1.125rem] backdrop-blur lg:h-16 lg:px-12";
const NAV_LINK = "rounded-full px-3 py-2 font-head text-[0.9375rem] font-bold no-underline";

export default function TopBar() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  return (
    <header className={BAR}>
      <Link to="/" className="no-underline text-ink">
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-2.5">
        {status === "signed" && (
          <NavLink to="/sessions" className={({ isActive }) => `${NAV_LINK} ${isActive ? "bg-sand text-ink" : "text-ink2"}`}>
            {t("shell.sessions")}
          </NavLink>
        )}
        <LangMenu />
        {status === "signed" && <AvatarMenu />}
      </nav>
    </header>
  );
}
