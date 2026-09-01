import { Heading, Highlight } from "@bumpinto/web";

/** Fosforlu kalem izi — 100° gradyanla iki ucu soluklaşan `--color-hl` bandı,
    1.2° sola yatık. Tek başına gövde punto ölçeğinde. */
export function Marker() {
  return <Highlight>buluşalım.</Highlight>;
}

/** W1 · `join.title` deseni ("<0>Buluşmaya</0> katıl") — başlığın ilk sözcüğü vurgulu.
    Üründe `Trans` boş çocukla enjekte eder; burada doğrudan children ile aynı sonuç. */
export function InTitle() {
  return (
    <Heading>
      <Highlight>Buluşmaya</Highlight> katıl
    </Heading>
  );
}

/** W4 · kazanan bloğu — mekan adının son sözcüğü ünlemle vurgulanır. */
export function WinnerName() {
  return (
    <Heading center>
      Karaköy <Highlight>Lokantası!</Highlight>
    </Heading>
  );
}
