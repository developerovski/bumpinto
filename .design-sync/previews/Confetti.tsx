import { Confetti, Page, WinnerCard, Wordmark } from "@bumpinto/web";

const WINNER = {
  id: "6d1f",
  name: "Karaköy Lokantası",
  rating: 4.6,
  priceLevel: 2,
  deckOrder: 1,
  mapsUrl: "https://maps.google.com/?q=Karak%C3%B6y+Lokantas%C4%B1",
  travelMinutes: { "p-self": 28, "p-elif": 34 },
};

/** W4 · sonuç sayfasının kutlama konfetisi: sun noktası, eğik flame kare ve mor
    nokta. Props almaz ve üçü de `absolute` — konumlanabilmesi için sayfanın
    relative çerçevesi gerekir, o yüzden hücre ResultScreen'in kendi
    kompozisyonunu (Page variant="result" + kazanan bloğu) kuruyor. */
export function OnResultPage() {
  return (
    <div className="bg-paper">
      <Page variant="result">
        <Confetti />
        <Wordmark />
        <WinnerCard
          venue={WINNER}
          travelLabels={{ "p-self": "Sana", "p-elif": "Elif" }}
        />
      </Page>
    </div>
  );
}
