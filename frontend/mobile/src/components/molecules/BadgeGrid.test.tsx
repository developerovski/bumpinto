import { render, screen } from "@testing-library/react-native";

import BadgeGrid from "./BadgeGrid";

/* Keşfet POC P6 — sunucu yalnız SAYAR, rozet istemcide türer (shared `badges.ts`).
   Sayaçlar spec §11.6: açtığın · buluşma · hafta seri; `friendsMet` artık çizilmez.
   TEST BAŞINA TEK `render`. */
test("3 sayaç + 4 rozet; kazanılmamış rozet ilerleme basar; kazanım durumu ekran okuyucuya söylenir", async () => {
  await render(<BadgeGrid stats={{ sessionsHosted: 12, friendsMet: 9, plansMet: 7, metStreakWeeks: 3 }} />);
  expect(screen.getByText("12")).toBeTruthy();
  expect(screen.getByText("açtığın")).toBeTruthy();
  expect(screen.getByText("7")).toBeTruthy();
  expect(screen.getByText("hafta seri")).toBeTruthy();
  expect(screen.queryByText("9")).toBeNull();
  expect(screen.getByLabelText("İlk buluşma · kazanıldı")).toBeTruthy();
  expect(screen.getByLabelText("10 buluşma · kilitli")).toBeTruthy();
  expect(screen.getByText("7/10 · 3 buluşma kaldı.")).toBeTruthy();
  expect(screen.getByLabelText("3 hafta seri · kazanıldı")).toBeTruthy();
});

test("istatistik yoksa sayaçlar 0 ve rozetler kilitli", async () => {
  await render(<BadgeGrid stats={undefined} />);
  expect(screen.getAllByText("0")).toHaveLength(3);
  expect(screen.getByLabelText("İlk buluşma · kilitli")).toBeTruthy();
});
