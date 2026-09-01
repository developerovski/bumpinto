/* Kaynak: ui.css .a-wm (+ > i, > span) / DS v2 */
import { useTranslation } from "react-i18next";

/** Artboard .wm — gradyan iğne + "BumpInto". Her web ekranının ilk öğesi. */
export default function Wordmark() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <i
        className={
          "h-[0.875rem] w-[0.875rem] rotate-45 " +
          "rounded-[50%_50%_50%_0.125rem] bg-[image:var(--grad)]"
        }
        aria-hidden
      />
      <span className="font-head text-[0.9375rem] font-extrabold tracking-[-0.01em]">
        {t("common.wordmark")}
      </span>
    </div>
  );
}
