import { render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { api } from "../lib/api";
import SessionsScreen from "../../app/sessions/index";
import { tap } from "../testUtils/interact";

/* NOT: `jest.mock` babel-plugin-jest-hoist ile import'ların ÜSTÜNE taşınır.

   Bu dosya neden `app/` altında DEĞİL: expo-router `app/` kökünü `require.context` ile tarar ve
   regex'i yalnız `+api`/`+html`/`+middleware` dosyalarını eler — `.test.tsx` de ROTA sayılır,
   `@testing-library/react-native` bundle'a girer ve Node `console` modülünü isteyip uygulamayı
   çökertir (2026-09-08 emülatörde görüldü). Ekran testleri bu yüzden `src/__tests__/`te yaşar. */
jest.mock("../lib/api", () => ({
  api: { listSessions: jest.fn() },
  webBase: "https://bumpinto.app",
}));

test("boş listede P2 kopyası ve davet kutusu", async () => {
  (api.listSessions as jest.Mock).mockResolvedValue({ open: [], past: [] });
  await render(<SessionsScreen />);
  await waitFor(() => expect(screen.getByText("Henüz buluşma yok")).toBeTruthy());
  expect(screen.getByPlaceholderText("Kod ya da link yapıştır")).toBeTruthy();
});

test("açık oturum kartında hazır sayısı ve duruma uygun CTA", async () => {
  (api.listSessions as jest.Mock).mockResolvedValue({
    past: [],
    open: [
      {
        slug: "x7k2m",
        name: "Cuma kahvesi",
        sessionType: "GROUP",
        status: "SWIPING",
        participantCount: 3,
        doneCount: 2,
        activityTypes: ["COFFEE", "FOOD"],
      },
    ],
  });
  await render(<SessionsScreen />);
  await waitFor(() => expect(screen.getByText("Cuma kahvesi")).toBeTruthy());
  expect(screen.getByText("2/3 bitirdi")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Desteye git" })).toBeTruthy();
});

/* Artboard P2 çerçevesi: `.top` / `.scroll` / `.cta` KARDEŞTİR — yalnız ortadaki kayar.
   Üst çubuk ya da birincil eylem kaydırmanın içine girerse liste uzadıkça ekranın dışına
   düşüyor; "Yeni buluşma" böyle kaybolmuştu (2026-09-08 cihazda görüldü, testler görmüyordu). */
const insideScrollView = (label: string) => {
  let node = screen.getByLabelText(label).parent;
  while (node) {
    if (String(node.type).includes("ScrollView")) return true;
    node = node.parent;
  }
  return false;
};

test("üst çubuk ve birincil eylem ScrollView'ın DIŞINDA, sabit durur", async () => {
  (api.listSessions as jest.Mock).mockResolvedValue({ open: [], past: [] });
  await render(<SessionsScreen />);
  await waitFor(() => expect(screen.getByText("Henüz buluşma yok")).toBeTruthy());

  expect(insideScrollView("Yeni buluşma kur")).toBe(false);
  expect(insideScrollView("Profil")).toBe(false);
});

/* Alt sekme YOK (plan38 "tek stack"): Keşfet'e giriş Oturumlar'ın sabit üst çubuğundan. */
test("üst çubuktaki Keşfet düğmesi /discover'a iter", async () => {
  (api.listSessions as jest.Mock).mockResolvedValue({ open: [], past: [] });
  await render(<SessionsScreen />);
  await waitFor(() => expect(screen.getByText("Henüz buluşma yok")).toBeTruthy());
  expect(insideScrollView("Keşfet")).toBe(false);
  await tap("Keşfet");
  expect(router.push).toHaveBeenCalledWith("/discover");
});

test("boş durumda 'Yeni buluşma' TEK kez çizilir (sabit çubuk + kart tekrarı yok)", async () => {
  (api.listSessions as jest.Mock).mockResolvedValue({ open: [], past: [] });
  await render(<SessionsScreen />);
  await waitFor(() => expect(screen.getByText("Henüz buluşma yok")).toBeTruthy());
  expect(screen.getAllByLabelText("Yeni buluşma kur")).toHaveLength(1);
});
