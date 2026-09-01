import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Note, Page } from "../components/atoms";
import { useSessionLive } from "../store/useSessionLive";
import { useSessionStore } from "../store/sessionStore";
import DeckScreen from "./DeckScreen";
import JoinForm from "./JoinForm";
import ResultScreen from "./ResultScreen";
import RunoffScreen from "./RunoffScreen";
import WaitingRoom from "./WaitingRoom";

export default function SessionPage() {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  useSessionLive(slug);
  const { view, needsJoin, error, refresh } = useSessionStore();

  if (error) {
    // `error` bir çeviri anahtarı (sessionStore) — bilinmeyen değerde i18next stringi aynen döner.
    return (
      <Page center>
        <h1>{t("session.errorTitle")}</h1>
        <Note>{t(error)}</Note>
      </Page>
    );
  }
  if (needsJoin || !view) {
    return <JoinForm slug={slug} onJoined={() => void refresh()} />;
  }
  switch (view.status) {
    case "COLLECTING":
    case "SUGGESTING":
      return <WaitingRoom view={view} />;
    case "SWIPING":
      return <DeckScreen slug={slug} view={view} />;
    case "RUNOFF":
      return <RunoffScreen slug={slug} view={view} />;
    case "DECIDED":
      return <ResultScreen view={view} />;
    default:
      return (
        <Page>
          <Note>{t("session.expired")}</Note>
        </Page>
      );
  }
}
