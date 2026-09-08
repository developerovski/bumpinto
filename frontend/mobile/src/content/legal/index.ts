import { LEGAL_DOCS, type LegalBlock, type LegalSlug, bodyFor } from "@bumpinto/shared";
import type { TFunction } from "i18next";

/**
 * Uygulama içi yasal okuyucuların (R-M4) belge dizini.
 *
 * Gövde metinleri `@bumpinto/shared/content/legal`ta ÜÇ DİLDE tam yazılıdır ve web ile
 * AYNI kaynaktır — mağazaya verilen URL ile uygulamadaki metin ayrışamaz. Bu yüzden plan
 * 39'un öngördüğü "v1 yalnız TR, EN/NL tarayıcıya" kısıtı GEÇERSİZDİR: okuyucu kullanıcının
 * dilinde açılır (K-M4 bu sayede doğmadan kapandı).
 *
 * `attributions` ve `support` yasal SÖZLEŞME değildir; gövdeleri i18n anahtarlarından
 * kurulur (web'deki karşılıklarıyla aynı anahtarlar) ve aynı okuyucuyla çizilir.
 */
export type LegalKey = LegalSlug | "attributions" | "support";

export type LegalDoc = {
  title: string;
  updated: string;
  version: string;
  /** "Tarayıcıda aç" hedefi — W-14 rotası; mağaza formuna giren URL ile aynıdır. */
  url: string;
  blocks: LegalBlock[];
};

const WEB_PATH: Record<LegalKey, string> = {
  privacy: "/privacy",
  terms: "/terms",
  "data-rights": "/data-rights",
  attributions: "/attributions",
  support: "/support",
};

/** Yol parçası `kvkk` tarihsel addır; sözleşmedeki dilim `data-rights`. */
const ALIAS: Record<string, LegalKey> = { kvkk: "data-rights" };

const KEYS: LegalKey[] = ["privacy", "terms", "data-rights", "attributions", "support"];

export const isLegalKey = (value: string): boolean =>
  KEYS.includes(value as LegalKey) || value in ALIAS;

const normalize = (value: string): LegalKey => ALIAS[value] ?? (value as LegalKey);

export function legalDoc(
  key: string,
  t: TFunction,
  language: string | undefined,
  webBase: string,
): LegalDoc {
  const doc = normalize(key);
  return {
    title: t(TITLE_KEY[doc]),
    updated: doc in LEGAL_DOCS ? LEGAL_DOCS[doc as LegalSlug].updated : STATIC_UPDATED,
    version: doc in LEGAL_DOCS ? LEGAL_DOCS[doc as LegalSlug].version : STATIC_VERSION,
    url: `${webBase}${WEB_PATH[doc]}`,
    blocks: blocksFor(doc, t, language),
  };
}

const STATIC_UPDATED = "2026-09-07";
const STATIC_VERSION = "1.0";

const TITLE_KEY: Record<LegalKey, string> = {
  privacy: "legal.privacy",
  terms: "legal.terms",
  "data-rights": "legal.dataRights",
  attributions: "attribution.pageTitle",
  support: "legal.support",
};

/* Atıflar ve açık kaynak listesi — sağlayıcı adları ÇEVRİLMEZ, lisans kodları da öyle. */
const OSS: [string, string][] = [
  ["React Native", "MIT"],
  ["Expo", "MIT"],
  ["react-native-webrtc", "MIT"],
  ["Phosphor Icons", "MIT"],
  ["Bricolage Grotesque", "OFL 1.1"],
  ["Figtree", "OFL 1.1"],
  ["Caveat", "OFL 1.1"],
];

function blocksFor(key: LegalKey, t: TFunction, language: string | undefined): LegalBlock[] {
  if (key in LEGAL_DOCS) return bodyFor(LEGAL_DOCS[key as LegalSlug].body, language);

  if (key === "attributions") {
    return [
      { h: t("attribution.mapData") },
      {
        table: [
          [t("attribution.name.google"), t("attribution.desc.google")],
          [t("attribution.name.foursquare"), `${t("attribution.desc.foursquare")} · Powered by Foursquare`],
          [t("attribution.name.open"), `${t("attribution.desc.open")} · © OpenStreetMap contributors`],
        ],
      },
      { p: t("attribution.everywhere"), muted: true },
      { h: t("attribution.openSource") },
      { table: OSS },
    ];
  }

  return [
    { h: t("support.cardTitle") },
    { p: t("support.cardHint"), muted: true },
    { link: ["", "hello@bumpinto.app", "mailto:hello@bumpinto.app"] },
    { h: t("support.faqTitle") },
    { ul: [t("support.q1"), t("support.q2"), t("support.q3"), t("support.q4")] },
    { h: t("support.trader") },
    {
      table: [
        [t("support.mName"), "BumpInto (Mehmet Şerefoğlu)"],
        [t("support.mEmail"), "hello@bumpinto.app"],
        [t("support.mPhone"), TRADER_PLACEHOLDER],
        [t("support.mAddress"), TRADER_PLACEHOLDER],
        [t("support.mWeb"), "bumpinto.app"],
      ],
    },
    { note: t("support.dsa") },
  ];
}

/**
 * BİLİNÇLİ yer tutucu: gerçek tacir bilgisi mağaza hesabıyla birlikte kesinleşir ve
 * `RELEASE-CHECKLIST.md`'de YAYIN KAPISI olarak izlenir (K-M6). Tarama istisnası orada kayıtlı.
 */
export const TRADER_PLACEHOLDER = "[tacir bilgisi — mağazada görünür]";
