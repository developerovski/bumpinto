import { useParams } from "react-router-dom";
import { useSessionLive } from "../store/useSessionLive";
import { useSessionStore } from "../store/sessionStore";
import DeckScreen from "./DeckScreen";
import JoinForm from "./JoinForm";
import ResultScreen from "./ResultScreen";
import RunoffScreen from "./RunoffScreen";
import WaitingRoom from "./WaitingRoom";

export default function SessionPage() {
  const { slug = "" } = useParams();
  useSessionLive(slug);
  const { view, needsJoin, error, refresh } = useSessionStore();

  if (error) {
    return (
      <main className="page" style={{ justifyContent: "center" }}>
        <h1>Hmm.</h1>
        <p className="muted">{error}</p>
      </main>
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
        <main className="page">
          <p className="muted">Bu oturumun süresi dolmuş.</p>
        </main>
      );
  }
}
