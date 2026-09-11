/* Kaynak: artboard Landing — .col(gap:10px; max-width:340px; margin-top:6px):
   Google butonu + ortalanmış koşul satırı. */
import { Trans } from "react-i18next";
import { Note } from "../atoms";
import AppleSignIn from "./AppleSignIn";
import GoogleSignIn from "./GoogleSignIn";

/** `onDone`: aynı sayfada devam eden akışlar (plan detayı) gezinmeyi devralır — verilmezse giriş
    sonrası `/sessions`'a gidilir ve kullanıcı bulunduğu plandan atılırdı. */
export default function SignInBlock({ onDone }: { onDone?: () => void } = {}) {
  return (
    <div className="flex w-full max-w-[21.25rem] flex-col gap-2.5 lg:mt-1.5">
      <GoogleSignIn onDone={onDone} />
      <AppleSignIn onDone={onDone} />
      {/* Artboard (622) koşullar satırı `.mi` (12px) — `.cp` değil. */}
      <Note center small>
        <Trans i18nKey="landing.terms" components={[<a key="0" href="/terms" />]} />
      </Note>
    </div>
  );
}
