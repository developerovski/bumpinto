import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Button, ErrorText, Page } from "../components/atoms";
import Attribution, { unionProvider } from "../components/molecules/Attribution";
import DeckHeader, { HeaderButton } from "../components/molecules/DeckHeader";
import DeckProgressNote from "../components/molecules/DeckProgressNote";
import FinishedCard from "../components/molecules/FinishedCard";
import LikedList from "../components/molecules/LikedList";
import SessionHeader from "../components/molecules/SessionHeader";
import TwoZone from "../components/molecules/TwoZone";
import VenueCheckRow from "../components/molecules/VenueCheckRow";
import VenueDeck from "../components/organisms/VenueDeck";
import { sessionActivity } from "../lib/activity";
import { useTravelLabels } from "../lib/useTravelLabels";
import { useDeckStore } from "../store/deckStore";
import { isHost, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/** Artboard W3 · Deste web — tıkla veya kaydır; bitince liste/gönder, az sonuçta liste. */
export default function DeckScreen(props: { slug: string; view: SessionView }) {
  const { t } = useTranslation();
  const selfId = props.view.viewer?.participantId;
  const activity = sessionActivity(props.view);
  const midpointLabel = props.view.midpointLabel;
  const title = props.view.name ?? t(`activity.${props.view.activityType}`);
  const venues = useMemo(
    () => [...(props.view.venues ?? [])].sort((a, b) => (a.deckOrder ?? 0) - (b.deckOrder ?? 0)),
    [props.view.venues],
  );
  // Uyum satırının "12 aynı kart" kuralı (§4.6) için liste modunda da TÜM kart kategorileri.
  const categories = useMemo(
    () => venues.map((v) => v.category).filter((c): c is string => !!c),
    [venues],
  );
  const listProvider = useMemo(() => unionProvider(venues), [venues]);
  // travelMinutes katılımcı UUID'siyle anahtarlı; artboard "Sen 28 dk · Mehmet 34 dk" diyor.
  const travel = useTravelLabels(props.view);

  const index = useDeckStore((s) => s.index);
  const liked = useDeckStore((s) => s.liked);
  const listMode = useDeckStore((s) => s.listMode);
  const sent = useDeckStore((s) => s.sent);
  const start = useDeckStore((s) => s.start);
  const setLike = useDeckStore((s) => s.setLike);
  const setListMode = useDeckStore((s) => s.setListMode);
  const finish = useDeckStore((s) => s.finish);
  const decideWithout = useSessionStore((s) => s.decideWithout);
  const { run, busy, error } = useSessionAction();

  useEffect(() => {
    start(props.slug, venues.length);
  }, [props.slug, venues.length, start]);

  const finished = index >= venues.length;
  // Sunucu gerçeği: yerel `sent` yeniden yüklemede sıfırlanır (deckStore.start), ama katılımcı
  // kaydı sunucuda deckDone=true kalır — çift gönderim/"gönder" butonunun geri gelmesi böyle
  // önlenir (coordinator düzeltmesi).
  const selfDone = !!props.view.participants?.find((p) => p.id === selfId)?.deckDone;
  const likedCount = Object.values(liked).filter(Boolean).length;
  const shareUrl = `${location.origin}/j/${props.view.slug ?? ""}`;
  const shareText = t("deck.nudgeText", {
    activity: t(`activity.${props.view.activityType}`),
    count: venues.length,
  });

  if ((finished || selfDone) && !listMode) {
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
            <>
              <FinishedCard
                likedCount={likedCount}
                sending={busy}
                sent={sent || selfDone}
                host={isHost(props.view)}
                selfId={selfId}
                participants={props.view.participants ?? []}
                shareText={shareText}
                shareUrl={shareUrl}
                onSend={() => void run(finish, "deck.errSend")}
                onList={() => setListMode(true)}
                onForce={() => void run(decideWithout, "deck.errForce")}
              />
              {error && <ErrorText>{error}</ErrorText>}
            </>
          }
          right={<LikedList venues={venues} liked={liked} travel={travel} />}
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
                  travel={travel}
                  activity={activity}
                  categories={categories}
                  midpointLabel={midpointLabel}
                />
              ))}
              {/* Satır başına atıf YOK (12 satır × 2 satır olurdu) — tek birleşik atıf burada. */}
              <Attribution provider={listProvider} />
              <Button type="button" onClick={() => void run(finish, "deck.errSend")} disabled={busy}>
                {t("deck.send")}
              </Button>
              {error && <ErrorText>{error}</ErrorText>}
            </>
          }
          right={<LikedList venues={venues} liked={liked} travel={travel} />}
        />
      </Page>
    );
  }

  const selfName = props.view.participants?.find((p) => p.id === selfId)?.displayName ?? undefined;

  return (
    <Page variant="deck">
      <DeckHeader
        title={title}
        meta={t("deck.cardsOf", { current: Math.min(index + 1, venues.length), total: venues.length })}
        likesMeta={t("deck.likesN", { count: likedCount })}
        progress={venues.length ? Math.min(index + 1, venues.length) / venues.length : 0}
        onSeeAll={() => setListMode(true)}
      />
      <TwoZone
        left={
          <VenueDeck venues={venues} travel={travel} activity={activity} midpointLabel={midpointLabel} />
        }
        right={
          <>
            <LikedList venues={venues} liked={liked} travel={travel} />
            <DeckProgressNote
              participants={props.view.participants ?? []}
              selfId={selfId}
              remaining={venues.length - index}
              selfName={selfName}
            />
          </>
        }
      />
    </Page>
  );
}
