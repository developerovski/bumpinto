import type { Schemas } from "@bumpinto/shared";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

import { api } from "./api";

/**
 * Apple ile Giriş (R-M1) — Google girişi sunan uygulamalar için Apple 4.8 gereği ZORUNLU.
 *
 * Nonce iki biçimde gider ve bu KASITLIDIR: Apple'a SHA-256 HASH'i, backend'e HAM hâli.
 * Backend, ham nonce'u hash'leyip identity token'ın `nonce` claim'iyle karşılaştırarak
 * yeniden oynatma (replay) saldırısını eler. İkisi karıştırılırsa doğrulama sessizce çöker.
 *
 * Apple `fullName`'i YALNIZ İLK girişte döndürür; sonraki girişlerde `null`'dur — bu yüzden
 * ad ilk seferde backend'e taşınır, orada saklanır.
 */
export async function signInWithApple(): Promise<Schemas["LoginResponse"] | null> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    // Kullanıcı vazgeçti: hata DEĞİL, sessizce giriş ekranında kalınır.
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw error;
  }

  if (!credential.identityToken) throw new Error("apple:no-identity-token");

  const fullName =
    [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ") ||
    undefined;

  return api.loginApple({ identityToken: credential.identityToken, nonce: rawNonce, fullName });
}
