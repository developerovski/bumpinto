import { render, screen, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";

import ParticipantSheet from "../../app/(sheets)/participant";
import { api } from "../lib/api";
import { useSocialStore } from "../store/socialStore";
import { tap } from "../testUtils/interact";

jest.mock("../lib/api", () => ({
  api: { report: jest.fn(), blockParticipant: jest.fn() },
  webBase: "https://bumpinto.app",
}));

const params = useLocalSearchParams as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useSocialStore.setState({ blocked: {}, busy: false, notice: null, error: null });
  params.mockReturnValue({
    slug: "x7k2m",
    participantId: "p3",
    name: "Kerem",
    place: "Helmond",
  });
  (api.blockParticipant as jest.Mock).mockResolvedValue({ id: "b1" });
  (api.report as jest.Mock).mockResolvedValue(undefined);
});

test("üç eylemi gösterir; sebep seçilmeden Gönder KAPALI; sebeple POST /api/reports", async () => {
  await render(<ParticipantSheet />);
  for (const a of ["Bildir", "Engelle", "Sesli sohbette sustur"]) {
    expect(screen.getByText(a)).toBeTruthy();
  }

  await tap("Bildir");
  expect(screen.getByText("Neyi bildiriyorsun?")).toBeTruthy();
  expect(screen.getByLabelText("Gönder").props.accessibilityState.disabled).toBe(true);

  await tap("Sesli sohbette taciz");
  expect(screen.getByLabelText("Gönder").props.accessibilityState.disabled).toBe(false);
  await tap("Gönder");

  await waitFor(() =>
    expect(api.report).toHaveBeenCalledWith({
      sessionSlug: "x7k2m",
      targetParticipantId: "p3",
      reason: "HARASSMENT",
      note: undefined,
    }),
  );
  // Apple 1.2: bildiren, bildirdiğini görmeye devam etmemeli — engelleme otomatik gelir.
  await waitFor(() => expect(api.blockParticipant).toHaveBeenCalledWith({ participantId: "p3" }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
});

test("'Rahatsız edici ad' sunucudaki IMPERSONATION üyesine eşlenir", async () => {
  await render(<ParticipantSheet />);
  await tap("Bildir");
  await tap("Rahatsız edici ad");
  await tap("Gönder");
  await waitFor(() =>
    expect((api.report as jest.Mock).mock.calls[0][0].reason).toBe("IMPERSONATION"),
  );
});

test("Engelle TEK BAŞINA POST /api/me/blocks çağırır, rapor göndermez", async () => {
  await render(<ParticipantSheet />);
  await tap("Engelle");
  await waitFor(() => expect(api.blockParticipant).toHaveBeenCalledWith({ participantId: "p3" }));
  expect(api.report).not.toHaveBeenCalled();
  expect(useSocialStore.getState().blocked.p3).toBe(true);
});

test("bildirim not metni kişinin adını taşır ve bunu görmeyeceğini söyler", async () => {
  await render(<ParticipantSheet />);
  await tap("Bildir");
  expect(
    screen.getByText("Bildirim ekibimize gider; 24 saat içinde bakılır. Kerem bunu görmez."),
  ).toBeTruthy();
});
