/* Kaynak: ui.css .a-card + .a-card--flame / .muted / .a-btn--white (artboard W4) */
import { useTranslation } from "react-i18next";
import { LinkButton, Sticker } from "../atoms";

/** Artboard W4 — viral döngü bloğu: "sıra sende" çıkartması + yeni buluşma daveti.
    Host zaten kurmuş olduğu için çıkartma yok, CTA yeni bir oturum açar.
    Buton artboard'da <button>; webde kök sayfaya giden bağlantı olduğu için <a>. */
export default function ViralCard(props: { host?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex items-center gap-2.5 rounded-card border border-[#f6c6d2] bg-flame-wash p-[0.75rem_0.875rem] shadow-sh1 lg:block lg:p-4">
      {!props.host && (
        // Artboard: .stk.w style="position:absolute;right:12px;top:-12px"
        <span className="absolute -top-3 left-3 flex lg:right-3 lg:left-auto">
          <Sticker white>{t("result.viralSticker")}</Sticker>
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-[0.9375rem] lg:text-h3">{t(props.host ? "result.viralHostTitle" : "result.viralTitle")}</h3>
        <span className="hidden text-[0.8125rem] leading-normal text-ink2 lg:block">{t("result.viralCopy")}</span>
      </div>
      {/* Artboard: .btn.b-wh style="min-height:46px;margin-top:12px" */}
      <LinkButton
        kind="white"
        size="sm"
        href={props.host ? "/sessions/new" : "/"}
        className="min-h-10 flex-none lg:mt-3 lg:min-h-11"
      >
        {/* 390'da şerit dar: kısa etiket (artboard 2654). Uzun hâli ≥1024'te. */}
        <span className="lg:hidden">{t("result.viralCtaShort")}</span>
        <span className="hidden lg:inline">{t(props.host ? "result.viralHostCta" : "result.viralCta")}</span>
      </LinkButton>
    </div>
  );
}
