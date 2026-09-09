import { render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { tap } from "../../testUtils/interact";
import InviteCard from "./InviteCard";

beforeEach(() => jest.clearAllMocks());

test("joinCode varsa kod satırı ve QR düğmesi çıkar", async () => {
  await render(<InviteCard slug="ab12cd34" joinCode="X7K2M" />);
  expect(screen.getByText(/kod/)).toBeTruthy();
  expect(screen.getByText("X7K2M")).toBeTruthy();
  await tap("QR göster");
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/(sheets)/qr",
    params: { slug: "ab12cd34" },
  });
});

/* Kod davetli görünümüne GELMEZ (`SessionView.joinCode` yalnız üyeye). Gelmediğinde ne kod
   satırı ne QR düğmesi çizilir — uydurma bir kod basmaktansa hiç basmamak doğru. */
test("joinCode yoksa kod satırı da QR düğmesi de çizilmez", async () => {
  await render(<InviteCard slug="ab12cd34" />);
  expect(screen.queryByText("X7K2M")).toBeNull();
  expect(screen.queryByLabelText("QR göster")).toBeNull();
  expect(screen.getByText("hesap gerekmez")).toBeTruthy();
});

/* `compact` (P6: ikinci kişi katıldıktan sonra) kod satırını düşürür — ama QR hâlâ işe
   yarar: masadaki üçüncü kişi için. */
test("compact kod satırını düşürür, QR düğmesi kalır", async () => {
  await render(<InviteCard slug="ab12cd34" joinCode="X7K2M" compact />);
  expect(screen.queryByText("X7K2M")).toBeNull();
  expect(screen.getByLabelText("QR göster")).toBeTruthy();
});
