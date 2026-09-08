import { render, screen, waitFor } from "@testing-library/react-native";

import { api } from "../../src/lib/api";
import SessionsScreen from "./index";

/* NOT: `jest.mock` babel-plugin-jest-hoist ile import'ların ÜSTÜNE taşınır. */
jest.mock("../../src/lib/api", () => ({
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
