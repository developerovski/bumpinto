import { render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { api } from "../../lib/api";
import { tap, typeText } from "../../testUtils/interact";
import InviteEntryCard from "./InviteEntryCard";

/* `jest.mock` babel-plugin-jest-hoist ile import'ların ÜSTÜNE taşınır — burada
   import'lardan sonra durması `import/first` ile çelişmemek içindir. */
jest.mock("../../lib/api", () => ({ api: { sessionByCode: jest.fn() } }));

/* Girdi ve dokunma `testUtils/interact` üzerinden: RNTL 14 + React 19'da çıplak
   `fireEvent.changeText` durum güncellemesini sonraki iddiadan önce BOŞALTMIYOR ve kutu
   eski değeriyle kalıyor (depo notu, 2026-09-08). */
const mock = (fn: unknown) => fn as jest.Mock;
beforeEach(() => jest.clearAllMocks());

const type = (text: string) => typeText("Kod ya da link yapıştır", text);
const join = () => tap("Katıl");

test("5 haneli kod uca sorulur ve dönen slug'a gidilir", async () => {
  mock(api.sessionByCode).mockResolvedValue({ slug: "ab12cd34" });
  await render(<InviteEntryCard />);
  await type("x7k2m");
  await join();
  await waitFor(() => expect(api.sessionByCode).toHaveBeenCalledWith("X7K2M"));
  expect(router.push).toHaveBeenCalledWith("/j/ab12cd34");
});

/* Link elimizdeyken uç ÇAĞRILMAZ: slug zaten linkin içinde. */
test("link yapıştırılırsa uç çağrılmaz, doğrudan slug'a gidilir", async () => {
  await render(<InviteEntryCard />);
  await type("https://bumpinto.app/j/ab12cd34");
  await join();
  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/j/ab12cd34"));
  expect(api.sessionByCode).not.toHaveBeenCalled();
});

test("geçersiz girdi uca hiç gitmez, satır içi hata verir", async () => {
  await render(<InviteEntryCard />);
  await type("abc");
  await join();
  await waitFor(() => expect(screen.getByText("Kod 5 haneli olmalı")).toBeTruthy());
  expect(api.sessionByCode).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
});

test("bilinmeyen kod için 'bulunamadı' yazılır", async () => {
  mock(api.sessionByCode).mockRejectedValue(new Error("404"));
  await render(<InviteEntryCard />);
  await type("X7K2M");
  await join();
  await waitFor(() => expect(screen.getByText("Bu kodla oturum bulunamadı")).toBeTruthy());
  expect(router.push).not.toHaveBeenCalled();
});

test("QR düğmesi tarama sayfasını açar", async () => {
  await render(<InviteEntryCard />);
  await tap("QR tara");
  expect(router.push).toHaveBeenCalledWith("/(sheets)/scan");
});
