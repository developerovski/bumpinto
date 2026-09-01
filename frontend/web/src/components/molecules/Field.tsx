import type { InputHTMLAttributes } from "react";
import TextInput from "../atoms/TextInput";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null };

export default function Field({ label, error, id, ...rest }: Props) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <TextInput id={id} aria-invalid={!!error} {...rest} />
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
