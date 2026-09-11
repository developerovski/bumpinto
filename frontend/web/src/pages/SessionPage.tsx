import type { SessionView } from "@bumpinto/shared";
import { useParams } from "react-router-dom";
import { Page } from "../components/atoms";
import CheckinPrompt from "../components/organisms/CheckinPrompt";
import { useSessionLive } from "../store/useSessionLive";
import { isHost, useSessionStore } from "../store/sessionStore";
import DeckScreen from "./DeckScreen";
import ErrorPage from "./ErrorPage";
import JoinForm from "./JoinForm";
import LobbyPage from "./LobbyPage";
import PlanPage from "./PlanPage";
import ResultScreen from "./ResultScreen";
import RunoffScreen from "./RunoffScreen";
import SoloSetupPage from "./SoloSetupPage";
import VenuesPage from "./VenuesPage";
import WaitingRoom from "./WaitingRoom";

export default function SessionPage() {
  const { slug = "" } = useParams();
  useSessionLive(slug);
  const { view, preview, previewSettled, error } = useSessionStore();

  // `error` bir çeviri anahtarı (sessionStore) — süresi dolmuş/bulunamadı ikisi de olabilir.
  if (error) return <ErrorPage kind={error === "session.expired" ? "expired" : "notFound"} />;
  // Görünüm yoksa katılım formu: sunucu üye olmayana 401/403 döner, store `view`'ı null'lar.
  // Ama kapanmış bir buluşmaya katılım YOK: form gönderilince 409 dönerdi (çıkmaz sokak).
  // Durumu kamu önizlemesi taşır — üye olmayan da okuyabilir (K-W12).
  if (!view) {
    // Karar ancak önizleme denemesi bitince: katılım formu mount'ta konum izni ister ve açık planda
    // yanlış ekrandır — Keşfet'ten gelen her ziyaretçi o istemi görürdü.
    if (!preview && !previewSettled) return <Page><div role="status" aria-busy="true" /></Page>;
    if (preview?.status === "DECIDED") return <ErrorPage kind="decided" />;
    if (preview?.status === "EXPIRED") return <ErrorPage kind="expired" />;
    // Açık plan (kitle ne olursa olsun, NONE dahil): koltuk yalnız istekle — K-B37.
    if (preview?.openPlan) return <PlanPage slug={slug} preview={preview} />;
    return <JoinForm />;
  }
  const solo = view.sessionType === "SOLO";
  const page = pageFor(view, slug, isHost(view), solo);
  /* Ses denetimi artık sayfadan BAĞIMSIZ bir kat değil: her sayfa onu kendi aksiyonlarının
     yanında basıyor (masaüstünde başlık satırı, mobilde `MobileCta`) — kullanıcı kararı
     2026-09-08. Görünürlük kuralları (SOLO / süresi dolmuş / geçersiz karar) `VoiceDock`'un
     kendisinde; burada tekrarlanmaz. */
  /* "Buluştunuz mu?" sayfadan BAĞIMSIZ: açık plan buluşma geçtiğinde herhangi bir aşamada olabilir
     (lobi, mekanlar, deste, karar) ve 30 sn'lik yoklama `meetPassed`'i açıkken çevirebilir. */
  return (
    <>
      {page}
      <CheckinPrompt key={slug} view={view} slug={slug} />
    </>
  );
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
