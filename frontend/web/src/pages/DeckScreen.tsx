import { useEffect, useMemo } from "react";
import VoiceDock from "../components/organisms/VoiceDock";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { attributionProviders } from "@bumpinto/shared";
import { Button, ErrorText, Page } from "../components/atoms";
import Attribution from "../components/molecules/Attribution";
import DeckHeader, { HeaderButton } from "../components/molecules/DeckHeader";
import DeckProgressNote from "../components/molecules/DeckProgressNote";
import FinishedCard from "../components/molecules/FinishedCard";
import LikedList from "../components/molecules/LikedList";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
import SessionHeader from "../components/molecules/SessionHeader";
import TwoZone from "../components/molecules/TwoZone";
import VenueCheckRow from "../components/molecules/VenueCheckRow";
import VenueDeck from "../components/organisms/VenueDeck";
import { activityListLabel, sessionActivities } from "../lib/activity";
import { useTravelLabels } from "../lib/useTravelLabels";
import { useDeckStore } from "../store/deckStore";
import { isHost, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/** Artboard W3 · Deste web — tıkla veya kaydır; bitince liste/gönder, az sonuçta liste. */
export default function DeckScreen(props: { slug: string; view: SessionView }) {
  const { t, i18n } = useTranslation();
  const selfId = props.view.viewer?.participantId;
  const activities = sessionActivities(props.view);
  const label = activityListLabel(activities, t, i18n.resolvedLanguage ?? "en");
  const midpointLabel = props.view.midpointLabel;
  const title = props.view.name ?? label;
  const venues = useMemo(
    () => [...(props.view.venues ?? [])].sort((a, b) => (a.deckOrder ?? 0) - (b.deckOrder ?? 0)),
    [props.view.venues],
  );
  // Uyum satırının "12 aynı kart" kuralı (§4.6) için liste modunda da TÜM kart kategorileri.
  const categories = useMemo(
    () => venues.map((v) => v.category).filter((c): c is string => !!c),
    [venues],
  );
  // Sağlayıcı atfı (spec §11) — listedeki HER kaynağın satırı config'ten basılır.
  const listProviders = useMemo(() => attributionProviders(venues), [venues]);
  // travel[] katılımcı UUID'siyle anahtarlı; artboard "Sen 28 dk · Mehmet 34 dk" diyor.
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
  if ((finished || selfDone) && !listMode) {
    return (
      <Page>
        <DeckHeader
          title={title}
          meta={t("deck.cardsDone", { total: venues.length })}
          progress={1}
          onSeeAll={() => setListMode(true)}
          voice={<VoiceDock view={props.view} placement="header-lg" />}
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
                onSend={() => void run(finish, "deck.errSend")}
                onList={() => setListMode(true)}
                onForce={() => void run(decideWithout, "deck.errForce")}
              />
              {error && <ErrorText>{error}</ErrorText>}
            </>
          }
          right={<LikedList venues={venues} liked={liked} travel={travel} categories={categories} finished />}
        />
      </Page>
    );
  }

  if (listMode) {
    return (
      <Page>
        <SessionHeader
          titleSize="auto"
          title={t("deck.listTitle")}
          meta={`${t("deck.likedN", { count: venues.length })} · ${t("deck.likesN", { count: likedCount })}`}
          action={
            <div className="flex items-center gap-2">
              <VoiceDock view={props.view} placement="header-lg" />
              <HeaderButton onClick={() => setListMode(false)}>{t("deck.backToDeck")}</HeaderButton>
            </div>
          }
        />
        <TwoZone
          rightLgOnly
          left={
            <>
              {/* Artboard 2288: satırlar TEK `.card` içinde, aralarında 14px paylı `.dv` çizgisi —
                  12 ayrı kart yerine tek liste gövdesi. */}
              <div className="overflow-hidden rounded-card border border-line bg-card shadow-sh1">
                {venues.map((v, i) => (
                  <div key={v.id}>
                    {i > 0 && <div className="mx-[0.875rem] h-px bg-line" />}
                    <VenueCheckRow
                      venue={v}
                      checked={!!liked[v.id!]}
                      onChange={(on) => void setLike(v.id!, on)}
                      travel={travel}
                      mixedDeck={activities.length > 1}
                      categories={categories}
                      midpointLabel={midpointLabel}
                    />
                  </div>
                ))}
              </div>
              {/* Satır başına atıf YOK (12 satır × 2 satır olurdu) — tek birleşik atıf burada.
                  Artboard liste modunda hiç atıf çizmiyor; sağlayıcı lisansları zorunlu kılıyor
                  (spec §11), bu yüzden tasarımın eksiği burada KAPATILMAZ. */}
              <Attribution providers={listProviders} />
              {error && <ErrorText>{error}</ErrorText>}
              {/* Artboard 2350 `.fade` — listenin dibi kağıda erisin. Yapışkan CTA'nın (52px düğme
                  + 12/14px pay = 78px = 4.875rem) hemen üstünde asılı durur. Negatif marjlar akışta
                  YER KAPLAMAMASINI sağlar: -mt-4 bölgenin kendi `gap-4`ünü, -mb-[4.5rem] hem 56px
                  yüksekliği hem alttaki gap'i geri alır — CTA'nın konumu şeritsizmiş gibi kalır. */}
              <div
                aria-hidden
                className="pointer-events-none sticky bottom-[4.875rem] -mt-4 -mb-[4.5rem] h-14 bg-gradient-to-b from-transparent to-paper lg:hidden"
              />
              {/* Artboard 2352: gönder butonu `.scroll` DIŞINDA, çerçevenin dibinde tam genişlik. */}
              <MobileCta voice={<VoiceDock view={props.view} placement="strip" />}>
                <Button type="button" onClick={() => void run(finish, "deck.errSend")} disabled={busy}>
                  {t("deck.send")}
                </Button>
              </MobileCta>
              <DesktopOnly>
                <Button type="button" onClick={() => void run(finish, "deck.errSend")} disabled={busy}>
                  {t("deck.send")}
                </Button>
              </DesktopOnly>
            </>
          }
          right={<LikedList venues={venues} liked={liked} travel={travel} categories={categories} />}
        />
      </Page>
    );
  }

  const selfName = props.view.participants?.find((p) => p.id === selfId)?.displayName ?? undefined;

  return (
    <Page variant="deck">
      <DeckHeader
        title={title}
        meta={`${t("deck.cardsOf", {
          current: Math.min(index + 1, venues.length),
          total: venues.length,
        })}${midpointLabel ? ` · ${t("deck.near", { place: midpointLabel })}` : ""}`}
        likesMeta={t("deck.likesN", { count: likedCount })}
        progress={venues.length ? Math.min(index + 1, venues.length) / venues.length : 0}
        onSeeAll={() => setListMode(true)}
        voice={<VoiceDock view={props.view} placement="header-lg" />}
      />
      {/* Artboard 2097-2141: 390'da deste ekranı yalnız başlık + ilerleme + deste + aksiyonlar +
          el yazısı nottur. "Beğendiklerin" ve ilerleme kartı mobilde destenin ALTINA yığılıyordu;
          o bilgi 390'da başlıktaki "· N beğeni" ile veriliyor. */}
      <TwoZone
        rightLgOnly
        left={
          <VenueDeck venues={venues} travel={travel} mixedDeck={activities.length > 1} midpointLabel={midpointLabel} />
        }
        right={
          <>
            <LikedList venues={venues} liked={liked} travel={travel} categories={categories} />
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
