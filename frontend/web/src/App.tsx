import { Route, Routes } from "react-router-dom";
import Highlight from "./components/atoms/Highlight";
import SessionPage from "./pages/SessionPage";

export default function App() {
  return (
    <Routes>
      <Route path="/j/:slug" element={<SessionPage />} />
      <Route
        path="*"
        element={
          <main className="page" style={{ justifyContent: "center" }}>
            <h1>
              Ortada <Highlight>buluşalım.</Highlight>
            </h1>
            <p className="muted">Bir davet linkin olmalı — örn. bumpinto.app/j/x7k2m</p>
          </main>
        }
      />
    </Routes>
  );
}
