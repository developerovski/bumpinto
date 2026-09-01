/* Kaynak: ui.css .field / .label / .err */
import type { InputHTMLAttributes } from "react";
import ErrorText from "../atoms/ErrorText";
import TextInput from "../atoms/TextInput";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null };

export default function Field({ label, error, id, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[0.875rem] font-semibold" htmlFor={id}>
        {label}
      </label>
      <TextInput id={id} aria-invalid={!!error} {...rest} />
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}
