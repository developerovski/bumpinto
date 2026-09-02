import { Outlet } from "react-router-dom";
import TopBar from "../molecules/TopBar";

/** react-router layout route: her sayfa üst çubuğun altında render olur. */
export default function AppShell() {
  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}
