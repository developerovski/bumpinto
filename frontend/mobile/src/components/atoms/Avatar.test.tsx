import { render, screen } from "@testing-library/react-native";

import Avatar from "./Avatar";

/* Bir kişi = bir renk. Dizinsiz bekleyen (boş koltuk, onay bekleyen istek) henüz kimse değildir:
   renk ALMAZ — yoksa paletin ilk rengini, yani host'unkini ödünç alırdı. TEST BAŞINA TEK `render`. */
test("dizinsiz bekleyen avatar NÖTR: kişi gradyanı çizilmez", async () => {
  await render(<Avatar name="?" waiting />);
  expect(screen.queryByTestId("avatar-tint")).toBeNull();
});

test("dizini olan bekleyen (konumu gelmemiş katılımcı) kendi rengini korur", async () => {
  await render(<Avatar name="Ayşe" tint={2} waiting />);
  expect(screen.getByTestId("avatar-tint")).toBeTruthy();
});
