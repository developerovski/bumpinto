/* Kaynak: ui.css .a-card + .a-card--flame / .muted / .a-btn--white (artboard W4) */
import { useTranslation } from "react-i18next";
import { LinkButton, Sticker } from "../atoms";

/** Artboard W4 — viral döngü bloğu: "sıra sende" çıkartması + yeni buluşma daveti.
    Host zaten kurmuş olduğu için çıkartma yok, CTA yeni bir oturum açar.
    Buton artboard'da <button>; webde kök sayfaya giden bağlantı olduğu için <a>. */
export default function ViralCard(props: { host?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="relative rounded-card border border-[#f6c6d2] bg-flame-wash p-4 shadow-sh1">
      {!props.host && (
        // Artboard: .stk.w style="position:absolute;right:12px;top:-12px"
        <span className="absolute -top-3 right-3 flex">
          <Sticker white>{t("result.viralSticker")}</Sticker>
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3>{t(props.host ? "result.viralHostTitle" : "result.viralTitle")}</h3>
        <span className="text-[0.8125rem] leading-normal text-ink2">{t("result.viralCopy")}</span>
      </div>
      {/* Artboard: .btn.b-wh style="min-height:46px;margin-top:12px" */}
      <LinkButton
        kind="white"
        size="sm"
        href={props.host ? "/sessions/new" : "/"}
        className="mt-3"
      >
        {t(props.host ? "result.viralHostCta" : "result.viralCta")}
      </LinkButton>
    </div>
  );
}
