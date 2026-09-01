import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Note, Page, Wordmark } from "../components/atoms";
import RunoffIntro from "../components/molecules/RunoffIntro";
import RunoffList from "../components/organisms/RunoffList";
import { useSessionStore } from "../store/sessionStore";

/** Kaynak: mobil `07 Runoff` artboard'u, webe birebir uyarlandı
    (durum çubuğu gibi mobil kabuk çıkarıldı, açılış Wordmark eklendi). */
export default function RunoffScreen(props: { slug: string; view: SessionView }) {
  const { t } = useTranslation();
  const finalists = useMemo(
    () => (props.view.venues ?? []).filter((v) => props.view.runoffVenueIds?.includes(v.id!)),
    [props.view.venues, props.view.runoffVenueIds],
  );
  const self = useSessionStore((s) => s.self);
  // travelMinutes katılımcı UUID'siyle anahtarlı; artboard "Sen 34′ · Ayşe 28′" diyor.
  const travelLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of props.view.participants ?? []) {
      if (p.id)
        labels[p.id] =
          p.id === self?.id ? t("runoff.travelSelf") : (p.displayName ?? t("deck.travelFriend"));
    }
    return labels;
  }, [props.view.participants, self?.id, t]);

  return (
    <Page>
      <Wordmark />
      <RunoffIntro />
      <Note>{t("runoff.copy")}</Note>
      <RunoffList slug={props.slug} finalists={finalists} travelLabels={travelLabels} />
    </Page>
  );
}
