# Theme spec: align the Multiple Z-Tests Calculator with moepouyan.com

Same token set already applied to the Canadian Sampling Plan Tool and the single Two-Proportion
Z-Test Calculator, so all three read as one family when embedded on the site. Values come from the
live site's computed styles and its `#moe-portfolio-landing` style block.

Status: **applied**. Every change below is in the working tree. No logic was touched.

---

## 1. Tokens

```
--brand            #0047AB          rgb(0, 71, 171)
--brand-hover      #003A8C
--brand-tint       rgba(0, 71, 171, 0.08)
--ink              #18212B
--muted            #5B6673
--secondary-text   rgba(0, 0, 0, 0.72)
--page-bg          #F5F5F5
--surface          #FFFFFF
--paper            #F7F5EF
--hairline         #D5D9DF
--success          #166534
--warning          #B45309
--danger           #991B1B
--focus-ring       #FFBF47   3px solid, 3px offset
```

Shape and motion:

```
--radius-card      24px
--radius-control   12px
--radius-pill      999px
--shadow-card      0 4px 6px rgba(0,0,0,.02), 0 10px 15px rgba(0,0,0,.03), 0 0 0 1px rgba(0,0,0,.04)
--shadow-cardHover 0 14px 28px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.05)
--ease-out         cubic-bezier(0.16, 1, 0.3, 1)
```

Type, from the one Google Fonts call the site already makes:

- **Space Grotesk 700** for every heading, in `#0047AB`, letter-spacing `-0.03em`.
- **Outfit 400/500** for body and UI, 17px / 1.5, letter-spacing `-0.01em`, in `rgba(0,0,0,0.72)`.

One title colour throughout, per the site rule.

---

## 2. Contrast, verified

| Pair | Ratio | Grade |
|---|---|---|
| `#0047AB` on white (and white on brand, the table header row) | 8.44 | AAA |
| `#0047AB` on `#F5F5F5` page | 7.74 | AAA |
| `#0047AB` on brand tint `#EBF0F8` (hovered table row) | 7.37 | AAA |
| `#18212B` on white | 16.26 | AAA |
| `#18212B` on `#F7F5EF` paper (zebra rows, metric strip) | 14.92 | AAA |
| `rgba(0,0,0,.72)` body on white | 9.29 | AAA |
| `rgba(0,0,0,.72)` body on paper | 8.52 | AAA |
| `#5B6673` muted on white | 5.84 | AA |
| `#5B6673` muted on paper / page | 5.36 | AA |
| `#166534` success on its 5% tint (Significant chip) | 6.60 | AAA |
| `#991B1B` danger on its 5% tint (Not significant chip) | 7.64 | AAA |

Lowest value in the app is 5.36:1. Nothing falls below AA.

Removed: the chart's `#fca311` orange and `#14213d` navy, and the Tailwind `green-100 / green-800`
and `red-100 / red-800` chips. None of those appear anywhere on the site.

---

## 3. File-by-file, as applied

### `index.html`
Google Fonts call with `preconnect`, `meta` description, `color-scheme: light`, and the Vite
favicon replaced with `/favicon.svg`.

### `public/favicon.svg`
New. Brand-blue tile with three stacked white bars at decreasing opacity, for the batch idea. The
sibling single-test tool uses a white Z on the same tile, so the two read as a set.

### `tailwind.config.js`
`theme.extend` carries the full token set: the `brand` family, `ink`, `muted`, `secondary`,
`hairline`, `paper`, `page`, `success`, `warning`, `danger`; `font-sans` Outfit and `font-display`
Space Grotesk; `rounded-card` / `rounded-control` / `rounded-pill`; `shadow-card` /
`shadow-cardHover`; `tracking-tight` and `tracking-tighter`; `ease-site`; and the `fadeIn` and
`modal` keyframes.

### `src/index.css`
Was three Tailwind directives and nothing else. Now carries the CSS custom properties, Outfit on
`html`, the page background and 17px body type, Space Grotesk 700 brand headings, the amber
`:focus-visible` ring, a `.tnum` helper, hidden number spinners for the narrow table inputs, and
`prefers-reduced-motion` and `@media print` blocks.

### `src/App.tsx`
Page background to `bg-page`, flex column so the footer sits at the bottom on short pages. Footer
to a hairline border with muted text, and its "© Z-Test Calculator. All rights reserved." replaced
with the method and your name. Dropped the unused `Activity` import and the unused `React` import.

### `src/components/Calculator.tsx`
Header rebuilt as a `<header>`: pill eyebrow reading "Batch significance testing", h1 in Space
Grotesk brand blue, and a subtitle in body colour that says what the batch framing is for. Sections
wrapped in `<section>` with consistent spacing. The primary action becomes a brand pill with a
`Play` icon, 48px minimum height, 2px border; Restart becomes a hairline outline pill. The
`transform hover:scale-105` on the run button was dropped, since the site's motion language is a
`translateY` lift on a `cubic-bezier(0.16, 1, 0.3, 1)` curve, not a scale.

### `src/components/InputForm.tsx`
Settings panel to `rounded-card` + `shadow-card`. The two radios become a pill segmented control:
inputs are `sr-only` with a `peer`, labels carry `peer-checked:bg-brand peer-checked:text-white`
and a `peer-focus-visible` amber ring, wrapped in a `fieldset` / `legend`. Shared `FIELD` and
`LABEL` constants give every input a 12px radius, hairline border, brand focus ring and tabular
figures. The "same sample size" checkbox moves into a `bg-paper` panel with a real `htmlFor`
binding, which it did not have.

### `src/components/DataTable.tsx`
Table wrapped in a `rounded-card` hairline container with the card shadow. Header row to brand
blue with white Space Grotesk small caps. Rows zebra white and `bg-paper`, hairline separators,
`brand-tint` on hover. Cell inputs to the 12px control style with tabular figures. `scope="col"`
added to the headers. Bulk Import becomes an outline brand pill.

### `src/components/ResultsGrid.tsx`
Heading to Space Grotesk brand. Added a count line under it, "n of m comparisons are significant at
the 95% level", which is both useful and the place a multiple-comparison figure belongs once
`REVIEW.md` P1 is implemented. Download CSV becomes a filled brand pill with an icon.

### `src/components/ResultCard.tsx`
- Card to `rounded-card` + `shadow-card`, lifting `translateY(-6px)` to `shadow-cardHover` over
  `ease-site`, matching the site's Tools cards.
- Significance chips to `success` / `danger` on a 5% tint with a matching border, replacing the
  Tailwind green and red pills. Text changed to "Significant" and "Not significant" so the chip
  fits beside the title.
- The three figures move into a `bg-paper` strip as a `<dl>`, in Space Grotesk with tabular
  figures, the difference picked out in brand.
- `Chart.defaults.font.family` set to Outfit and `Chart.defaults.color` to `#5B6673`.
- Series palette to `['#0047AB', '#18212B']`. Bars get `borderRadius: 6`, `maxBarThickness: 72`,
  no border.
- Y grid to `rgba(0,0,0,0.06)`, X grid off, axis border to hairline.
- Chart title (the difference label) to `#166534` or `#991B1B` in Space Grotesk, replacing the
  `rgba(22,163,74,1)` and `rgba(220,38,38,1)` literals.
- Tooltip restyled: ink background, 12px corner, Space Grotesk title, no colour swatch.
- Chart sits in its own hairline `rounded-control` panel.

### `src/components/BulkInputModal.tsx`
Backdrop to `bg-ink/50` with a blur, replacing `bg-black bg-opacity-50`. Panel to `rounded-card`
with the hover shadow and a subtle scale-in. Header and footer separated by hairlines, footer on
`bg-paper`. The CSV format hint becomes a `bg-paper` code chip and the counts-mode note a bordered
panel. Textarea to the 12px control style with a brand focus ring. Cancel becomes a quiet text
button, Import Data a brand pill. Added `aria-label`s to the close button and the textarea and
`role="alert"` on the error line.

---

## 4. Verification

- `npm run build` succeeds. Bundle: 371.45 kB JS (123.37 kB gzip), 16.26 kB CSS (4.10 kB gzip).
- Production bundle rendered and driven in headless Chromium at 1280px: settings and table, a
  three-row run with results, and the bulk import modal. No console or page errors.
- Every new Tailwind utility confirmed present in the emitted CSS.
- No new type or lint errors. The five pre-existing `tsc` errors and the one `eslint` error are
  unchanged and are logged in `REVIEW.md` P6.

---

## 5. Later changes

Version 1.0.0 rewrote the component tree while keeping every token above unchanged. `InputForm`
became `SettingsPanel`, `ResultsGrid` became `ResultsSection`, and `ResultsTable` and the `ui/`
primitives (`SegmentedControl`, `NumberField`, `CellField`) were added. All carry the same brand
tokens, pill controls, 12px fields and 24px cards.

Two additions to the palette in use, both already in the token set and both verified in section 2:
`warning` (#B45309) for assumption warnings, the family-wise error notice and the "Lost to
correction" marker, and `danger` (#991B1B) for invalid field borders and messages.

The chart labelling bug noted below was fixed in the same pass. See `docs/UPGRADE.md`.
