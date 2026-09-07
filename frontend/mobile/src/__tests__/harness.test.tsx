import { render } from "@testing-library/react-native";

import Index from "../../app/index";

/**
 * T1 duman testi: jest-expo koşucusu + RNTL + TSX derlemesi ayakta mı.
 * Ekranın kendisi M-4:T7'de Giriş (O2) ile değişecek; bu test o zaman düşer.
 *
 * DİKKAT (RNTL 14): `render` artık Promise döndürür — `await` ZORUNLU.
 */
describe("test koşucusu", () => {
  it("bir RN ekranını render eder", async () => {
    const { getByText } = await render(<Index />);
    expect(getByText("BumpInto")).toBeTruthy();
  });

  it("expo-secure-store ikizi çalışır", async () => {
    const store = require("expo-secure-store");
    await store.setItemAsync("k", "v");
    await expect(store.getItemAsync("k")).resolves.toBe("v");
  });
});
