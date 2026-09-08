import { LEGAL_DOCS } from "@bumpinto/shared";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";

import LegalDocScreen from "../../app/account/legal/[doc]";
import { isLegalKey } from "../content/legal";

jest.mock("../lib/api", () => ({ api: {}, webBase: "https://bumpinto.app" }));

const params = useLocalSearchParams as unknown as jest.Mock;
const openDoc = (doc: string) => {
  params.mockReturnValue({ doc });
  return render(<LegalDocScreen />);
};

beforeEach(() => jest.clearAllMocks());

test("beş belge anahtarı tanınır, bilinmeyen tanınmaz", () => {
  for (const key of ["privacy", "terms", "data-rights", "kvkk", "attributions", "support"]) {
    expect(isLegalKey(key)).toBe(true);
  }
  expect(isLegalKey("nope")).toBe(false);
});

test("paylaşılan belgeler sürüm ve tarihle gelir", () => {
  for (const doc of Object.values(LEGAL_DOCS)) {
    expect(doc.version).toMatch(/^\d+\.\d+$/);
    expect(doc.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
});

test("okuyucu gizlilik belgesini çizer ve 'Tarayıcıda aç' web URL'sine gider", async () => {
  await openDoc("privacy");
  expect(screen.getByText("Gizlilik politikası")).toBeTruthy();
  expect(screen.getByText("Neyi topluyoruz")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Tarayıcıda aç"));
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://bumpinto.app/privacy");
});

test("şartlar UGC sıfır tolerans maddesini içerir (Apple 1.2)", async () => {
  await openDoc("terms");
  expect(screen.getByText(/sıfır toleransımız var/)).toBeTruthy();
});

test("kvkk takma adı veri hakları belgesini açar ve m.11 haklarını sayar", async () => {
  await openDoc("kvkk");
  expect(screen.getByText("Veri hakların")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Tarayıcıda aç"));
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://bumpinto.app/data-rights");
});

test("atıflar üç sağlayıcıyı ve açık kaynak lisanslarını sayar", async () => {
  await openDoc("attributions");
  for (const text of ["Google Maps Platform", "OpenStreetMap", "React Native"]) {
    expect(screen.getAllByText(new RegExp(text)).length).toBeGreaterThan(0);
  }
  // Üç yazı tipi de OFL 1.1 — lisans satırı birden çok kez geçer.
  expect(screen.getAllByText("OFL 1.1").length).toBe(3);
  expect(screen.getAllByText("MIT").length).toBe(4);
  expect(screen.getByText(/Powered by Foursquare/)).toBeTruthy();
});

test("destek DSA tacir bilgisini ve yayın kapısı yer tutucusunu gösterir", async () => {
  await openDoc("support");
  expect(screen.getByText("Tacir bilgileri")).toBeTruthy();
  expect(screen.getByText(/DSA/)).toBeTruthy();
  expect(screen.getAllByText("[tacir bilgisi — mağazada görünür]").length).toBe(2);
});

test("bilinmeyen belge hesap ekranına yönlendirir", async () => {
  await openDoc("nope");
  expect(screen.getByText("redirect:/account")).toBeTruthy();
  expect(screen.queryByLabelText("Tarayıcıda aç")).toBeNull();
});
