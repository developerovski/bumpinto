import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Button, Page } from "../components/atoms";
import DeckHeader, { HeaderButton } from "../components/molecules/DeckHeader";
import DeckProgressNote from "../components/molecules/DeckProgressNote";
import FinishedCard from "../components/molecules/FinishedCard";
import LikedList from "../components/molecules/LikedList";
import SessionHeader from "../components/molecules/SessionHeader";
import TwoZone from "../components/molecules/TwoZone";
import VenueCheckRow from "../components/molecules/VenueCheckRow";
import VenueDeck from "../components/organisms/VenueDeck";
import { useTravelLabels } from "../lib/useTravelLabels";
import { useDeckStore } from "../store/deckStore";

/** Artboard W3 · Deste web — tıkla veya kaydır; bitince liste/gönder, az sonuçta liste. */
export default function DeckScreen(props: { slug: string; view: SessionView }) {
  const { t } = useTranslation();
  const selfId = props.view.viewer?.participantId;
  const title = props.view.name ?? t(`activity.${props.view.activityType}`);
  const venues = useMemo(
    () => [...(props.view.venues ?? [])].sort((a, b) => (a.deckOrder ?? 0) - (b.deckOrder ?? 0)),
    [props.view.venues],
  );
  // travelMinutes katılımcı UUID'siyle anahtarlı; artboard "Sen 28 dk · Mehmet 34 dk" diyor.
  const travelLabels = useTravelLabels(props.view);
  // Liste modu satırları "Sana" der (deck.travelSelfTo) — deste kartları "Sen" kullanır.
  const listTravelLabels = useTravelLabels(props.view, "deck.travelSelfTo");

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

  if (finished && !listMode) {
    return (
      <Page>
        <DeckHeader
          title={title}
          meta={t("deck.cardsDone", { total: venues.length })}
          progress={1}
          onSeeAll={() => setListMode(true)}
        />
        <TwoZone
          left={
            <FinishedCard
              likedCount={likedCount}
              sending={sending}
              onSend={() => void finish()}
              onList={() => setListMode(true)}
            />
          }
          right={<LikedList venues={venues} liked={liked} selfId={selfId} />}
        />
      </Page>
    );
  }

  if (listMode) {
    return (
      <Page>
        <SessionHeader
          title={t("deck.listTitle")}
          meta={`${t("deck.likedN", { count: venues.length })} · ${t("deck.likesN", { count: likedCount })}`}
          action={<HeaderButton onClick={() => setListMode(false)}>{t("deck.backToDeck")}</HeaderButton>}
        />
        <TwoZone
          left={
            <>
              {venues.map((v) => (
                <VenueCheckRow
                  key={v.id}
                  venue={v}
                  checked={!!liked[v.id!]}
                  onChange={(on) => void setLike(v.id!, on)}
                  travelLabels={listTravelLabels}
                />
              ))}
              <Button type="button" onClick={() => void finish()} disabled={sending}>
                {t("deck.send")}
              </Button>
            </>
          }
          right={<LikedList venues={venues} liked={liked} selfId={selfId} />}
        />
      </Page>
    );
  }

  return (
    <Page variant="deck">
      <DeckHeader
        title={title}
        meta={t("deck.cardsOf", { current: Math.min(index + 1, venues.length), total: venues.length })}
        progress={venues.length ? Math.min(index + 1, venues.length) / venues.length : 0}
        onSeeAll={() => setListMode(true)}
      />
      <TwoZone
        left={<VenueDeck venues={venues} travelLabels={travelLabels} />}
        right={
          <>
            <LikedList venues={venues} liked={liked} selfId={selfId} />
            <DeckProgressNote participants={props.view.participants ?? []} selfId={selfId} />
          </>
        }
      />
    </Page>
  );
}
