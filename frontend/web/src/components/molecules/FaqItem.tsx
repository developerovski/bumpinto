/* Artboard W19 · SSS satırı — `<details>` örtük `group` rolü taşır, JS'siz açılır. */
export default function FaqItem(props: { question: string; answer: string }) {
  return (
    <details className="rounded-2xl border border-line bg-card p-[0.875rem_1.125rem]">
      <summary className="cursor-pointer text-[0.875rem] font-semibold text-ink">{props.question}</summary>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-ink2">{props.answer}</p>
    </details>
  );
}
