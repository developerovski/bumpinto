/* Kaynak: artboard Landing — .col(gap:10px; max-width:340px; margin-top:6px):
   Google butonu + ortalanmış koşul satırı. */
import { Trans } from "react-i18next";
import { Note } from "../atoms";
import GoogleSignIn from "./GoogleSignIn";

export default function SignInBlock() {
  return (
    <div className="flex w-full max-w-[21.25rem] flex-col gap-2.5 lg:mt-1.5">
      <GoogleSignIn />
      <Note center>
        <Trans i18nKey="landing.terms" components={[<a key="0" href="/terms" />]} />
      </Note>
    </div>
  );
}
