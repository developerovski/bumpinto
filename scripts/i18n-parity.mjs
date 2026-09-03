#!/usr/bin/env node
/* tr/en/nl anahtar paritesi — eksik ya da fazla anahtarı çıkışa yazar, farkta 1 döner.
   CLDR çoğul kuralı: tr'de yalnız "other" kategorisi var (i18next `simplifyPluralSuffix`
   bu durumda hiç ek KULLANMAZ — plain key), en/nl'de "one"/"other" iki kategori var
   (`_one`/`_other` eki zorunlu). Bu yüzden `deck.likedN` (tr, eksiz) ile `deck.likedN_one` +
   `deck.likedN_other` (en/nl) GERÇEK bir eşleşmedir — literal karşılaştırma hatalı pozitif
   üretir. Karşılaştırmadan önce bilinen CLDR çoğul eklerini (`_zero/_one/_two/_few/_many/_other`)
   soyup taban anahtara indirgeriz. */
import { readFileSync } from "node:fs";

const dir = "frontend/web/src/i18n/locales";
const load = (l) => JSON.parse(readFileSync(`${dir}/${l}.json`, "utf8"));
const flat = (o, p = "") =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`],
  );

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const base = (k) => k.replace(PLURAL_SUFFIX, "");

const langs = ["tr", "en", "nl"];
const raw = Object.fromEntries(langs.map((l) => [l, new Set(flat(load(l)))]));
const keys = Object.fromEntries(langs.map((l) => [l, new Set([...raw[l]].map(base))]));
let bad = 0;
for (const l of langs.slice(1)) {
  for (const k of keys.tr) if (!keys[l].has(k)) (bad = 1), console.error(`eksik ${l}: ${k}`);
  for (const k of keys[l]) if (!keys.tr.has(k)) (bad = 1), console.error(`fazla ${l}: ${k}`);
}
console.log(langs.map((l) => `${l} ${raw[l].size}`).join(" · "));
process.exit(bad);
