import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { Button, IconButton } from "../components/atoms";
import { SettingsRow } from "../components/molecules";
import { PRESS_LOCK_MS, shouldAcceptPress } from "../lib/useOncePress";

/**
 * ÇİFT DOKUNUŞ = TEK EYLEM (2026-09-08 kullanıcı bildirdi: iki kez dokununca aynı ekran iki kez
 * açılıyordu). `onPress` her dokunuşta ateşlenir, gezinme ASENKRONDUR — ikinci dokunuş ilk
 * `router.push` yığına işlenmeden geçer. Aynı sorun yazma uçlarında daha pahalıdır
 * (iki `createSession`, iki `join`).
 *
 * Kilit ÖRNEK BAŞINADIR; farklı düğmeler birbirini engellemez.
 *
 * TEST BAŞINA TEK `render` (K-M29). İki dokunuş TEK `act` içinde gönderilir: `act`sız arka
 * arkaya iki `fireEvent.press` sonraki testlerin `screen`'ini bozuyor (K-M17'nin aynı ailesi)
 * ve tek `act` ayrıca iki dokunuşun gerçekten YAKIN olmasını garanti eder — iki ayrı `await`
 * arasında geçen süre kilidin penceresini aşabilirdi.
 */
/** Gerçek çift dokunuş: iki basma, tek `act`. */
async function doublePress(element: Parameters<typeof fireEvent.press>[0]) {
  await act(async () => {
    fireEvent.press(element);
    fireEvent.press(element);
  });
}
test("Button: hızlı iki dokunuş TEK kez çalışır", async () => {
  const onPress = jest.fn();
  await render(<Button title="Buluşmayı kur" onPress={onPress} />);
  const button = screen.getByRole("button", { name: "Buluşmayı kur" });
  await doublePress(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

/* Zaman penceresi SAF fonksiyonda sınanır: `Date.now`u taklit etmek RNTL'nin kendi
   `act`/zamanlayıcı işleyişini bozuyor ve sonraki testlerde hiçbir şey çizilmiyor. */
test("kilit yalnız pencere İÇİNDE tutar", () => {
  expect(shouldAcceptPress(1000, 1000 + 80)).toBe(false);
  expect(shouldAcceptPress(1000, 1000 + PRESS_LOCK_MS - 1)).toBe(false);
  expect(shouldAcceptPress(1000, 1000 + PRESS_LOCK_MS)).toBe(true);
  // İlk dokunuş her zaman geçer (henüz basılmamış: lastAt = 0).
  expect(shouldAcceptPress(0, Date.now())).toBe(true);
});

/* Kilit ÖRNEK başına: iki ayrı düğmeye hızlı basmak meşrudur ve engellenmez. */
test("ayrı düğmeler birbirini engellemez", async () => {
  const first = jest.fn();
  const second = jest.fn();
  await render(
    <>
      <Button title="Katıl" onPress={first} />
      <Button title="Vazgeç" onPress={second} />
    </>,
  );
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "Katıl" }));
    fireEvent.press(screen.getByRole("button", { name: "Vazgeç" }));
  });
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
});

test("IconButton: hızlı iki dokunuş TEK kez çalışır", async () => {
  const onPress = jest.fn();
  await render(<IconButton label="Kopyala" icon={null} onPress={onPress} />);
  const button = screen.getByRole("button", { name: "Kopyala" });
  await doublePress(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("SettingsRow: hızlı iki dokunuş TEK kez çalışır", async () => {
  const onPress = jest.fn();
  await render(<SettingsRow icon={null} label="Hesap ve veriler" onPress={onPress} />);
  const row = screen.getByRole("button", { name: "Hesap ve veriler" });
  await doublePress(row);
  expect(onPress).toHaveBeenCalledTimes(1);
});
