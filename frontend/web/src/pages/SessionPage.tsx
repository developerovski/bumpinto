import type { SessionView } from "@bumpinto/shared";
import { useParams } from "react-router-dom";
import VoiceDock from "../components/organisms/VoiceDock";
import { useSessionLive } from "../store/useSessionLive";
import { isHost, useSessionStore } from "../store/sessionStore";
import DeckScreen from "./DeckScreen";
import ErrorPage from "./ErrorPage";
import JoinForm from "./JoinForm";
import LobbyPage from "./LobbyPage";
import ResultScreen from "./ResultScreen";
import RunoffScreen from "./RunoffScreen";
import SoloSetupPage from "./SoloSetupPage";
import VenuesPage from "./VenuesPage";
import WaitingRoom from "./WaitingRoom";

export default function SessionPage() {
  const { slug = "" } = useParams();
  useSessionLive(slug);
  const { view, preview, error } = useSessionStore();

  // `error` bir çeviri anahtarı (sessionStore) — süresi dolmuş/bulunamadı ikisi de olabilir.
  if (error) return <ErrorPage kind={error === "session.expired" ? "expired" : "notFound"} />;
  // Görünüm yoksa katılım formu: sunucu üye olmayana 401/403 döner, store `view`'ı null'lar.
  // Ama kapanmış bir buluşmaya katılım YOK: form gönderilince 409 dönerdi (çıkmaz sokak).
  // Durumu kamu önizlemesi taşır — üye olmayan da okuyabilir (K-W12).
  if (!view) {
    if (preview?.status === "DECIDED") return <ErrorPage kind="decided" />;
    if (preview?.status === "EXPIRED") return <ErrorPage kind="expired" />;
    return <JoinForm />;
  }
  const solo = view.sessionType === "SOLO";
  const page = pageFor(view, slug, isHost(view), solo);
  // Dock durum anahtarının DIŞINDA: aşama geçişi sayfayı değiştirir, dock'u değil (spec §7). SOLO'da ses
  // yok; sayfa bir hata ekranıysa (süresi dolmuş / karar geçersizleşmiş) da dock basılmaz.
  const dockable =
    !solo &&
    view.status !== "EXPIRED" &&
    !(view.status === "DECIDED" && !(view.venues ?? []).some((v) => v.id === view.decidedVenueId));
  return dockable ? <>{page}<VoiceDock view={view} /></> : page;
}

function pageFor(view: SessionView, slug: string, host: boolean, solo: boolean) {
  switch (view.status) {
    case "COLLECTING":
    case "SUGGESTING":
      if (solo) return <SoloSetupPage view={view} />;
      return host ? <LobbyPage view={view} /> : <WaitingRoom view={view} />;
    case "BROWSING":
      return <VenuesPage view={view} />;
    case "SWIPING":
      return <DeckScreen slug={slug} view={view} />;
    case "RUNOFF":
      return <RunoffScreen slug={slug} view={view} />;
    case "DECIDED":
      return (view.venues ?? []).some((v) => v.id === view.decidedVenueId) ? <ResultScreen view={view} /> : <ErrorPage kind="expired" />;
    default:
      return <ErrorPage kind="expired" />;
  }
}
