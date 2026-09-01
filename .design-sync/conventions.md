## Building with BumpInto

BumpInto is a Turkish-first "meet in the middle" app. Its design system is small, opinionated
and **phone-shaped**: warm paper background, one flame/pink accent, heavy display type,
sticker-and-polaroid playfulness. Screens are a single centred 480px column, never a wide layout.

### 1. Always mount inside `BumpIntoProvider`

15 of the 32 components call `useTranslation()`. Outside the provider they render raw i18n keys
(`join.title`) instead of copy. The provider ships in the bundle with an initialised i18next
instance pinned to Turkish, exported alongside the components:

```jsx
const { BumpIntoProvider, Page, Wordmark, Button } = window.BumpInto;

<BumpIntoProvider>
  <Page>
    <Wordmark />
    <Button type="button">Katıl</Button>
  </Page>
</BumpIntoProvider>
```

`Page` is the layout shell — a 480px max-width, full-viewport-height flex column with the product's own
gutter and rhythm. Variants: `default`, `deck`, `result`, plus `center`. Start every screen with it.

### 2. The styling idiom — read this before writing any class

The stylesheet is compiled Tailwind v4, **but it is a closed set**: it contains only the
utilities the product itself uses. Verified absent, for example: `p-7`, `gap-9`, `text-right`,
`grid-cols-3`, `text-sun`. Writing those produces silently unstyled output.

So, in order of preference:

1. **Compose DS components.** They carry their own styling; this is the idiom.
2. **For your own layout glue, use the design tokens as CSS variables** via `style={{…}}` —
   always available, never tree-shaken away:
   - colour `--color-paper` `--color-card` `--color-ink` `--color-ink2` `--color-ink3`
     `--color-flame` `--color-flame-deep` `--color-flame-wash` `--color-sun` `--color-hl`
     `--color-grass` `--color-grass-wash` `--color-violet` `--color-violet-wash`
     `--color-amber` `--color-amber-wash` `--color-line` `--color-line2` `--color-line-in`
   - type `--font-head` (Bricolage Grotesque) `--font-body` (Figtree) `--font-hand` (Caveat),
     sizes `--text-display` `--text-h2` `--text-h3`
   - surface `--radius-card` `--shadow-sh1` (only `sh1` is exposed as a variable — for the
     deeper elevation use the `shadow-sh2` utility class)
   - brand gradients `--grad` (flame→coral, the like button and progress fill)
     and `--story-ring` (the conic avatar ring)
3. **Utility classes only when you have confirmed they exist** in the stylesheet. Ones the
   product uses, and that do resolve: `font-head` `font-hand` `rounded-card` `shadow-sh1`
   `shadow-sh2` `bg-card` `bg-flame-deep` `bg-grass-wash` `text-ink2` `border-line2`
   `flex` `gap-3` `p-4` `text-center`.

Two gotchas: there is **no `text-display` utility** — display sizing comes from the base layer's
`h1`, so use the `Heading` component. And there is no `flame2` token or utility at all:
the coral end of the brand gradient lives inside `--grad`’s own literal value.

The DS also ships hand-drawn glyph classes used by its own components: `c-ico-undo`, `c-ico-x`,
`c-ico-heart` (deck actions), `c-mark*` (map mark), `c-check` (the green tick).

### 3. Where the truth lives

Read `_ds/<folder>/styles.css` and its `@import` closure before styling — it is the authoritative
list of what resolves. Per component, read `components/<group>/<Name>/<Name>.prompt.md` for usage
and `<Name>.d.ts` for the props contract. Groups are `atoms`, `molecules`, `organisms`.

### 4. Copy

Product copy is Turkish and lives in i18n; components that own their text render it themselves —
pass them data, not strings. When you write new copy, match the voice: short, warm, lower-case
casual ("Konumunu at, ortada buluşalım. Hesap filan gerekmez.").
