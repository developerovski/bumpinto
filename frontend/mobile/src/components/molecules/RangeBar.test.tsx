import { render, screen } from "@testing-library/react-native";

import RangeBar from "./RangeBar";

/**
 * Yol çubuğu — ROZET ÇORBASI YASAK (karar dok. §4, GUIDE kural 10): adalet yalnız bant +
 * baş harf noktaları + aralık ile gösterilir, "Sen ~30 dk ▲" rozeti ÜRETİLMEZ.
 *
 * TEST BAŞINA TEK `render` (RNTL 14).
 */

/* Dakikalar `travel[]`ten okunur (K-B26: `travelMinutes` DEĞİL) — `fairnessOf`un girdisi. */
const venue = (id: string, minutes: Record<string, number>) => ({
  id,
  travel: Object.entries(minutes).map(([participantId, m]) => ({ participantId, minutes: m })),
});

const travel = {
  labels: { me: "Sen", a: "Ayşe", k: "Kerem" },
  names: { me: "Mehmet", a: "Ayşe", k: "Kerem" },
  colors: { me: 0, a: 1, k: 2 },
  selfId: "me",
};

test("bant + baş harf noktaları + aralık; rozet YOK", async () => {
  await render(<RangeBar venue={venue("v1", { me: 25, a: 30, k: 35 })} travel={travel} />);
  expect(screen.getByText("25–35 dk")).toBeTruthy();
  expect(screen.queryByText(/▲/)).toBeNull();
  expect(screen.getByText("Herkese ~aynı")).toBeTruthy();
  // Noktalar dekoratif; kişi başı dakika ekran okuyucuya BURADAN verilir.
  expect(screen.getByLabelText("Kerem ~35 dk, Ayşe ~30 dk, Sen ~25 dk")).toBeTruthy();
});

test("adaletsizde uzak kişi yazılır", async () => {
  await render(<RangeBar venue={venue("v2", { me: 20, a: 20, k: 40 })} travel={travel} />);
  expect(screen.getByText(/Kerem için uzak/)).toBeTruthy();
  expect(screen.getByText(/fark 20 dk/)).toBeTruthy();
});

/* Nokta DEKORATİF (ekran okuyucudan gizli) — bilgi bandın etiketinde. Harf HAM addan gelir:
   kendi noktan "Sen"in baş harfini (S) taşısaydı oturumda olmayan ÜÇÜNCÜ bir kişi gibi
   okunurdu; başlıktaki avatarla eşleşmesi gerekiyor. */
test("noktalar ham addan baş harf alır, kendi noktan koyu halka taşır", async () => {
  await render(<RangeBar venue={venue("v3", { me: 25, a: 30, k: 35 })} travel={travel} />);
  const dot = (id: string) => screen.getByTestId(`range-dot-${id}`, { includeHiddenElements: true });
  const letter = (id: string) => dot(id).props.children.at(-1).props.children;
  expect(letter("me")).toBe("M");
  expect(letter("a")).toBe("A");
  expect(letter("k")).toBe("K");
  // "Sen" bilgisi HUE değil BİÇİM taşır: koyu dış halka (dolgu kimlik rengine ait kalır).
  const border = (id: string) =>
    dot(id)
      .props.style.filter(Boolean)
      .reduce((acc: Record<string, unknown>, x: Record<string, unknown>) => ({ ...acc, ...x }), {})
      .borderColor;
  expect(border("me")).not.toBe(border("k"));
});

test("tek kişide aralık değil tek sayı yazılır", async () => {
  await render(<RangeBar venue={venue("v4", { me: 30 })} travel={travel} />);
  expect(screen.getByText("~30 dk")).toBeTruthy();
  expect(screen.queryByText(/–/)).toBeNull();
});

/* Çapalı oturumda 2 km'lik daire içindeki 20 kartın hepsi aynı şeyi yazardı — baş cümle
   çizilmez, olgu (fark) kalır. */
test("çapalı oturumda baş cümle basılmaz, fark satırı kalır", async () => {
  await render(
    <RangeBar venue={venue("v5", { me: 25, a: 30, k: 35 })} travel={{ ...travel, anchored: true }} />,
  );
  expect(screen.queryByText("Herkese ~aynı")).toBeNull();
  expect(screen.getByText(/fark 10 dk/)).toBeTruthy();
});

test("yol verisi yoksa hiç çizilmez", async () => {
  const view = await render(<RangeBar venue={{ id: "v6" }} travel={travel} />);
  expect(view.toJSON()).toBeNull();
});
