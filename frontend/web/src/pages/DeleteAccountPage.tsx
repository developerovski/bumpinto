/* Artboard W18 · Hesabı sil — Apple 5.1.1(v) + Play hesap silme politikası. Akış:
   kimlik (Google/Apple ile giriş) → silinecek/kalacak → "SİL" yazımı → DELETE /api/me →
   /account/deleted. Kurulumsuz çalışır: sayfa anonim açılır, giriş burada yapılır. */
import { Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, ErrorText, Note, Overline, Page } from "../components/atoms";
import AppleSignIn from "../components/molecules/AppleSignIn";
import Field from "../components/molecules/Field";
import GoogleSignIn from "../components/molecules/GoogleSignIn";
import LegalBlocks from "../components/molecules/LegalBlocks";
import MobileCta from "../components/molecules/MobileCta";
import PageHeader from "../components/molecules/PageHeader";
import Sheet from "../components/molecules/Sheet";
import TwoZone from "../components/molecules/TwoZone";
import PlainShell from "../components/organisms/PlainShell";
import { useAuthStore } from "../store/authStore";

/* Artboard 5246/5255/5303/5312: "Silinecekler" ve "Kalacaklar" listeleri beyaz kart YÜZEYİNDE
   durur (1280'de 14px 18px dolgu). Çıplak liste, uyarı metninden ayrışmıyordu. */
const LIST_CARD = "rounded-card border border-line bg-card p-[0.875rem_1.125rem] shadow-sh1";
/* Artboard 5264–5279: sağ bölgenin iki kartı — doğrulama beyaz, onay kartı kırmızımsı kenarlıklı. */
const ZONE_CARD = "flex flex-col gap-3 rounded-card border bg-card p-[1.375rem] shadow-sh1";

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
  // Yalnız 390 akışında true olur: açan buton (`MobileCta`) ≥1024'te gizlidir.
  const [sheet, setSheet] = useState(false);
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

  /* Onay bloğu: görünür etiket + input + yıkıcı buton + Apple notu. Etiket `aria-label` DEĞİL
     gerçek `<label>` — artboard 5272–5274'te `.fld` içinde görünür bir `.lb` var; etiketsiz
     kutu kullanıcıya ne yazacağını söylemiyordu. */
  const confirmBlock = (
    <>
      <Field
        id="del-confirm"
        label={t("del.confirmLabel", { word })}
        value={typed}
        autoComplete="off"
        onChange={(e) => setTyped(e.target.value)}
      />
      <Button type="button" kind="danger" disabled={busy || !confirmed} onClick={() => void submit()}>
        <Trash size={18} aria-hidden />
        {t("del.submit")}
      </Button>
      <Note>{t("del.appleNote")}</Note>
      {error && <ErrorText>{error}</ErrorText>}
    </>
  );

  return (
    <PlainShell>
      <Page>
        <PageHeader title={t("del.title")} size="reader" />
        {/* Artboard 5297–5299: 390'da EN ÜSTTE kimlik doğrulama gelir (kurulum gerekmeden
            silmenin ön koşulu), listeler altında kalır. DOM sırası değişmez. */}
        <TwoZone
          mobileFirst="right"
          left={<>
            <LegalBlocks blocks={[{ p: t("del.warn"), muted: true }]} />
            <Overline>{t("del.willDelete")}</Overline>
            <div className={LIST_CARD}>
              <LegalBlocks blocks={[{ ul: [t("del.d1"), t("del.d2"), t("del.d3"), t("del.d4")] }]} />
            </div>
            <Overline>{t("del.willKeep")}</Overline>
            <div className={LIST_CARD}>
              <LegalBlocks blocks={[{ ul: [t("del.k1"), t("del.k2")] }]} />
            </div>
            <Note>{t("del.pause")}</Note>
            {signed && (
              <Button type="button" kind="ghost" size="fit"
                onClick={() => void logout().catch(() => undefined)}>
                {t("profile.logout")}
              </Button>
            )}
          </>}
          right={<>
            {signed ? (
              <>
                <div className={`${ZONE_CARD} border-line`}>
                  <h3>{t("del.verify")}</h3>
                  <Note>{t("del.signedAs", { email: me.email ?? "" })}</Note>
                </div>
                {/* Alt sayfa açıkken onay bloğu ORADADIR: aynı düğüm iki kapta birden basılmaz
                    (çift `id`/etiket olurdu). Masaüstünde açan buton gizli olduğundan bu kart
                    ≥1024'te her zaman görünür kalır. */}
                {!sheet && (
                  <div className={`${ZONE_CARD} hidden border-[#efc9c2] lg:flex`}>{confirmBlock}</div>
                )}
              </>
            ) : (
              <div className={`${ZONE_CARD} border-line`}>
                <h3>{t("del.verify")}</h3>
                {/* Artboard 5298: "kurulum gerekmez" mesajı doğrulama kartının BAŞINDA durur —
                    uygulamayı silmiş kullanıcı hesabını buradan kapatabileceğini bilmeli. */}
                <Note>{t("del.verifyIntro")}</Note>
                <GoogleSignIn onDone={() => setError(null)} />
                <AppleSignIn onDone={() => setError(null)} />
                <Note>{t("del.verifyHint")}</Note>
                {error && <ErrorText>{error}</ErrorText>}
              </div>
            )}
          </>}
        />
        {/* Artboard 5322–5324: 390'da ekrana yapışık `.cta` butonu onay ADIMINI açar. */}
        {signed && !sheet && (
          <MobileCta>
            <Button type="button" kind="danger" onClick={() => setSheet(true)}>
              <Trash size={18} aria-hidden />
              {t("del.mobileSubmit")}
            </Button>
          </MobileCta>
        )}
      </Page>
      {/* Artboard 5334–5364: 390 onay adımı ekran DİBİNDEN açılan alt sayfadır (`.scrim` +
          `.sheet` + `.grab`) — DS'in `Sheet` molekülü bu ölçüyü ve odak tuzağını zaten taşır. */}
      {sheet && (
        <Sheet title={t("del.sheetTitle")} onClose={() => setSheet(false)}>
          {confirmBlock}
          <Button type="button" kind="ghost" onClick={() => setSheet(false)}>{t("common.cancel")}</Button>
        </Sheet>
      )}
    </PlainShell>
  );
}
