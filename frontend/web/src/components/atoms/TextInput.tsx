/* Kaynak: ui.css .a-inp / DS v2 */
import type { InputHTMLAttributes } from "react";

/* Artboard `.inp` (CSS 143) 52px/16px/yarıçap 16; `.inp.phd` (926) nokta ekleme alanında
   44px/14px/yarıçap 12'ye iner. */
const sizes = {
  md: "min-h-[3.25rem] rounded-2xl px-[1.125rem] text-base",
  sm: "min-h-11 rounded-xl px-[1.125rem] text-[0.875rem]",
};

/* Prop adı `size` DEĞİL: `<input size>` yerel bir sayısal öznitelik, aynı adı kullanmak
   `Field`'ın native prop'ları geçirdiği her yerde tür çakışması üretiyor. */
export default function TextInput({
  inputSize = "md",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { inputSize?: keyof typeof sizes }) {
  return (
    <input
      {...props}
      className={
        `${sizes[inputSize]} w-full border-[1.5px] border-line-in bg-card ` +
        "font-body text-ink placeholder:text-ink3 " +
        // Hata çerçevesi KALICI (artboard 1363): hata duruyorsa çerçeve de durur — yalnız
        // odakta değil. `aria-invalid` zaten erişilebilirlik sözleşmesi; görsel onun izinde.
        "aria-[invalid=true]:border-flame-deep aria-[invalid=true]:shadow-[0_0_0_3px_var(--color-flame-wash)] " +
        "focus:border-flame-deep focus:shadow-[0_0_0_3px_var(--color-flame-wash)] focus:outline-none"
      }
    />
  );
}
