import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import ParticipantRow from "../components/molecules/ParticipantRow";
const kerem = {
  id: "p3",
  displayName: "Kerem",
  locationLabel: "Helmond",
  travelMode: "CAR" as const,
  midpointMinutes: 30,
};

beforeEach(() => jest.clearAllMocks());

test("normal satır adı, konumu ve süreyi gösterir", async () => {
  await render(<ParticipantRow participant={kerem} slug="x7k2m" />);
  expect(screen.getByText("Kerem")).toBeTruthy();
  expect(screen.getByText("Helmond · ~30 dk")).toBeTruthy();
});

test("engellenen satır kimlik ve konum GÖSTERMEZ", async () => {
  await render(<ParticipantRow participant={{ ...kerem, blocked: true }} slug="x7k2m" />);
  expect(screen.getByText("Engellenen kişi")).toBeTruthy();
  expect(screen.queryByText("Kerem")).toBeNull();
  expect(screen.queryByText(/Helmond/)).toBeNull();
  expect(screen.getByText("engellendi")).toBeTruthy();
});

/* Satır rolüyle aranır: `Avatar` da adı `accessibilityLabel` olarak taşır, düz etiket
   araması iki eşleşme bulur. */
const rowFor = (name: string) => screen.getByRole("button", { name });

test("uzun basma bildir/engelle alt sayfasını açar", async () => {
  await render(<ParticipantRow participant={kerem} slug="x7k2m" />);
  const row = rowFor("Kerem");
  expect(row.props.accessibilityHint).toBe("Seçenekler için basılı tut");
  fireEvent(row, "longPress");
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/(sheets)/participant",
    params: { slug: "x7k2m", participantId: "p3", name: "Kerem", place: "Helmond" },
  });
});

test("kendi satırı ve engellenmiş satır alt sayfayı AÇMAZ", async () => {
  const view = await render(<ParticipantRow participant={kerem} slug="x7k2m" self />);
  fireEvent(rowFor("Kerem"), "longPress");
  expect(router.push).not.toHaveBeenCalled();
  view.unmount();

  await render(<ParticipantRow participant={{ ...kerem, blocked: true }} slug="x7k2m" />);
  fireEvent(rowFor("Engellenen kişi"), "longPress");
  expect(router.push).not.toHaveBeenCalled();
});
