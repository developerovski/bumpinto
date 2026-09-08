import * as AppleAuthentication from "expo-apple-authentication";

import { api } from "../api";
import { signInWithApple } from "../appleAuth";

jest.mock("../api", () => ({ api: { loginApple: jest.fn() } }));

const signIn = AppleAuthentication.signInAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test("Apple'a HASH'li, backend'e HAM nonce gönderir", async () => {
  signIn.mockResolvedValue({
    identityToken: "id-token",
    fullName: { givenName: "Ayşe", familyName: "Y" },
  });
  (api.loginApple as jest.Mock).mockResolvedValue({ accessToken: "jwt" });

  await signInWithApple();

  expect(signIn.mock.calls[0][0].nonce).toBe("hashed-nonce");
  expect(api.loginApple).toHaveBeenCalledWith({
    identityToken: "id-token",
    nonce: "raw-nonce",
    fullName: "Ayşe Y",
  });
});

test("ad dönmezse fullName gönderilmez (Apple yalnız ilk girişte döndürür)", async () => {
  signIn.mockResolvedValue({ identityToken: "id-token", fullName: null });
  (api.loginApple as jest.Mock).mockResolvedValue({ accessToken: "jwt" });

  await signInWithApple();

  expect(api.loginApple).toHaveBeenCalledWith({
    identityToken: "id-token",
    nonce: "raw-nonce",
    fullName: undefined,
  });
});

test("vazgeçmede null döner; identityToken yoksa hata fırlatır", async () => {
  signIn.mockRejectedValue({ code: "ERR_REQUEST_CANCELED" });
  await expect(signInWithApple()).resolves.toBeNull();

  signIn.mockResolvedValue({ identityToken: null });
  await expect(signInWithApple()).rejects.toThrow("apple:no-identity-token");
  expect(api.loginApple).not.toHaveBeenCalled();
});
