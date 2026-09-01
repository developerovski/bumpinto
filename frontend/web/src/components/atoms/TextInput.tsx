/* Kaynak: ui.css .a-inp / DS v2 */
import type { InputHTMLAttributes } from "react";

export default function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "min-h-[3.25rem] w-full rounded-2xl border-[1.5px] border-line-in bg-card " +
        "px-[1.125rem] font-body text-base text-ink placeholder:text-ink3 " +
        "focus:border-flame-deep focus:shadow-[0_0_0_3px_var(--color-flame-wash)] focus:outline-none"
      }
    />
  );
}
