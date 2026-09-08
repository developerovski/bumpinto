import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import { OnlineProvider } from "../../lib/onlineContext";
import { useOnline, useRetryOnline } from "../../lib/useOnline";
import OfflineBanner from "../molecules/OfflineBanner";
import ToastHost from "../molecules/ToastHost";
import TopBar from "../molecules/TopBar";

/** react-router layout route: her sayfa üst çubuğun altında render olur. */
export default function AppShell() {
  const { t } = useTranslation();
  const net = useOnline();
  const { retry, checking } = useRetryOnline();
  return (
    // Dikey flex kabuk: üst çubuk + sayfa + atıf altbilgisi TAM olarak bir ekran eder. Harita
    // sayfaları (`Page wide`) kalan yüksekliği `flex-1` ile alır; sabit `calc(100dvh - …)` yerine
    // ölçü buradan gelir, böylece altbilgi/üst çubuk yüksekliği değişse de sayfa kaymaz
    // (UI review 2026-09-03: altta bir ekran boyu boşluk ve gereksiz kaydırma).
    <div data-app-shell className="flex min-h-[100dvh] flex-col">
      <TopBar />
      <ToastHost />
      {/* Canlı bölge HER ZAMAN mount'ta (kod incelemesi #2): OfflineBanner içerik değişmeden
          ÖNCE erişilebilirlik ağacında olmalı, yoksa ekran okuyucu ilk anonsu kaçırır. Tek
          yer, tek kural: /sessions, oturum ekranları ve profil aynı şeridi görür. */}
      <div role="status" aria-live="polite">
        <OfflineBanner online={net.online} lastOnlineAt={net.lastOnlineAt} onRetry={retry} retrying={checking} />
      </div>
      <OnlineProvider value={net}>
        <Outlet />
      </OnlineProvider>

      <footer className="mt-auto flex flex-col items-center gap-2 border-t border-line bg-paper px-5 pt-4 pb-5 text-center text-[0.6875rem] text-ink2">
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link to="/privacy" className="text-ink2">{t("legal.privacy")}</Link>
          <Link to="/terms" className="text-ink2">{t("legal.terms")}</Link>
          <Link to="/data-rights" className="text-ink2">{t("legal.dataRights")}</Link>
          <Link to="/support" className="text-ink2">{t("legal.support")}</Link>
        </nav>
      </footer>
    </div>
  );
}
