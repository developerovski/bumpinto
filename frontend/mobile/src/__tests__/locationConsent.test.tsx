import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import LocationConsentSheet from "../../app/(sheets)/location-consent";
import * as permissions from "../lib/permissions";

/* Ekran testleri `src/__tests__/`te yaşar: `app/` altındaki her .ts(x) expo-router için ROTADIR
   ve test dosyası bundle'a girip uygulamayı çökertir (M-4 `routeTree.test.ts` kapısı). */
jest.mock("../lib/permissions", () => ({
  requestLocationWhenInUse: jest.fn(),
  openAppSettings: jest.fn(),
}));

const request = permissions.requestLocationWhenInUse as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test("açılışta sistem izni İSTEMEZ, üç gerekçeyi gösterir", async () => {
  await render(<LocationConsentSheet />);
  expect(request).not.toHaveBeenCalled();
  for (const r of [
    "Arkadaşlarına yaklaşık gösterilir",
    "Buluşmayla birlikte silinir",
    "İstemezsen adres yaz",
  ]) {
    expect(screen.getByText(r)).toBeTruthy();
  }
  expect(screen.getByText("Sonraki adımda telefonun izin soracak.")).toBeTruthy();
});

test("'Devam et' sistem iznini ister; 'Adres yazacağım' istemez", async () => {
  request.mockResolvedValue("granted");
  await render(<LocationConsentSheet />);

  fireEvent.press(screen.getByText("Adres yazacağım"));
  expect(request).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith(
    expect.objectContaining({ params: { locationPermission: "manual" } }),
  );

  fireEvent.press(screen.getByText("Devam et"));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ params: { locationPermission: "granted" } }),
    ),
  );
});
