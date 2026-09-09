import { render, screen } from "@testing-library/react-native";

import ShareCardImage from "./ShareCardImage";

/* Düğüm ekran okuyucudan GİZLİ (ekran dışında duran bir çizim yüzeyi, kullanıcı arayüzü
   değil) — bu yüzden sorgular `includeHiddenElements` ile açılır. Gizlemeyi testi
   yeşillendirmek için kaldırmak, kartı VoiceOver'a okutmak olurdu. */
const hidden = { includeHiddenElements: true } as const;

/* `fairnessOf` dakikaları `travel[]`ten okur (K-B26) — `travelMinutes` DEĞİL. */
const venue = {
  id: "v1",
  name: "Café Berlage",
  address: "Kleine Berg 16, Eindhoven",
  photoUrl: "https://cdn/x.jpg",
  travel: [
    { participantId: "m", minutes: 25 },
    { participantId: "k", minutes: 35 },
  ],
};

const participants = [
  { id: "m", displayName: "Mehmet" },
  { id: "k", displayName: "Kerem" },
];

test("kart adı, kişi dakikalarını ve altbilgiyi taşır", async () => {
  await render(
    <ShareCardImage nodeRef={{ current: null }} venue={venue} participants={participants} />,
  );
  expect(screen.getByText("Café Berlage", hidden)).toBeTruthy();
  expect(screen.getByText("Mehmet", hidden)).toBeTruthy();
  expect(screen.getByText("Kerem", hidden)).toBeTruthy();
  expect(screen.getByText("~35 dk", hidden)).toBeTruthy();
  expect(screen.getByText("herkes ~25–35 dk · fark 10 dk", hidden)).toBeTruthy();
});

/* Yol verisi yoksa altbilgi çizilmez — uydurma bir "fark 0 dk" basılmaz. */
test("yol verisi yoksa kart yine çizilir, altbilgi düşer", async () => {
  await render(
    <ShareCardImage
      nodeRef={{ current: null }}
      venue={{ id: "v1", name: "Café Berlage" }}
      participants={[]}
    />,
  );
  expect(screen.getByText("Café Berlage", hidden)).toBeTruthy();
  expect(screen.queryByText(/fark/, hidden)).toBeNull();
});
