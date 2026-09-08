import { Route, Routes } from "react-router-dom";
import AppShell from "./components/organisms/AppShell";
import RequireAuth from "./components/organisms/RequireAuth";
import ErrorPage from "./pages/ErrorPage";
import AccountDeletedPage from "./pages/AccountDeletedPage";
import AccountPage from "./pages/AccountPage";
import AttributionsPage from "./pages/AttributionsPage";
import ConsentPage from "./pages/ConsentPage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import LegalPage from "./pages/LegalPage";
import SupportPage from "./pages/SupportPage";
import Landing from "./pages/Landing";
import NewSessionPage from "./pages/NewSessionPage";
import ProfilePage from "./pages/ProfilePage";
import SessionPage from "./pages/SessionPage";
import SessionsPage from "./pages/SessionsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/j/:slug" element={<SessionPage />} />
        <Route path="/sessions" element={<RequireAuth><SessionsPage /></RequireAuth>} />
        <Route path="/sessions/new" element={<RequireAuth><NewSessionPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        {/* RequireAuth YOK (kasıtlı): mağaza meta verisi bu URL'leri anonim erişilebilir ister. */}
        <Route path="/privacy" element={<LegalPage slug="privacy" />} />
        <Route path="/terms" element={<LegalPage slug="terms" />} />
        <Route path="/data-rights" element={<LegalPage slug="data-rights" />} />
        <Route path="/attributions" element={<AttributionsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/account/consent" element={<RequireAuth><ConsentPage /></RequireAuth>} />
        <Route path="*" element={<ErrorPage kind="lost" />} />
      </Route>
      {/* AppShell DIŞINDA (PlainShell): silme akışı gezinme/altbilgi taşımaz, kurulumsuz çalışır. */}
      <Route path="/account/delete" element={<DeleteAccountPage />} />
      <Route path="/account/deleted" element={<AccountDeletedPage />} />
    </Routes>
  );
}
