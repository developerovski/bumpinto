import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import TopBar from "../molecules/TopBar";

/** react-router layout route: her sayfa üst çubuğun altında render olur. */
export default function AppShell() {
  const { t } = useTranslation();
  return (
    <>
      <TopBar />
      <Outlet />
      <p className="px-5 pb-4 text-center text-[0.6875rem] text-ink3">{t("attribution.osm")}</p>
    </>
  );
}
