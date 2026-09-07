/* Artboard W18 · Hesabı sil — Apple 5.1.1(v) + Play hesap silme politikası. Akış:
   kimlik (Google/Apple ile giriş) → silinecek/kalacak → "SİL" yazımı → DELETE /api/me →
   /account/deleted. Kurulumsuz çalışır: sayfa anonim açılır, giriş burada yapılır. */
import { Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, ErrorText, Note, Overline, Page, TextInput } from "../components/atoms";
import AppleSignIn from "../components/molecules/AppleSignIn";
import GoogleSignIn from "../components/molecules/GoogleSignIn";
import LegalBlocks from "../components/molecules/LegalBlocks";
import PageHeader from "../components/molecules/PageHeader";
import TwoZone from "../components/molecules/TwoZone";
import PlainShell from "../components/organisms/PlainShell";
import { useAuthStore } from "../store/authStore";

export default function DeleteAccountPage() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const me = useAuthStore((s) => s.me);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const word = t("del.confirmWord");
  const signed = status === "signed" && !!me;
  // TR'de "sil".toUpperCase() → "SIL" (noktasız I). Karşılaştırma yerele duyarlı yapılır.
  const confirmed = typed.trim().toLocaleUpperCase("tr") === word.toLocaleUpperCase("tr");

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      navigate("/account/deleted", { replace: true });
    } catch (e) {
      const code = (e as { response?: { status?: number } }).response?.status;
      setError(t(code === 401 || code === 403 ? "del.errAuth" : "del.errDelete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PlainShell>
      <Page>
        <PageHeader title={t("del.title")} />
        <TwoZone
          left={<>
            <Note>{t("del.warn")}</Note>
            <Overline>{t("del.willDelete")}</Overline>
            <LegalBlocks blocks={[{ ul: [t("del.d1"), t("del.d2"), t("del.d3"), t("del.d4")] }]} />
            <Overline>{t("del.willKeep")}</Overline>
            <LegalBlocks blocks={[{ ul: [t("del.k1"), t("del.k2")] }]} />
            <Note>{t("del.pause")}</Note>
            {signed && (
              <Button type="button" kind="ghost" size="fit"
                onClick={() => void logout().catch(() => undefined)}>
                {t("profile.logout")}
              </Button>
            )}
          </>}
          right={<>
            <Overline>{t("del.verify")}</Overline>
            {signed ? (
              <>
                <Note card>{t("del.signedAs", { email: me.email ?? "" })}</Note>
                <TextInput
                  aria-label={t("del.confirmLabel", { word })}
                  value={typed}
                  autoComplete="off"
                  onChange={(e) => setTyped(e.target.value)}
                />
                <Button type="button" kind="danger" disabled={busy || !confirmed} onClick={() => void submit()}>
                  <Trash size={18} aria-hidden />
                  {t("del.submit")}
                </Button>
                <Note>{t("del.appleNote")}</Note>
              </>
            ) : (
              <>
                <GoogleSignIn onDone={() => setError(null)} />
                <AppleSignIn onDone={() => setError(null)} />
                <Note>{t("del.verifyHint")}</Note>
              </>
            )}
            {error && <ErrorText>{error}</ErrorText>}
          </>}
        />
      </Page>
    </PlainShell>
  );
}
