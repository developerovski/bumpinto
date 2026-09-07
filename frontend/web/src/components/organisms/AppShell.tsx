import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { useOnline, useRetryOnline } from "../../lib/useOnline";
import OfflineBanner from "../molecules/OfflineBanner";
import TopBar from "../molecules/TopBar";

/** react-router layout route: her sayfa üst çubuğun altında render olur. */
export default function AppShell() {
  const { t } = useTranslation();
  const { online, lastOnlineAt } = useOnline();
  const { retry, checking } = useRetryOnline();
  return (
    // Dikey flex kabuk: üst çubuk + sayfa + atıf altbilgisi TAM olarak bir ekran eder. Harita
    // sayfaları (`Page wide`) kalan yüksekliği `flex-1` ile alır; sabit `calc(100dvh - …)` yerine
    // ölçü buradan gelir, böylece altbilgi/üst çubuk yüksekliği değişse de sayfa kaymaz
    // (UI review 2026-09-03: altta bir ekran boyu boşluk ve gereksiz kaydırma).
    <div data-app-shell className="flex min-h-[100dvh] flex-col">
      <TopBar />
      {/* Canlı bölge HER ZAMAN mount'ta (kod incelemesi #2): OfflineBanner içerik değişmeden
          ÖNCE erişilebilirlik ağacında olmalı, yoksa ekran okuyucu ilk anonsu kaçırır. Tek
          yer, tek kural: /sessions, oturum ekranları ve profil aynı şeridi görür. */}
      <div role="status" aria-live="polite">
        <OfflineBanner online={online} lastOnlineAt={lastOnlineAt} onRetry={retry} retrying={checking} />
      </div>
      <Outlet />
      <p className="px-5 pb-4 text-center text-[0.6875rem] text-ink2">{t("attribution.osm")}</p>
    </div>
  );
}
