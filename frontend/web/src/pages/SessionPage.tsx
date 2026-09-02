import { useParams } from "react-router-dom";
import { useSessionLive } from "../store/useSessionLive";
import { useSessionStore } from "../store/sessionStore";
import DeckScreen from "./DeckScreen";
import ErrorPage from "./ErrorPage";
import JoinForm from "./JoinForm";
import ResultScreen from "./ResultScreen";
import RunoffScreen from "./RunoffScreen";
import WaitingRoom from "./WaitingRoom";

export default function SessionPage() {
  const { slug = "" } = useParams();
  useSessionLive(slug);
  const { view, needsJoin, error } = useSessionStore();

  if (error) {
    // `error` bir çeviri anahtarı (sessionStore) — süresi dolmuş/bulunamadı ikisi de olabilir.
    return <ErrorPage kind={error === "session.expired" ? "expired" : "notFound"} />;
  }
  if (needsJoin || !view) {
    return <JoinForm />;
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
      return <ErrorPage kind="expired" />;
  }
}
