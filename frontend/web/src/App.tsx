import { Route, Routes } from "react-router-dom";
import AppShell from "./components/organisms/AppShell";
import RequireAuth from "./components/organisms/RequireAuth";
import ErrorPage from "./pages/ErrorPage";
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
        <Route path="*" element={<ErrorPage kind="lost" />} />
      </Route>
    </Routes>
  );
}
