import { useEffect, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Button, Heading, Highlight, Note, Page, Wordmark } from "../components/atoms";
import DeckHeader from "../components/molecules/DeckHeader";
import VenueCheckRow from "../components/molecules/VenueCheckRow";
import VenueDeck from "../components/organisms/VenueDeck";
import { useDeckStore } from "../store/deckStore";
import { useSessionStore } from "../store/sessionStore";

/** Artboard W3 · Deste web — tıkla veya kaydır. */
export default function DeckScreen(props: { slug: string; view: SessionView }) {
  const { t } = useTranslation();
  const venues = useMemo(
    () => [...(props.view.venues ?? [])].sort((a, b) => (a.deckOrder ?? 0) - (b.deckOrder ?? 0)),
    [props.view.venues],
  );
  const self = useSessionStore((s) => s.self);
  // travelMinutes katılımcı UUID'siyle anahtarlı; artboard "Sana 28 dk · Mehmet 34 dk" diyor.
  const travelLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of props.view.participants ?? []) {
      if (p.id)
        labels[p.id] =
          p.id === self?.id ? t("deck.travelSelf") : (p.displayName ?? t("deck.travelFriend"));
    }
    return labels;
  }, [props.view.participants, self?.id, t]);

  const index = useDeckStore((s) => s.index);
  const liked = useDeckStore((s) => s.liked);
  const listMode = useDeckStore((s) => s.listMode);
  const sending = useDeckStore((s) => s.sending);
  const start = useDeckStore((s) => s.start);
  const setLike = useDeckStore((s) => s.setLike);
  const setListMode = useDeckStore((s) => s.setListMode);
  const finish = useDeckStore((s) => s.finish);

  useEffect(() => {
    start(props.slug, venues.length);
  }, [props.slug, venues.length, start]);

  const finished = index >= venues.length;
  const likedCount = Object.values(liked).filter(Boolean).length;

  // Artboard'da karşılığı yok — plandaki işlevsel iskelet.
  if (finished && !listMode) {
    return (
      <Page center>
        <Wordmark />
        <Heading center>
          <Trans i18nKey="deck.finishedTitle" components={[<Highlight key="0" />]} />
        </Heading>
        <Note center>{t("deck.likedCount", { count: likedCount })}</Note>
        <Button type="button" onClick={() => void finish()} disabled={sending}>
          {t("deck.send")}
        </Button>
        <Button type="button" kind="white" onClick={() => setListMode(true)}>
          {t("deck.backToList")}
        </Button>
      </Page>
    );
  }

  // Artboard'da karşılığı yok — plandaki işlevsel iskelet (az sonuç → liste, spec §4).
  if (listMode) {
    return (
      <Page>
        <Wordmark />
        <Heading size="md">{t("deck.listTitle")}</Heading>
        {venues.map((v) => (
          <VenueCheckRow
            key={v.id}
            venue={v}
            checked={!!liked[v.id!]}
            onChange={(on) => void setLike(v.id!, on)}
            travelLabels={travelLabels}
          />
        ))}
        <Button type="button" onClick={() => void finish()} disabled={sending}>
          {t("deck.send")}
        </Button>
      </Page>
    );
  }

  return (
    <Page variant="deck">
      <DeckHeader
        current={Math.min(index + 1, venues.length)}
        total={venues.length}
        onSeeAll={() => setListMode(true)}
      />
      <VenueDeck venues={venues} travelLabels={travelLabels} />
    </Page>
  );
}
