import { attributionProviders } from "@bumpinto/shared";
import { render, screen } from "@testing-library/react-native";

import { useConfigStore } from "../../store/configStore";
import Attribution from "./Attribution";

/* Atıf VERİ-GÜDÜMLÜ: satırlar `/api/config.sources[]`ten gelir, sağlayıcı başına kod dalı
   YOK. Test bu yüzden config'i besleyip ekrandaki metni okur. */
const SOURCES = [
  { id: "google", attributionKey: "attribution.google", attributionUrl: null, ratingScale: 5 as const },
  { id: "foursquare", attributionKey: "attribution.foursquare", attributionUrl: null, ratingScale: 10 as const },
];

beforeEach(() => {
  useConfigStore.setState({
    config: { mapEngine: "maplibre", tiles: { styleUrl: "s" }, sources: SOURCES },
    failed: false,
  });
});

/* FSQ tips'ten türeyen "neyle bilinir" cümlesi Foursquare atfı ister — mekan Google'dan
   gelmiş olsa bile (GUIDE kural 8; B-15 T2). Eşleme `@bumpinto/shared`ta. */
test("FSQ kaynaklı tagline varsa Foursquare atfı da basılır", async () => {
  await render(
    <Attribution providers={attributionProviders([{ provider: "google", taglineSource: "FSQ" }])} />,
  );
  expect(screen.getByText("Google Maps")).toBeTruthy();
  expect(screen.getByText("Powered by Foursquare")).toBeTruthy();
});

test("tagline kaynağı yoksa yalnız sağlayıcı atfı kalır", async () => {
  await render(<Attribution providers={attributionProviders([{ provider: "google" }])} />);
  expect(screen.getByText("Google Maps")).toBeTruthy();
  expect(screen.queryByText("Powered by Foursquare")).toBeNull();
});
