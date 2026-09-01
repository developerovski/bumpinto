import { Trans, useTranslation } from "react-i18next";
import { Route, Routes } from "react-router-dom";
import { Highlight, Note, Page } from "./components/atoms";
import SessionPage from "./pages/SessionPage";

export default function App() {
  const { t } = useTranslation();
  return (
    <Routes>
      <Route path="/j/:slug" element={<SessionPage />} />
      <Route
        path="*"
        element={
          <Page center>
            <h1>
              <Trans i18nKey="app.homeTitle" components={[<Highlight key="0" />]} />
            </h1>
            <Note>{t("app.homeHint")}</Note>
          </Page>
        }
      />
    </Routes>
  );
}
