import {
  Button,
  DeckHeader,
  Field,
  Heading,
  Highlight,
  JoinIntro,
  Note,
  Page,
  Progress,
  ViralCard,
  VenueCard,
  WinnerCard,
  Wordmark,
} from "@bumpinto/web";

/* Uygulama kabuğu: `mx-auto max-w-[30rem] min-h-dvh`. Tek başına boş bir sütun
   olduğu için her hücre gerçek bir ekranı kurar — hücrelerin uzun çıkması
   `min-h-dvh` gereğidir. */

const WINNER_VENUE = {
  id: "v-karakoy",
  name: "Karaköy Lokantası",
  rating: 4.6,
  priceLevel: 2,
  deckOrder: 0,
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Karak%C3%B6y+Lokantas%C4%B1",
  travelMinutes: { "p-self": 14, "p-elif": 11 },
};

const TRAVEL = { "p-self": "Sana", "p-elif": "Elif" };

/** W1 · varsayılan varyant — davet ekranı: marka, başlık bloğu, form alanları,
    ana çağrı. Kolonlar 15px `gap` ile üst üste akar. */
export function JoinScreen() {
  return (
    <Page>
      <Wordmark />
      <JoinIntro />
      <Field id="pg-name" label="Adın" placeholder="Arkadaşların sana ne der?" />
      <Field id="pg-addr" label="Neredesin?" defaultValue="Moda Sahil, Kadıköy" />
      <Button type="button">Katıl</Button>
      <Note center>Konumun yalnızca bu buluşma için kullanılır.</Note>
    </Page>
  );
}

/** W3 · `variant="deck"` — `gap-0`, dar üst boşluk, alt boşluk yok:
    sayaç başlığı + ilerleme şeridi + deste kartı kendi aralıklarını taşır. */
export function DeckScreen() {
  return (
    <Page variant="deck">
      <DeckHeader current={4} total={12} onSeeAll={() => {}} />
      <div className="mb-3.5">
        <Progress value={4 / 12} />
      </div>
      <VenueCard
        venue={{
          id: "v-bebek",
          name: "Bebek Kahve",
          rating: 4.4,
          priceLevel: 2,
          deckOrder: 1,
          travelMinutes: { "p-self": 18, "p-elif": 9 },
        }}
        travelLabels={TRAVEL}
      />
    </Page>
  );
}

/** W4 · `variant="result"` — kazanan bloğu + viral kart. `relative`, çıkartmaların
    kart kenarından taşabilmesi için. */
export function ResultScreen() {
  return (
    <Page variant="result">
      <Wordmark />
      <WinnerCard venue={WINNER_VENUE} travelLabels={TRAVEL} />
      <ViralCard />
    </Page>
  );
}

/** `center` — içerik dikeyde ortalanır. Deste bitince görünen kapanış ekranı. */
export function CenteredFinish() {
  return (
    <Page center>
      <Wordmark />
      <Heading center>
        Deste <Highlight>bitti!</Highlight>
      </Heading>
      <Note center>7 mekanı beğendin.</Note>
      <Button type="button">Beğenilerimi gönder</Button>
      <Button type="button" kind="white">
        Listeye dön, düzelt
      </Button>
    </Page>
  );
}
