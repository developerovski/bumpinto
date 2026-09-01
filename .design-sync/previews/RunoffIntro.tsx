import { RunoffIntro } from "@bumpinto/web";

/** 07 Runoff · ekranın başlık bloğu: "Son düzlük" çıkartması ve `Trans` ile
    iki satıra bölünen başlık. Props almaz — metin i18n'den (`runoff.*`) gelir. */
export function Header() {
  return (
    <div style={{ width: "27.75rem", background: "var(--color-paper)", padding: "1rem" }}>
      <RunoffIntro />
    </div>
  );
}
