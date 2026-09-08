import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { Avatar, Badge, Button } from "./index";

/** DİKKAT (RNTL 14): `render` Promise döndürür — `await` zorunlu (T1 saha notu #3). */

test("Button min 52px ve devre dışıyken basılamaz", async () => {
  await render(<Button title="Katıl" onPress={jest.fn()} disabled />);
  const btn = screen.getByRole("button", { name: "Katıl" });
  expect(btn).toBeDisabled();
  expect(StyleSheet.flatten(btn.props.style).minHeight).toBe(52);
});

test("Avatar baş harfi ve çevrimiçi noktası", async () => {
  await render(<Avatar name="Ayşe" tint={1} online />);
  expect(screen.getByText("A")).toBeTruthy();
  expect(screen.getByLabelText("online")).toBeTruthy();
});

test("Badge metni 12px altına inmez (erişilebilirlik düzeltmesi)", async () => {
  await render(<Badge tone="grass">Hazır</Badge>);
  expect(
    StyleSheet.flatten(screen.getByText("Hazır").props.style).fontSize,
  ).toBeGreaterThanOrEqual(12);
});
