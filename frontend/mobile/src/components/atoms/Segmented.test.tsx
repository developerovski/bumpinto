import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import Segmented from "./Segmented";

/**
 * Seçili kabarcık her yuvanın KENDİ zemini değil, rayda KAYAN TEK bir parçadır — bu yüzden
 * "hangi yuva seçili" sorusu artık zemin rengiyle değil `accessibilityState.selected` ile
 * yanıtlanır. Testler o sözleşmeyi ve kabarcığın TEK olduğunu korur.
 *
 * TEST BAŞINA TEK `render` (K-M29).
 */
const OPTIONS = [
  { value: "a", label: "Grup" },
  { value: "b", label: "Bireysel" },
] as const;

/** Rayın genişliği `onLayout`tan gelir; jsdom benzeri ortamda olay elle gönderilir. */
function layout(width: number) {
  fireEvent(screen.getByTestId("segmented-track"), "layout", {
    nativeEvent: { layout: { width, height: 44, x: 0, y: 0 } },
  });
}

function Harness(p: { iconOnly?: boolean }) {
  const [value, setValue] = useState<"a" | "b">("a");
  return (
    <Segmented options={OPTIONS} value={value} onChange={setValue} iconOnly={p.iconOnly} />
  );
}

test("seçim yuvanın erişilebilirlik durumunda taşınır", async () => {
  await render(<Harness />);
  expect(screen.getByRole("tab", { name: "Grup" }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole("tab", { name: "Bireysel" }).props.accessibilityState.selected).toBe(false);
});

test("dokunma seçimi değiştirir", async () => {
  await render(<Harness />);
  await act(async () => {
    fireEvent.press(screen.getByRole("tab", { name: "Bireysel" }));
  });
  expect(screen.getByRole("tab", { name: "Bireysel" }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole("tab", { name: "Grup" }).props.accessibilityState.selected).toBe(false);
});

/* Kabarcık TEK: yuva başına zemin basılsaydı seçim değişiminde iki beyaz yüzey birden
   görünebilir ve geçiş ışınlanma gibi okunurdu. */
test("beyaz kabarcık TEK parçadır ve yuva genişliğinde durur", async () => {
  await render(<Harness />);
  await act(async () => layout(200));
  const thumbs = screen.queryAllByTestId("segmented-thumb", { includeHiddenElements: true });
  expect(thumbs).toHaveLength(1);
  // padding 4 → kullanılabilir 192, iki yuva → 96.
  expect(flat(thumbs[0].props.style).find((x) => x?.width != null)?.width).toBe(96);
});

/* Ray ölçülmeden kabarcık çizilmez: 0 genişlikle basıp sonra yerine kaydırmak ilk karede
   soldan fırlayan bir kabarcık gösterirdi. */
test("ray ölçülmeden kabarcık çizilmez", async () => {
  await render(<Harness />);
  expect(screen.queryAllByTestId("segmented-thumb", { includeHiddenElements: true })).toHaveLength(0);
});

test("yalnız-ikon rayında etiket erişilebilirlik adı olarak KALIR", async () => {
  await render(<Harness iconOnly />);
  expect(screen.getByRole("tab", { name: "Grup" })).toBeTruthy();
  // Ekranda yazı YOK — beş ikonu yan yana yazıyla basmak 390'da satırı taşırıyor.
  expect(screen.queryByText("Grup")).toBeNull();
});

/** Stil dizilerini tek düzeye indirir (RN `style` iç içe dizi olabilir). */
function flat(style: unknown): Record<string, unknown>[] {
  if (Array.isArray(style)) return style.flatMap(flat);
  return style && typeof style === "object" ? [style as Record<string, unknown>] : [];
}
