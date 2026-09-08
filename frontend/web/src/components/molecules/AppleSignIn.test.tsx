import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({ api: { loginApple: vi.fn(), me: vi.fn() } }));

import { api } from "../../lib/api";
import AppleSignIn from "./AppleSignIn";

type AppleWindow = typeof window & { AppleID?: unknown };
const signIn = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_APPLE_CLIENT_ID", "app.bumpinto.web");
  vi.stubEnv("VITE_APPLE_REDIRECT_URI", "https://bumpinto.app/");
  (window as AppleWindow).AppleID = { auth: { init: vi.fn(), signIn } };
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as AppleWindow).AppleID;
});

function at(onDone = vi.fn()) {
  render(<MemoryRouter><AppleSignIn onDone={onDone} /></MemoryRouter>);
  return onDone;
}

describe("AppleSignIn", () => {
  it("kimlik yoksa buton yerine not basar", () => {
    vi.stubEnv("VITE_APPLE_CLIENT_ID", "");
    at();
    expect(screen.queryByRole("button", { name: /Apple ile devam et/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Apple girişi bu ortamda yapılandırılmadı/)).toBeInTheDocument();
  });

  it("başarılı girişte identityToken, nonce ve ad sunucuya gider", async () => {
    signIn.mockResolvedValue({ authorization: { id_token: "tok" }, user: { name: { firstName: "Mehmet", lastName: "Ş" } } });
    vi.mocked(api.loginApple).mockResolvedValue({ userId: "u1" } as never);
    vi.mocked(api.me).mockResolvedValue({ id: "u1", email: "m@x.test" } as never);
    const onDone = at();
    fireEvent.click(screen.getByRole("button", { name: /Apple ile devam et/ }));
    await waitFor(() => expect(api.loginApple).toHaveBeenCalled());
    const body = vi.mocked(api.loginApple).mock.calls[0][0];
    expect(body.identityToken).toBe("tok");
    expect(body.nonce.length).toBeGreaterThan(15);
    expect(body.fullName).toBe("Mehmet Ş");
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("kullanıcı vazgeçerse hata basılmaz, sunucu hatasında basılır", async () => {
    signIn.mockRejectedValue({ error: "popup_closed_by_user" });
    at();
    fireEvent.click(screen.getByRole("button", { name: /Apple ile devam et/ }));
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(screen.queryByText(/tekrar dene/)).not.toBeInTheDocument();
    signIn.mockResolvedValue({ authorization: { id_token: "tok" } });
    vi.mocked(api.loginApple).mockRejectedValue(new Error("500"));
    fireEvent.click(screen.getByRole("button", { name: /Apple ile devam et/ }));
    expect(await screen.findByText(/Apple ile giriş yapılamadı/)).toBeInTheDocument();
  });
});
