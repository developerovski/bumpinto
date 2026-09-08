import { render, screen } from "@testing-library/react-native";

import { useNetStore } from "../../store/netStore";
import OfflineBanner from "./OfflineBanner";

/**
 * P24 şeridi — çevrimdışıyken "elindeki veri ne zamandan kalma" sorusunu yanıtlar.
 *
 * Saat `netStore.lastSyncAt`ten okunur; ekranlar ve şerit AYNI zamanı gösterir çünkü
 * `sessionStore` her başarılı yüklemede oraya yazar (M-4 T8). İkinci bir zaman kaynağı yok.
 *
 * TEST BAŞINA TEK `render` (RNTL 14).
 */

test("çevrimiçiyken hiçbir şey çizmez", async () => {
  useNetStore.setState({ online: true, lastSyncAt: null });

  await render(<OfflineBanner onRetry={jest.fn()} />);

  expect(screen.queryByText("Bağlantı yok")).toBeNull();
});

test("çevrimdışıyken son senkron saatiyle şerit çizer", async () => {
  useNetStore.setState({ online: false, lastSyncAt: new Date("2026-09-06T12:38:00").getTime() });

  await render(<OfflineBanner onRetry={jest.fn()} />);

  expect(screen.getByText("Bağlantı yok")).toBeTruthy();
  expect(screen.getByText(/12:38/)).toBeTruthy();
});
