/* Artboard .tog / .tog.off (150-151, 524) — 50×30 pill, 24px topuz, açıkken gradyan,
   kapalıyken düz `line2` (kenarlıksız). `role="switch"` zorunlu: rıza ekranı klavye
   ve ekran okuyucuyla çalışmak zorunda (KVKK m.5/1 · GDPR Art. 7(1) açık rıza kanıtlanabilir olmalı). */
export default function Toggle(props: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      className={[
        "relative h-[1.875rem] w-[3.125rem] flex-none cursor-pointer rounded-full transition-colors",
        "focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-45",
        props.checked ? "bg-[image:var(--grad)]" : "bg-line2",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "absolute top-[0.1875rem] h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(39,32,59,0.25)] transition-all",
          props.checked ? "left-[1.4375rem]" : "left-[0.1875rem]",
        ].join(" ")}
      />
    </button>
  );
}
